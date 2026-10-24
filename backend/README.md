# Business Club · Hiring Platform — Backend

FastAPI + SQLAlchemy 2.0 (async) + Alembic. Implements the contract in
[`docs/openapi.yml`](../docs/openapi.yml) on top of the schema in
[`docs/database/database.md`](../docs/database/database.md), following
[`.roo/backend_rules.md`](../.roo/backend_rules.md).

## Layered architecture

```text
app/
├── core/            # settings, async engine/session, security, rate limiting, DI
├── common/          # domain exceptions, pagination, shared Pydantic contracts
├── modules/         # domain modules (models / schemas / repository / service / router)
│   ├── users/         Telegram initData auth, sessions, nonces
│   ├── files/         storage proxy (dufs or local FS) + file index
│   ├── startups/      startup catalog and atomic startup+vacancies editor
│   ├── vacancies/     catalog, details, view tracking, apply, owner stats
│   ├── applications/  "my" / inbox lists and status moderation
│   └── profile/       aggregated dashboard and owned startups
└── main.py          # app factory, exception handlers, CORS, dual /api and /api/v1 mounting
```

Routers only handle HTTP transport, services own business rules, repositories own SQL.
Every domain error is a framework-agnostic exception mapped centrally to
`{"message": "…"}` with the status code from the specification.

## API surface

Mounted twice, at `/api/v1` and `/api` (see the `servers` section of the spec):

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/app-config` | Public runtime flags: `production`, `devMode`, `devUsers` |
| POST | `/auth/telegram` | HMAC-SHA256 check, `auth_date` freshness, replay protection, `hb_session` cookie |
| GET | `/auth/me` | Current Telegram profile |
| POST | `/auth/dev-login` | DEV only: issue a session for a preset identity |
| GET | `/profile/dashboard`, `/profile/startups` | Aggregated profile |
| GET/POST | `/startups` | Catalog (search, paging) and atomic creation |
| GET/PUT | `/startups/{startupId}` | Detail and full replacement (vacancy set sync) |
| GET | `/vacancies`, `/vacancies/titles`, `/vacancies/templates` | Catalog, dictionaries |
| GET | `/vacancies/{vacancyId}` | Detail with `myApplicationStatus` / `isOwner` |
| POST | `/vacancies/{vacancyId}/view` | Idempotent per UTC calendar day |
| POST | `/vacancies/{vacancyId}/apply` | Creates `pending` application |
| GET | `/vacancies/{vacancyId}/stats` | Owner only, 14 daily points |
| GET | `/applications/mine`, `/applications/inbox` | Applicant / owner lists |
| PATCH | `/applications/{applicationId}/status` | Idempotent moderation |
| POST/GET/DELETE | `/files/upload`, `/files/{fileId}` | Storage proxy, cookie-authenticated reads |

## Authentication

`POST /auth/telegram` verifies the raw `Telegram.WebApp.initData` string:

1. `data_check_string` from all fields except `hash`, sorted by name;
2. `HMAC-SHA256(HMAC-SHA256("WebAppData", TELEGRAM_BOT_TOKEN), data_check_string)`,
   compared with `hmac.compare_digest`;
3. `auth_date` freshness against `INIT_DATA_MAX_AGE`;
4. signature fingerprint recorded in `telegram_auth_nonces` (replay protection);
5. user upsert by `telegram_id`, then a `sessions` row holding only the token hash.

Protected endpoints accept either the HttpOnly `hb_session` cookie or the
`X-Telegram-Init-Data` header. The cookie is required for `<img src>` logo
requests, which the browser issues without JS.

## DEV mode

Test mode is opt-in and can never be activated in production:

| Variable | Default | Purpose |
|---|---|---|
| `DEV_MODE` | `false` | Enables `/auth/dev-login`, accepts `initData=dev:<key>`, and mounts the frontend user switcher |
| `DEV_DEFAULT_USER` | `founder` | Preset used when DEV mode resolves a sessionless request |

`Settings.dev_mode_enabled` returns `DEV_MODE and not is_production`, so a stray
`DEV_MODE=1` inside a production `.env` is ignored.

What DEV mode relaxes:

1. `POST /auth/telegram` accepts synthetic `dev:<key>` payloads **instead of**
   verifying the HMAC — the strict branch is still the only one reachable when
   DEV mode is off.
2. A request with neither a session cookie nor `initData` resolves the preset
   from `DEV_DEFAULT_USER` instead of returning `401`.
3. `POST /auth/dev-login` exists; in strict mode both it and `/auth/app-config`
   report `devMode: false` and `devUsers: []`.

Presets (`backend/app/core/dev_users.py`) are deterministic, seeded on startup:

| Key | Identity | Seeded content |
|---|---|---|
| `founder` | Основатель стартапа | `NeuroPilot AI` with two vacancies and two incoming applications |
| `applicant` | Соискатель | two applications to the founder's vacancies |
| `empty` | Пустой пользователь | no startups, vacancies or applications |
| `real` | Реальный пользователь | the signed Telegram account; requires a real `X-Telegram-Init-Data` |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/businessclub` | Async DSN |
| `TELEGRAM_BOT_TOKEN` | – (required) | Bot secret used for HMAC |
| `INIT_DATA_MAX_AGE` | `86400` | Max `auth_date` age, seconds |
| `SESSION_TTL` | `86400` | Session/cookie lifetime, seconds |
| `SESSION_SECRET` | – | Reserved for signed-cookie deployments |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated exact origins |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Base for generated URLs |
| `FILES_PUBLIC_PREFIX` | `/api/v1/files` | Public file proxy prefix |
| `STORAGE_BACKEND` | `local` | `local` or `dufs` |
| `LOCAL_STORAGE_PATH` | `./data/uploads` | Used when `STORAGE_BACKEND=local` |
| `DUFS_BASE_URL` | `http://dufs:5000` | dufs base URL |
| `DUFS_AUTH` | – | `user:password` for dufs basic auth |
| `STORAGE_BUDGET_BYTES` | `536870912` | Total attachment budget → `507` when exceeded |

| Limit | Value |
|---|---|
| `startup-logo` | ≤ 2 MB, `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml` |
| `application-attachment` | ≤ 10 MB, any MIME |
| Attachments per application | 5 |

## Local development

```bash
cd backend
uv sync --all-groups          # install runtime + dev dependencies
uv run alembic upgrade head   # apply the schema
uv run uvicorn app.main:app --reload
```

The OpenAPI UI is available at `/docs`, the raw schema at `/api/v1/openapi.json`.

## Quality gates

```bash
uv run ruff check app/ tests/
uv run ruff format --check app/ tests/
uv run mypy app/
uv run pytest
```

`mypy` runs in strict mode. The test suite is async (`pytest-asyncio`) and covers the
happy paths plus `403`, `404`, `409`, `422`, `507`-adjacent validation, replay
protection, per-day view idempotency, file ownership, and Alembic/ORM schema parity.

## Migrations

```bash
uv run alembic revision --autogenerate -m "change"
uv run alembic upgrade head
```

`alembic/env.py` reuses `app.core.database.Base.metadata` and honors an explicitly
configured `sqlalchemy.url` (used by the parity test) before falling back to
`DATABASE_URL`.
