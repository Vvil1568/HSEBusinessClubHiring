import uuid

from pydantic import Field, field_validator

from app.common.pagination import PageSchema
from app.common.schemas.base import BaseSchema, UtcDatetime
from app.common.schemas.contracts import ApplicantSchema, StartupStageValue


class VacancyInputSchema(BaseSchema):
    id: uuid.UUID | None = None
    title: str = Field(default="", max_length=150)
    description: str = ""
    requirements: str = ""
    reward: str = Field(default="", max_length=255)
    is_hidden: bool = False


class StartupInputSchema(BaseSchema):
    title: str = Field(min_length=1, max_length=150)
    short_description: str = Field(min_length=1, max_length=300)
    description: str = ""
    logo_url: str | None = None
    stage: StartupStageValue
    vacancies: list[VacancyInputSchema] = Field(default_factory=list)

    @field_validator("description", mode="before")
    @classmethod
    def _default_description(cls, value: object) -> object:
        return "" if value is None else value


class StartupSummarySchema(BaseSchema):
    id: uuid.UUID
    title: str
    logo_url: str | None = None
    stage: StartupStageValue
    short_description: str
    owner: ApplicantSchema
    created_at: UtcDatetime
    updated_at: UtcDatetime
    vacancies_count: int = Field(ge=0, default=0)
    applications_count: int = Field(ge=0, default=0)
    views_count: int = Field(ge=0, default=0)


class StartupSchema(StartupSummarySchema):
    description: str
    vacancies: list["VacancySchema"] = Field(default_factory=list)


class StartupPageSchema(PageSchema[StartupSummarySchema]):
    pass


from app.modules.vacancies.schemas import VacancySchema  # noqa: E402

StartupSchema.model_rebuild()
