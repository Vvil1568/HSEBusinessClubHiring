import enum
import uuid

from pydantic import Field

from app.common.schemas.base import BaseSchema


class ErrorSchema(BaseSchema):
    message: str


class StartupStageValue(enum.StrEnum):
    IDEA = "idea"
    MVP = "mvp"
    SCALING = "scaling"


class ApplicantSchema(BaseSchema):
    id: uuid.UUID
    telegram_id: int
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    photo_url: str | None = None


class UserProfileSchema(ApplicantSchema):
    startups_count: int = Field(ge=0, default=0)
    vacancies_count: int = Field(ge=0, default=0)
    applications_count: int = Field(ge=0, default=0)


class StartupRefSchema(BaseSchema):
    id: uuid.UUID
    title: str = Field(max_length=150)
    logo_url: str | None = None
    stage: StartupStageValue
