import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin
from app.modules.users.models import User

if TYPE_CHECKING:
    from app.modules.files.models import StoredFile
    from app.modules.vacancies.models import Vacancy


class StartupStage(enum.StrEnum):
    IDEA = "idea"
    MVP = "mvp"
    SCALING = "scaling"


class Startup(Base, TimestampMixin):
    __tablename__ = "startups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    short_description: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    stage: Mapped[StartupStage] = mapped_column(
        Enum(StartupStage, name="startup_stage", values_callable=lambda items: [item.value for item in items]),
        nullable=False,
    )
    logo_file_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("files.id", ondelete="SET NULL"),
        default=None,
    )

    owner: Mapped[User] = relationship(lazy="joined")
    logo: Mapped["StoredFile | None"] = relationship(lazy="joined")
    vacancies: Mapped[list["Vacancy"]] = relationship(
        back_populates="startup",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
