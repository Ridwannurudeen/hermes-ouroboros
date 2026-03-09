from __future__ import annotations

from contextvars import ContextVar

from openai import AsyncOpenAI


class OpenAICompatibleProvider:
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str | None = None,
        timeout_seconds: float = 60.0,
        temperature: float = 0.2,
        fallback_provider: object | None = None,
    ) -> None:
        self.model = model
        self.temperature = temperature
        self.timeout_seconds = timeout_seconds
        self.fallback_provider = fallback_provider
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout_seconds)
        self._backend_var: ContextVar[str] = ContextVar('openai_backend', default='unknown')
        self._error_var: ContextVar[str | None] = ContextVar('openai_error', default=None)

    async def generate(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str] | None = None,
    ) -> str:
        try:
            response = await self._create_completion(system_prompt, query, include_temperature=True)
            self._backend_var.set('openai')
            self._error_var.set(None)
            return response.choices[0].message.content or ''
        except Exception as exc:
            if self._should_retry_without_temperature(exc):
                response = await self._create_completion(system_prompt, query, include_temperature=False)
                self._backend_var.set('openai')
                self._error_var.set('retried_without_temperature')
                return response.choices[0].message.content or ''
            if self.fallback_provider is None:
                raise
            self._backend_var.set(type(self.fallback_provider).__name__)
            self._error_var.set(str(exc))
            return await self.fallback_provider.generate(
                role,
                system_prompt,
                query,
                context=context,
            )

    def consume_generation_diagnostics(self) -> dict[str, str | None]:
        return {
            'backend': self._backend_var.get(),
            'error': self._error_var.get(),
        }

    async def _create_completion(self, system_prompt: str, query: str, include_temperature: bool):
        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': query},
            ],
        }
        if include_temperature:
            payload['temperature'] = self.temperature
        return await self.client.chat.completions.create(**payload)

    def _should_retry_without_temperature(self, exc: Exception) -> bool:
        message = str(exc).lower()
        return 'temperature' in message and 'unsupported' in message
