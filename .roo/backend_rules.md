# УНИВЕРСАЛЬНЫЙ СТАНДАРТ РАЗРАБОТКИ BACKEND (Python + FastAPI + SQLAlchemy 2.0)

## 1. Категорические запреты (Hard Invariants)

- **Запрещена бизнес-логика в роутерах (контроллерах):** Роутеры отвечают исключительно за HTTP-транспорт: сериализацию/десериализацию через Pydantic, извлечение заголовков/токенов, вызов сервиса и возврат HTTP-кода. Запрещены прямые SQL-запросы, вызовы внешних API и ветвления бизнес-правил внутри роутера.
- **Запрещен доступ к БД в обход репозиториев:** Сервисный слой не выполняет прямые методы `session.execute(...)`. Любая работа с базой данных инкапсулируется в классах репозиториев (`Repository`).
- **Запрещены очевидные и мусорные комментарии:** Никаких `# init app`, `# get user by id`, `# router for items`. Код обязан быть самодокументируемым за счет строгой типизации, понятного именования функций и моделей. Докстринги допустимы только для описания нетривиальных математических алгоритмов или специфичных требований безопасности.
- **Запрещено использование устаревших версий синтаксиса:**
  - Строго нативный синтаксис типов Python 3.10+: `T | None` (вместо `Optional[T]`), `list[T]` (вместо `List[T]`), `dict[K, V]` (вместо `Dict[K, V]`).
  - Строго **SQLAlchemy 2.0**: только декларативный стиль `Mapped[...]`, `mapped_column(...)` и явные конструкции `select(...)`, `insert(...)`, `update(...)`. Запрещены вызовы `session.query()`.
  - Строго **Pydantic v2**: конфигурация через `model_config = ConfigDict(...)`, выгрузка через `.model_dump()`. Методы v1 (`.dict()`, `@validator`) запрещены.
- **Запрещено просачивание инфраструктурных ошибок клиенту:** Исключения СУБД (IntegrityError, ConnectionRefused) перехватываются внутри репозитория/сервиса и транслируются в доменные бизнес-исключения. Клиент никогда не должен получать стек вызовов Postgres.
- **Запрещен синхронный блокирующий I/O:** Любые обращения к сети, базам данных, очередям и дисковым хранилищам выполняются строго через асинхронные интерфейсы (`async / await`).
---

## 2. Архитектура: Модульный монолит (Layered Modular Monolith)

Проект организуется вокруг независимых доменных модулей. Каждый модуль представляет собой замкнутый слой:

```text
app/
├── core/                      # Системное ядро приложения
│   ├── config.py              # Pydantic Settings (чтение .env, порты, секреты)
│   ├── database.py            # Async Engine, sessionmaker, Base класс моделей
│   ├── security.py            # Хеширование, криптография, генерация токенов
│   └── dependencies.py        # Общие DI провайдеры (get_db, get_current_user)
│
├── common/                    # Переиспользуемые утилиты без бизнес-логики
│   ├── exceptions/            # Базовые доменные ошибки и их трансляторы в HTTP
│   └── schemas/               # Базовые схемы (ApiResponse, PaginationParams)
│
├── modules/                   # Бизнес-модули системы
│   └── [domain_module]/       # Пример: users, catalog, orders
│       ├── models.py          # SQLAlchemy 2.0 ORM сущности
│       ├── schemas.py         # Pydantic DTO (Input, Output, Filters)
│       ├── repository.py      # Слой доступа к данным (DAL)
│       ├── service.py         # Бизнес-логика и транзакционные сценарии
│       └── router.py          # HTTP-эндпоинты модуля
│
└── main.py                    # Инициализация FastAPI, middleware, сборка роутеров
```

---

## 3. Правила взаимодействия слоев

```
[ HTTP Request ]
       │
       ▼
┌──────────────┐   Принимает запрос, валидирует входные DTO (Pydantic),
│    Router    │   передает параметры в сервис, возвращает статус-код.
└──────┬───────┘
       │
       ▼
┌──────────────┐   Реализует бизнес-логику, проверяет инварианты,
│   Service    │   управляет правами доступа (ReBAC), генерирует Domain Events.
└──────┬───────┘
       │
       ▼
┌──────────────┐   Инкапсулирует запросы к БД (SQLAlchemy 2.0),
│  Repository  │   управляет пагинацией, фильтрацией и транзакциями.
└──────┬───────┘
       │
       ▼
┌──────────────┐   Декларативное описание схемы таблиц и связей (PostgreSQL).
│    Models    │
└──────────────┘
```

---

## 4. Конвенции типизации и моделей

### 4.1. Слой данных (SQLAlchemy 2.0 ORM)
Все модели наследуются от единого `Base` класса. Поля определяются через явные типы `Mapped`:

```python
from datetime import datetime
import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 4.2. Слой контрактов (Pydantic v2)
Все схемы наследуются от общего `BaseSchema` с включенным чтением ORM-атрибутов:

```python
from pydantic import BaseModel, ConfigDict, Field
import uuid

class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class EntityCreate(BaseSchema):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=1000)

class EntityResponse(EntityCreate):
    id: uuid.UUID
    owner_id: uuid.UUID
```

---

## 5. Паттерн обработки ошибок (Clean Exceptions)

Сервисный слой выбрасывает чистые доменные исключения, **не зависящие от фреймворка FastAPI**:

```python
# app/common/exceptions/domain.py
class DomainException(Exception):
    def __init__(self, message: str):
        self.message = message

class EntityNotFoundException(DomainException): ...
class PermissionDeniedException(DomainException): ...
class EntityConflictException(DomainException): ...
```

В `app/main.py` регистрируются централизованные обработчики, маппящие доменные исключения в стандартизированный ответ:
* `EntityNotFoundException` $\to$ **HTTP 404**
* `PermissionDeniedException` $\to$ **HTTP 403**
* `EntityConflictException` $\to$ **HTTP 409** (нарушение уникальности)
* Стандартный формат тела ошибки: `{"detail": "Понятное описание проблемы"}`.

---

## 6. Управление сессиями и транзакциями (Unit of Work via DI)

- Сессия БД внедряется через `Depends(get_db)`.
- Роутер открывает транзакцию и передает сессию в репозиторий.
- При успешном выполнении сервис выполняет `await session.commit()`.
- При возникновении исключения middleware или dependency производит автоматический `await session.rollback()`.

---

## 7. Протокол контроля качества (Definition of Done)

Задача по бэкенду считается выполненной, если:
1. `uv run ruff check app/` и `uv run ruff format app/` выполняются без замечаний.
2. `uv run mypy app/` проходит в строгом режиме (без ошибок типов).
3. Написаны асинхронные тесты на `pytest` (`pytest-asyncio`), покрывающие Happy Path и краевые случаи (404, 409, 403).
4. Эндпоинты строго соответствуют OpenAPI-спецификации по путям, методам и статус-кодам.