from app.core.config import Settings
from app.modules.applications.presenters import logo_url
from app.modules.startups.models import Startup
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.repository import VacancyAggregateRow
from app.modules.vacancies.schemas import (
    VacancyDetailsSchema,
    VacancyListItemSchema,
    VacancySchema,
)


def vacancy_schema(vacancy: Vacancy, *, applications_count: int, views_count: int) -> VacancySchema:
    return VacancySchema(
        id=vacancy.id,
        startup_id=vacancy.startup_id,
        title=vacancy.title,
        description=vacancy.description,
        requirements=vacancy.requirements,
        reward=vacancy.reward,
        is_hidden=vacancy.is_hidden,
        views_count=views_count,
        applications_count=applications_count,
        created_at=vacancy.created_at,
        updated_at=vacancy.updated_at,
    )


def vacancy_list_item_schema(settings: Settings, row: VacancyAggregateRow) -> VacancyListItemSchema:
    startup: Startup = row.startup
    return VacancyListItemSchema(
        id=row.vacancy.id,
        startup_id=startup.id,
        startup_title=startup.title,
        startup_logo_url=logo_url(settings, startup.logo),
        title=row.vacancy.title,
        applications_count=row.applications_count,
        views_count=row.views_count,
        is_hidden=row.vacancy.is_hidden,
        created_at=row.vacancy.created_at,
    )


def vacancy_details_schema(
    settings: Settings,
    row: VacancyAggregateRow,
    *,
    my_application_status: object,
    is_owner: bool,
) -> VacancyDetailsSchema:
    startup: Startup = row.startup
    base = vacancy_schema(
        row.vacancy,
        applications_count=row.applications_count,
        views_count=row.views_count,
    )
    return VacancyDetailsSchema(
        **base.model_dump(),
        startup={
            "id": startup.id,
            "title": startup.title,
            "logo_url": logo_url(settings, startup.logo),
            "stage": startup.stage.value,
        },
        my_application_status=my_application_status,
        is_owner=is_owner,
    )
