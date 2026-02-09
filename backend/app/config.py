from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    music_base_url: str = "http://localhost:5173/music"
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "env_nested_delimiter": "__"}


settings = Settings()
