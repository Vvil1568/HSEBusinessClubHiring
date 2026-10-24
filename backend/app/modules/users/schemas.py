from pydantic import Field

from app.common.schemas.base import BaseSchema, UtcDatetime
from app.common.schemas.contracts import UserProfileSchema


class TelegramAuthInput(BaseSchema):
    init_data: str = Field(min_length=1, max_length=8192)


class TelegramSessionSchema(BaseSchema):
    user: UserProfileSchema
    expires_at: UtcDatetime
