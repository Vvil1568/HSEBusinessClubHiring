import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.common.exceptions import (
    AuthRequiredException,
    DomainException,
    RateLimitExceededException,
    UnprocessableEntityException,
    UserBlockedException,
)
from app.core.config import Settings, get_settings
from app.core.database import engine
from app.modules.applications.router import router as applications_router
from app.modules.files.router import router as files_router
from app.modules.files.storage import build_storage
from app.modules.profile.router import router as profile_router
from app.modules.startups.router import router as startups_router
from app.modules.users.router import router as auth_router
from app.modules.vacancies.router import router as vacancies_router

logger = logging.getLogger("app")

API_PREFIX = "/api/v1"
LEGACY_API_PREFIX = "/api"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = get_settings()
    app.state.settings = settings
    build_storage(settings)
    from app.core.database import session_factory
    from app.core.seed import seed_vacancy_templates

    async with session_factory() as session:
        await seed_vacancy_templates(session)
        if settings.dev_mode_enabled:
            # Preset identities must exist before the switcher can list them.
            from app.core.dev_users import ensure_dev_presets

            await ensure_dev_presets(session)
            await session.commit()
    yield
    await engine.dispose()


def _error_response(status_code: int, message: str, headers: dict[str, str] | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"message": message}, headers=headers)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainException)
    async def handle_domain(_: Request, exc: DomainException) -> JSONResponse:
        headers: dict[str, str] = {}
        if isinstance(exc, RateLimitExceededException):
            headers["Retry-After"] = str(exc.retry_after)
        return _error_response(exc.status_code, exc.message, headers)

    @app.exception_handler(AuthRequiredException)
    async def handle_auth(_: Request, exc: AuthRequiredException) -> JSONResponse:
        return _error_response(exc.status_code, exc.message)

    @app.exception_handler(UserBlockedException)
    async def handle_blocked(_: Request, exc: UserBlockedException) -> JSONResponse:
        return _error_response(exc.status_code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(422, _validation_message(exc))

    @app.exception_handler(IntegrityError)
    async def handle_integrity(_: Request, exc: IntegrityError) -> JSONResponse:
        logger.warning("database integrity error: %s", exc)
        return _error_response(409, "Конфликт состояния")

    @app.exception_handler(SQLAlchemyError)
    async def handle_database(_: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("database error", exc_info=exc)
        return _error_response(500, "Внутренняя ошибка сервера")

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)
        return _error_response(500, "Внутренняя ошибка сервера")


def _validation_message(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if errors:
        location = ".".join(str(part) for part in errors[0].get("loc", ())[1:])
        detail = str(errors[0].get("msg", "Некорректные данные"))
        return f"Некорректные данные: {location} — {detail}" if location else detail
    return UnprocessableEntityException.default_message


def _register_routes(app: FastAPI, prefix: str) -> None:
    app.include_router(auth_router, prefix=prefix)
    app.include_router(profile_router, prefix=prefix)
    app.include_router(startups_router, prefix=prefix)
    app.include_router(vacancies_router, prefix=prefix)
    app.include_router(applications_router, prefix=prefix)
    app.include_router(files_router, prefix=prefix)


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    application = FastAPI(
        title="Business Club · Hiring Platform API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url=f"{API_PREFIX}/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Retry-After"],
    )
    register_exception_handlers(application)
    _register_routes(application, API_PREFIX)
    _register_routes(application, LEGACY_API_PREFIX)

    @application.get("/health", tags=["Service"], summary="Проверка живости")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()
