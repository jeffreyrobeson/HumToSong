from pathlib import Path

from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    gemini_api_key: str = ""
    # Gemini 模型名, 可在 .env 用 MODEL= 覆盖.免费档不同模型配额分开计,
    # gemini-2.5-flash 打满时可改 gemini-2.0-flash / gemini-2.0-flash-lite 等绕开.
    model: str = "gemini-2.5-flash"
    music_base_url: str = "http://localhost:5173/music"
    allowed_origins: list[str] = ["http://localhost:5173"]
    # 管理后台: 登录密码 (空则管理后台禁用) 与 session cookie 签名密钥.
    admin_password: str = ""
    admin_session_secret: str = "change-me-in-prod"
    # QQ 音乐点歌 API (cyapi.top)
    qq_music_api_key: str = ""
    # Meting 备用方案: 本机 node 微服务 (meting_service.mjs). QQ 拿不到直链时回退网易源.
    meting_base_url: str = "http://127.0.0.1:9109"
    meting_enabled: bool = True

    model_config = {"env_file": str(_env_path), "env_file_encoding": "utf-8", "env_nested_delimiter": "__"}


settings = Settings()
