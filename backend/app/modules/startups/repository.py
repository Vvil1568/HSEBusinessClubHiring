import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import ColumnElement, Select, and_, func, or_, select
from sqlalchemy.engine import Row
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.sql.selectable import ScalarSelect

from app.modules.applications.models import Application
from app.modules.startups.models import Startup, StartupStage
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy, VacancyView


@dataclass(frozen=True, slots=True)
class StartupAggregateRow:
    startup: Startup
    owner: User
    vacancies_count: int
    applications_count: int
    views_count: int


AggregateStatement = Select[Startup, User, int, int, int]
AggregateRecord = Row[Startup, User, int, int, int]


def _visible_vacancies_count() -> ScalarSelect[int]:
    return (
        select(func.count(Vacancy.id))
        .where(Vacancy.startup_id == Startup.id)
        .where(Vacancy.is_hidden.is_(False))
        .correlate(Startup)
        .scalar_subquery()
    )


def _applications_count() -> ScalarSelect[int]:
    return (
        select(func.count(Application.id))
        .join(Vacancy, Vacancy.id == Application.vacancy_id)
        .where(Vacancy.startup_id == Startup.id)
        .correlate(Startup)
        .scalar_subquery()
    )


def _views_count() -> ScalarSelect[int]:
    return (
        select(func.count(VacancyView.vacancy_id))
        .join(Vacancy, Vacancy.id == VacancyView.vacancy_id)
        .where(Vacancy.startup_id == Startup.id)
        .correlate(Startup)
        .scalar_subquery()
    )


class StartupRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def aggregate_statement(self) -> AggregateStatement:
        return (
            select(
                Startup,
                User,
                _visible_vacancies_count().label("vacancies_count"),
                _applications_count().label("applications_count"),
                _views_count().label("views_count"),
            )
            .join(User, User.id == Startup.owner_id)
            .options(joinedload(Startup.logo))
        )

    async def aggregate_page(
        self,
        statement: AggregateStatement,
        *,
        offset: int,
        limit: int,
    ) -> list[StartupAggregateRow]:
        result = await self._session.execute(statement.offset(offset).limit(limit))
        return [self._to_row(row) for row in result.all()]

    async def aggregate_all(self, statement: AggregateStatement) -> list[StartupAggregateRow]:
        result = await self._session.execute(statement)
        return [self._to_row(row) for row in result.all()]

    @staticmethod
    def _to_row(row: AggregateRecord) -> StartupAggregateRow:
        return StartupAggregateRow(
            startup=row[0],
            owner=row[1],
            vacancies_count=int(row[2]),
            applications_count=int(row[3]),
            views_count=int(row[4]),
        )

    async def count(self, statement: AggregateStatement) -> int:
        subquery = statement.order_by(None).subquery()
        total = await self._session.execute(select(func.count()).select_from(subquery))
        return int(total.scalar_one())

    async def find_aggregate(self, startup_id: uuid.UUID) -> StartupAggregateRow | None:
        rows = await self.aggregate_all(self.aggregate_statement().where(Startup.id == startup_id))
        return rows[0] if rows else None

    async def get_row_with_vacancies(self, startup_id: uuid.UUID) -> StartupAggregateRow | None:
        return await self.find_aggregate(startup_id)

    async def get(self, startup_id: uuid.UUID) -> Startup | None:
        result = await self._session.execute(
            select(Startup).where(Startup.id == startup_id).options(joinedload(Startup.owner), joinedload(Startup.logo))
        )
        return result.unique().scalar_one_or_none()

    async def get_with_vacancies(self, startup_id: uuid.UUID) -> Startup | None:
        result = await self._session.execute(
            select(Startup)
            .where(Startup.id == startup_id)
            .options(
                joinedload(Startup.owner),
                joinedload(Startup.logo),
                selectinload(Startup.vacancies),
            )
        )
        return result.unique().scalar_one_or_none()

    async def add(
        self,
        *,
        owner_id: uuid.UUID,
        title: str,
        short_description: str,
        description: str,
        stage: StartupStage,
        logo_file_id: uuid.UUID | None,
    ) -> Startup:
        entity = Startup(
            owner_id=owner_id,
            title=title,
            short_description=short_description,
            description=description,
            stage=stage,
            logo_file_id=logo_file_id,
        )
        self._session.add(entity)
        await self._session.flush()
        return entity

    def owned_statement(self, owner_id: uuid.UUID) -> AggregateStatement:
        return self.aggregate_statement().where(Startup.owner_id == owner_id)

    @staticmethod
    def owned_filter(owner_id: uuid.UUID) -> ColumnElement[bool]:
        return Startup.owner_id == owner_id

    @staticmethod
    def filter_catalog(
        statement: AggregateStatement,
        *,
        search: str | None,
        owner_id: uuid.UUID | None,
    ) -> AggregateStatement:
        if search:
            pattern = f"%{search.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(Startup.title).like(pattern),
                    func.lower(Startup.short_description).like(pattern),
                    func.lower(Startup.description).like(pattern),
                )
            )
        if owner_id is not None:
            statement = statement.where(Startup.owner_id == owner_id)
        return statement.order_by(Startup.updated_at.desc(), Startup.id.desc())

    async def save(
        self,
        entity: Startup,
        *,
        title: str,
        short_description: str,
        description: str,
        stage: StartupStage,
        logo_file_id: uuid.UUID | None,
        moment: datetime,
    ) -> None:
        entity.title = title
        entity.short_description = short_description
        entity.description = description
        entity.stage = stage
        entity.logo_file_id = logo_file_id
        entity.updated_at = moment
        await self._session.flush()
        # The eager `logo` relationship would otherwise keep the pre-update object.
        self._session.expire(entity, ["logo"])


class StartupAccessRepository:
    """Ownership lookups shared by vacancy/application modules."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def owner_of_vacancy(self, vacancy_id: uuid.UUID) -> uuid.UUID | None:
        result = await self._session.execute(
            select(Startup.owner_id).join(Vacancy, Vacancy.startup_id == Startup.id).where(Vacancy.id == vacancy_id)
        )
        return result.scalar_one_or_none()

    async def owned_startup_ids(self, owner_id: uuid.UUID) -> list[uuid.UUID]:
        result = await self._session.execute(select(Startup.id).where(Startup.owner_id == owner_id))
        return list(result.scalars().all())

    async def find_by_owner_and_title(self, owner_id: uuid.UUID, title: str) -> uuid.UUID | None:
        result = await self._session.execute(
            select(Startup.id).where(and_(Startup.owner_id == owner_id, Startup.title == title)).limit(1)
        )
        return result.scalar_one_or_none()
