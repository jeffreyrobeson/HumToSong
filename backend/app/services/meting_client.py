"""Meting 备用方案客户端:调本机常驻的 node 微服务 (meting_service.mjs).

当主方案 QQ 音乐 (cyapi) 拿不到可播直链时, backend 调本模块兜底:
微服务走网易源, 搜索并返回第一个能拿到真实可播 mp3 直链的曲目.

返回结构与 qq_music.get_song 对齐, 供 match_music 下游 (match_metadata / story /
MatchResponse / proxy-audio) 无缝复用, 不需改前端.
"""

import httpx

from app.config import settings

TIMEOUT = 30.0


async def get_song(query: str, limit: int = 10) -> dict:
    """按关键词取首个可播曲目, 返回与 qq_music.get_song 同形 dict.

    微服务返回 {name, artist, id, url, source}; 这里补齐 album/duration/cover/link 为空,
    保持下游消费一致. 失败 (微服务不可达 / 返回 error / 无 url) 抛 RuntimeError.
    """
    url = f"{settings.meting_base_url}/search-url"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, params={"q": query, "limit": limit})
    if resp.status_code != 200:
        raise RuntimeError(f"meting service {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    if data.get("error") or not data.get("url"):
        raise RuntimeError(f"meting: {data.get('error', 'no playable url')}")
    # 对齐 qq_music.get_song 的字段形状
    return {
        "name": data.get("name", ""),
        "artists": data.get("artist", ""),
        "album": "",
        "id": data.get("id", ""),
        "duration": 0,
        "cover": "",
        "link": "",
        "url": data["url"],
    }
