from httpx import AsyncClient

from tests.conftest import build_init_data

STARTUP_PAYLOAD = {
    "title": "SkillBridge",
    "shortDescription": "Менторская платформа для Junior-разработчиков.",
    "description": "Платформа соединяет менторов и джунов.",
    "logoUrl": None,
    "stage": "idea",
    "vacancies": [
        {
            "title": "Frontend Developer",
            "description": "Интерфейс личного кабинета ментора.",
            "requirements": "React, TypeScript.",
            "reward": "от 120 000 ₽.",
            "isHidden": False,
        }
    ],
}


async def test_create_and_read_startup(client: AsyncClient) -> None:
    created = await client.post("/api/v1/startups", json=STARTUP_PAYLOAD)
    assert created.status_code == 201

    body = created.json()
    assert body["title"] == "SkillBridge"
    assert body["logoUrl"] is None
    assert body["stage"] == "idea"
    assert body["vacanciesCount"] == 1
    assert body["applicationsCount"] == 0
    assert body["viewsCount"] == 0
    assert len(body["vacancies"]) == 1
    assert body["vacancies"][0]["title"] == "Frontend Developer"
    assert body["owner"]["telegramId"] == 279058397

    fetched = await client.get(f"/api/v1/startups/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


async def test_startup_details_returns_404_for_unknown_id(client: AsyncClient) -> None:
    response = await client.get("/api/v1/startups/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json()["message"] == "Стартап не найден"


async def test_startup_catalog_paginates_and_searches(client: AsyncClient) -> None:
    await client.post("/api/v1/startups", json={**STARTUP_PAYLOAD, "title": "NeuroPilot AI"})
    await client.post("/api/v1/startups", json={**STARTUP_PAYLOAD, "title": "FinPulse"})

    page = await client.get("/api/v1/startups", params={"page": 1, "pageSize": 1})
    assert page.status_code == 200
    body = page.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["pageSize"] == 1
    assert len(body["items"]) == 1

    search = await client.get("/api/v1/startups", params={"search": "neuro"})
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["title"] == "NeuroPilot AI"


async def test_replace_startup_syncs_vacancies(client: AsyncClient) -> None:
    created = await client.post("/api/v1/startups", json=STARTUP_PAYLOAD)
    startup = created.json()
    kept_id = startup["vacancies"][0]["id"]

    update = {
        "title": "SkillBridge",
        "shortDescription": "Обновлённое описание.",
        "description": "Полное описание.",
        "logoUrl": None,
        "stage": "scaling",
        "vacancies": [
            {
                "id": kept_id,
                "title": "Frontend Developer",
                "description": "Обновлённые обязанности.",
                "requirements": "React, TypeScript, 3 года.",
                "reward": "от 150 000 ₽.",
                "isHidden": False,
            },
            {
                "title": "Backend Developer",
                "description": "Интеграции.",
                "requirements": "Python, FastAPI.",
                "reward": "от 240 000 ₽.",
                "isHidden": True,
            },
        ],
    }
    response = await client.put(f"/api/v1/startups/{startup['id']}", json=update)
    assert response.status_code == 200

    body = response.json()
    assert body["stage"] == "scaling"
    assert body["shortDescription"] == "Обновлённое описание."
    assert body["vacanciesCount"] == 1
    vacancies = {item["title"]: item for item in body["vacancies"]}
    assert set(vacancies) == {"Frontend Developer", "Backend Developer"}
    assert vacancies["Frontend Developer"]["id"] == kept_id
    assert vacancies["Backend Developer"]["isHidden"] is True


async def test_replace_startup_rejects_foreign_owner(client: AsyncClient) -> None:
    created = await client.post("/api/v1/startups", json=STARTUP_PAYLOAD)
    startup_id = created.json()["id"]

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=999000111)
    response = await client.put(f"/api/v1/startups/{startup_id}", json=STARTUP_PAYLOAD)
    assert response.status_code == 403
    assert response.json()["message"] == "Недостаточно прав для изменения этого стартапа"


async def test_create_startup_commits_nothing_when_logo_invalid(client: AsyncClient) -> None:
    payload = {**STARTUP_PAYLOAD, "logoUrl": "/api/v1/files/00000000-0000-0000-0000-000000000000"}
    response = await client.post("/api/v1/startups", json=payload)
    assert response.status_code == 422

    listing = await client.get("/api/v1/startups")
    assert listing.json()["total"] == 0


async def test_owned_startups_and_dashboard(client: AsyncClient) -> None:
    await client.post("/api/v1/startups", json=STARTUP_PAYLOAD)

    owned = await client.get("/api/v1/profile/startups")
    assert owned.status_code == 200
    assert len(owned.json()) == 1

    dashboard = await client.get("/api/v1/profile/dashboard")
    assert dashboard.status_code == 200
    body = dashboard.json()
    assert body["totals"] == {"startups": 1, "vacancies": 1, "applications": 0}
    assert body["user"]["startupsCount"] == 1
    assert len(body["recentStartups"]) == 1
    assert len(body["myVacancies"]) == 1
