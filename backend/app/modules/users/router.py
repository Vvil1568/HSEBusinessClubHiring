from typing import Any

from fastapi import APIRouter, Request, Response, status

from app.common.exceptions import EntityNotFoundException
from app.core.config import Settings, get_settings
from app.core.dependencies import (
    AuthServiceDep,
    CurrentUser,
    DbSession,
    build_auth_rate_limiter,
)
from app.core.dev_users import DEV_USERS, REAL_USER_KEY, dev_init_data_key, get_dev_preset
from app.modules.users.schemas import (
    AppConfigSchema,
    DevLoginInput,
    DevSwitchResultSchema,
    DevUserSchema,
    TelegramAuthInput,
    TelegramSessionSchema,
)
from app.modules.users.service import AuthService, IssuedSession

router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_session_cookie(response: Response, *, settings: Settings, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


async def _session_body(
    service: AuthService,
    issued: IssuedSession,
    response: Response,
    settings: Settings,
) -> dict[str, Any]:
    counters = await service.users.counters(issued.user.id)
    _set_session_cookie(response, settings=settings, token=issued.token)
    user = issued.user
    return {
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "startups_count": counters.startups,
            "vacancies_count": counters.vacancies,
            "applications_count": counters.applications,
        },
        "expires_at": issued.expires_at,
    }


def _dev_user_schemas() -> list[DevUserSchema]:
    return [
        DevUserSchema(
            key=preset.key,
            label=preset.label,
            description=preset.description,
            first_name=preset.first_name,
            last_name=preset.last_name,
            photo_url=preset.photo_url,
            telegram_id=preset.telegram_id,
            available_outside_telegram=preset.available_outside_telegram,
        )
        for preset in DEV_USERS
    ]


@router.get(
    "/app-config",
    response_model=AppConfigSchema,
    summary="Публичная конфигурация приложения",
    description=(
        "Сообщает фронтенду окружение и доступность DEV-переключателя. Не требует авторизации и не раскрывает секретов."
    ),
)
async def get_app_config() -> AppConfigSchema:
    settings = get_settings()
    dev_enabled = settings.dev_mode_enabled
    return AppConfigSchema(
        production=settings.is_production,
        dev_mode=dev_enabled,
        default_dev_user=settings.dev_default_user,
        dev_users=_dev_user_schemas() if dev_enabled else [],
    )


@router.post(
    "/telegram",
    response_model=TelegramSessionSchema,
    status_code=status.HTTP_200_OK,
    summary="Обменять initData на сессию",
)
async def create_telegram_session(
    payload: TelegramAuthInput,
    request: Request,
    response: Response,
    service: AuthServiceDep,
    session: DbSession,
) -> TelegramSessionSchema:
    settings = get_settings()
    client_key = request.client.host if request.client else "unknown"
    await build_auth_rate_limiter(settings).hit(client_key)

    issued = await service.create_session(payload.init_data)
    await session.commit()

    body = await _session_body(service, issued, response, settings)
    return TelegramSessionSchema.model_validate(body)


@router.get("/me", summary="Текущий пользователь")
async def get_current_user_profile(user: CurrentUser) -> dict[str, object]:
    return {
        "id": user.id,
        "telegramId": user.telegram_id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "photoUrl": user.photo_url,
    }


@router.post(
    "/dev-login",
    response_model=DevSwitchResultSchema,
    summary="Переключить тестового пользователя (DEV)",
    description=(
        "Создаёт сессию для выбранного пресета без проверки подписи Telegram. "
        "Для пресета `real` нужен реальный `initData` в заголовке "
        "`X-Telegram-Init-Data`. В строгом режиме возвращает 404."
    ),
)
async def dev_login(
    payload: DevLoginInput,
    request: Request,
    response: Response,
    service: AuthServiceDep,
    session: DbSession,
) -> DevSwitchResultSchema:
    settings = get_settings()
    if not settings.dev_mode_enabled:
        raise EntityNotFoundException()

    preset = get_dev_preset(payload.user)
    if preset is None:
        raise EntityNotFoundException("Тестовый пользователь не найден")

    if preset.key == REAL_USER_KEY:
        init_data = request.headers.get("X-Telegram-Init-Data", "").strip()
        # `real` must prove identity with a genuinely signed payload: a stored
        # `dev:<key>` override would otherwise silently resolve to that preset.
        if not init_data or dev_init_data_key(init_data) is not None:
            raise EntityNotFoundException("Откройте приложение через Telegram")
        issued = await service.create_session(init_data)
    else:
        issued = await service.create_dev_session(preset.key)

    await session.commit()
    body = await _session_body(service, issued, response, settings)
    return DevSwitchResultSchema.model_validate({**body, "dev_user": preset.key})
