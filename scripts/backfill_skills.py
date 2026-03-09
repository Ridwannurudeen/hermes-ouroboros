from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.skill_creator import SkillCreator


def main() -> None:
    creator = SkillCreator(ROOT)
    created = 0
    updated = 0
    for path in sorted((ROOT / 'sessions').glob('*.json')):
        session = json.loads(path.read_text(encoding='utf-8'))
        if session.get('skill_path'):
            continue
        skill_path = creator.maybe_create_skill(session)
        if not skill_path:
            continue
        session['skill_path'] = skill_path
        path.write_text(json.dumps(session, indent=2), encoding='utf-8')
        created += 1
        updated += 1
    print(f'Created {created} skills and updated {updated} session files.')


if __name__ == '__main__':
    main()
