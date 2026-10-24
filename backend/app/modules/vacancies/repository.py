import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.engine import Row
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.sql.elements import UnaryExpression
from sqlalchemy.sql.selectable import ScalarSelect

from app.modules.applications.models import Application
from app.modules.startups.models import Startup
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy, VacancySortOrder, VacancyTemplate, VacancyView


@dataclass(frozen=True, slots=True)
class VacancyAggregateRow:
    vacancy: Vacancy
    startup: Startup
    applications_count: int
    views_count: int


@dataclass(frozen=True, slots=True)
class DailyActivityRow:
    day: date
    views: int
    applications: int


def _applications_count_subquery() -> ScalarSelect[int]:
    return (
        select(func.count(Application.id))
        .where(Application.vacancy_id == Vacancy.id)
        .correlate(Vacancy)
        .scalar_subquery()
    )


def _views_count_subquery() -> ScalarSelect[int]:
    return (
        select(func.count(VacancyView.vacancy_id))
        .where(VacancyView.vacancy_id == Vacancy.id)
        .correlate(Vacancy)
        .scalar_subquery()
    )


AggregateStatement = Select[Vacancy, Startup, int, int]
AggregateRecord = Row[Vacancy, Startup, int, int]
OrderingClause = UnaryExpression[Any]


class VacancyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def aggregate_statement(self) -> AggregateStatement:
        return (
            select(
                Vacancy,
                Startup,
                _applications_count_subquery().label("applications_count"),
                _views_count_subquery().label("views_count"),
            )
            .join(Startup, Startup.id == Vacancy.startup_id)
            .options(joinedload(Startup.logo))
        )

    async def aggregate_page(
        self,
        statement: AggregateStatement,
        *,
        offset: int,
        limit: int,
    ) -> list[VacancyAggregateRow]:
        result = await self._session.execute(statement.offset(offset).limit(limit))
        return [self._to_row(row) for row in result.all()]

    async def aggregate_all(self, statement: AggregateStatement) -> list[VacancyAggregateRow]:
        result = await self._session.execute(statement)
        return [self._to_row(row) for row in result.all()]

    async def count(self, statement: AggregateStatement) -> int:
        subquery = statement.order_by(None).subquery()
        total = await self._session.execute(select(func.count()).select_from(subquery))
        return int(total.scalar_one())

    async def find_aggregate(self, vacancy_id: uuid.UUID) -> VacancyAggregateRow | None:
        rows = await self.aggregate_all(self.aggregate_statement().where(Vacancy.id == vacancy_id))
        return rows[0] if rows else None

    async def get(self, vacancy_id: uuid.UUID) -> Vacancy | None:
        result = await self._session.execute(
            select(Vacancy).where(Vacancy.id == vacancy_id).options(joinedload(Vacancy.startup))
        )
        return result.unique().scalar_one_or_none()

    async def get_owned_startup(self, vacancy_id: uuid.UUID, owner_id: uuid.UUID) -> Vacancy | None:
        result = await self._session.execute(
            select(Vacancy)
            .join(Startup, Startup.id == Vacancy.startup_id)
            .where(Vacancy.id == vacancy_id, Startup.owner_id == owner_id)
            .options(joinedload(Vacancy.startup))
        )
        return result.unique().scalar_one_or_none()

    async def add(
        self,
        *,
        startup_id: uuid.UUID,
        title: str,
        description: str,
        requirements: str,
        reward: str,
        is_hidden: bool,
    ) -> Vacancy:
        entity = Vacancy(
            startup_id=startup_id,
            title=title,
            description=description,
            requirements=requirements,
            reward=reward,
            is_hidden=is_hidden,
        )
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def save(
        self,
        entity: Vacancy,
        *,
        title: str,
        description: str,
        requirements: str,
        reward: str,
        is_hidden: bool,
        moment: datetime,
    ) -> None:
        entity.title = title
        entity.description = description
        entity.requirements = requirements
        entity.reward = reward
        entity.is_hidden = is_hidden
        entity.updated_at = moment
        await self._session.flush()

    async def delete(self, entity: Vacancy) -> None:
        await self._session.delete(entity)
        await self._session.flush()

    async def titles(self) -> list[str]:
        result = await self._session.execute(select(Vacancy.title).where(Vacancy.is_hidden.is_(False)).distinct())
        return sorted(set(result.scalars().all()))

    async def templates(self) -> list[VacancyTemplate]:
        result = await self._session.execute(
            select(VacancyTemplate).where(VacancyTemplate.is_active.is_(True)).order_by(VacancyTemplate.title)
        )
        return list(result.scalars().all())

    @staticmethod
    def filter_catalog(
        statement: AggregateStatement,
        *,
        search: str | None,
        titles: list[str],
        owner_id: uuid.UUID | None,
    ) -> AggregateStatement:
        if owner_id is not None:
            statement = statement.where(Startup.owner_id == owner_id)
        else:
            statement = statement.where(Vacancy.is_hidden.is_(False))
        if titles:
            statement = statement.where(func.lower(Vacancy.title).in_([title.lower() for title in titles]))
        if search:
            pattern = f"%{search.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(Startup.title).like(pattern),
                    func.lower(Vacancy.requirements).like(pattern),
                    func.lower(Vacancy.reward).like(pattern),
                )
            )
        return statement

    @staticmethod
    def apply_sort(
        statement: AggregateStatement,
        sort_by: "VacancySortOrder",
    ) -> AggregateStatement:
        ordering: list[OrderingClause]
        if sort_by is VacancySortOrder.VIEWS:
            ordering = [_views_count_subquery().desc(), Vacancy.created_at.desc(), Vacancy.id.desc()]
        elif sort_by is VacancySortOrder.APPLICATIONS:
            ordering = [_applications_count_subquery().desc(), Vacancy.created_at.desc(), Vacancy.id.desc()]
        else:
            ordering = [Vacancy.created_at.desc(), Vacancy.id.desc()]
        return statement.order_by(*ordering)

    async def daily_activity(self, vacancy_id: uuid.UUID, *, since: date) -> list[DailyActivityRow]:
        views_statement = (
            select(VacancyView.view_date, func.count(VacancyView.vacancy_id))
            .where(VacancyView.vacancy_id == vacancy_id, VacancyView.view_date >= since)
            .group_by(VacancyView.view_date)
        )
        applications_statement = (
            select(func.date(Application.created_at), func.count(Application.id))
            .where(Application.vacancy_id == vacancy_id, func.date(Application.created_at) >= since)
            .group_by(func.date(Application.created_at))
        )
        views = {row[0]: int(row[1]) for row in (await self._session.execute(views_statement)).all()}
        applications_rows = (await self._session.execute(applications_statement)).all()
        applications = {self._as_date(row[0]): int(row[1]) for row in applications_rows}

        days = sorted({*views, *applications})
        return [
            DailyActivityRow(
                day=day,
                views=views.get(day, 0),
                applications=applications.get(day, 0),
            )
            for day in days
        ]

    async def recent_viewers(self, vacancy_id: uuid.UUID, *, limit: int) -> list[tuple[User, datetime]]:
        result = await self._session.execute(
            select(User, VacancyView.viewed_at)
            .join(VacancyView, VacancyView.user_id == User.id)
            .where(VacancyView.vacancy_id == vacancy_id)
            .order_by(VacancyView.viewed_at.desc())
            .limit(limit)
        )
        return [(row[0], row[1]) for row in result.all()]

    async def total_views(self, vacancy_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(VacancyView).where(VacancyView.vacancy_id == vacancy_id)
        )
        return int(result.scalar_one())

    async def views_by_vacancy(self, vacancy_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not vacancy_ids:
            return {}
        result = await self._session.execute(
            select(VacancyView.vacancy_id, func.count(VacancyView.vacancy_id))
            .where(VacancyView.vacancy_id.in_(vacancy_ids))
            .group_by(VacancyView.vacancy_id)
        )
        return {row[0]: int(row[1]) for row in result.all()}

    async def list_for_startup(self, startup_id: uuid.UUID) -> list[Vacancy]:
        result = await self._session.execute(
            select(Vacancy).where(Vacancy.startup_id == startup_id).order_by(Vacancy.created_at)
        )
        return list(result.scalars().all())

    @staticmethod
    def _as_date(value: object) -> date:
        if isinstance(value, date):
            return value
        return date.fromisoformat(str(value))

    @staticmethod
    def _to_row(row: AggregateRecord) -> VacancyAggregateRow:
        return VacancyAggregateRow(
            vacancy=row[0],
            startup=row[1],
            applications_count=int(row[2]),
            views_count=int(row[3]),
        )


class VacancyViewModel:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = VacancyRepository(session)

    async def register(
        self,
        *,
        vacancy_id: uuid.UUID,
        user_id: uuid.UUID,
        view_date: date,
        viewed_at: datetime,
    ) -> bool:
        result = await self._session.execute(
            select(VacancyView).where(
                VacancyView.vacancy_id == vacancy_id,
                VacancyView.user_id == user_id,
                VacancyView.view_date == view_date,
            )
        )
        if result.scalar_one_or_none() is not None:
            return False

        self._session.add(
            VacancyView(
                vacancy_id=vacancy_id,
                user_id=user_id,
                view_date=view_date,
                viewed_at=viewed_at,
            )
        )
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            return False
        return True

    async def views_for_vacancy(self, vacancy_id: uuid.UUID) -> int:
        return await self._repository.total_views(vacancy_id)
