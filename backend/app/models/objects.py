from pydantic import BaseModel, Field


class IdentifiedObject(BaseModel):
    id: str = ""
    name: str
    color: str
    material: str = Field(description="One of: wood, metal, glass, ceramic, fabric, plastic, organic")
    size: str = Field(description="One of: small, medium, large")
    musical_quality: str
    confidence: float = Field(ge=0, le=1)


class IdentifyRequest(BaseModel):
    image: str = Field(description="Base64-encoded image data")
    provider_id: str


class IdentifyResponse(BaseModel):
    objects: list[IdentifiedObject]
