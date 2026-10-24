import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Executable, and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.applications.models import Application
from app.modules.startups.models import Startup
from app.modules.users.models import Session, TelegramAuthNonce, User
from app.modules.vacancies.models import Vacancy


@dataclass(frozen=True, slots=True)
class UserCounters:
    startups: int
    vacancies: int
    applications: int


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self._session.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalar_one_or_none()

    async def upsert_telegram_user(
        self,
        *,
        telegram_id: int,
        first_name: str,
        last_name: str,
        username: str | None,
        photo_url: str | None,
    ) -> User:
        user = await self.get_by_telegram_id(telegram_id)
        if user is None:
            user = User(
                telegram_id=telegram_id,
                first_name=first_name,
                last_name=last_name,
                telegram_username=username,
                photo_url=photo_url,
                is_active=True,
            )
            self._session.add(user)
            await self._session.flush()
            return user

        user.first_name = first_name
        user.last_name = last_name
        user.telegram_username = username
        user.photo_url = photo_url
        await self._session.flush()
        return user

    async def counters(self, user_id: uuid.UUID) -> UserCounters:
        startups_total = await self._scalar(
            select(func.count()).select_from(Startup).where(Startup.owner_id == user_id)
        )
        vacancies_total = await self._scalar(
            select(func.count())
            .select_from(Vacancy)
            .join(Startup, Startup.id == Vacancy.startup_id)
            .where(Startup.owner_id == user_id)
        )
        applications_total = await self._scalar(
            select(func.count()).select_from(Application).where(Application.applicant_id == user_id)
        )
        return UserCounters(
            startups=startups_total,
            vacancies=vacancies_total,
            applications=applications_total,
        )

    async def _scalar(self, statement: Executable) -> int:
        result = await self._session.execute(statement)
        return int(result.scalar_one())


class SessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: bytes,
        expires_at: datetime,
    ) -> Session:
        entity = Session(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self._session.add(entity)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            raise
        return entity

    async def get_active(self, token_hash: bytes, now: datetime) -> Session | None:
        result = await self._session.execute(
            select(Session).where(
                and_(
                    Session.token_hash == token_hash,
                    Session.revoked_at.is_(None),
                    Session.expires_at > now,
                )
            )
        )
        return result.scalar_one_or_none()

    async def touch(self, entity: Session, now: datetime) -> None:
        entity.last_used_at = now
        await self._session.flush()


class TelegramNonceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def consume(
        self,
        *,
        fingerprint: str,
        telegram_id: int,
        auth_date: datetime,
        consumed_at: datetime,
    ) -> bool:
        existing = await self._session.get(TelegramAuthNonce, fingerprint)
        if existing is not None:
            return False

        self._session.add(
            TelegramAuthNonce(
                hash=fingerprint,
                telegram_id=telegram_id,
                auth_date=auth_date,
                consumed_at=consumed_at,
            )
        )
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            return False
        return True
