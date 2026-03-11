from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextvars import ContextVar
from pathlib import Path
from typing import Any

from core.learned_guidance import LearnedGuidanceLibrary


class TrainedFallbackProvider:
    def __init__(self, root: str | Path, base_provider: object, profile_name: str = 'trained_fallback') -> None:
        self.root = Path(root)
        self.base_provider = base_provider
        self.profile_name = profile_name
        self.timeout_seconds = getattr(base_provider, 'timeout_seconds', 60.0)
        self.temperature = getattr(base_provider, 'temperature', 0.2)
        self.training_summary = self._load_training_summary()
        self.benchmark_summary = self._load_benchmark_summary()
        self.guidance = LearnedGuidanceLibrary(self.root)
        self._backend_var: ContextVar[str] = ContextVar(f'{profile_name}_backend', default=profile_name)
        self._error_var: ContextVar[str | None] = ContextVar('trained_fallback_error', default=None)

    async def generate(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str] | None = None,
    ) -> str:
        trained_prompt = self._build_system_prompt(role, system_prompt, query, context or {})
        response = await self.base_provider.generate(role, trained_prompt, query, context=context)
        backend = type(self.base_provider).__name__
        error = None
        if hasattr(self.base_provider, 'consume_generation_diagnostics'):
            diagnostics = self.base_provider.consume_generation_diagnostics()
            backend = f"{self.profile_name}->{diagnostics.get('backend') or backend}"
            error = diagnostics.get('error')
        else:
            backend = f'{self.profile_name}->{backend}'
        self._backend_var.set(backend)
        self._error_var.set(error)
        return response

    async def generate_stream(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str] | None = None,
    ) -> AsyncIterator[str]:
        if not hasattr(self.base_provider, 'generate_stream'):
            full = await self.generate(role, system_prompt, query, context=context)
            if full:
                yield full
            return
        trained_prompt = self._build_system_prompt(role, system_prompt, query, context or {})
        backend = type(self.base_provider).__name__
        error = None
        async for token in self.base_provider.generate_stream(role, trained_prompt, query, context=context):
            yield token
        if hasattr(self.base_provider, 'consume_generation_diagnostics'):
            diagnostics = self.base_provider.consume_generation_diagnostics()
            backend = f"{self.profile_name}->{diagnostics.get('backend') or backend}"
            error = diagnostics.get('error')
        else:
            backend = f'{self.profile_name}->{backend}'
        self._backend_var.set(backend)
        self._error_var.set(error)

    def _build_system_prompt(
        self,
        role: str,
        system_prompt: str,
        query: str,
        context: dict[str, str],
    ) -> str:
        learned_guidance = self.guidance.format_for_prompt(query)

        lines = [
            system_prompt,
            '',
            'Hermes Ouroboros learned-profile mode is active.',
            'Apply only directly relevant learned reasoning patterns.',
            'Do not mention fallback mode, training records, benchmarks, or prior sessions in the answer.',
            'Global rules: be concrete, avoid filler, surface tradeoffs explicitly, keep the answer internally consistent, and keep the structure crisp.',
        ]

        if learned_guidance and not learned_guidance.startswith('No strongly relevant'):
            lines.extend(
                [
                    '',
                    'Relevant learned guidance:',
                    learned_guidance,
                ]
            )

        # Enforce the structured output format each persona requires.
        # These rules REINFORCE the agent's system prompt — they do not override it.
        if role == 'advocate':
            lines.append(
                'Output format: STEEL-MANNED CASE → STRONGEST EVIDENCE (3 concrete points) → MECHANISM → CONFIDENCE: [0-100].'
            )
        elif role == 'skeptic':
            lines.append(
                'Output format: FALSIFICATION CRITERION → HIDDEN ASSUMPTION → STRONGEST COUNTEREVIDENCE (3 points) → CONFIDENCE THAT THE CLAIM IS FALSE: [0-100].'
            )
        elif role == 'oracle':
            lines.append(
                'Output format: BASE RATE → HIGH-CONFIDENCE FACTS (3 claims) → UNCERTAIN / CONTESTED → CALIBRATION: [probability 0-100%].'
            )
        elif role == 'contrarian':
            lines.append(
                'Output format: REFRAMING → PARADIGM SHIFT → WHAT CONSENSUS GETS BACKWARDS → CONTRARIAN CONFIDENCE: [0-100].'
            )
        elif role == 'researcher':
            lines.append(
                'Produce 3 additional pieces of evidence that would resolve the disagreement. Be concise and factual.'
            )
        elif role == 'arbiter':
            lines.append(
                'Output format: KEY DISAGREEMENTS → EVIDENCE WEIGHING → BAYESIAN UPDATE → FINAL VERDICT → CONFIDENCE SCORE: [0-100] → DISSENTING VIEWS.'
            )

        if context:
            lines.extend(
                [
                    '',
                    'Context to incorporate:',
                    json.dumps(context, ensure_ascii=True),
                ]
            )

        return '\n'.join(lines)

    def _load_training_summary(self) -> str:
        loop_summary = self.root / 'models' / 'loop1_summary.txt'
        if not loop_summary.exists():
            return 'latest loop summary unavailable'

        lines = [line.strip() for line in loop_summary.read_text(encoding='utf-8').splitlines() if ':' in line]
        selected: list[str] = []
        for line in lines:
            key, value = [part.strip() for part in line.split(':', 1)]
            if key in {'High-quality kept', 'Final training loss', 'Model version'}:
                selected.append(f'{key.lower()} {value}')
        return ', '.join(selected) if selected else 'latest loop summary unavailable'

    def _load_benchmark_summary(self) -> dict[str, Any]:
        benchmark_path = self.root / 'benchmark' / 'results_v1.json'
        if not benchmark_path.exists():
            return {}
        try:
            data = json.loads(benchmark_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            return {}
        if not isinstance(data, dict):
            return {}
        return data

    def consume_generation_diagnostics(self) -> dict[str, str | None]:
        return {
            'backend': self._backend_var.get(),
            'error': self._error_var.get(),
        }
