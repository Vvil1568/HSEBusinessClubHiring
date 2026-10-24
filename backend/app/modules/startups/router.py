import uuid
from typing import Annotated

from fastapi import APIRouter, Path, Query, status

from app.common.pagination import CatalogPagination
from app.core.dependencies import CurrentUser, StartupServiceDep
from app.modules.startups.schemas import (
    StartupInputSchema,
    StartupPageSchema,
    StartupSchema,
)

router = APIRouter(prefix="/startups", tags=["Startups"])

StartupPath = Annotated[uuid.UUID, Path(alias="startupId")]


@router.get("", response_model=StartupPageSchema, summary="Каталог стартапов")
async def list_startups(
    user: CurrentUser,
    service: StartupServiceDep,
    params: CatalogPagination,
    search: Annotated[str | None, Query(max_length=200)] = None,
    owner_id: Annotated[uuid.UUID | None, Query(alias="ownerId")] = None,
) -> StartupPageSchema:
    _ = user
    trimmed = search.strip() if search else ""
    return await service.list_catalog(
        params=params,
        search=trimmed or None,
        owner_id=owner_id,
    )


@router.post(
    "",
    response_model=StartupSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Создать стартап",
)
async def create_startup(
    payload: StartupInputSchema,
    user: CurrentUser,
    service: StartupServiceDep,
) -> StartupSchema:
    return await service.create(owner=user, payload=payload)


@router.get("/{startupId}", response_model=StartupSchema, summary="Стартап по id")
async def get_startup(
    startup_id: StartupPath,
    user: CurrentUser,
    service: StartupServiceDep,
) -> StartupSchema:
    _ = user
    return await service.get_detail(startup_id)


@router.put("/{startupId}", response_model=StartupSchema, summary="Полное обновление стартапа")
async def replace_startup(
    startup_id: StartupPath,
    payload: StartupInputSchema,
    user: CurrentUser,
    service: StartupServiceDep,
) -> StartupSchema:
    return await service.replace(owner=user, startup_id=startup_id, payload=payload)
