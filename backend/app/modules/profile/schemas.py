from pydantic import Field

from app.common.schemas.base import BaseSchema
from app.common.schemas.contracts import UserProfileSchema
from app.modules.applications.schemas import ApplicationSchema
from app.modules.startups.schemas import StartupSummarySchema
from app.modules.vacancies.schemas import VacancyListItemSchema


class ProfileTotalsSchema(BaseSchema):
    startups: int = Field(ge=0, default=0)
    vacancies: int = Field(ge=0, default=0)
    applications: int = Field(ge=0, default=0)


class ProfileDashboardSchema(BaseSchema):
    user: UserProfileSchema
    recent_startups: list[StartupSummarySchema] = Field(default_factory=list)
    my_vacancies: list[VacancyListItemSchema] = Field(default_factory=list)
    my_applications: list[ApplicationSchema] = Field(default_factory=list)
    totals: ProfileTotalsSchema
