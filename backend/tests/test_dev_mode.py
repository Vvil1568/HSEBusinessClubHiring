"""DEV-mode contract: relaxed identity in development, strict rules everywhere else."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import models as _models  # noqa: F401  (registers metadata)
from app.core.config import Settings, get_settings
from app.core.database import Base, get_db
from app.main import create_app
from tests.conftest import build_init_data

TEST_BOT_TOKEN = "111111:test-bot-token"


def _dev_settings(*, app_env: str = "development", dev_mode: bool = True) -> Settings:
    return Settings(
        app_env=app_env,
        dev_mode=dev_mode,
        dev_default_user="founder",
        database_url="sqlite+aiosqlite:///:memory:",
        telegram_bot_token=TEST_BOT_TOKEN,
        init_data_max_age=86400,
        session_ttl=86400,
        session_secret="test-secret",
        public_base_url="http://testserver",
        files_public_prefix="/api/v1/files",
        cors_allowed_origins="http://localhost:5173",
        storage_backend="local",
        local_storage_path=":memory:",
    )


async def _make_client(settings: Settings) -> AsyncIterator[AsyncClient]:
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)

    application = create_app(settings)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with maker() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    application.dependency_overrides[get_db] = override_get_db
    # `AppSettings` binds the original `get_settings` object, so patching the
    # module attribute is not enough: the override must key off that object.
    application.dependency_overrides[get_settings] = lambda: settings

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr("app.modules.users.router.get_settings", lambda: settings)
        async with AsyncClient(transport=ASGITransport(app=application), base_url="http://testserver") as http_client:
            yield http_client

    await engine.dispose()


@pytest.fixture
async def dev_client() -> AsyncIterator[AsyncClient]:
    async for client in _make_client(_dev_settings()):
        yield client


async def _post_dev_login(client: AsyncClient, key: str, **headers: str) -> Response:
    return await client.post("/api/v1/auth/dev-login", json={"user": key}, headers=headers)


async def test_app_config_reports_dev_users(dev_client: AsyncClient) -> None:
    response = await dev_client.get("/api/v1/auth/app-config")
    assert response.status_code == 200
    body = response.json()
    assert body["devMode"] is True
    assert body["production"] is False
    keys = [item["key"] for item in body["devUsers"]]
    assert keys == ["founder", "applicant", "empty", "real"]
    real = next(item for item in body["devUsers"] if item["key"] == "real")
    assert real["availableOutsideTelegram"] is False


async def test_dev_login_switches_identity(dev_client: AsyncClient) -> None:
    founder = await _post_dev_login(dev_client, "founder")
    assert founder.status_code == 200
    founder_body = founder.json()
    assert founder_body["user"]["firstName"] == "Иван"
    assert founder_body["user"]["startupsCount"] == 1
    assert founder_body["devUser"] == "founder"

    applicant = await _post_dev_login(dev_client, "applicant")
    assert applicant.status_code == 200
    applicant_body = applicant.json()
    assert applicant_body["user"]["firstName"] == "Анна"
    assert applicant_body["user"]["startupsCount"] == 0
    # The founder seeded two applications for the applicant.
    assert applicant_body["user"]["applicationsCount"] == 2

    empty = await _post_dev_login(dev_client, "empty")
    assert empty.status_code == 200
    assert empty.json()["user"]["startupsCount"] == 0
    assert empty.json()["user"]["applicationsCount"] == 0


async def test_dev_session_survives_without_init_data(dev_client: AsyncClient) -> None:
    await _post_dev_login(dev_client, "founder")
    response = await dev_client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["firstName"] == "Иван"


async def test_dev_mode_resolves_default_user_without_session(dev_client: AsyncClient) -> None:
    # No cookie and no initData: DEV mode resolves the default preset instead
    # of returning 401.
    fresh = AsyncClient(transport=dev_client._transport, base_url="http://testserver")
    async with fresh as anonymous:
        response = await anonymous.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["firstName"] == "Иван"


async def test_dev_login_rejects_unknown_preset(dev_client: AsyncClient) -> None:
    response = await _post_dev_login(dev_client, "nobody")
    assert response.status_code == 404


async def test_real_preset_requires_init_data(dev_client: AsyncClient) -> None:
    response = await _post_dev_login(dev_client, "real")
    assert response.status_code == 404


async def test_real_preset_rejects_synthetic_override(dev_client: AsyncClient) -> None:
    # A stale `dev:founder` override in the header must never stand in for the
    # signed payload behind the `real` preset.
    response = await _post_dev_login(dev_client, "real", **{"X-Telegram-Init-Data": "dev:founder"})
    assert response.status_code == 404


async def test_real_preset_accepts_verified_init_data(dev_client: AsyncClient) -> None:
    init_data = build_init_data(telegram_id=555000111, first_name="Реальный", last_name="Юзер")
    response = await _post_dev_login(dev_client, "real", **{"X-Telegram-Init-Data": init_data})
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["firstName"] == "Реальный"
    assert body["devUser"] == "real"


async def test_strict_mode_rejects_dev_identities_and_hides_endpoints(
    client: AsyncClient,
) -> None:
    config = await client.get("/api/v1/auth/app-config")
    assert config.status_code == 200
    assert config.json()["devMode"] is False
    assert config.json()["devUsers"] == []

    login = await _post_dev_login(client, "founder")
    assert login.status_code == 404

    # A synthetic payload must not pass the strict HMAC check.
    synthetic = await client.post("/api/v1/auth/telegram", json={"initData": "dev:founder"})
    assert synthetic.status_code == 401


def test_production_env_force_disables_dev_mode() -> None:
    production = _dev_settings(app_env="production")
    assert production.is_production is True
    assert production.dev_mode_enabled is False


async def test_production_client_reports_no_dev_surface() -> None:
    async for http_client in _make_client(_dev_settings(app_env="production")):
        config = await http_client.get("/api/v1/auth/app-config")
        assert config.status_code == 200
        assert config.json()["production"] is True
        assert config.json()["devMode"] is False
        assert config.json()["devUsers"] == []

        login = await _post_dev_login(http_client, "founder")
        assert login.status_code == 404
