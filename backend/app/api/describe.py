from fastapi import APIRouter, HTTPException

from app.models.music import DescribeRequest, DescribeResponse, MusicDescription
from app.services.gemini_text import generate_music_description

router = APIRouter()


@router.post("/generate-description", response_model=DescribeResponse)
async def describe(request: DescribeRequest) -> DescribeResponse:
    """Generate a music description from objects and emotion data."""
    try:
        description = await generate_music_description(request.objects, request.emotion)
        return DescribeResponse(description=MusicDescription(**description))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Description generation failed: {e}") from e
