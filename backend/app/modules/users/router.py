from fastapi import APIRouter, Request, Response, status

from app.core.config import get_settings
from app.core.dependencies import AuthServiceDep, CurrentUser, DbSession, build_auth_rate_limiter
from app.modules.users.schemas import TelegramAuthInput, TelegramSessionSchema

router = APIRouter(prefix="/auth", tags=["Auth"])


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
    counters = await service.users.counters(issued.user.id)
    await session.commit()

    response.set_cookie(
        key=settings.session_cookie_name,
        value=issued.token,
        max_age=settings.session_ttl,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )
    return TelegramSessionSchema(
        user={
            "id": issued.user.id,
            "telegram_id": issued.user.telegram_id,
            "first_name": issued.user.first_name,
            "last_name": issued.user.last_name,
            "photo_url": issued.user.photo_url,
            "startups_count": counters.startups,
            "vacancies_count": counters.vacancies,
            "applications_count": counters.applications,
        },
        expires_at=issued.expires_at,
    )


@router.get("/me", summary="Текущий пользователь")
async def get_current_user_profile(user: CurrentUser) -> dict[str, object]:
    return {
        "id": user.id,
        "telegramId": user.telegram_id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "photoUrl": user.photo_url,
    }
