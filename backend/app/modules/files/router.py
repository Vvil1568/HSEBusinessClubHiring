import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, File, Form, Path, UploadFile, status
from fastapi.responses import StreamingResponse

from app.common.exceptions import UnprocessableEntityException
from app.core.config import get_settings
from app.core.dependencies import CurrentUser, FileServiceDep
from app.modules.files.models import FileScope
from app.modules.files.schemas import DeleteResultSchema, StoredFileSchema

router = APIRouter(prefix="/files", tags=["Files"])

FileIdPath = Annotated[uuid.UUID, Path(alias="fileId")]

CHUNK_SIZE = 64 * 1024


async def _iter_upload(upload: UploadFile, limit: int) -> AsyncIterator[bytes]:
    total = 0
    while chunk := await upload.read(CHUNK_SIZE):
        total += len(chunk)
        if total > limit:
            raise UnprocessableEntityException("Файл больше допустимого размера")
        yield chunk


def _resolve_scope(raw: str) -> FileScope:
    try:
        return FileScope(raw)
    except ValueError:
        return FileScope.APPLICATION_ATTACHMENT


def _limit_for(scope: FileScope) -> int:
    settings = get_settings()
    if scope is FileScope.STARTUP_LOGO:
        return settings.max_logo_bytes
    return settings.max_attachment_bytes


@router.post(
    "/upload",
    response_model=StoredFileSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Загрузить файл в хранилище",
)
async def upload_file(
    user: CurrentUser,
    service: FileServiceDep,
    scope: Annotated[str, Form()] = "application-attachment",
    file: Annotated[UploadFile | None, File()] = None,
) -> StoredFileSchema:
    if file is None or not file.filename:
        raise UnprocessableEntityException("Файл не передан")

    resolved_scope = _resolve_scope(scope)
    try:
        stored = await service.upload(
            user=user,
            scope=resolved_scope,
            original_name=file.filename,
            mime_type=file.content_type or "application/octet-stream",
            size=file.size or 0,
            chunks=_iter_upload(file, _limit_for(resolved_scope)),
        )
    finally:
        await file.close()

    return StoredFileSchema(
        id=stored.id,
        name=stored.original_name,
        size=stored.size_bytes,
        mime_type=stored.mime_type,
        url=get_settings().file_url(stored.id),
        created_at=stored.created_at,
    )


@router.get("/{fileId}", summary="Скачать/отобразить файл")
async def download_file(file_id: FileIdPath, user: CurrentUser, service: FileServiceDep) -> StreamingResponse:
    payload = await service.open_for_read(user=user, file_id=file_id)
    encoded_name = payload.stored.original_name.replace('"', "'")
    disposition = "inline" if payload.is_image else f"attachment; filename*=UTF-8''{encoded_name}"
    return StreamingResponse(
        service.read_bytes(payload.stored),
        media_type=payload.mime_type,
        headers={
            "Content-Length": str(payload.size),
            "Content-Disposition": disposition,
            "Cache-Control": "private, max-age=300",
        },
    )


@router.delete("/{fileId}", response_model=DeleteResultSchema, summary="Удалить файл")
async def delete_file(file_id: FileIdPath, user: CurrentUser, service: FileServiceDep) -> DeleteResultSchema:
    await service.delete(user=user, file_id=file_id)
    return DeleteResultSchema()
