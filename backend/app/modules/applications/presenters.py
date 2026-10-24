from app.core.config import Settings
from app.modules.applications.models import Application
from app.modules.applications.repository import ApplicationRow
from app.modules.applications.schemas import ApplicationFileSchema, ApplicationSchema
from app.modules.files.models import StoredFile
from app.modules.startups.models import Startup
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy


def applicant_payload(user: User) -> dict[str, object]:
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "photo_url": user.photo_url,
    }


def logo_url(settings: Settings, file: StoredFile | None) -> str | None:
    if file is None:
        return None
    return settings.file_url(file.id)


def application_file_schema(settings: Settings, file: StoredFile) -> ApplicationFileSchema:
    return ApplicationFileSchema(
        id=file.id,
        name=file.original_name,
        size=file.size_bytes,
        mime_type=file.mime_type,
        url=settings.file_url(file.id),
    )


def application_schema(settings: Settings, row: ApplicationRow) -> ApplicationSchema:
    application: Application = row.application
    vacancy: Vacancy = row.vacancy
    startup: Startup = row.startup
    return ApplicationSchema(
        id=application.id,
        vacancy_id=vacancy.id,
        vacancy_title=vacancy.title,
        startup_id=startup.id,
        startup_title=startup.title,
        startup_logo_url=logo_url(settings, startup.logo),
        applicant=applicant_payload(application.applicant),
        motivation=application.motivation,
        files=[
            application_file_schema(settings, attachment.file)
            for attachment in application.attachments
            if attachment.file is not None
        ],
        status=application.status,
        created_at=application.created_at,
    )
