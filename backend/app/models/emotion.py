from pydantic import BaseModel, Field


class EmotionData(BaseModel):
    emotion: str = Field(description="calm, focused, excited, anxious, melancholic, contemplative, neutral")
    tempo: int = Field(ge=40, le=220)
    regularity: float = Field(ge=0, le=1)
    energy: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
