import enum
import uuid

from pydantic import Field

from app.common.schemas.base import BaseSchema, UtcDatetime


class FileUploadScope(enum.StrEnum):
    STARTUP_LOGO = "startup-logo"
    APPLICATION_ATTACHMENT = "application-attachment"

    @classmethod
    def coerce(cls, raw: str | None) -> "FileUploadScope":
        try:
            return cls(raw or "")
        except ValueError:
            return cls.APPLICATION_ATTACHMENT


class StoredFileSchema(BaseSchema):
    id: uuid.UUID
    name: str
    size: int = Field(ge=0)
    mime_type: str
    url: str
    created_at: UtcDatetime


class DeleteResultSchema(BaseSchema):
    deleted: bool = True
