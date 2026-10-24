from httpx import AsyncClient

from tests.conftest import build_init_data


async def test_auth_requires_init_data(client: AsyncClient) -> None:
    anonymous = AsyncClient(transport=client._transport, base_url="http://testserver")
    async with anonymous as http_client:
        response = await http_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["message"] == "Требуется авторизация"


async def test_telegram_auth_creates_session_and_returns_counters(client: AsyncClient) -> None:
    init_data = build_init_data(telegram_id=111222333, first_name="Иван", last_name="Петров")
    response = await client.post("/api/v1/auth/telegram", json={"initData": init_data})
    assert response.status_code == 200

    body = response.json()
    assert body["user"]["telegramId"] == 111222333
    assert body["user"]["firstName"] == "Иван"
    assert body["user"]["lastName"] == "Петров"
    assert body["user"]["startupsCount"] == 0
    assert "hb_session" in response.cookies
    assert body["expiresAt"].endswith("Z")


async def test_telegram_auth_rejects_replayed_init_data(client: AsyncClient) -> None:
    init_data = build_init_data(telegram_id=444555666)
    first = await client.post("/api/v1/auth/telegram", json={"initData": init_data})
    assert first.status_code == 200

    second = await client.post("/api/v1/auth/telegram", json={"initData": init_data})
    assert second.status_code == 401
    assert "message" in second.json()


async def test_telegram_auth_rejects_expired_init_data(client: AsyncClient) -> None:
    import time

    stale = build_init_data(telegram_id=777888999, auth_date=int(time.time()) - 200_000)
    response = await client.post("/api/v1/auth/telegram", json={"initData": stale})
    assert response.status_code == 401


async def test_telegram_auth_rejects_bad_signature(client: AsyncClient) -> None:
    forged = build_init_data(telegram_id=123123123).replace("hash=", "hash=0", 1)
    response = await client.post("/api/v1/auth/telegram", json={"initData": forged})
    assert response.status_code == 401


async def test_current_user_returns_telegram_profile(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["telegramId"] == 279058397
    assert set(body) == {"id", "telegramId", "firstName", "lastName", "photoUrl"}
