from __future__ import annotations

import aiohttp
import asyncio


class ModalHTTPProvider:
    max_concurrency = 1

    def __init__(
        self,
        endpoint_url: str,
        base_model: str,
        adapter_name: str,
        auth_token: str | None = None,
        timeout_seconds: float = 600.0,
        temperature: float = 0.2,
        max_retries: int = 3,
        retry_backoff_seconds: float = 2.0,
    ) -> None:
        self.endpoint_url = endpoint_url.rstrip('/')
        self.base_model = base_model
        self.adapter_name = adapter_name
        self.auth_token = auth_token.strip() if auth_token else None
        self.timeout_seconds = timeout_seconds
        self.temperature = temperature
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds

    async def generate(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str] | None = None,
    ) -> str:
        payload = {
            'base_model_name': self.base_model,
            'adapter_name': self.adapter_name,
            'system_prompt': system_prompt,
            'query': query,
            'max_new_tokens': 256,
            'temperature': self.temperature,
        }
        timeout = aiohttp.ClientTimeout(total=self.timeout_seconds)
        headers = {}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        async with aiohttp.ClientSession(timeout=timeout) as session:
            for attempt in range(self.max_retries + 1):
                async with session.post(f'{self.endpoint_url}/generate', json=payload, headers=headers) as response:
                    if response.status != 429:
                        response.raise_for_status()
                        data = await response.json()
                        return str(data.get('response', ''))

                    if attempt >= self.max_retries:
                        response.raise_for_status()

                    retry_after = response.headers.get('Retry-After')
                    try:
                        delay = float(retry_after) if retry_after else self.retry_backoff_seconds * (attempt + 1)
                    except ValueError:
                        delay = self.retry_backoff_seconds * (attempt + 1)
                    await response.read()
                await asyncio.sleep(delay)
        raise RuntimeError('Modal HTTP inference failed after retries.')
