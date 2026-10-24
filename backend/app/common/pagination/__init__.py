import math
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Self

from fastapi import Depends, Query
from pydantic import BaseModel, ConfigDict, Field

MAX_PAGE_SIZE = 100


@dataclass(frozen=True, slots=True)
class PaginationParams:
    page: int = 1
    page_size: int = 6

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


def _coerce_int(raw: str | None, default: int) -> int:
    if raw is None:
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def pagination_dependency(default_page_size: int) -> Callable[..., PaginationParams]:
    """Create a dependency that coerces malformed pagination input to defaults."""

    def dependency(
        page: Annotated[str | None, Query(description="Номер страницы, начиная с 1")] = None,
        page_size: Annotated[str | None, Query(alias="pageSize", description="Размер страницы")] = None,
    ) -> PaginationParams:
        return PaginationParams(
            page=_coerce_int(page, 1),
            page_size=min(_coerce_int(page_size, default_page_size), MAX_PAGE_SIZE),
        )

    return dependency


class PageSchema[TItem](BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    items: list[TItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = Field(default=6, serialization_alias="pageSize", validation_alias="pageSize")

    @classmethod
    def build(cls, items: list[TItem], total: int, params: PaginationParams) -> Self:
        return cls(items=items, total=total, page=params.page, page_size=params.page_size)


def total_pages(total: int, page_size: int) -> int:
    return math.ceil(total / page_size) if page_size > 0 else 0


CatalogPagination = Annotated[PaginationParams, Depends(pagination_dependency(6))]
ApplicationPagination = Annotated[PaginationParams, Depends(pagination_dependency(10))]
