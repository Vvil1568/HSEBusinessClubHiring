import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import (
    EntityNotFoundException,
    PermissionDeniedException,
    UnprocessableEntityException,
)
from app.core.config import Settings
from app.modules.applications.models import Application, ApplicationFile
from app.modules.files.models import FileScope, StoredFile
from app.modules.files.repository import FileRepository
from app.modules.files.storage import FileStorage, StorageError, StorageGateway, StorageObjectNotFound
from app.modules.startups.models import Startup
from app.modules.users.models import User
from app.modules.vacancies.models import Vacancy

LOGO_MIME_TYPES = frozenset(
    {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
        "image/svg+xml",
    }
)
DEFAULT_MIME_TYPE = "application/octet-stream"


@dataclass(frozen=True, slots=True)
class FilePayload:
    stored: StoredFile
    mime_type: str
    size: int
    is_image: bool


class FileService:
    def __init__(self, session: AsyncSession, settings: Settings, storage: FileStorage) -> None:
        self._session = session
        self._settings = settings
        self._storage = StorageGateway(storage, settings)
        self._repository = FileRepository(session)

    async def upload(
        self,
        *,
        user: User,
        scope: FileScope,
        original_name: str,
        mime_type: str,
        size: int,
        chunks: AsyncIterator[bytes],
    ) -> StoredFile:
        resolved_mime = (mime_type or DEFAULT_MIME_TYPE).lower().split(";")[0].strip()
        self._validate(scope=scope, mime_type=resolved_mime, size=size)

        used_bytes = await self._repository.total_size()
        self._storage.assert_budget(used_bytes, size)

        file_id = uuid.uuid4()
        storage_key = str(file_id)
        try:
            written = await self._storage.store(
                scope_key=file_id,
                chunks=chunks,
                content_type=resolved_mime,
            )
        except StorageError as error:
            raise UnprocessableEntityException("Не удалось загрузить файл") from error

        entity = await self._repository.add(
            file_id=file_id,
            uploaded_by_id=user.id,
            scope=scope,
            original_name=self._normalize_name(original_name),
            storage_key=storage_key,
            size_bytes=written,
            mime_type=resolved_mime,
        )
        await self._session.commit()
        return entity

    async def open_for_read(self, *, user: User, file_id: uuid.UUID) -> FilePayload:
        stored = await self._repository.get(file_id)
        if stored is None:
            raise EntityNotFoundException("Файл не найден")
        await self._assert_readable(user=user, stored=stored)
        return FilePayload(
            stored=stored,
            mime_type=stored.mime_type,
            size=stored.size_bytes,
            is_image=stored.mime_type in LOGO_MIME_TYPES,
        )

    def read_bytes(self, stored: StoredFile) -> AsyncIterator[bytes]:
        return self._storage.read(stored.storage_key)

    async def delete(self, *, user: User, file_id: uuid.UUID) -> None:
        stored = await self._repository.get(file_id)
        if stored is None:
            raise EntityNotFoundException("Файл не найден")
        if stored.uploaded_by_id is None or stored.uploaded_by_id != user.id:
            raise PermissionDeniedException("Нет доступа к этому файлу")

        await self._storage.remove(stored.storage_key)
        await self._repository.delete(stored)
        await self._session.commit()

    async def resolve_owned_logo(self, *, user: User, logo_url: str | None) -> StoredFile | None:
        if logo_url is None or not logo_url.strip():
            return None
        stored = await self._repository.get(self._extract_file_id(logo_url))
        if stored is None:
            raise UnprocessableEntityException("Логотип не найден в хранилище")
        if stored.scope is not FileScope.STARTUP_LOGO:
            raise UnprocessableEntityException("Файл не является логотипом стартапа")
        if stored.uploaded_by_id != user.id:
            raise UnprocessableEntityException("Логотип загружен другим пользователем")
        return stored

    async def resolve_attachments(self, *, user: User, file_ids: list[uuid.UUID]) -> list[StoredFile]:
        if len(file_ids) > self._settings.max_attachments_per_application:
            raise UnprocessableEntityException("Можно приложить не больше 5 файлов")
        if not file_ids:
            return []

        found = {item.id: item for item in await self._repository.list_by_ids(file_ids)}
        resolved: list[StoredFile] = []
        for file_id in file_ids:
            stored = found.get(file_id)
            if stored is None or stored.scope is not FileScope.APPLICATION_ATTACHMENT:
                raise UnprocessableEntityException("Файл не найден в хранилище")
            if stored.uploaded_by_id not in {None, user.id}:
                raise UnprocessableEntityException("Файл загружен другим пользователем")
            resolved.append(stored)
        return resolved

    async def _assert_readable(self, *, user: User, stored: StoredFile) -> None:
        if stored.scope is FileScope.STARTUP_LOGO:
            return
        if stored.uploaded_by_id == user.id:
            return

        statement = (
            select(ApplicationFile.application_id)
            .join(Application, Application.id == ApplicationFile.application_id)
            .join(Vacancy, Vacancy.id == Application.vacancy_id)
            .join(Startup, Startup.id == Vacancy.startup_id)
            .where(ApplicationFile.file_id == stored.id)
            .where((Application.applicant_id == user.id) | (Startup.owner_id == user.id))
            .limit(1)
        )
        allowed = (await self._session.execute(statement)).scalar_one_or_none()
        if allowed is None:
            raise PermissionDeniedException("Нет доступа к этому файлу")

    def _validate(self, *, scope: FileScope, mime_type: str, size: int) -> None:
        if size <= 0:
            raise UnprocessableEntityException("Файл не передан")
        if scope is FileScope.STARTUP_LOGO:
            if size > self._settings.max_logo_bytes:
                raise UnprocessableEntityException("Файл больше 2 МБ")
            if mime_type not in LOGO_MIME_TYPES:
                raise UnprocessableEntityException("Логотип должен быть изображением PNG, JPG, WEBP, GIF или SVG")
            return
        if size > self._settings.max_attachment_bytes:
            raise UnprocessableEntityException("Файл больше 10 МБ")

    @staticmethod
    def _extract_file_id(logo_url: str) -> uuid.UUID:
        candidate = logo_url.strip().rstrip("/").rsplit("/", maxsplit=1)[-1]
        try:
            return uuid.UUID(candidate)
        except ValueError as error:
            raise UnprocessableEntityException("Ссылка на логотип недействительна") from error

    @staticmethod
    def _normalize_name(original_name: str) -> str:
        name = (original_name or "file").replace("\\", "/").rsplit("/", maxsplit=1)[-1].strip()
        return (name or "file")[:255]


StorageMissing = StorageObjectNotFound
