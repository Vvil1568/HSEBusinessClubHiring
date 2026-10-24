"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-24

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("telegram_username", sa.String(length=64), nullable=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("photo_url", sa.String(length=512), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("telegram_id", name=op.f("uq_users_telegram_id")),
    )
    op.create_index(op.f("ix_users_telegram_id"), "users", ["telegram_id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_sessions_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_sessions_token_hash")),
    )
    op.create_index(op.f("ix_sessions_user_id"), "sessions", ["user_id"], unique=False)
    op.create_index("ix_sessions_user_expires", "sessions", ["user_id", "expires_at"], unique=False)

    op.create_table(
        "telegram_auth_nonces",
        sa.Column("hash", sa.String(length=64), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("auth_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("hash", name=op.f("pk_telegram_auth_nonces")),
    )
    op.create_index(op.f("ix_telegram_auth_nonces_telegram_id"), "telegram_auth_nonces", ["telegram_id"], unique=False)

    op.create_table(
        "files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_id", sa.Uuid(), nullable=True),
        sa.Column("scope", sa.Enum("startup-logo", "application-attachment", name="file_scope"), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], name=op.f("fk_files_uploaded_by_id_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_files")),
        sa.UniqueConstraint("storage_key", name=op.f("uq_files_storage_key")),
    )
    op.create_index(op.f("ix_files_uploaded_by_id"), "files", ["uploaded_by_id"], unique=False)

    op.create_table(
        "startups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("short_description", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("stage", sa.Enum("idea", "mvp", "scaling", name="startup_stage"), nullable=False),
        sa.Column("logo_file_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], name=op.f("fk_startups_owner_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["logo_file_id"], ["files.id"], name=op.f("fk_startups_logo_file_id_files"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_startups")),
    )
    op.create_index(op.f("ix_startups_owner_id"), "startups", ["owner_id"], unique=False)

    op.create_table(
        "vacancy_templates",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=False),
        sa.Column("reward", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vacancy_templates")),
    )

    op.create_table(
        "vacancies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("startup_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=False),
        sa.Column("reward", sa.String(length=255), nullable=False),
        sa.Column("is_hidden", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["startup_id"], ["startups.id"], name=op.f("fk_vacancies_startup_id_startups"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_vacancies")),
    )
    op.create_index(op.f("ix_vacancies_startup_id"), "vacancies", ["startup_id"], unique=False)

    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("vacancy_id", sa.Uuid(), nullable=False),
        sa.Column("applicant_id", sa.Uuid(), nullable=False),
        sa.Column("motivation", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "rejected", "approved", name="application_status"),
            nullable=False,
        ),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["applicant_id"], ["users.id"], name=op.f("fk_applications_applicant_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["users.id"], name=op.f("fk_applications_reviewed_by_id_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], name=op.f("fk_applications_vacancy_id_vacancies"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_applications")),
        sa.UniqueConstraint("vacancy_id", "applicant_id", name="uq_applications_vacancy_applicant"),
    )
    op.create_index(op.f("ix_applications_applicant_id"), "applications", ["applicant_id"], unique=False)
    op.create_index(op.f("ix_applications_vacancy_id"), "applications", ["vacancy_id"], unique=False)

    op.create_table(
        "application_files",
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("sort_order", sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], name=op.f("fk_application_files_application_id_applications"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["file_id"], ["files.id"], name=op.f("fk_application_files_file_id_files"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("application_id", "file_id", name=op.f("pk_application_files")),
    )

    op.create_table(
        "vacancy_views",
        sa.Column("vacancy_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("view_date", sa.Date(), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_vacancy_views_user_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], name=op.f("fk_vacancy_views_vacancy_id_vacancies"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("vacancy_id", "user_id", "view_date", name=op.f("pk_vacancy_views")),
        sa.UniqueConstraint("vacancy_id", "user_id", "view_date", name="uq_vacancy_views_key"),
    )


def downgrade() -> None:
    op.drop_table("vacancy_views")
    op.drop_table("application_files")
    op.drop_index(op.f("ix_applications_vacancy_id"), table_name="applications")
    op.drop_index(op.f("ix_applications_applicant_id"), table_name="applications")
    op.drop_table("applications")
    op.drop_index(op.f("ix_vacancies_startup_id"), table_name="vacancies")
    op.drop_table("vacancies")
    op.drop_table("vacancy_templates")
    op.drop_index(op.f("ix_startups_owner_id"), table_name="startups")
    op.drop_table("startups")
    op.drop_index(op.f("ix_files_uploaded_by_id"), table_name="files")
    op.drop_table("files")
    op.drop_index(op.f("ix_telegram_auth_nonces_telegram_id"), table_name="telegram_auth_nonces")
    op.drop_table("telegram_auth_nonces")
    op.drop_index("ix_sessions_user_expires", table_name="sessions")
    op.drop_index(op.f("ix_sessions_user_id"), table_name="sessions")
    op.drop_table("sessions")
    op.drop_index(op.f("ix_users_telegram_id"), table_name="users")
    op.drop_table("users")

    for enum_name in ("application_status", "startup_stage", "file_scope"):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
