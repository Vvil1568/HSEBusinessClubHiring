import uuid
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/businessclub"

    cors_allowed_origins: str = "http://localhost:5173"

    telegram_bot_token: str = ""
    init_data_max_age: int = 86400
    session_ttl: int = 86400
    session_secret: str = "dev-only-insecure-secret"
    session_cookie_name: str = "hb_session"

    public_base_url: str = "http://localhost:3000"
    files_public_prefix: str = "/api/v1/files"

    storage_backend: str = "local"
    local_storage_path: str = "./data/uploads"
    dufs_base_url: str = "http://dufs:5000"
    dufs_auth: str = ""
    storage_budget_bytes: int = 512 * 1024 * 1024
    max_logo_bytes: int = 2 * 1024 * 1024
    max_attachment_bytes: int = 10 * 1024 * 1024
    max_attachments_per_application: int = 5

    auth_rate_limit_attempts: int = 30
    auth_rate_limit_window_seconds: int = 60
    view_rate_limit_attempts: int = 120
    view_rate_limit_window_seconds: int = 60

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def dufs_credentials(self) -> tuple[str, str] | None:
        username, separator, password = self.dufs_auth.partition(":")
        if not separator or not username:
            return None
        return username, password

    def file_url(self, file_id: uuid.UUID) -> str:
        return f"{self.files_public_prefix.rstrip('/')}/{file_id}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
