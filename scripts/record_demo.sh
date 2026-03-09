#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-hermes-demo}"
PROVIDER="${HERMES_DEMO_PROVIDER:-mock}"
PAUSE_SECONDS="${HERMES_DEMO_PAUSE_SECONDS:-10}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/scripts/setup_demo_tmux.sh" "${SESSION_NAME}"

tmux send-keys -t "${SESSION_NAME}:control" \
  "cd ${ROOT_DIR} && python -X utf8 scripts/demo_run.py --provider ${PROVIDER} --pause-seconds ${PAUSE_SECONDS}" \
  C-m

echo "Demo started in tmux session: ${SESSION_NAME}"
echo "Attach with:"
echo "tmux attach -t ${SESSION_NAME}"
