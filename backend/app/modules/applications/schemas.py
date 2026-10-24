import uuid

from pydantic import Field

from app.common.pagination import PageSchema
from app.common.schemas.base import BaseSchema, UtcDatetime
from app.common.schemas.contracts import ApplicantSchema
from app.modules.applications.models import ApplicationStatus


class ApplicationFileSchema(BaseSchema):
    id: uuid.UUID
    name: str
    size: int = Field(ge=0)
    mime_type: str | None = None
    url: str | None = None


class ApplicationSchema(BaseSchema):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    vacancy_title: str
    startup_id: uuid.UUID
    startup_title: str
    startup_logo_url: str | None = None
    applicant: ApplicantSchema
    motivation: str
    files: list[ApplicationFileSchema] = Field(default_factory=list)
    status: ApplicationStatus
    created_at: UtcDatetime


class ApplicationPageSchema(PageSchema[ApplicationSchema]):
    pass


class ApplicationStatusUpdateSchema(BaseSchema):
    status: ApplicationStatus
