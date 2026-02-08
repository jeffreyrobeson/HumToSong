from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import describe, identify, match
from app.config import settings

app = FastAPI(title="LLL API", version="0.1.0", description="Life Live Loop - AI Music Creation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identify.router, prefix="/api", tags=["identify"])
app.include_router(describe.router, prefix="/api", tags=["describe"])
app.include_router(match.router, prefix="/api", tags=["match"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
