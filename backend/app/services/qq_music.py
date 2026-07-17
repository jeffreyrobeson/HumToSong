"""QQ 音乐点歌 API 封装 (cyapi.top).

- search_songs(msg, num=20): 搜索返回歌曲列表 (name/artists/id/cover)
- get_song(msg, n=1): 取序号 n 对应歌曲的播放链接 + 详情
- resolve_by_mid(mid): 按歌曲 mid 直接解析 (忽略其他参数)

返回的 url 是 QQ 音乐 CDN 直链 (带 vkey, 有时效), 可直接给前端 <audio> 播放.
"""

import httpx

from app.config import settings

API_URL = "https://cyapi.top/API/qq_music.php"
TIMEOUT = 20.0


def _params(msg: str | None, n: int | None, num: int | None, mid: str | None) -> dict:
    params: dict = {"apikey": settings.qq_music_api_key, "type": "json"}
    if mid:
        params["mid"] = mid
    else:
        if msg:
            params["msg"] = msg
        if n is not None:
            params["n"] = n
        if num is not None:
            params["num"] = num
    return params


async def _get(params: dict) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(API_URL, params=params)
    if resp.status_code != 200:
        raise RuntimeError(f"QQ music API {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    # 统一错误: cyapi 返回 {code:403/429,...} 表示失败
    if isinstance(data, dict) and data.get("code") and int(data.get("code")) != 200:
        raise RuntimeError(f"QQ music API error: {data.get('msg') or data.get('code')}")
    return data


async def search_songs(msg: str, num: int = 20) -> list[dict]:
    """搜索歌曲, 返回 [{name, artists, id, cover}, ...]."""
    data = await _get(_params(msg=msg, n=None, num=num, mid=None))
    items = data.get("list") or []
    return [
        {
            "name": it.get("name", ""),
            "artists": it.get("artists", ""),
            "id": it.get("id", ""),
            "cover": it.get("cover", ""),
        }
        for it in items
    ]


async def get_song(msg: str, n: int = 1) -> dict:
    """取第 n 首歌的播放链接 + 详情."""
    data = await _get(_params(msg=msg, n=n, num=None, mid=None))
    return {
        "name": data.get("name", ""),
        "artists": ", ".join(a.get("name", "") for a in (data.get("artists") or [])),
        "album": (data.get("album") or {}).get("name", ""),
        "id": data.get("id", ""),
        "duration": data.get("duration", 0),
        "cover": ((data.get("cover") or {}).get("large")) or data.get("cover", ""),
        "link": data.get("link", ""),
        "url": data.get("url", ""),
    }


async def resolve_by_mid(mid: str) -> dict:
    """按 mid 直接解析歌曲."""
    data = await _get(_params(msg=None, n=None, num=None, mid=mid))
    return {
        "name": data.get("name", ""),
        "artists": ", ".join(a.get("name", "") for a in (data.get("artists") or [])),
        "album": (data.get("album") or {}).get("name", ""),
        "id": data.get("id", ""),
        "duration": data.get("duration", 0),
        "cover": ((data.get("cover") or {}).get("large")) or data.get("cover", ""),
        "link": data.get("link", ""),
        "url": data.get("url", ""),
    }
