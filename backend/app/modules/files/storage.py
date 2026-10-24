import asyncio
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import httpx

from app.common.exceptions import InsufficientStorageException
from app.core.config import Settings


class StorageError(Exception):
    pass


class StorageObjectNotFound(StorageError):
    pass


class FileStorage(Protocol):
    async def put(self, key: str, chunks: AsyncIterator[bytes], *, content_type: str) -> int: ...

    def stream(self, key: str) -> AsyncIterator[bytes]: ...

    async def delete(self, key: str) -> None: ...


class DufsFileStorage:
    def __init__(self, base_url: str, credentials: tuple[str, str] | None) -> None:
        self._base_url = base_url.rstrip("/")
        self._auth = credentials

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            auth=self._auth,
            follow_redirects=False,
        )

    async def put(self, key: str, chunks: AsyncIterator[bytes], *, content_type: str) -> int:
        total = 0

        async def body() -> AsyncIterator[bytes]:
            nonlocal total
            async for chunk in chunks:
                total += len(chunk)
                yield chunk

        try:
            async with self._client() as client:
                response = await client.put(
                    f"{self._base_url}/{key}",
                    content=body(),
                    headers={"Content-Type": content_type},
                )
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise StorageError("Не удалось сохранить файл") from error
        return total

    async def stream(self, key: str) -> AsyncIterator[bytes]:
        client = self._client()
        try:
            async with client.stream("GET", f"{self._base_url}/{key}") as response:
                if response.status_code == 404:
                    raise StorageObjectNotFound(key)
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    yield chunk
        except httpx.HTTPError as error:
            raise StorageError("Не удалось прочитать файл") from error
        finally:
            await client.aclose()

    async def delete(self, key: str) -> None:
        try:
            async with self._client() as client:
                response = await client.delete(f"{self._base_url}/{key}")
                if response.status_code == 404:
                    raise StorageObjectNotFound(key)
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise StorageError("Не удалось удалить файл") from error


class LocalFileStorage:
    """Filesystem backend used when dufs is not provisioned (local runs, tests)."""

    def __init__(self, root: Path) -> None:
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        return self._root / key

    async def put(self, key: str, chunks: AsyncIterator[bytes], *, content_type: str) -> int:
        _ = content_type
        target = self._path(key)
        total = 0
        try:
            with target.open("wb") as handle:
                async for chunk in chunks:
                    handle.write(chunk)
                    total += len(chunk)
        except OSError as error:
            target.unlink(missing_ok=True)
            raise StorageError("Не удалось сохранить файл") from error
        return total

    async def stream(self, key: str) -> AsyncIterator[bytes]:
        target = self._path(key)
        if not target.exists():
            raise StorageObjectNotFound(key)
        with target.open("rb") as handle:
            while chunk := handle.read(64 * 1024):
                yield chunk
                await asyncio.sleep(0)

    async def delete(self, key: str) -> None:
        target = self._path(key)
        await asyncio.to_thread(target.unlink, missing_ok=True)


@dataclass(frozen=True, slots=True)
class StorageUpload:
    key: str
    size: int


class StorageGateway:
    def __init__(self, storage: FileStorage, settings: Settings) -> None:
        self._storage = storage
        self._settings = settings

    async def store(self, *, scope_key: uuid.UUID, chunks: AsyncIterator[bytes], content_type: str) -> int:
        key = str(scope_key)
        size = await self._storage.put(key, chunks, content_type=content_type)
        if size == 0:
            await self._storage.delete(key)
            raise StorageError("Файл пустой")
        return size

    def read(self, key: str) -> AsyncIterator[bytes]:
        return self._storage.stream(key)

    async def remove(self, key: str) -> None:
        try:
            await self._storage.delete(key)
        except StorageObjectNotFound:
            return

    def assert_budget(self, used_bytes: int, upcoming_bytes: int) -> None:
        if used_bytes + upcoming_bytes > self._settings.storage_budget_bytes:
            raise InsufficientStorageException()


StorageFactory = Callable[[Settings], FileStorage]

_STORAGE_SINGLETONS: dict[tuple[str, str], FileStorage] = {}


def build_storage(settings: Settings) -> FileStorage:
    """Return a process-wide storage handle; backends are stateless and reusable."""
    cache_key = (settings.storage_backend, settings.local_storage_path or settings.dufs_base_url)
    existing = _STORAGE_SINGLETONS.get(cache_key)
    if existing is not None:
        return existing

    created: FileStorage
    if settings.storage_backend == "dufs":
        created = DufsFileStorage(settings.dufs_base_url, settings.dufs_credentials)
    else:
        created = LocalFileStorage(Path(settings.local_storage_path))
    _STORAGE_SINGLETONS[cache_key] = created
    return created


AsyncBytesFactory = Callable[[], Awaitable[AsyncIterator[bytes]]]
