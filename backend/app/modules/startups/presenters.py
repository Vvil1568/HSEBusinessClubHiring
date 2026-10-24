from app.core.config import Settings
from app.modules.applications.presenters import applicant_payload, logo_url
from app.modules.startups.models import Startup
from app.modules.startups.repository import StartupAggregateRow
from app.modules.startups.schemas import StartupSchema, StartupSummarySchema
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.presenters import vacancy_schema
from app.modules.vacancies.repository import VacancyAggregateRow


def startup_summary_schema(settings: Settings, row: StartupAggregateRow) -> StartupSummarySchema:
    startup: Startup = row.startup
    owner: User = row.owner
    return StartupSummarySchema(
        id=startup.id,
        title=startup.title,
        logo_url=logo_url(settings, startup.logo),
        stage=startup.stage.value,
        short_description=startup.short_description,
        owner=applicant_payload(owner),
        created_at=startup.created_at,
        updated_at=startup.updated_at,
        vacancies_count=row.vacancies_count,
        applications_count=row.applications_count,
        views_count=row.views_count,
    )


def startup_schema(
    settings: Settings,
    row: StartupAggregateRow,
    vacancies: list[tuple[Vacancy, int, int]],
) -> StartupSchema:
    summary = startup_summary_schema(settings, row)
    return StartupSchema(
        **summary.model_dump(),
        description=row.startup.description,
        vacancies=[
            vacancy_schema(vacancy, applications_count=applications_count, views_count=views_count)
            for vacancy, applications_count, views_count in vacancies
        ],
    )


def vacancy_counts_payload(row: VacancyAggregateRow) -> tuple[Vacancy, int, int]:
    return row.vacancy, row.applications_count, row.views_count
