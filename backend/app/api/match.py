from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.config import settings
from app.models.music import (
    MatchRequest,
    MatchResponse,
    MergeRequest,
    MergeResponse,
    MusicDescription,
)
from app.services.gemini_text import (
    generate_music_story,
    generate_search_query,
    merge_layers_smart,
    rerank_matches,
)
from app.services.music_matcher import MusicMatcher
from app.services import meting_client, qq_music

router = APIRouter()


def _to_item(music_id: str, data: dict) -> dict:
    """把 music_library.json 的一条记录转成对外的 item 结构."""
    return {
        "music_id": music_id,
        "file": data["file"],
        "audio_url": f"{settings.music_base_url}/{data['file']}",
        "features": data["features"],
        "mood": data["features"]["mood"],
        "instruments": data["instruments"],
        "tags": data["tags"],
        "description": data["description"],
    }


@router.get("/music-library")
async def list_music_library() -> dict:
    """列出全部音乐库."""
    matcher = MusicMatcher()
    items = [_to_item(mid, data) for mid, data in matcher.library.items()]
    return {"count": len(items), "items": items}


@router.get("/music/{music_id}")
async def get_music(music_id: str) -> dict:
    """按 music_id 取单首音乐.找不到返回 404."""
    matcher = MusicMatcher()
    data = matcher.library.get(music_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"music not found: {music_id}")
    return _to_item(music_id, data)


@router.get("/music")
async def list_music_filtered(mood: str | None = None, tag: str | None = None, q: str | None = None) -> dict:
    """按 mood / tag / 关键词筛选音乐.参数全部可选, AND 关系."""
    matcher = MusicMatcher()
    items: list[dict] = []
    for music_id, data in matcher.library.items():
        if mood and data["features"]["mood"] != mood:
            continue
        if tag and tag.lower() not in {t.lower() for t in data["tags"]}:
            continue
        if q and q.lower() not in (data["description"] + " " + music_id).lower():
            continue
        items.append(_to_item(music_id, data))
    return {"count": len(items), "items": items}


