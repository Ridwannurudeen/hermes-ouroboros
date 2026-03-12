"""HERMES Adversarial Intelligence Engine client."""

from __future__ import annotations

import json
from typing import Any, Dict, Generator, Iterator, Optional

import httpx

from .models import Verdict

DEFAULT_BASE_URL = "https://hermes-ouroboros.online"
DEFAULT_TIMEOUT = 300.0  # council deliberation can take a while


class HermesError(Exception):
    """Base exception for HERMES SDK errors."""

    def __init__(self, message: str, status_code: int = 0, response_body: str = ""):
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body


class RateLimitError(HermesError):
    """Raised when the API rate limit is exceeded."""

    def __init__(self, retry_after: int = 0, **kwargs: Any):
        super().__init__(f"Rate limited. Retry after {retry_after}s.", **kwargs)
        self.retry_after = retry_after


class HermesClient:
    """Synchronous client for the HERMES Adversarial Intelligence Engine.

    Args:
        api_key: Optional API key for authenticated access (30 rpm vs 5 rpm guest).
        base_url: Base URL of the HERMES API. Defaults to the public instance.
        timeout: Request timeout in seconds. Defaults to 300s (council deliberation
                 involves multiple AI agents and can take 30-120s).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self._client: Optional[httpx.Client] = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            headers: Dict[str, str] = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            self._client = httpx.Client(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
            )
        return self._client

    def _handle_error(self, response: httpx.Response) -> None:
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise RateLimitError(
                retry_after=retry_after,
                status_code=429,
                response_body=response.text,
            )
        if response.status_code >= 400:
            raise HermesError(
                message=f"HTTP {response.status_code}: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )

    def query(self, text: str, mode: str = "verify") -> Verdict:
        """Run a query through the HERMES council.

        Args:
            text: The claim, idea, or question to analyze (max 4000 chars).
            mode: Analysis mode — "verify", "red_team", or "research".

        Returns:
            A Verdict object with the council's findings.

        Raises:
            HermesError: On API errors.
            RateLimitError: When rate limit is exceeded.
        """
        client = self._get_client()
        payload = {"query": text, "analysis_mode": mode}
        response = client.post("/api/query", json=payload)
        self._handle_error(response)
        data = response.json()
        return Verdict.from_api_response(data["result"])

    def verify(self, text: str) -> Verdict:
        """Fact-check a claim.

        Shorthand for ``client.query(text, mode="verify")``.
        """
        return self.query(text, mode="verify")

    def red_team(self, text: str) -> Verdict:
        """Stress-test an idea or plan.

        Shorthand for ``client.query(text, mode="red_team")``.
        """
        return self.query(text, mode="red_team")

    def research(self, text: str) -> Verdict:
        """Deep multi-perspective analysis.

        Shorthand for ``client.query(text, mode="research")``.
        """
        return self.query(text, mode="research")

    def stream(self, text: str, mode: str = "verify") -> Iterator[Dict[str, Any]]:
        """Stream council deliberation events via SSE.

        Yields dicts with event data as each agent completes. The final event
        has ``type="final"`` and contains the complete result.

        Event types:
            - ``agent_token``: Incremental token from an agent (role, token).
            - ``agent_complete``: An agent finished (role, preview, duration_seconds).
            - ``final``: Deliberation complete (result dict).
            - ``error``: Something went wrong (message).

        Args:
            text: The claim, idea, or question to analyze.
            mode: Analysis mode — "verify", "red_team", or "research".

        Yields:
            Event dicts from the SSE stream.

        Raises:
            HermesError: On API errors.
        """
        client = self._get_client()
        payload = {"query": text, "analysis_mode": mode}

        with client.stream(
            "POST",
            "/api/query/stream",
            json=payload,
            headers={"Accept": "text/event-stream"},
        ) as response:
            self._handle_error(response)
            buffer = ""
            for chunk in response.iter_text():
                buffer += chunk
                while "\n\n" in buffer:
                    event_text, buffer = buffer.split("\n\n", 1)
                    for line in event_text.strip().split("\n"):
                        if line.startswith("data: "):
                            data_str = line[6:]
                            try:
                                event = json.loads(data_str)
                                yield event
                                if event.get("type") in ("final", "error"):
                                    return
                            except json.JSONDecodeError:
                                continue

    def stream_verdict(self, text: str, mode: str = "verify") -> Verdict:
        """Stream the deliberation and return the final Verdict.

        Like ``stream()`` but consumes all events and returns only the final
        Verdict object. Useful when you want streaming's keep-alive behavior
        without processing intermediate events.
        """
        for event in self.stream(text, mode=mode):
            if event.get("type") == "final":
                return Verdict.from_api_response(event["result"])
            if event.get("type") == "error":
                raise HermesError(event.get("message", "Stream error"))
        raise HermesError("Stream ended without a final event")

    def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None and not self._client.is_closed:
            self._client.close()
            self._client = None

    def __enter__(self) -> HermesClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def __del__(self) -> None:
        self.close()


class AsyncHermesClient:
    """Async client for the HERMES Adversarial Intelligence Engine.

    Same interface as HermesClient but all methods are async.

    Args:
        api_key: Optional API key for authenticated access (30 rpm vs 5 rpm guest).
        base_url: Base URL of the HERMES API. Defaults to the public instance.
        timeout: Request timeout in seconds.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers: Dict[str, str] = {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
            )
        return self._client

    def _handle_error(self, response: httpx.Response) -> None:
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise RateLimitError(
                retry_after=retry_after,
                status_code=429,
                response_body=response.text,
            )
        if response.status_code >= 400:
            raise HermesError(
                message=f"HTTP {response.status_code}: {response.text}",
                status_code=response.status_code,
                response_body=response.text,
            )

    async def query(self, text: str, mode: str = "verify") -> Verdict:
        """Run a query through the HERMES council (async)."""
        client = self._get_client()
        payload = {"query": text, "analysis_mode": mode}
        response = await client.post("/api/query", json=payload)
        self._handle_error(response)
        data = response.json()
        return Verdict.from_api_response(data["result"])

    async def verify(self, text: str) -> Verdict:
        """Fact-check a claim (async)."""
        return await self.query(text, mode="verify")

    async def red_team(self, text: str) -> Verdict:
        """Stress-test an idea or plan (async)."""
        return await self.query(text, mode="red_team")

    async def research(self, text: str) -> Verdict:
        """Deep multi-perspective analysis (async)."""
        return await self.query(text, mode="research")

    async def stream(self, text: str, mode: str = "verify"):
        """Stream council deliberation events via SSE (async).

        Yields event dicts as each agent completes.
        """
        client = self._get_client()
        payload = {"query": text, "analysis_mode": mode}

        async with client.stream(
            "POST",
            "/api/query/stream",
            json=payload,
            headers={"Accept": "text/event-stream"},
        ) as response:
            self._handle_error(response)
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                while "\n\n" in buffer:
                    event_text, buffer = buffer.split("\n\n", 1)
                    for line in event_text.strip().split("\n"):
                        if line.startswith("data: "):
                            data_str = line[6:]
                            try:
                                event = json.loads(data_str)
                                yield event
                                if event.get("type") in ("final", "error"):
                                    return
                            except json.JSONDecodeError:
                                continue

    async def stream_verdict(self, text: str, mode: str = "verify") -> Verdict:
        """Stream the deliberation and return the final Verdict (async)."""
        async for event in self.stream(text, mode=mode):
            if event.get("type") == "final":
                return Verdict.from_api_response(event["result"])
            if event.get("type") == "error":
                raise HermesError(event.get("message", "Stream error"))
        raise HermesError("Stream ended without a final event")

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> AsyncHermesClient:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()


