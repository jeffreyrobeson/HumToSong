from fastapi import APIRouter, HTTPException

from app.models.objects import IdentifyRequest, IdentifyResponse
from app.services.gemini_vision import identify_objects

router = APIRouter()


@router.post("/identify-objects", response_model=IdentifyResponse)
async def identify(request: IdentifyRequest) -> IdentifyResponse:
    """Identify objects in a photo using Gemini Vision API."""
    try:
        objects = await identify_objects(request.image)
        return IdentifyResponse(objects=objects)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object identification failed: {e}") from e
