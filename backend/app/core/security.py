import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import parse_qsl

from app.common.exceptions import InvalidTelegramDataException

SESSION_TOKEN_BYTES = 32
TELEGRAM_SECRET_KEY_LABEL = b"WebAppData"
MAX_INIT_DATA_LENGTH = 8192


@dataclass(frozen=True, slots=True)
class TelegramUser:
    telegram_id: int
    first_name: str
    last_name: str
    username: str | None
    photo_url: str | None


@dataclass(frozen=True, slots=True)
class VerifiedInitData:
    user: TelegramUser
    auth_date: datetime
    signature_hash: str
    query_id: str | None


def utc_now() -> datetime:
    return datetime.now(UTC)


def _data_check_string(fields: dict[str, str]) -> str:
    return "\n".join(f"{key}={fields[key]}" for key in sorted(fields))


def _parse_fields(init_data: str) -> dict[str, str]:
    try:
        pairs = parse_qsl(init_data, strict_parsing=False, keep_blank_values=True)
    except ValueError as error:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram") from error
    return dict(pairs)


def verify_init_data(init_data: str, *, bot_token: str, max_age_seconds: int) -> VerifiedInitData:
    raw = init_data.strip()
    if not raw:
        raise InvalidTelegramDataException("Откройте приложение через Telegram")
    if len(raw) > MAX_INIT_DATA_LENGTH:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")
    if not bot_token:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")

    fields = _parse_fields(raw)
    received_hash = fields.pop("hash", "")
    if not received_hash:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")

    secret_key = hmac.new(TELEGRAM_SECRET_KEY_LABEL, bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, _data_check_string(fields).encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")

    auth_date_raw = fields.get("auth_date", "")
    try:
        auth_date_timestamp = int(auth_date_raw)
    except ValueError as error:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram") from error

    auth_date = datetime.fromtimestamp(auth_date_timestamp, tz=UTC)
    if time.time() - auth_date_timestamp > max_age_seconds:
        raise InvalidTelegramDataException("Сессия Telegram истекла, откройте приложение заново")

    user = _parse_user(fields.get("user"))
    return VerifiedInitData(
        user=user,
        auth_date=auth_date,
        signature_hash=received_hash,
        query_id=fields.get("query_id") or None,
    )


def _parse_user(raw_user: str | None) -> TelegramUser:
    if not raw_user:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")
    try:
        payload = json.loads(raw_user)
    except json.JSONDecodeError as error:
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram") from error
    if not isinstance(payload, dict):
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")

    telegram_id = payload.get("id")
    if not isinstance(telegram_id, int):
        raise InvalidTelegramDataException("Не удалось проверить данные Telegram")

    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    username = payload.get("username")
    photo_url = payload.get("photo_url")

    return TelegramUser(
        telegram_id=telegram_id,
        first_name=first_name if isinstance(first_name, str) else "",
        last_name=last_name if isinstance(last_name, str) else "",
        username=username if isinstance(username, str) and username else None,
        photo_url=photo_url if isinstance(photo_url, str) and photo_url else None,
    )


def init_data_fingerprint(init_data: str) -> str:
    return hashlib.sha256(init_data.strip().encode()).hexdigest()


def generate_session_token() -> str:
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def hash_session_token(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()
