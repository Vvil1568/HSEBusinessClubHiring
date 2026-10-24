import asyncio
import time
from collections import deque

from app.common.exceptions import RateLimitExceededException


class SlidingWindowRateLimiter:
    """Process-local sliding window limiter for low-cost abuse protection."""

    def __init__(self, *, max_events: int, window_seconds: int) -> None:
        self._max_events = max_events
        self._window_seconds = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = asyncio.Lock()

    async def hit(self, key: str) -> None:
        now = time.monotonic()
        async with self._lock:
            bucket = self._events.setdefault(key, deque())
            self._evict(bucket, now)
            if len(bucket) >= self._max_events:
                retry_after = max(1, int(self._window_seconds - (now - bucket[0])))
                raise RateLimitExceededException(retry_after=retry_after)
            bucket.append(now)

    def _evict(self, bucket: deque[float], now: float) -> None:
        threshold = now - self._window_seconds
        while bucket and bucket[0] <= threshold:
            bucket.popleft()
        if not bucket:
            for key, candidate in list(self._events.items()):
                if not candidate:
                    del self._events[key]
