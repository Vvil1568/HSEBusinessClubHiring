import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, SmallInteger, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.modules.files.models import StoredFile
from app.modules.users.models import User

if TYPE_CHECKING:
    from app.modules.vacancies.models import Vacancy


class ApplicationStatus(enum.StrEnum):
    PENDING = "pending"
    REJECTED = "rejected"
    APPROVED = "approved"


class Application(Base, TimestampMixin):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    applicant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    motivation: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(
            ApplicationStatus,
            name="application_status",
            values_callable=lambda items: [item.value for item in items],
        ),
        nullable=False,
        default=ApplicationStatus.PENDING,
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        default=None,
    )
    status_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    applicant: Mapped[User] = relationship(foreign_keys=[applicant_id], lazy="joined")
    reviewer: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id], lazy="joined")
    vacancy: Mapped["Vacancy"] = relationship(back_populates="applications")
    attachments: Mapped[list["ApplicationFile"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ApplicationFile.sort_order",
    )

    __table_args__ = (UniqueConstraint("vacancy_id", "applicant_id", name="uq_applications_vacancy_applicant"),)


class ApplicationFile(Base):
    __tablename__ = "application_files"

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"),
        primary_key=True,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)

    application: Mapped[Application] = relationship(back_populates="attachments")
    file: Mapped[StoredFile] = relationship(lazy="joined")
