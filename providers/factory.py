from __future__ import annotations

from dataclasses import replace

from core.settings import AppSettings, env_value
from learning.model_swapper import ModelSwapper
from providers.mock_provider import MockCouncilProvider
from providers.modal_cli import ModalCLIProvider
from providers.modal_http import ModalHTTPProvider
from providers.openai_compatible import OpenAICompatibleProvider
from providers.trained_fallback import TrainedFallbackProvider



_OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434/v1'


def build_provider(settings: AppSettings) -> object:
    provider_name = settings.provider.name.lower()
    if provider_name == 'mock':
        return MockCouncilProvider()

    if provider_name == 'ollama':
        base_url = settings.provider.base_url or _OLLAMA_DEFAULT_BASE_URL
        return OpenAICompatibleProvider(
            api_key='ollama',
            model=settings.provider.model,
            base_url=base_url,
            timeout_seconds=settings.provider.timeout_seconds,
            temperature=settings.provider.temperature,
            fallback_provider=MockCouncilProvider(),
        )

    if provider_name in {'trained_fallback', 'learned_profile'}:
        # Resolve which base provider to wrap.
        # If the underlying provider is ollama, keep it as ollama.
        # Otherwise fall back to openai_compatible.
        underlying_name = settings.provider.name.lower()
        if underlying_name not in {'openai', 'openai_compatible', 'nous', 'nous_portal', 'ollama'}:
            base_provider_settings = replace(
                settings,
                provider=replace(settings.provider, name='openai_compatible'),
            )
        else:
            base_provider_settings = settings
        base_provider = build_provider(base_provider_settings)
        return TrainedFallbackProvider(
            root=settings.root,
            base_provider=base_provider,
            profile_name='learned_profile' if provider_name == 'learned_profile' else 'trained_fallback',
        )

    if provider_name in {'openai', 'openai_compatible', 'nous', 'nous_portal'}:
        api_key = env_value(settings.provider.api_key_env)
        if not api_key:
            raise RuntimeError(
                f"Provider '{settings.provider.name}' requires env var {settings.provider.api_key_env} to be set."
            )
        return OpenAICompatibleProvider(
            api_key=api_key,
            model=settings.provider.model,
            base_url=settings.provider.base_url,
            timeout_seconds=settings.provider.timeout_seconds,
            temperature=settings.provider.temperature,
            fallback_provider=MockCouncilProvider(),
        )

    if provider_name in {'modal_adapter', 'modal_http'}:
        adapter_name = settings.provider.model
        if adapter_name.lower() in {'active', 'latest', 'trained'}:
            swapper = ModelSwapper(settings.root)
            if adapter_name.lower() == 'active':
                version = swapper.get_active_version()
            else:
                version = swapper.get_latest_version()
            target = swapper.get_inference_target(version)
            if target.get('provider') not in {'modal_adapter', 'modal_http'}:
                raise RuntimeError(
                    f"Resolved trained model '{version}' is not registered for Modal inference."
                )
            adapter_name = str(target.get('model', '')).strip()
            if not adapter_name:
                raise RuntimeError(f"Resolved trained model '{version}' has an empty modal adapter target.")
        if provider_name == 'modal_http':
            endpoint_url = env_value('MODAL_INFERENCE_URL') or settings.provider.base_url
            if not endpoint_url:
                raise RuntimeError(
                    "Provider 'modal_http' requires MODAL_INFERENCE_URL or provider.base_url to be set."
                )
            return ModalHTTPProvider(
                endpoint_url=endpoint_url,
                base_model=settings.learning.base_model,
                adapter_name=adapter_name,
                auth_token=env_value('MODAL_INFERENCE_TOKEN'),
                timeout_seconds=max(settings.provider.timeout_seconds, 600.0),
                temperature=settings.provider.temperature,
            )
        return ModalCLIProvider(
            root=settings.root,
            base_model=settings.learning.base_model,
            adapter_name=adapter_name,
            timeout_seconds=max(settings.provider.timeout_seconds, 600.0),
            temperature=settings.provider.temperature,
        )

    raise RuntimeError(f'Unsupported provider configured: {settings.provider.name}')
