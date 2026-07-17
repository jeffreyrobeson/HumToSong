from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api import admin, describe, identify, match
from app.config import settings
from app.services import admin as admin_service
from app.services import db

app = FastAPI(title="LLL API", version="0.1.0", description="Life Live Loop - AI Music Creation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(identify.router, prefix="/api", tags=["identify"])
app.include_router(describe.router, prefix="/api", tags=["describe"])
app.include_router(match.router, prefix="/api", tags=["match"])

# 首次启动建供应商/key 表, 并把 .env 的明文管理密码迁移进 DB
db.init_db()
admin_service.seed_admin_password_from_env()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# Serve static frontend in production (when static/ directory exists)
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=_static_dir / "assets"), name="assets")
    app.mount("/music", StaticFiles(directory=_static_dir / "music"), name="music")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str) -> FileResponse:
        file_path = _static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_static_dir / "index.html")
