"""共享的 Gemini 客户端调用, 带 429 限流自动重试.

免费档 gemini-2.5-flash 限 20 次/分钟, 超限返回 429 RESOURCE_EXHAUSTED
并附带 retry_delay.这里在收到 429 时按延迟等待后重试, 最多 MAX_RETRIES 次, 
仍失败则把异常上抛 (由路由层包成 500) .
"""

import asyncio
import re

from google import genai
from google.genai import errors

from app.config import settings

MAX_RETRIES = 1
MAX_RETRY_WAIT = 8.0       # 即使 Gemini 报告更长也最多等这么久, 避免把客户端熬断
MAX_TOTAL_WAIT = 15.0      # 累计等待硬上限, 保护 nginx proxy_read_timeout(120s) 与手机耐心


def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _retry_delay_from_error(err: errors.APIError) -> float:
    """从 429 错误信息里解析 'Please retry in Xs' 的等待秒数, clamp 到上限."""
    msg = str(err)
    m = re.search(r"retry in ([\d.]+)s", msg)
    wait = 8.0
    if m:
        try:
            wait = float(m.group(1))
        except ValueError:
            pass
    return min(wait, MAX_RETRY_WAIT)


async def generate_content(model: str, contents) -> "object":
    """带 429 限流重试的 generate_content.contents 形态与原 SDK 一致.

    免费档 gemini-2.5-flash 限 20 次/分钟, 超限返回 429 RESOURCE_EXHAUSTED.
    这里只在 429 时按 Gemini 报告的 retry_delay 等待后重试 1 次, 并在累计等待
    超过 MAX_TOTAL_WAIT 时放弃上抛 -- 避免请求长时间挂住把客户端/反代熬断.
    """
    last_err: Exception | None = None
    waited = 0.0
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await _client().aio.models.generate_content(
                model=model, contents=contents
            )
        except errors.APIError as e:
            last_err = e
            # 只有 429 才重试；4xx 客户端错误 (400 等) 重试徒劳, 直接上抛
            if getattr(e, "code", None) != 429 or attempt == MAX_RETRIES:
                raise
            wait = _retry_delay_from_error(e)
            if waited + wait > MAX_TOTAL_WAIT:
                raise
            waited += wait
            await asyncio.sleep(wait)
    # 理论上到不了
    raise last_err  # type: ignore[misc]
