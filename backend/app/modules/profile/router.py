from fastapi import APIRouter

from app.core.dependencies import CurrentUser, ProfileServiceDep
from app.modules.profile.schemas import ProfileDashboardSchema
from app.modules.startups.schemas import StartupSummarySchema

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/dashboard", response_model=ProfileDashboardSchema, summary="Дашборд личного кабинета")
async def get_profile_dashboard(user: CurrentUser, service: ProfileServiceDep) -> ProfileDashboardSchema:
    return await service.dashboard(user)


@router.get("/startups", response_model=list[StartupSummarySchema], summary="Все стартапы пользователя")
async def list_owned_startups(user: CurrentUser, service: ProfileServiceDep) -> list[StartupSummarySchema]:
    return await service.owned_startups(user)
