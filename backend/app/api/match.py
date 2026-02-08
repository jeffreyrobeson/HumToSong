from fastapi import APIRouter, HTTPException

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
    merge_layers_smart,
    rerank_matches,
)
from app.services.music_matcher import MusicMatcher

router = APIRouter()


@router.post("/match-music", response_model=MatchResponse)
async def match_music(request: MatchRequest) -> MatchResponse:
    """Match music using algorithmic scoring + Gemini re-ranking + story generation."""
    try:
        matcher = MusicMatcher()

        # Step 1: Algorithmic top-3
        top3 = matcher.get_top_n(
            gemini_description=request.gemini_description,
            user_emotion=request.user_emotion,
            user_objects=request.user_objects,
            n=3,
        )

        # Step 2: Gemini re-rank — pick the most creatively resonant
        best = await rerank_matches(
            candidates=top3,
            objects=request.user_objects,
            emotion=request.user_emotion,
            gemini_description=request.gemini_description,
        )

        # Step 3: Generate poetic story
        story = await generate_music_story(
            objects=request.user_objects,
            emotion=request.user_emotion,
            music_description=request.gemini_description,
            match_metadata=best["metadata"],
        )

        audio_url = f"{settings.music_base_url}/{best['file']}"
        return MatchResponse(
            music_id=best["music_id"],
            audio_url=audio_url,
            confidence=best["confidence"],
            reasoning=best["reasoning"],
            creative_reason=best.get("creative_reason", ""),
            story=story,
            metadata=best["metadata"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Music matching failed: {e}") from e


@router.post("/merge-layers", response_model=MergeResponse)
async def merge_layers(request: MergeRequest) -> MergeResponse:
    """Use Gemini to intelligently merge collaboration layers."""
    try:
        layer_dicts = [layer.model_dump() for layer in request.layers]
        result = await merge_layers_smart(layer_dicts)

        blend_story = result.pop("blend_story", "")
        description = MusicDescription(**result)
        return MergeResponse(description=description, blend_story=blend_story)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer merge failed: {e}") from e
