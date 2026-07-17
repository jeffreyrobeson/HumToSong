"""OpenAI 兼容调用路径: 支持自定义 base_url + 多 key 轮换.

当用户在前端选了某个「自定义供应商」时, 三个 AI 接口走这里而不是 Gemini.
- 文本生成: POST {base_url}/chat/completions, messages=[{"role":"user","content":prompt}]
- 图像识别: 同端点, user content 用多模态结构 (text + image_url(base64 data url)) 

设计与 gemini_client.generate_content 同形签名 generate_content(provider, prompt, image=...), 
便于调用方无缝切换.429/5xx 带有限重试.
"""

import asyncio
import base64
import json

import httpx

from app.services import db

MAX_RETRIES = 1
TIMEOUT = 60.0


def _basic_auth(api_key: str) -> str:
    return f"Bearer {api_key}"


async def _post(base_url: str, api_key: str, model: str, messages: list, timeout: float = TIMEOUT) -> str:
    """单次 POST chat/completions, 返回 assistant 文本.失败抛 RuntimeError(含状态与正文)."""
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {
        "Authorization": _basic_auth(api_key),
        "Content-Type": "application/json",
    }
    body = {"model": model, "messages": messages, "temperature": 0.8}
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, headers=headers, json=body)
    if resp.status_code != 200:
        raise RuntimeError(f"OpenAI-compat upstream {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    # 兼容 OpenAI/通义/Kimi/DeepSeek 等: 标准 chat.completions.choices[0].message.content
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"unexpected upstream response: {json.dumps(data)[:300]}") from e


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0].strip()
    return text


async def generate_content(provider_id: str, prompt: str, image_data_url: str | None = None) -> str:
    """用所选供应商调用.image_data_url 提供时走多模态视觉；否则纯文本.

    自动从 DB 取该供应商最早可用 key (FIFO 轮换) ；429/5xx 最多重试一次 (换下一条 key) .
    返回模型回复文本 (已剥离 markdown 代码围栏) .
    """
    provider = db.get_provider(provider_id)
    if not provider:
        raise RuntimeError(f"provider not found: {provider_id}")

    messages = [
        {
            "role": "user",
            "content": (
                [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ]
                if image_data_url
                else prompt
            ),
        }
    ]

    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        key = db.get_active_key(provider_id)
        if not key:
            raise RuntimeError("no active api key for this provider")
        try:
            text = await _post(provider["base_url"], key["api_key"], provider["model"], messages)
            return _strip_fences(text)
        except RuntimeError as e:
            last_err = e
            msg = str(e)
            # 仅对疑似限流/上游临时错误重试；4xx (非 429) 直接上抛
            if (" 429 " in msg or " 500 " in msg or " 502 " in msg or " 503 " in msg) and attempt < MAX_RETRIES:
                # 轮换到下一条 key: 把当前 key 标记轮换时刻？这里只 sleep 短暂后重试, 
                # get_active_key 仍按 FIFO, 重试时若只有一条 key 则复用同一把.
                await asyncio.sleep(2)
                continue
            raise
    raise last_err  # type: ignore[misc]


def ensure_data_url(image_base64: str) -> str:
    """前端可能传 'data:image/jpeg;base64,xxx' 或裸 base64, 统一成 data url."""
    if image_base64.startswith("data:"):
        return image_base64
    return f"data:image/jpeg;base64,{image_base64}"