@router.post("/match-music", response_model=MatchResponse)
async def match_music(request: MatchRequest) -> MatchResponse:
    """生成音乐描述 → AI 产出搜索词 → 调 QQ 音乐取播放链接."""
    try:
        # Step 1: AI 浓缩成适合 QQ 音乐搜索的中文关键词
        query = await generate_search_query(
            objects=request.user_objects,
            emotion=request.user_emotion,
            music_description=request.gemini_description,
            provider_id=request.provider_id,
        )

        # Step 2: 调 QQ 音乐取第 1 首的播放链接; 失败/无 url 时回退 Meting (网易源) 兜底
        song: dict = {}
        source = "qq"
        try:
            song = await qq_music.get_song(msg=query, n=1)
            if not song.get("url"):
                raise RuntimeError("qq music returned no playable url")
        except Exception as qq_err:
            song = {}
            if settings.meting_enabled:
                try:
                    song = await meting_client.get_song(query)
                    source = "netease-fallback"
                except Exception as meting_err:
                    raise RuntimeError(
                        f"qq music failed ({qq_err}); meting fallback also failed ({meting_err})"
                    ) from meting_err
            else:
                raise RuntimeError(f"qq music failed ({qq_err})") from qq_err

        # Step 3: 生成诗意故事 (用 QQ 歌曲元数据作为 match_metadata)
        match_metadata = {
            "name": song["name"],
            "artists": song["artists"],
            "album": song["album"],
            "duration": song["duration"],
            "cover": song["cover"],
            "query": query,
            "source": source,
        }
        story = await generate_music_story(
            objects=request.user_objects,
            emotion=request.user_emotion,
            music_description=request.gemini_description,
            match_metadata=match_metadata,
            provider_id=request.provider_id,
        )

        return MatchResponse(
            music_id=song["id"] or f"qq_{query}",
            audio_url=f"/api/proxy-audio?url={_encode(song['url'])}",
            confidence=1.0,
            reasoning=f"搜索词: {query} | 匹配: {song['name']} - {song['artists']}",
            creative_reason=f"根据你的物体与情绪, 用「{query}」在 QQ 音乐为你点了一首「{song['name']}」.",
            story=story,
            metadata=match_metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Music matching failed: {e}") from e


import base64
import typing
import urllib.parse

import httpx

# 仅允许代理 QQ 音乐 / 网易音乐(Meting 备用方案)相关域名, 防止被滥用为开放代理
_ALLOWED_PROXY_HOSTS = (
    "isure6.stream.qqmusic.qq.com",
    "isure.stream.qqmusic.qq.com",
    "stream.qqmusic.qq.com",
    ".music.126.net",  # Meting 备用方案: 网易 CDN (m701/m801.music.126.net ...)
)
_PROXY_TIMEOUT = 60.0


def _encode(url: str) -> str:
    """把上游音频 url 编码进查询参数."""
    return urllib.parse.quote(base64.b64encode(url.encode()).decode())


def _decode(token: str) -> str:
    return base64.urlsafe_b64decode(token.encode()).decode()


@router.get("/proxy-audio")
async def proxy_audio(url: str, request: Request) -> StreamingResponse:
    """流式代理 QQ 音乐 CDN 直链, 让前端 <audio> 同源播放, 绕开浏览器跨域/防盗链."""
    try:
        upstream = _decode(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"bad url token: {e}") from e

    parsed = urllib.parse.urlparse(upstream)
    if not any(parsed.hostname and parsed.hostname.endswith(h) for h in _ALLOWED_PROXY_HOSTS):
        raise HTTPException(status_code=403, detail="host not allowed")

    # 透传 Range 头支持 seek; 伪造 Referer 防盗链
    fwd_headers = {}
    if "range" in request.headers:
        fwd_headers["Range"] = request.headers["range"]
    fwd_headers["Referer"] = "https://y.qq.com/"
    fwd_headers["User-Agent"] = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"

    async def stream() -> typing.AsyncIterator[bytes]:
        async with httpx.AsyncClient(timeout=_PROXY_TIMEOUT, follow_redirects=True) as client:
            async with client.stream("GET", upstream, headers=fwd_headers) as upstream_resp:
                async for chunk in upstream_resp.aiter_raw():
                    yield chunk

    upstream_resp_headers = {"Accept-Ranges": "bytes"}
    # 透传 Content-Range / Content-Length 用于 seek
    return StreamingResponse(
        stream(),
        media_type="audio/mp4",
        headers=upstream_resp_headers,
    )


@router.get("/playable-url")
async def playable_url(mid: str) -> dict:
    """按 QQ 歌曲 mid 实时取新鲜播放链接 (vkey 有时效, 不能长期缓存).

    返回 {audio_url, name, artists} ——audio_url 是走 /proxy-audio 的同源链,
    前端直接给 <audio>.src 即可。解析失败抛 500。
    """
    try:
        song = await qq_music.resolve_by_mid(mid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"resolve mid failed: {e}") from e
    if not song.get("url"):
        raise HTTPException(status_code=500, detail=f"no playable url for mid: {mid}")
    return {
        "audio_url": f"/api/proxy-audio?url={_encode(song['url'])}",
        "name": song.get("name", ""),
        "artists": song.get("artists", ""),
    }


@router.post("/merge-layers", response_model=MergeResponse)
async def merge_layers(request: MergeRequest) -> MergeResponse:
    """Intelligently merge collaboration layers via the configured OpenAI-compatible provider."""
    try:
        layer_dicts = [layer.model_dump() for layer in request.layers]
        result = await merge_layers_smart(layer_dicts, request.provider_id)

        blend_story = result.pop("blend_story", "")
        description = MusicDescription(**result)
        return MergeResponse(description=description, blend_story=blend_story)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer merge failed: {e}") from e
