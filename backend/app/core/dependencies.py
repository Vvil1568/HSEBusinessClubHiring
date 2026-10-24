from typing import Annotated

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import AuthRequiredException
from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.rate_limit import SlidingWindowRateLimiter
from app.modules.applications.service import ApplicationService
from app.modules.files.service import FileService
from app.modules.files.storage import FileStorage, build_storage
from app.modules.profile.service import ProfileService
from app.modules.startups.service import StartupService
from app.modules.users.models import User
from app.modules.users.service import AuthService
from app.modules.vacancies.service import VacancyService

DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_auth_service(session: DbSession, settings: AppSettings) -> AuthService:
    return AuthService(session, settings)


def get_file_service(session: DbSession, settings: AppSettings) -> FileService:
    storage: FileStorage = build_storage(settings)
    return FileService(session, settings, storage)


def get_startup_service(session: DbSession, settings: AppSettings) -> StartupService:
    storage: FileStorage = build_storage(settings)
    return StartupService(session, settings, FileService(session, settings, storage))


def get_vacancy_service(session: DbSession, settings: AppSettings) -> VacancyService:
    storage: FileStorage = build_storage(settings)
    return VacancyService(session, settings, FileService(session, settings, storage))


def get_application_service(session: DbSession, settings: AppSettings) -> ApplicationService:
    return ApplicationService(session, settings)


def get_profile_service(session: DbSession, settings: AppSettings) -> ProfileService:
    return ProfileService(session, settings)


async def get_current_user(
    request: Request,
    session: DbSession,
    settings: AppSettings,
    init_data_header: Annotated[str | None, Header(alias="X-Telegram-Init-Data")] = None,
    session_cookie: Annotated[str | None, Cookie(alias="hb_session")] = None,
) -> User:
    service = AuthService(session, settings)
    cookie_token = session_cookie or request.cookies.get(settings.session_cookie_name)
    user = await service.resolve_identity(cookie_token=cookie_token, init_data=init_data_header)
    if user is None:
        raise AuthRequiredException()
    await session.commit()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def resolve_optional_user(
    request: Request,
    session: AsyncSession,
    settings: Settings,
    init_data_header: str | None,
    session_cookie: str | None,
) -> User | None:
    """Best-effort resolution used by endpoints that tolerate anonymous callers."""
    service = AuthService(session, settings)
    cookie_token = session_cookie or request.cookies.get(settings.session_cookie_name)
    user = await service.resolve_identity(cookie_token=cookie_token, init_data=init_data_header)
    if user is None:
        return None
    await session.commit()
    return user


def build_auth_rate_limiter(settings: Settings) -> SlidingWindowRateLimiter:
    return SlidingWindowRateLimiter(
        max_events=settings.auth_rate_limit_attempts,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )


def build_view_rate_limiter(settings: Settings) -> SlidingWindowRateLimiter:
    return SlidingWindowRateLimiter(
        max_events=settings.view_rate_limit_attempts,
        window_seconds=settings.view_rate_limit_window_seconds,
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
FileServiceDep = Annotated[FileService, Depends(get_file_service)]
StartupServiceDep = Annotated[StartupService, Depends(get_startup_service)]
VacancyServiceDep = Annotated[VacancyService, Depends(get_vacancy_service)]
ApplicationServiceDep = Annotated[ApplicationService, Depends(get_application_service)]
ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]
