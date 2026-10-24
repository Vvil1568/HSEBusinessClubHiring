from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.modules.applications.presenters import applicant_payload, application_schema
from app.modules.applications.repository import ApplicationRepository
from app.modules.profile.schemas import ProfileDashboardSchema, ProfileTotalsSchema
from app.modules.startups.models import Startup
from app.modules.startups.presenters import startup_summary_schema
from app.modules.startups.repository import StartupRepository
from app.modules.startups.schemas import StartupSummarySchema
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.vacancies.presenters import vacancy_list_item_schema
from app.modules.vacancies.repository import VacancyRepository

RECENT_STARTUPS_LIMIT = 6
MY_VACANCIES_LIMIT = 5
MY_APPLICATIONS_LIMIT = 5


class ProfileService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._settings = settings
        self._users = UserRepository(session)
        self._startups = StartupRepository(session)
        self._vacancies = VacancyRepository(session)
        self._applications = ApplicationRepository(session)

    async def owned_startups(self, user: User) -> list[StartupSummarySchema]:
        rows = await self._startups.aggregate_all(self._startups.owned_statement(user.id))
        rows.sort(key=lambda row: row.startup.updated_at, reverse=True)
        return [startup_summary_schema(self._settings, row) for row in rows]

    async def dashboard(self, user: User) -> ProfileDashboardSchema:
        counters = await self._users.counters(user.id)

        startups = await self._startups.aggregate_all(self._startups.owned_statement(user.id))
        startups.sort(key=lambda row: row.startup.updated_at, reverse=True)

        vacancy_rows = await self._vacancies.aggregate_all(
            self._vacancies.aggregate_statement().where(Startup.owner_id == user.id)
        )
        vacancy_rows.sort(key=lambda row: (row.applications_count, row.views_count), reverse=True)

        application_statement = await self._applications.my_statement(user.id)
        application_rows = await self._applications.page(
            application_statement,
            offset=0,
            limit=MY_APPLICATIONS_LIMIT,
        )

        return ProfileDashboardSchema(
            user={
                **applicant_payload(user),
                "startups_count": counters.startups,
                "vacancies_count": counters.vacancies,
                "applications_count": counters.applications,
            },
            recent_startups=[startup_summary_schema(self._settings, row) for row in startups[:RECENT_STARTUPS_LIMIT]],
            my_vacancies=[vacancy_list_item_schema(self._settings, row) for row in vacancy_rows[:MY_VACANCIES_LIMIT]],
            my_applications=[application_schema(self._settings, row) for row in application_rows],
            totals=ProfileTotalsSchema(
                startups=counters.startups,
                vacancies=counters.vacancies,
                applications=counters.applications,
            ),
        )
