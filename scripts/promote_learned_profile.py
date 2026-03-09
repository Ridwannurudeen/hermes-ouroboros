from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from learning.model_swapper import ModelSwapper


def main() -> int:
    swapper = ModelSwapper(ROOT)
    version = swapper.get_latest_version()
    entry = swapper.register_inference_target(
        version=version,
        provider_name='learned_profile',
        target_model='learned_profile',
    )
    swapper.set_active_version(version)
    print(f'Promoted {version} to learned_profile.')
    print(entry['inference_target'])
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
