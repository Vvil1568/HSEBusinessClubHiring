import uuid
from typing import Annotated

from fastapi import APIRouter, Path

from app.common.pagination import ApplicationPagination
from app.core.dependencies import ApplicationServiceDep, CurrentUser
from app.modules.applications.schemas import (
    ApplicationPageSchema,
    ApplicationSchema,
    ApplicationStatusUpdateSchema,
)

router = APIRouter(prefix="/applications", tags=["Applications"])

ApplicationPath = Annotated[uuid.UUID, Path(alias="applicationId")]


@router.get("/mine", response_model=ApplicationPageSchema, summary="Мои отклики")
async def list_my_applications(
    user: CurrentUser,
    service: ApplicationServiceDep,
    params: ApplicationPagination,
) -> ApplicationPageSchema:
    return await service.list_mine(user=user, params=params)


@router.get("/inbox", response_model=ApplicationPageSchema, summary="Входящие отклики")
async def list_inbox_applications(
    user: CurrentUser,
    service: ApplicationServiceDep,
    params: ApplicationPagination,
) -> ApplicationPageSchema:
    return await service.list_inbox(user=user, params=params)


@router.patch("/{applicationId}/status", response_model=ApplicationSchema, summary="Изменить статус отклика")
async def update_application_status(
    application_id: ApplicationPath,
    payload: ApplicationStatusUpdateSchema,
    user: CurrentUser,
    service: ApplicationServiceDep,
) -> ApplicationSchema:
    return await service.change_status(user=user, application_id=application_id, status=payload.status)
