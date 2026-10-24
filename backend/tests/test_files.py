import uuid

from httpx import AsyncClient

from tests.conftest import build_init_data

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 128


async def _upload(client: AsyncClient, *, scope: str, name: str, content: bytes, mime: str) -> dict[str, object]:
    response = await client.post(
        "/api/v1/files/upload",
        files={"file": (name, content, mime)},
        data={"scope": scope},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_upload_and_download_logo(client: AsyncClient) -> None:
    stored = await _upload(
        client,
        scope="startup-logo",
        name="logo.png",
        content=PNG_BYTES,
        mime="image/png",
    )
    assert stored["name"] == "logo.png"
    assert stored["mimeType"] == "image/png"
    assert stored["url"] == f"/api/v1/files/{stored['id']}"
    assert stored["size"] == len(PNG_BYTES)

    downloaded = await client.get(f"/api/v1/files/{stored['id']}")
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"].startswith("image/png")
    assert downloaded.headers["content-disposition"] == "inline"
    assert downloaded.content == PNG_BYTES


async def test_upload_rejects_oversized_logo(client: AsyncClient) -> None:
    payload = b"\x89PNG" + b"\x00" * (2 * 1024 * 1024 + 16)
    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("big.png", payload, "image/png")},
        data={"scope": "startup-logo"},
    )
    assert response.status_code == 422


async def test_upload_rejects_wrong_mime_for_logo(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/files/upload",
        files={"file": ("doc.pdf", b"%PDF-1.4", "application/pdf")},
        data={"scope": "startup-logo"},
    )
    assert response.status_code == 422
    assert "Логотип" in response.json()["message"]


async def test_delete_file_only_for_owner(client: AsyncClient) -> None:
    stored = await _upload(
        client,
        scope="application-attachment",
        name="resume.pdf",
        content=b"%PDF-1.4",
        mime="application/pdf",
    )

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    forbidden = await client.delete(f"/api/v1/files/{stored['id']}")
    assert forbidden.status_code == 403

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=279058397)
    deleted = await client.delete(f"/api/v1/files/{stored['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}

    again = await client.get(f"/api/v1/files/{stored['id']}")
    assert again.status_code == 404


async def test_attachment_flow_into_application(client: AsyncClient) -> None:
    startup_payload = {
        "title": "FinPulse",
        "shortDescription": "Финтех-аналитика.",
        "description": "Аналитика для команд.",
        "logoUrl": None,
        "stage": "mvp",
        "vacancies": [
            {
                "title": "Data Analyst",
                "description": "Аналитика.",
                "requirements": "SQL.",
                "reward": "от 190 000 ₽.",
                "isHidden": False,
            }
        ],
    }
    startup = (await client.post("/api/v1/startups", json=startup_payload)).json()
    vacancy_id = startup["vacancies"][0]["id"]

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=555666777)
    attachment = await _upload(
        client,
        scope="application-attachment",
        name="resume.pdf",
        content=b"%PDF-1.4 resume",
        mime="application/pdf",
    )

    created = await client.post(
        f"/api/v1/vacancies/{vacancy_id}/apply",
        json={
            "motivation": "Готов обсудить задачи.",
            "files": [{"id": attachment["id"], "name": "forged.pdf", "size": 1, "url": "/evil"}],
        },
    )
    assert created.status_code == 201
    files = created.json()["files"]
    assert len(files) == 1
    assert files[0]["name"] == "resume.pdf"
    assert files[0]["url"] == f"/api/v1/files/{attachment['id']}"

    owner_download = await client.get(f"/api/v1/files/{attachment['id']}")
    assert owner_download.status_code == 200

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=279058397)
    owner_view = await client.get(f"/api/v1/files/{attachment['id']}")
    assert owner_view.status_code == 200

    client.headers["X-Telegram-Init-Data"] = build_init_data(telegram_id=999000111)
    stranger = await client.get(f"/api/v1/files/{attachment['id']}")
    assert stranger.status_code == 403


async def test_logo_can_be_attached_to_startup(client: AsyncClient) -> None:
    logo = await _upload(
        client,
        scope="startup-logo",
        name="neuropilot-logo.png",
        content=PNG_BYTES,
        mime="image/png",
    )
    payload = {
        "title": "NeuroPilot AI",
        "shortDescription": "ИИ-ассистент.",
        "description": "Описание.",
        "logoUrl": logo["url"],
        "stage": "idea",
        "vacancies": [],
    }
    created = await client.post("/api/v1/startups", json=payload)
    assert created.status_code == 201
    assert created.json()["logoUrl"] == logo["url"]

    removed = await client.put(
        f"/api/v1/startups/{created.json()['id']}",
        json={**payload, "logoUrl": None},
    )
    assert removed.status_code == 200
    assert removed.json()["logoUrl"] is None


async def test_attachment_scope_is_enforced_for_logo_url(client: AsyncClient) -> None:
    attachment = await _upload(
        client,
        scope="application-attachment",
        name="resume.pdf",
        content=b"%PDF-1.4",
        mime="application/pdf",
    )
    payload = {
        "title": "Wrong Logo",
        "shortDescription": "Описание.",
        "description": "",
        "logoUrl": attachment["url"],
        "stage": "idea",
        "vacancies": [],
    }
    response = await client.post("/api/v1/startups", json=payload)
    assert response.status_code == 422


async def test_download_unknown_file_returns_404(client: AsyncClient) -> None:
    response = await client.get(f"/api/v1/files/{uuid.uuid4()}")
    assert response.status_code == 404
