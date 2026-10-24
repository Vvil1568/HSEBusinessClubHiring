from httpx import AsyncClient

from tests.conftest import build_init_data

STARTUP = {
    "title": "NeuroPilot AI",
    "shortDescription": "ИИ-ассистент для клиник.",
    "description": "Помогает врачам.",
    "logoUrl": None,
    "stage": "mvp",
    "vacancies": [
        {
            "title": "ML Engineer",
            "description": "Дообучение моделей.",
            "requirements": "PyTorch, NLP.",
            "reward": "от 250 000 ₽.",
            "isHidden": False,
        },
        {
            "title": "Product Designer",
            "description": "Интерфейсы для врачей.",
            "requirements": "Figma, B2B.",
            "reward": "от 180 000 ₽.",
            "isHidden": True,
        },
    ],
}


async def _create_startup(client: AsyncClient) -> dict[str, object]:
    response = await client.post("/api/v1/startups", json=STARTUP)
    assert response.status_code == 201
    return response.json()


async def test_vacancy_catalog_hides_hidden_vacancies(client: AsyncClient) -> None:
    await _create_startup(client)

    public = await client.get("/api/v1/vacancies")
    assert public.status_code == 200
    body = public.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "ML Engineer"
    assert body["items"][0]["startupTitle"] == "NeuroPilot AI"

    owned = await client.get("/api/v1/vacancies", params={"ownerId": "me"})
    assert owned.json()["total"] == 2


async def test_vacancy_catalog_filters_and_sorts(client: AsyncClient) -> None:
    await _create_startup(client)

    by_title = await client.get("/api/v1/vacancies", params={"titles": "ml engineer"})
    assert by_title.json()["total"] == 1

    by_search = await client.get("/api/v1/vacancies", params={"search": "pytorch"})
    assert by_search.json()["total"] == 1

    nothing = await client.get("/api/v1/vacancies", params={"search": "kubernetes"})
    assert nothing.json()["total"] == 0


async def test_vacancy_titles_and_templates(client: AsyncClient) -> None:
    await _create_startup(client)

    titles = await client.get("/api/v1/vacancies/titles")
    assert titles.status_code == 200
    assert titles.json() == ["ML Engineer"]

    templates = await client.get("/api/v1/vacancies/templates")
    assert templates.status_code == 200
    assert len(templates.json()) >= 2
    assert {"id", "title", "description", "requirements", "reward"} <= set(templates.json()[0])


async def test_vacancy_details_exposes_application_context(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    own_view = await client.get(f"/api/v1/vacancies/{vacancy_id}")
    assert own_view.status_code == 200
    assert own_view.json()["isOwner"] is True
    assert own_view.json()["myApplicationStatus"] is None
    assert own_view.json()["startup"]["title"] == "NeuroPilot AI"

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    stranger_view = await client.get(f"/api/v1/vacancies/{vacancy_id}")
    assert stranger_view.json()["isOwner"] is False


async def test_vacancy_details_404(client: AsyncClient) -> None:
    response = await client.get("/api/v1/vacancies/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json()["message"] == "Вакансия не найдена"


async def test_view_tracking_is_idempotent_per_day(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    owner_attempt = await client.post(f"/api/v1/vacancies/{vacancy_id}/view")
    assert owner_attempt.status_code == 200
    assert owner_attempt.json()["tracked"] is False

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    first = await client.post(f"/api/v1/vacancies/{vacancy_id}/view")
    assert first.json()["tracked"] is True
    second = await client.post(f"/api/v1/vacancies/{vacancy_id}/view")
    assert second.json()["tracked"] is False


async def test_apply_creates_application_and_returns_409_on_repeat(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    payload = {"motivation": "Три года в NLP.", "files": []}
    applicant = build_init_data(telegram_id=555666777)
    client.headers["X-Telegram-Init-Data"] = applicant

    created = await client.post(f"/api/v1/vacancies/{vacancy_id}/apply", json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "pending"
    assert body["vacancyTitle"] == "ML Engineer"
    assert body["startupTitle"] == "NeuroPilot AI"
    assert body["applicant"]["telegramId"] == 555666777
    assert body["files"] == []

    repeat = await client.post(f"/api/v1/vacancies/{vacancy_id}/apply", json=payload)
    assert repeat.status_code == 409
    assert repeat.json()["message"] == "Вы уже откликнулись на эту вакансию"


async def test_apply_rejects_empty_motivation(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]
    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)

    response = await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={"motivation": "   ", "files": []},
    )
    assert response.status_code == 422
    assert response.json()["message"] == "Добавьте мотивационное письмо"


async def test_apply_rejects_unknown_attachment(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]
    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)

    response = await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={
            "motivation": "Хочу в команду.",
            "files": [{"id": "00000000-0000-0000-0000-000000000000", "name": "resume.pdf"}],
        },
    )
    assert response.status_code == 422


async def test_owner_cannot_apply_to_own_vacancy(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    response = await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={"motivation": "Себе.", "files": []},
    )
    assert response.status_code == 422


async def test_vacancy_stats_are_owner_only(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    owner_stats = await client.get(f"/api/v1/vacancies/{vacancy_id}/stats")
    assert owner_stats.status_code == 200
    body = owner_stats.json()
    assert len(body["daily"]) == 14
    assert body["daily"][-1]["date"] >= body["daily"][0]["date"]
    assert body["totalViews"] == 0
    assert body["totalApplications"] == 0

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    forbidden = await client.get(f"/api/v1/vacancies/{vacancy_id}/stats")
    assert forbidden.status_code == 403
    assert forbidden.json()["message"] == "Статистика доступна только владельцу стартапа"


async def test_applications_lists_and_status_transitions(client: AsyncClient) -> None:
    startup = await _create_startup(client)
    vacancy_id = startup["vacancies"][0]["id"]  # type: ignore[index]

    applicant_header = build_init_data(telegram_id=555666777)
    client.headers["X-Telegram-Init-Data"] = applicant_header
    created = await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={"motivation": "Хочу в команду.", "files": []},
    )
    application_id = created.json()["id"]

    mine = await client.get("/api/v1/applications/mine")
    assert mine.status_code == 200
    assert mine.json()["total"] == 1

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=279058397)
    inbox = await client.get("/api/v1/applications/inbox")
    assert inbox.status_code == 200
    assert inbox.json()["total"] == 1

    approved = await client.patch(
        f"/api/v1/applications/{application_id}/status",
        json={"status": "approved"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    idempotent = await client.patch(
        f"/api/v1/applications/{application_id}/status",
        json={"status": "approved"},
    )
    assert idempotent.status_code == 200
    assert idempotent.json()["status"] == "approved"

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    forbidden = await client.patch(
        f"/api/v1/applications/{application_id}/status",
        json={"status": "rejected"},
    )
    assert forbidden.status_code == 403


async def test_application_status_404_and_validation(client: AsyncClient) -> None:
    missing = await client.patch(
        "/api/v1/applications/00000000-0000-0000-0000-000000000000/status",
        json={"status": "approved"},
    )
    assert missing.status_code == 404

    invalid = await client.patch(
        "/api/v1/applications/00000000-0000-0000-0000-000000000000/status",
        json={"status": "unknown"},
    )
    assert invalid.status_code == 422
