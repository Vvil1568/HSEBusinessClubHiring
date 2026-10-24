import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, CreatedAtMixin, TimestampMixin
from app.modules.users.models import User

if TYPE_CHECKING:
    from app.modules.applications.models import Application
    from app.modules.startups.models import Startup


class VacancySortOrder(enum.StrEnum):
    NEW = "new"
    VIEWS = "views"
    APPLICATIONS = "applications"


class Vacancy(Base, TimestampMixin):
    __tablename__ = "vacancies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    startup_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("startups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requirements: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reward: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    startup: Mapped["Startup"] = relationship(back_populates="vacancies")
    applications: Mapped[list["Application"]] = relationship(
        back_populates="vacancy",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    views: Mapped[list["VacancyView"]] = relationship(
        back_populates="vacancy",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class VacancyTemplate(Base, TimestampMixin):
    __tablename__ = "vacancy_templates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requirements: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reward: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class VacancyView(Base, CreatedAtMixin):
    __tablename__ = "vacancy_views"

    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    view_date: Mapped[date] = mapped_column(Date, primary_key=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    vacancy: Mapped[Vacancy] = relationship(back_populates="views")
    user: Mapped[User] = relationship(lazy="joined")

    __table_args__ = (UniqueConstraint("vacancy_id", "user_id", "view_date", name="uq_vacancy_views_key"),)
