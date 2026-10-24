import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.files.models import FileScope, StoredFile


class FileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, file_id: uuid.UUID) -> StoredFile | None:
        return await self._session.get(StoredFile, file_id)

    async def get_by_keys(self, keys: list[str]) -> list[StoredFile]:
        if not keys:
            return []
        result = await self._session.execute(select(StoredFile).where(StoredFile.storage_key.in_(keys)))
        return list(result.scalars().all())

    async def list_by_ids(self, file_ids: list[uuid.UUID]) -> list[StoredFile]:
        if not file_ids:
            return []
        result = await self._session.execute(select(StoredFile).where(StoredFile.id.in_(file_ids)))
        return list(result.scalars().all())

    async def add(
        self,
        *,
        file_id: uuid.UUID,
        uploaded_by_id: uuid.UUID,
        scope: FileScope,
        original_name: str,
        storage_key: str,
        size_bytes: int,
        mime_type: str,
    ) -> StoredFile:
        entity = StoredFile(
            id=file_id,
            uploaded_by_id=uploaded_by_id,
            scope=scope,
            original_name=original_name,
            storage_key=storage_key,
            size_bytes=size_bytes,
            mime_type=mime_type,
        )
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def delete(self, entity: StoredFile) -> None:
        await self._session.delete(entity)
        await self._session.flush()

    async def total_size(self) -> int:
        result = await self._session.execute(select(StoredFile.size_bytes))
        return sum(result.scalars().all())
