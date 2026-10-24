"""DEV-mode fixtures: swappable test identities and their demo content.

Everything here is only reachable while ``settings.dev_mode_enabled`` is true.
Preset identities are stable (fixed ``telegram_id`` values), so switching
between them in the UI keeps the same rows without creating duplicates.

``DEV_INIT_DATA_PREFIX`` marks synthetic ``initData`` strings such as
``dev:founder``. They bypass HMAC verification on purpose and are rejected
whenever DEV mode is off.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TelegramUser, utc_now
from app.modules.applications.models import Application, ApplicationStatus
from app.modules.startups.models import Startup, StartupStage
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.vacancies.models import Vacancy

__all__ = [
    "DEV_INIT_DATA_PREFIX",
    "DEV_USERS",
    "DevUserPreset",
    "build_dev_init_data",
    "dev_init_data_key",
    "ensure_dev_presets",
    "get_dev_preset",
    "preset_telegram_user",
]

DEV_INIT_DATA_PREFIX = "dev:"
REAL_USER_KEY = "real"


@dataclass(frozen=True, slots=True)
class DevUserPreset:
    key: str
    label: str
    description: str
    first_name: str
    last_name: str
    username: str | None
    photo_url: str | None
    telegram_id: int | None
    available_outside_telegram: bool = True


DEV_USERS: tuple[DevUserPreset, ...] = (
    DevUserPreset(
        key="founder",
        label="Основатель стартапа",
        description="Владеет стартапом с вакансиями и откликами.",
        first_name="Иван",
        last_name="Петров",
        username="dev_founder",
        photo_url=None,
        telegram_id=900_000_001,
    ),
    DevUserPreset(
        key="applicant",
        label="Соискатель",
        description="Откликается на вакансии, своих стартапов нет.",
        first_name="Анна",
        last_name="Смирнова",
        username="dev_applicant",
        photo_url=None,
        telegram_id=900_000_002,
    ),
    DevUserPreset(
        key="empty",
        label="Пустой пользователь",
        description="Ни стартапов, ни вакансий, ни откликов.",
        first_name="Павел",
        last_name="Орлов",
        username="dev_empty",
        photo_url=None,
        telegram_id=900_000_003,
    ),
    DevUserPreset(
        key=REAL_USER_KEY,
        label="Реальный пользователь",
        description="Текущий Telegram-аккаунт с проверенным initData.",
        first_name="",
        last_name="",
        username=None,
        photo_url=None,
        telegram_id=None,
        available_outside_telegram=False,
    ),
)

_PRESETS: dict[str, DevUserPreset] = {preset.key: preset for preset in DEV_USERS}

FOUNDER_STARTUP_TITLE = "NeuroPilot AI"


def get_dev_preset(key: str) -> DevUserPreset | None:
    return _PRESETS.get(key)


def build_dev_init_data(key: str) -> str:
    return f"{DEV_INIT_DATA_PREFIX}{key}"


def dev_init_data_key(init_data: str) -> str | None:
    """Return the preset key for a synthetic dev payload, else ``None``."""
    raw = init_data.strip()
    if not raw.startswith(DEV_INIT_DATA_PREFIX):
        return None
    key = raw[len(DEV_INIT_DATA_PREFIX) :]
    return key or None


def preset_telegram_user(preset: DevUserPreset) -> TelegramUser:
    if preset.telegram_id is None:
        raise ValueError(f"dev preset {preset.key!r} has no Telegram identity")
    return TelegramUser(
        telegram_id=preset.telegram_id,
        first_name=preset.first_name,
        last_name=preset.last_name,
        username=preset.username,
        photo_url=preset.photo_url,
    )


async def ensure_dev_presets(session: AsyncSession) -> dict[str, User]:
    """Upsert every preset user and seed the founder's demo content once."""
    repository = UserRepository(session)
    resolved: dict[str, User] = {}
    for preset in DEV_USERS:
        if preset.telegram_id is None:
            continue
        identity = preset_telegram_user(preset)
        resolved[preset.key] = await repository.upsert_telegram_user(
            telegram_id=identity.telegram_id,
            first_name=identity.first_name,
            last_name=identity.last_name,
            username=identity.username,
            photo_url=identity.photo_url,
        )
    await _seed_founder_content(session, resolved)
    return resolved


async def _seed_founder_content(session: AsyncSession, users: dict[str, User]) -> None:
    founder = users.get("founder")
    applicant = users.get("applicant")
    if founder is None or applicant is None:
        return

    existing = await session.execute(select(Startup.id).where(Startup.owner_id == founder.id).limit(1))
    if existing.scalar_one_or_none() is not None:
        return

    startup = Startup(
        owner_id=founder.id,
        title=FOUNDER_STARTUP_TITLE,
        short_description="Платформа подбора инженеров на основе ИИ.",
        description=(
            "NeuroPilot AI автоматизирует первичный скрининг кандидатов: "
            "структурированные интервью, оценка сигналов и рекомендации по найму.\n\n"
            "Демо-стартап создан в DEV-режиме и безопасно удаляется вместе с базой."
        ),
        stage=StartupStage.MVP,
    )
    session.add(startup)
    await session.flush()

    vacancies = [
        Vacancy(
            startup_id=startup.id,
            title="Senior Frontend Developer",
            description="Развитие интерфейсов скрининга и отчётности для нанимающих менеджеров.",
            requirements="React, TypeScript, опыт от 4 лет, работа с дизайн-системой.",
            reward="от 280 000 ₽, удалённый формат.",
        ),
        Vacancy(
            startup_id=startup.id,
            title="Product Designer",
            description="Проектирование сценариев интервью и аналитических дашбордов.",
            requirements="Портфолио B2B-продуктов, Figma, исследования пользователей.",
            reward="от 200 000 ₽, гибкий график.",
        ),
    ]
    session.add_all(vacancies)
    await session.flush()

    now = utc_now()
    session.add_all(
        [
            Application(
                vacancy_id=vacancies[0].id,
                applicant_id=applicant.id,
                motivation=("Пять лет развиваю интерфейсы B2B-продуктов, хочу поучаствовать в построении ИИ-найма."),
                status=ApplicationStatus.PENDING,
                status_changed_at=now,
            ),
            Application(
                vacancy_id=vacancies[1].id,
                applicant_id=applicant.id,
                motivation="Люблю ранние стадии: собираю дизайн-систему с нуля.",
                status=ApplicationStatus.APPROVED,
                status_changed_at=now,
            ),
        ]
    )
    await session.flush()
