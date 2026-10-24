import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Query, Request, status

from app.common.pagination import CatalogPagination
from app.core.config import get_settings
from app.core.dependencies import CurrentUser, VacancyServiceDep, build_view_rate_limiter
from app.modules.applications.schemas import ApplicationSchema
from app.modules.vacancies.models import VacancySortOrder
from app.modules.vacancies.schemas import (
    ApplyInputSchema,
    TrackViewResultSchema,
    VacancyDetailsSchema,
    VacancyPageSchema,
    VacancyStatsSchema,
    VacancyTemplateSchema,
)

router = APIRouter(prefix="/vacancies", tags=["Vacancies"])

ME_SENTINEL = "me"

VacancyPath = Annotated[uuid.UUID, Path(alias="vacancyId")]


def _owned_owner_id(raw: str | None, current_user_id: uuid.UUID) -> uuid.UUID | None:
    if not raw:
        return None
    if raw.strip().lower() == ME_SENTINEL:
        return current_user_id
    try:
        return uuid.UUID(raw.strip())
    except ValueError:
        return None


def _flatten_titles(titles: list[str] | None) -> list[str]:
    if not titles:
        return []
    result: list[str] = []
    for raw in titles:
        for part in raw.split(","):
            cleaned = part.strip()
            if cleaned and cleaned not in result:
                result.append(cleaned)
    return result[:50]


@router.get("", response_model=VacancyPageSchema, summary="Каталог вакансий")
async def list_vacancies(
    user: CurrentUser,
    service: VacancyServiceDep,
    params: CatalogPagination,
    search: Annotated[str | None, Query(max_length=200)] = None,
    titles: Annotated[list[str] | None, Query()] = None,
    sort_by: Annotated[VacancySortOrder, Query(alias="sortBy")] = VacancySortOrder.NEW,
    owner_id: Annotated[str | None, Query(alias="ownerId")] = None,
) -> VacancyPageSchema:
    return await service.list_catalog(
        params=params,
        search=search.strip() if search else None,
        titles=_flatten_titles(titles),
        sort_by=sort_by,
        owner_id=_owned_owner_id(owner_id, user.id),
    )


@router.get("/titles", response_model=list[str], summary="Справочник названий вакансий")
async def list_vacancy_titles(user: CurrentUser, service: VacancyServiceDep) -> list[str]:
    _ = user
    return await service.list_titles()


@router.get("/templates", response_model=list[VacancyTemplateSchema], summary="Шаблоны вакансий")
async def list_vacancy_templates(user: CurrentUser, service: VacancyServiceDep) -> list[VacancyTemplateSchema]:
    _ = user
    return await service.list_templates()


@router.get("/{vacancyId}", response_model=VacancyDetailsSchema, summary="Карточка вакансии")
async def get_vacancy(
    vacancy_id: VacancyPath,
    user: CurrentUser,
    service: VacancyServiceDep,
) -> VacancyDetailsSchema:
    details = await service.get_details(vacancy_id=vacancy_id, user=user)
    return VacancyDetailsSchema.model_validate(details)


@router.post("/{vacancyId}/view", response_model=TrackViewResultSchema, summary="Отметить просмотр")
async def register_vacancy_view(
    vacancy_id: VacancyPath,
    request: Request,
    user: CurrentUser,
    service: VacancyServiceDep,
) -> TrackViewResultSchema:
    client_key = request.client.host if request.client else str(user.id)
    await build_view_rate_limiter(get_settings()).hit(client_key)
    return await service.register_view(vacancy_id=vacancy_id, user=user)


@router.post(
    "/{vacancyId}/apply",
    response_model=ApplicationSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Откликнуться на вакансию",
)
async def apply_to_vacancy(
    vacancy_id: VacancyPath,
    payload: ApplyInputSchema,
    user: CurrentUser,
    service: VacancyServiceDep,
) -> ApplicationSchema:
    return await service.apply(vacancy_id=vacancy_id, user=user, payload=payload)


@router.get("/{vacancyId}/stats", response_model=VacancyStatsSchema, summary="Статистика вакансии")
async def get_vacancy_stats(
    vacancy_id: VacancyPath,
    user: CurrentUser,
    service: VacancyServiceDep,
) -> VacancyStatsSchema:
    return await service.get_stats(vacancy_id=vacancy_id, user=user)
