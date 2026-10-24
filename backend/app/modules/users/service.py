from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import (
    InvalidTelegramDataException,
    UserBlockedException,
)
from app.core.config import Settings
from app.core.security import (
    VerifiedInitData,
    generate_session_token,
    hash_session_token,
    init_data_fingerprint,
    utc_now,
    verify_init_data,
)
from app.modules.users.models import User
from app.modules.users.repository import SessionRepository, TelegramNonceRepository, UserRepository


@dataclass(frozen=True, slots=True)
class IssuedSession:
    user: User
    token: str
    expires_at: datetime


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._users = UserRepository(session)
        self._sessions = SessionRepository(session)
        self._nonces = TelegramNonceRepository(session)

    @property
    def users(self) -> UserRepository:
        return self._users

    @property
    def session(self) -> AsyncSession:
        return self._session

    async def create_session(self, init_data: str) -> IssuedSession:
        verified = self._verify(init_data)
        fingerprint = init_data_fingerprint(init_data)
        now = utc_now()

        consumed = await self._nonces.consume(
            fingerprint=fingerprint,
            telegram_id=verified.user.telegram_id,
            auth_date=verified.auth_date,
            consumed_at=now,
        )
        if not consumed:
            raise InvalidTelegramDataException("Сессия Telegram истекла, откройте приложение заново")

        user = await self._upsert_user(verified)
        return await self._issue(user, now)

    async def resolve_session_cookie(self, token: str) -> User | None:
        if not token:
            return None
        now = utc_now()
        entity = await self._sessions.get_active(hash_session_token(token), now)
        if entity is None:
            return None
        user = await self._users.get_by_id(entity.user_id)
        if user is None:
            return None
        if not user.is_active:
            raise UserBlockedException()
        await self._sessions.touch(entity, now)
        return user

    async def resolve_init_data_header(self, init_data: str) -> User:
        verified = self._verify(init_data)
        user = await self._upsert_user(verified)
        return user

    async def revoke_session(self, token: str) -> None:
        if not token:
            return
        now = utc_now()
        entity = await self._sessions.get_active(hash_session_token(token), now)
        if entity is None:
            return
        entity.revoked_at = now
        await self._session.flush()

    async def _issue(self, user: User, now: datetime) -> IssuedSession:
        token = generate_session_token()
        expires_at = now + timedelta(seconds=self._settings.session_ttl)
        await self._sessions.create(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=expires_at,
        )
        return IssuedSession(user=user, token=token, expires_at=expires_at)

    async def _upsert_user(self, verified: VerifiedInitData) -> User:
        user = await self._users.upsert_telegram_user(
            telegram_id=verified.user.telegram_id,
            first_name=verified.user.first_name,
            last_name=verified.user.last_name,
            username=verified.user.username,
            photo_url=verified.user.photo_url,
        )
        if not user.is_active:
            raise UserBlockedException()
        return user

    def _verify(self, init_data: str) -> VerifiedInitData:
        return verify_init_data(
            init_data,
            bot_token=self._settings.telegram_bot_token,
            max_age_seconds=self._settings.init_data_max_age,
        )


def normalize_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


__all__ = ["AuthService", "IssuedSession", "normalize_datetime"]
