import uuid

from pydantic import Field

from app.common.pagination import PageSchema
from app.common.schemas.base import BaseSchema, UtcDatetime
from app.common.schemas.contracts import ApplicantSchema, StartupRefSchema
from app.modules.applications.models import ApplicationStatus
from app.modules.vacancies.models import VacancySortOrder


class VacancySchema(BaseSchema):
    id: uuid.UUID
    startup_id: uuid.UUID
    title: str
    description: str
    requirements: str
    reward: str
    is_hidden: bool
    views_count: int = Field(ge=0, default=0)
    applications_count: int = Field(ge=0, default=0)
    created_at: UtcDatetime
    updated_at: UtcDatetime


class VacancyListItemSchema(BaseSchema):
    id: uuid.UUID
    startup_id: uuid.UUID
    startup_title: str
    startup_logo_url: str | None = None
    title: str
    applications_count: int = Field(ge=0, default=0)
    views_count: int = Field(ge=0, default=0)
    is_hidden: bool
    created_at: UtcDatetime


class VacancyDetailsSchema(VacancySchema):
    startup: StartupRefSchema
    my_application_status: ApplicationStatus | None = None
    is_owner: bool = False


class VacancyPageSchema(PageSchema[VacancyListItemSchema]):
    pass


class VacancyTemplateSchema(BaseSchema):
    id: str
    title: str
    description: str
    requirements: str
    reward: str


class TrackViewResultSchema(BaseSchema):
    tracked: bool


class DailyActivityPointSchema(BaseSchema):
    date: str
    views: int = Field(ge=0, default=0)
    applications: int = Field(ge=0, default=0)


class VacancyViewerSchema(BaseSchema):
    user: ApplicantSchema
    viewed_at: UtcDatetime


class VacancyStatsSchema(BaseSchema):
    vacancy_id: uuid.UUID
    vacancy_title: str
    startup_title: str
    startup_logo_url: str | None = None
    total_views: int = Field(ge=0, default=0)
    total_applications: int = Field(ge=0, default=0)
    daily: list[DailyActivityPointSchema] = Field(default_factory=list)
    viewers: list[VacancyViewerSchema] = Field(default_factory=list)
    applications: list["ApplicationSchema"] = Field(default_factory=list)


class ApplyFileInputSchema(BaseSchema):
    id: uuid.UUID
    name: str | None = None
    size: int | None = None
    mime_type: str | None = None
    url: str | None = None


class ApplyInputSchema(BaseSchema):
    motivation: str = Field(min_length=1)
    files: list[ApplyFileInputSchema] = Field(default_factory=list, max_length=5)


class VacancySortQuery(BaseSchema):
    value: VacancySortOrder = VacancySortOrder.NEW


from app.modules.applications.schemas import ApplicationSchema  # noqa: E402

VacancyStatsSchema.model_rebuild()
