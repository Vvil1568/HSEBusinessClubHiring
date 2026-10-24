from pydantic import Field

from app.common.schemas.base import BaseSchema, UtcDatetime
from app.common.schemas.contracts import UserProfileSchema


class TelegramAuthInput(BaseSchema):
    init_data: str = Field(min_length=1, max_length=8192)


class TelegramSessionSchema(BaseSchema):
    user: UserProfileSchema
    expires_at: UtcDatetime


class DevUserSchema(BaseSchema):
    key: str
    label: str
    description: str
    first_name: str
    last_name: str
    photo_url: str | None = None
    telegram_id: int | None = None
    available_outside_telegram: bool


class AppConfigSchema(BaseSchema):
    """Runtime switches for the Mini App shell (public, no authentication)."""

    production: bool
    dev_mode: bool
    default_dev_user: str
    dev_users: list[DevUserSchema]


class DevLoginInput(BaseSchema):
    user: str = Field(min_length=1, max_length=32)


class DevSwitchResultSchema(BaseSchema):
    """Same shape as `TelegramSessionSchema`, plus the active preset key."""

    user: UserProfileSchema
    expires_at: UtcDatetime
    dev_user: str
