import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import EntityNotFoundException, PermissionDeniedException
from app.common.pagination import PaginationParams
from app.core.config import Settings
from app.modules.applications.repository import ApplicationRepository
from app.modules.files.service import FileService
from app.modules.startups.models import StartupStage
from app.modules.startups.presenters import startup_schema, startup_summary_schema
from app.modules.startups.repository import StartupAggregateRow, StartupRepository
from app.modules.startups.schemas import (
    StartupInputSchema,
    StartupPageSchema,
    StartupSchema,
    StartupSummarySchema,
    VacancyInputSchema,
)
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.repository import VacancyRepository

DEFAULT_VACANCY_TITLE = "Команда проекта"


class StartupService:
    def __init__(self, session: AsyncSession, settings: Settings, files: FileService) -> None:
        self._session = session
        self._settings = settings
        self._files = files
        self._startups = StartupRepository(session)
        self._vacancies = VacancyRepository(session)
        self._applications = ApplicationRepository(session)

    async def list_catalog(
        self,
        *,
        params: PaginationParams,
        search: str | None,
        owner_id: uuid.UUID | None,
    ) -> StartupPageSchema:
        statement = self._startups.filter_catalog(
            self._startups.aggregate_statement(),
            search=search,
            owner_id=owner_id,
        )
        total = await self._startups.count(statement)
        rows = await self._startups.aggregate_page(statement, offset=params.offset, limit=params.limit)
        return StartupPageSchema.build(
            [startup_summary_schema(self._settings, row) for row in rows],
            total,
            params,
        )

    async def list_owned(self, owner: User) -> list[StartupSummarySchema]:
        rows = await self._startups.aggregate_all(self._startups.owned_statement(owner.id))
        rows.sort(key=lambda row: row.startup.updated_at, reverse=True)
        return [startup_summary_schema(self._settings, row) for row in rows]

    async def get_detail(self, startup_id: uuid.UUID) -> StartupSchema:
        row = await self._startups.find_aggregate(startup_id)
        if row is None:
            raise EntityNotFoundException("Стартап не найден")
        return await self._render(row)

    async def create(self, *, owner: User, payload: StartupInputSchema) -> StartupSchema:
        logo = await self._files.resolve_owned_logo(user=owner, logo_url=payload.logo_url)
        try:
            startup = await self._startups.add(
                owner_id=owner.id,
                title=payload.title.strip(),
                short_description=payload.short_description.strip(),
                description=payload.description,
                stage=StartupStage(payload.stage.value),
                logo_file_id=logo.id if logo else None,
            )
            for input_schema in payload.vacancies:
                await self._vacancies.add(
                    startup_id=startup.id,
                    title=self._vacancy_title(input_schema, payload),
                    description=input_schema.description,
                    requirements=input_schema.requirements,
                    reward=input_schema.reward,
                    is_hidden=input_schema.is_hidden,
                )
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise
        created = await self._startups.get_row_with_vacancies(startup.id)
        if created is None:
            raise EntityNotFoundException("Стартап не найден")
        return await self._render(created)

    async def replace(
        self,
        *,
        owner: User,
        startup_id: uuid.UUID,
        payload: StartupInputSchema,
    ) -> StartupSchema:
        startup = await self._startups.get_with_vacancies(startup_id)
        if startup is None:
            raise EntityNotFoundException("Стартап не найден")
        if startup.owner_id != owner.id:
            raise PermissionDeniedException("Недостаточно прав для изменения этого стартапа")

        logo = await self._files.resolve_owned_logo(user=owner, logo_url=payload.logo_url)
        now = self._now()
        existing = {vacancy.id: vacancy for vacancy in startup.vacancies}
        kept: set[uuid.UUID] = set()

        try:
            await self._startups.save(
                startup,
                title=payload.title.strip(),
                short_description=payload.short_description.strip(),
                description=payload.description,
                stage=StartupStage(payload.stage.value),
                logo_file_id=logo.id if logo else None,
                moment=now,
            )
            for input_schema in payload.vacancies:
                title = self._vacancy_title(input_schema, payload)
                target = existing.get(input_schema.id) if input_schema.id else None
                if target is not None:
                    kept.add(target.id)
                    await self._vacancies.save(
                        target,
                        title=title,
                        description=input_schema.description,
                        requirements=input_schema.requirements,
                        reward=input_schema.reward,
                        is_hidden=input_schema.is_hidden,
                        moment=now,
                    )
                    continue
                created = await self._vacancies.add(
                    startup_id=startup.id,
                    title=title,
                    description=input_schema.description,
                    requirements=input_schema.requirements,
                    reward=input_schema.reward,
                    is_hidden=input_schema.is_hidden,
                )
                kept.add(created.id)

            for vacancy_id, vacancy in existing.items():
                if vacancy_id not in kept:
                    await self._vacancies.delete(vacancy)
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

        updated = await self._startups.get_row_with_vacancies(startup_id)
        if updated is None:
            raise EntityNotFoundException("Стартап не найден")
        return await self._render(updated)

    async def _render(self, row: StartupAggregateRow) -> StartupSchema:
        vacancies = await self._vacancy_tuples(row.startup.id)
        return startup_schema(self._settings, row, vacancies)

    async def _vacancy_tuples(self, startup_id: uuid.UUID) -> list[tuple[Vacancy, int, int]]:
        vacancies = await self._vacancies.list_for_startup(startup_id)
        vacancy_ids = [vacancy.id for vacancy in vacancies]
        counts = await self._applications.counts_by_vacancy(vacancy_ids)
        view_counts = await self._vacancies.views_by_vacancy(vacancy_ids)
        return [(vacancy, counts.get(vacancy.id, 0), view_counts.get(vacancy.id, 0)) for vacancy in vacancies]

    @staticmethod
    def _vacancy_title(input_schema: VacancyInputSchema, payload: StartupInputSchema) -> str:
        title = input_schema.title.strip()
        if title:
            return title
        if payload.vacancies:
            fallback = payload.vacancies[0].title.strip()
            if fallback:
                return fallback
        return DEFAULT_VACANCY_TITLE

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)
