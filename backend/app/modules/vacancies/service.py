import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import (
    EntityConflictException,
    EntityNotFoundException,
    PermissionDeniedException,
    UnprocessableEntityException,
)
from app.common.pagination import PaginationParams
from app.core.config import Settings
from app.modules.applications.presenters import applicant_payload, application_schema, logo_url
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import ApplicationSchema
from app.modules.files.service import FileService
from app.modules.users.models import User
from app.modules.vacancies.models import VacancySortOrder
from app.modules.vacancies.presenters import vacancy_details_schema, vacancy_list_item_schema
from app.modules.vacancies.repository import VacancyRepository, VacancyViewModel
from app.modules.vacancies.schemas import (
    ApplyInputSchema,
    DailyActivityPointSchema,
    TrackViewResultSchema,
    VacancyPageSchema,
    VacancyStatsSchema,
    VacancyTemplateSchema,
    VacancyViewerSchema,
)

DAILY_WINDOW_DAYS = 14
RECENT_VIEWERS_LIMIT = 20


class VacancyService:
    def __init__(self, session: AsyncSession, settings: Settings, files: FileService) -> None:
        self._session = session
        self._settings = settings
        self._files = files
        self._vacancies = VacancyRepository(session)
        self._applications = ApplicationRepository(session)
        self._views = VacancyViewModel(session)

    async def list_catalog(
        self,
        *,
        params: PaginationParams,
        search: str | None,
        titles: list[str],
        sort_by: VacancySortOrder,
        owner_id: uuid.UUID | None,
    ) -> VacancyPageSchema:
        statement = self._vacancies.filter_catalog(
            self._vacancies.aggregate_statement(),
            search=search,
            titles=titles,
            owner_id=owner_id,
        )
        statement = self._vacancies.apply_sort(statement, sort_by)
        total = await self._vacancies.count(statement)
        rows = await self._vacancies.aggregate_page(statement, offset=params.offset, limit=params.limit)
        return VacancyPageSchema.build(
            [vacancy_list_item_schema(self._settings, row) for row in rows],
            total,
            params,
        )

    async def list_titles(self) -> list[str]:
        return await self._vacancies.titles()

    async def list_templates(self) -> list[VacancyTemplateSchema]:
        templates = await self._vacancies.templates()
        return [
            VacancyTemplateSchema(
                id=template.id,
                title=template.title,
                description=template.description,
                requirements=template.requirements,
                reward=template.reward,
            )
            for template in templates
        ]

    async def get_details(self, *, vacancy_id: uuid.UUID, user: User) -> object:
        row = await self._vacancies.find_aggregate(vacancy_id)
        if row is None:
            raise EntityNotFoundException("Вакансия не найдена")
        status = await self._applications.applicant_status(vacancy_id, user.id)
        return vacancy_details_schema(
            self._settings,
            row,
            my_application_status=status,
            is_owner=row.startup.owner_id == user.id,
        )

    async def register_view(self, *, vacancy_id: uuid.UUID, user: User) -> TrackViewResultSchema:
        row = await self._vacancies.find_aggregate(vacancy_id)
        if row is None:
            raise EntityNotFoundException("Вакансия не найдена")
        if row.startup.owner_id == user.id:
            return TrackViewResultSchema(tracked=False)

        now = datetime.now(UTC)
        tracked = await self._views.register(
            vacancy_id=vacancy_id,
            user_id=user.id,
            view_date=now.date(),
            viewed_at=now,
        )
        if tracked:
            await self._session.commit()
        return TrackViewResultSchema(tracked=tracked)

    async def apply(
        self,
        *,
        vacancy_id: uuid.UUID,
        user: User,
        payload: ApplyInputSchema,
    ) -> ApplicationSchema:
        motivation = payload.motivation.strip()
        if not motivation:
            raise UnprocessableEntityException("Добавьте мотивационное письмо")

        row = await self._vacancies.find_aggregate(vacancy_id)
        if row is None:
            raise EntityNotFoundException("Вакансия не найдена")
        if row.startup.owner_id == user.id:
            raise UnprocessableEntityException("Нельзя откликнуться на вакансию своего стартапа")

        attachments = await self._files.resolve_attachments(
            user=user,
            file_ids=[item.id for item in payload.files],
        )
        if await self._applications.find_by_applicant(vacancy_id, user.id) is not None:
            raise EntityConflictException("Вы уже откликнулись на эту вакансию")

        try:
            created = await self._applications.add(
                vacancy_id=vacancy_id,
                applicant_id=user.id,
                motivation=motivation,
                moment=datetime.now(UTC),
                file_ids=[file.id for file in attachments],
            )
            await self._session.commit()
        except IntegrityError as error:
            await self._session.rollback()
            raise EntityConflictException("Вы уже откликнулись на эту вакансию") from error

        result = await self._applications.get_row(created.id)
        if result is None:
            raise EntityNotFoundException("Отклик не найден")
        return application_schema(self._settings, result)

    async def get_stats(self, *, vacancy_id: uuid.UUID, user: User) -> VacancyStatsSchema:
        row = await self._vacancies.find_aggregate(vacancy_id)
        if row is None:
            raise EntityNotFoundException("Вакансия не найдена")
        if row.startup.owner_id != user.id:
            raise PermissionDeniedException("Статистика доступна только владельцу стартапа")

        today = datetime.now(UTC).date()
        since = today - timedelta(days=DAILY_WINDOW_DAYS - 1)
        activity = {item.day: item for item in await self._vacancies.daily_activity(vacancy_id, since=since)}

        daily: list[DailyActivityPointSchema] = []
        for offset in range(DAILY_WINDOW_DAYS):
            day = since + timedelta(days=offset)
            point = activity.get(day)
            daily.append(
                DailyActivityPointSchema(
                    date=day.isoformat(),
                    views=point.views if point else 0,
                    applications=point.applications if point else 0,
                )
            )

        viewers = await self._vacancies.recent_viewers(vacancy_id, limit=RECENT_VIEWERS_LIMIT)
        applications = await self._applications.for_vacancy(vacancy_id)
        startup = row.startup

        return VacancyStatsSchema(
            vacancy_id=row.vacancy.id,
            vacancy_title=row.vacancy.title,
            startup_title=startup.title,
            startup_logo_url=logo_url(self._settings, startup.logo),
            total_views=row.views_count,
            total_applications=row.applications_count,
            daily=daily,
            viewers=[
                VacancyViewerSchema(user=applicant_payload(viewer), viewed_at=viewed_at)
                for viewer, viewed_at in viewers
            ],
            applications=[application_schema(self._settings, item) for item in applications],
        )