# ---------------------------------------------------------------------------
# Module-level convenience functions
# ---------------------------------------------------------------------------

def verify(text: str, api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> Verdict:
    """Fact-check a claim using HERMES.

    One-shot convenience function. Creates a temporary client, runs the query,
    and returns the Verdict.

    Args:
        text: The claim to fact-check.
        api_key: Optional API key for higher rate limits.
        base_url: API base URL override.

    Returns:
        A Verdict object.
    """
    with HermesClient(api_key=api_key, base_url=base_url) as client:
        return client.verify(text)


def red_team(text: str, api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> Verdict:
    """Stress-test an idea using HERMES.

    One-shot convenience function. Creates a temporary client, runs the query,
    and returns the Verdict.

    Args:
        text: The idea or plan to stress-test.
        api_key: Optional API key for higher rate limits.
        base_url: API base URL override.

    Returns:
        A Verdict object.
    """
    with HermesClient(api_key=api_key, base_url=base_url) as client:
        return client.red_team(text)


def research(text: str, api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> Verdict:
    """Run a deep research analysis using HERMES.

    One-shot convenience function. Creates a temporary client, runs the query,
    and returns the Verdict.

    Args:
        text: The topic or question to research.
        api_key: Optional API key for higher rate limits.
        base_url: API base URL override.

    Returns:
        A Verdict object.
    """
    with HermesClient(api_key=api_key, base_url=base_url) as client:
        return client.research(text)
