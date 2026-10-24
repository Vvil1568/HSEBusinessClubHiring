import sqlite3
from pathlib import Path

from alembic.config import Config

from alembic import command
from app.core import models as _models  # noqa: F401  (registers metadata)
from app.core.database import Base

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_alembic_migration_matches_orm_metadata(tmp_path: Path) -> None:
    database_file = tmp_path / "migration.db"
    url = f"sqlite+aiosqlite:///{database_file.as_posix()}"

    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")

    connection = sqlite3.connect(database_file)
    try:
        migrated = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    finally:
        connection.close()

    expected = set(Base.metadata.tables)
    ignorable = {"alembic_version"}

    assert expected - migrated == set(), "миграция не создаёт часть таблиц"
    assert migrated - expected - ignorable == set(), "миграция создаёт лишние таблицы"
