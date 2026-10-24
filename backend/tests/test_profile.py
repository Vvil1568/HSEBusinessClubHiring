import pytest
from httpx import AsyncClient

from app.core.config import Settings
from tests.conftest import build_init_data


async def test_dashboard_is_empty_for_new_user(client: AsyncClient) -> None:
    response = await client.get("/api/v1/profile/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["totals"] == {"startups": 0, "vacancies": 0, "applications": 0}
    assert body["recentStartups"] == []
    assert body["myVacancies"] == []
    assert body["myApplications"] == []
    assert body["user"]["telegramId"] == 279058397


async def test_owned_startups_excludes_other_owners(client: AsyncClient) -> None:
    payload = {
        "title": "Mine",
        "shortDescription": "Мой проект.",
        "description": "",
        "logoUrl": None,
        "stage": "idea",
        "vacancies": [],
    }
    assert (await client.post("/api/v1/startups", json=payload)).status_code == 201

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    assert (await client.get("/api/v1/profile/startups")).json() == []
    assert (await client.get("/api/v1/profile/dashboard")).json()["totals"]["startups"] == 0


async def test_dashboard_totals_match_counters(client: AsyncClient) -> None:
    payload = {
        "title": "Counted",
        "shortDescription": "Описание.",
        "description": "",
        "logoUrl": None,
        "stage": "mvp",
        "vacancies": [
            {
                "title": "Role A",
                "description": "",
                "requirements": "",
                "reward": "",
                "isHidden": False,
            },
            {
                "title": "Role B",
                "description": "",
                "requirements": "",
                "reward": "",
                "isHidden": True,
            },
        ],
    }
    created = await client.post("/api/v1/startups", json=payload)
    assert created.status_code == 201
    vacancy_id = created.json()["vacancies"][0]["id"]

    applicant = build_init_data(telegram_id=555666777)
    client.headers["X-Telegram-Init-Data"] = applicant
    await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={"motivation": "Хочу.", "files": []},
    )

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=279058397)
    body = (await client.get("/api/v1/profile/dashboard")).json()
    assert body["totals"] == {"startups": 1, "vacancies": 2, "applications": 0}
    assert body["user"]["startupsCount"] == 1
    assert body["user"]["vacanciesCount"] == 2
    assert body["user"]["applicationsCount"] == 0

    client.headers["X-Telegram-Init-Data"] = applicant
    applicant_body = (await client.get("/api/v1/profile/dashboard")).json()
    assert applicant_body["totals"]["applications"] == 1
    assert len(applicant_body["myApplications"]) == 1


async def test_storage_budget_returns_507(
    client: AsyncClient,
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "storage_budget_bytes", 16)

    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("big.pdf", b"x" * 64, "application/pdf")},
        data={"scope": "application-attachment"},
    )
    assert response.status_code == 507
    assert response.json()["message"] == "Хранилище файлов переполнено"
