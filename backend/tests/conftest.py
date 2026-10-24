import hashlib
import hmac
import json
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlencode

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import models as _models  # noqa: F401  (registers metadata)
from app.core.config import Settings, get_settings
from app.core.database import Base, get_db
from app.core.seed import seed_vacancy_templates
from app.main import create_app

TEST_BOT_TOKEN = "111111:test-bot-token"


def build_init_data(
    *,
    telegram_id: int,
    first_name: str = "Анна",
    last_name: str = "Смирнова",
    username: str = "anna",
    photo_url: str | None = None,
    auth_date: int | None = None,
    bot_token: str = TEST_BOT_TOKEN,
) -> str:
    fields = {
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "query_id": f"AAH{telegram_id}{int(time.time() * 1000)}",
        "user": json.dumps(
            {
                "id": telegram_id,
                "first_name": first_name,
                "last_name": last_name,
                "username": username,
                **({"photo_url": photo_url} if photo_url else {}),
            },
            ensure_ascii=False,
        ),
    }
    check_string = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    signature = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    return f"{urlencode(fields)}&hash={signature}"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        app_env="test",
        database_url="sqlite+aiosqlite:///:memory:",
        telegram_bot_token=TEST_BOT_TOKEN,
        init_data_max_age=86400,
        session_ttl=86400,
        session_secret="test-secret",
        public_base_url="http://testserver",
        files_public_prefix="/api/v1/files",
        cors_allowed_origins="http://localhost:5173",
        storage_backend="local",
        local_storage_path=str(tmp_path / "uploads"),
        storage_budget_bytes=10 * 1024 * 1024,
    )


@pytest.fixture
async def session_factory(
    settings: Settings,
) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)
    async with maker() as session:
        await seed_vacancy_templates(session)
    yield maker
    await engine.dispose()


@pytest.fixture
async def client(
    settings: Settings,
    session_factory: async_sessionmaker[AsyncSession],
    monkeypatch: pytest.MonkeyPatch,
) -> AsyncIterator[AsyncClient]:
    monkeypatch.setattr("app.core.dependencies.get_settings", lambda: settings)
    monkeypatch.setattr("app.modules.users.router.get_settings", lambda: settings)
    monkeypatch.setattr("app.modules.vacancies.router.get_settings", lambda: settings)
    monkeypatch.setattr("app.modules.files.router.get_settings", lambda: settings)

    application = create_app(settings)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[get_settings] = lambda: settings

    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        http_client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=279058397)
        yield http_client


@pytest.fixture
def make_init_data() -> "object":
    return build_init_data


def utc_now() -> datetime:
    return datetime.now(UTC)
