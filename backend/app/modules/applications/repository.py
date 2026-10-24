import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import Select, func, select
from sqlalchemy.engine import Row
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.applications.models import Application, ApplicationFile, ApplicationStatus
from app.modules.startups.models import Startup
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy


@dataclass(frozen=True, slots=True)
class ApplicationRow:
    application: Application
    vacancy: Vacancy
    startup: Startup


ApplicationStatement = Select[Application, Vacancy, Startup]
ApplicationRecord = Row[Application, Vacancy, Startup]


class ApplicationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _base_statement(self) -> ApplicationStatement:
        statement = select(Application, Vacancy, Startup)
        statement = statement.join(Vacancy, Vacancy.id == Application.vacancy_id)
        statement = statement.join(Startup, Startup.id == Vacancy.startup_id)
        return statement.options(
            joinedload(Application.applicant),
            selectinload(Application.attachments).joinedload(ApplicationFile.file),
            joinedload(Startup.logo),
        )

    @staticmethod
    def _to_row(row: ApplicationRecord) -> ApplicationRow:
        return ApplicationRow(application=row[0], vacancy=row[1], startup=row[2])

    async def page(
        self,
        statement: ApplicationStatement,
        *,
        offset: int,
        limit: int,
    ) -> list[ApplicationRow]:
        result = await self._session.execute(statement.offset(offset).limit(limit))
        return [self._to_row(row) for row in result.unique().all()]

    async def all(self, statement: ApplicationStatement) -> list[ApplicationRow]:
        result = await self._session.execute(statement)
        return [self._to_row(row) for row in result.unique().all()]

    async def count(self, statement: ApplicationStatement) -> int:
        subquery = statement.order_by(None).with_only_columns(Application.id).subquery()
        total = await self._session.execute(select(func.count()).select_from(subquery))
        return int(total.scalar_one())

    async def get_row(self, application_id: uuid.UUID) -> ApplicationRow | None:
        rows = await self.all(self._base_statement().where(Application.id == application_id))
        return rows[0] if rows else None

    async def get(self, application_id: uuid.UUID) -> Application | None:
        result = await self._session.execute(
            select(Application)
            .where(Application.id == application_id)
            .options(
                joinedload(Application.applicant),
                selectinload(Application.attachments).joinedload(ApplicationFile.file),
            )
        )
        return result.unique().scalar_one_or_none()

    async def find_by_applicant(self, vacancy_id: uuid.UUID, applicant_id: uuid.UUID) -> Application | None:
        result = await self._session.execute(
            select(Application).where(
                Application.vacancy_id == vacancy_id,
                Application.applicant_id == applicant_id,
            )
        )
        return result.scalar_one_or_none()

    async def add(
        self,
        *,
        vacancy_id: uuid.UUID,
        applicant_id: uuid.UUID,
        motivation: str,
        moment: datetime,
        file_ids: list[uuid.UUID],
    ) -> Application:
        entity = Application(
            vacancy_id=vacancy_id,
            applicant_id=applicant_id,
            motivation=motivation,
            status=ApplicationStatus.PENDING,
            status_changed_at=moment,
        )
        entity.attachments = [
            ApplicationFile(file_id=file_id, sort_order=index) for index, file_id in enumerate(file_ids)
        ]
        self._session.add(entity)
        try:
            await self._session.flush()
        except IntegrityError as error:
            await self._session.rollback()
            raise error
        return entity

    async def mark_status(
        self,
        entity: Application,
        *,
        status: ApplicationStatus,
        reviewer_id: uuid.UUID,
        moment: datetime,
    ) -> None:
        entity.status = status
        entity.reviewed_by_id = reviewer_id
        entity.status_changed_at = moment
        await self._session.flush()

    async def my_statement(self, applicant_id: uuid.UUID) -> ApplicationStatement:
        return (
            self._base_statement()
            .where(Application.applicant_id == applicant_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )

    async def inbox_statement(self, owner_id: uuid.UUID) -> ApplicationStatement:
        return (
            self._base_statement()
            .where(Startup.owner_id == owner_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )

    async def for_vacancy(self, vacancy_id: uuid.UUID) -> list[ApplicationRow]:
        statement = (
            self._base_statement()
            .where(Application.vacancy_id == vacancy_id)
            .order_by(Application.created_at.desc(), Application.id.desc())
        )
        return await self.all(statement)

    async def applicant_status(self, vacancy_id: uuid.UUID, applicant_id: uuid.UUID) -> ApplicationStatus | None:
        result = await self._session.execute(
            select(Application.status).where(
                Application.vacancy_id == vacancy_id,
                Application.applicant_id == applicant_id,
            )
        )
        return result.scalar_one_or_none()

    async def counts_by_vacancy(self, vacancy_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not vacancy_ids:
            return {}
        result = await self._session.execute(
            select(Application.vacancy_id, func.count(Application.id))
            .where(Application.vacancy_id.in_(vacancy_ids))
            .group_by(Application.vacancy_id)
        )
        return {row[0]: int(row[1]) for row in result.all()}

    async def applicant_for(self, application_id: uuid.UUID) -> User | None:
        result = await self._session.execute(
            select(User).join(Application, Application.applicant_id == User.id).where(Application.id == application_id)
        )
        return result.scalar_one_or_none()
