from pydantic import BaseModel, Field


class MusicFeatures(BaseModel):
    tempo: int
    tempo_range: list[int] = Field(min_length=2, max_length=2)
    mood: str
    energy: float = Field(ge=0, le=1)
    brightness: float = Field(ge=0, le=1)
    duration: int


class MusicEntry(BaseModel):
    file: str
    features: MusicFeatures
    instruments: list[str]
    material_affinity: list[str]
    tags: list[str]
    description: str


class MusicDescription(BaseModel):
    genre: str
    tempo: int
    key: str = ""
    instruments: list[str] = []
    mood: str
    energy_level: str = ""
    description: str = ""
    matching_tags: list[str] = []


class DescribeRequest(BaseModel):
    objects: list[dict]
    emotion: dict
    provider_id: str


class DescribeResponse(BaseModel):
    description: MusicDescription


class MatchRequest(BaseModel):
    gemini_description: dict
    user_emotion: dict
    user_objects: list[dict]
    provider_id: str


class MatchResponse(BaseModel):
    music_id: str
    audio_url: str
    confidence: float
    reasoning: str
    metadata: dict
    creative_reason: str = ""
    story: str = ""


class MergeLayerInput(BaseModel):
    user_name: str
    objects: list[dict]
    emotion: dict
    gemini_description: dict | None = None


class MergeRequest(BaseModel):
    layers: list[MergeLayerInput]
    provider_id: str


class MergeResponse(BaseModel):
    description: MusicDescription
    blend_story: str = ""
