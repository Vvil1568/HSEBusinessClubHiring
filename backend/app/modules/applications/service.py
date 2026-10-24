import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import EntityNotFoundException, PermissionDeniedException
from app.common.pagination import PaginationParams
from app.core.config import Settings
from app.modules.applications.models import ApplicationStatus
from app.modules.applications.presenters import application_schema
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import ApplicationPageSchema, ApplicationSchema
from app.modules.startups.repository import StartupAccessRepository
from app.modules.users.models import User


class ApplicationService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._applications = ApplicationRepository(session)
        self._access = StartupAccessRepository(session)

    async def list_mine(self, *, user: User, params: PaginationParams) -> ApplicationPageSchema:
        statement = await self._applications.my_statement(user.id)
        total = await self._applications.count(statement)
        rows = await self._applications.page(statement, offset=params.offset, limit=params.limit)
        return ApplicationPageSchema.build(
            [application_schema(self._settings, row) for row in rows],
            total,
            params,
        )

    async def list_inbox(self, *, user: User, params: PaginationParams) -> ApplicationPageSchema:
        statement = await self._applications.inbox_statement(user.id)
        total = await self._applications.count(statement)
        rows = await self._applications.page(statement, offset=params.offset, limit=params.limit)
        return ApplicationPageSchema.build(
            [application_schema(self._settings, row) for row in rows],
            total,
            params,
        )

    async def change_status(
        self,
        *,
        user: User,
        application_id: uuid.UUID,
        status: ApplicationStatus,
    ) -> ApplicationSchema:
        row = await self._applications.get_row(application_id)
        if row is None:
            raise EntityNotFoundException("Отклик не найден")
        if row.startup.owner_id != user.id:
            raise PermissionDeniedException("Управлять откликом может только владелец стартапа")

        await self._applications.mark_status(
            row.application,
            status=status,
            reviewer_id=user.id,
            moment=datetime.now(UTC),
        )
        await self._session.commit()

        updated = await self._applications.get_row(application_id)
        if updated is None:
            raise EntityNotFoundException("Отклик не найден")
        return application_schema(self._settings, updated)
