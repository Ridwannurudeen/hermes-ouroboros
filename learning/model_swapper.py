from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ModelSwapper:
    def __init__(self, root: str | Path = '.') -> None:
        self.root = Path(root)
        self.models_dir = self.root / 'models'
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.registry_path = self.models_dir / 'registry.json'

    def register_model(
        self,
        version: str,
        model_name: str,
        adapter_path: str,
        training_loss: float | None,
    ) -> dict[str, Any]:
        registry = self._read_registry()
        registry[version] = {
            'model': model_name,
            'adapter_path': adapter_path,
            'training_loss': training_loss,
            'deployed_at': datetime.now(timezone.utc).isoformat(),
        }
        self._ensure_active_version(registry)
        self.registry_path.write_text(json.dumps(registry, indent=2), encoding='utf-8')
        return registry[version]

    def register_inference_target(
        self,
        version: str,
        provider_name: str,
        target_model: str,
    ) -> dict[str, Any]:
        registry = self._read_registry()
        entry = registry.setdefault(version, {})
        entry['inference_target'] = {
            'provider': provider_name,
            'model': target_model,
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }
        self._ensure_active_version(registry)
        self.registry_path.write_text(json.dumps(registry, indent=2), encoding='utf-8')
        return entry

    def set_active_version(self, version: str) -> dict[str, Any]:
        registry = self._read_registry()
        if version not in registry or not version.startswith('v'):
            raise KeyError(f'Model version not found in registry: {version}')
        registry.setdefault('_meta', {})
        registry['_meta']['active_version'] = version
        registry['_meta']['updated_at'] = datetime.now(timezone.utc).isoformat()
        self.registry_path.write_text(json.dumps(registry, indent=2), encoding='utf-8')
        return registry['_meta']

    def get_active_version(self) -> str:
        registry = self._read_registry()
        meta = registry.get('_meta')
        if isinstance(meta, dict):
            active_version = meta.get('active_version')
            if isinstance(active_version, str) and active_version in registry:
                return active_version
        latest = self.get_latest_version()
        self.set_active_version(latest)
        return latest

    def get_inference_target(self, version: str) -> dict[str, Any]:
        registry = self._read_registry()
        entry = registry.get(version)
        if not entry:
            raise KeyError(f'Model version not found in registry: {version}')
        target = entry.get('inference_target')
        if not isinstance(target, dict):
            raise KeyError(f'No inference target registered for version: {version}')
        return target

    def get_latest_version(self) -> str:
        registry = self._read_registry()
        versions = [key for key in registry if key.startswith('v')]
        if not versions:
            raise KeyError('No model versions found in registry.')
        return max(versions, key=lambda item: int(item[1:]) if item[1:].isdigit() else -1)

    def _read_registry(self) -> dict[str, Any]:
        if not self.registry_path.exists():
            return {
                '_meta': {
                    'active_version': 'v0',
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                },
                'v0': {
                    'model': 'base_hermes_3_8b',
                    'training_loss': None,
                    'deployed_at': None,
                }
            }
        registry = json.loads(self.registry_path.read_text(encoding='utf-8'))
        if not isinstance(registry, dict):
            raise ValueError('Model registry must be a JSON object.')
        self._ensure_active_version(registry)
        return registry

    def _ensure_active_version(self, registry: dict[str, Any]) -> None:
        versions = [key for key in registry if isinstance(key, str) and key.startswith('v')]
        if not versions:
            return
        registry.setdefault('_meta', {})
        meta = registry['_meta']
        if not isinstance(meta, dict):
            registry['_meta'] = {}
            meta = registry['_meta']
        active_version = meta.get('active_version')
        if isinstance(active_version, str) and active_version in registry:
            return
        meta['active_version'] = max(versions, key=lambda item: int(item[1:]) if item[1:].isdigit() else -1)
        meta['updated_at'] = datetime.now(timezone.utc).isoformat()
