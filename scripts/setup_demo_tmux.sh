#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${1:-hermes-demo}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs/demo"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required but not installed." >&2
  echo "Install it first, for example: sudo apt-get update && sudo apt-get install -y tmux" >&2
  exit 1
fi

mkdir -p "${LOG_DIR}"
for name in master advocate skeptic oracle contrarian arbiter telegram; do
  : > "${LOG_DIR}/${name}.log"
done

if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
  tmux kill-session -t "${SESSION_NAME}"
fi

tmux new-session -d -s "${SESSION_NAME}" -n control -c "${ROOT_DIR}"
tmux send-keys -t "${SESSION_NAME}:control" "printf 'Run the demo from here:\npython -X utf8 scripts/demo_run.py --provider mock --pause-seconds 10\n\nSwitch to the recording window when the logs start moving.\n'" C-m

tmux new-window -t "${SESSION_NAME}" -n recording -c "${ROOT_DIR}"

tmux send-keys -t "${SESSION_NAME}:recording.0" "tail -n 80 -F logs/demo/master.log" C-m
tmux split-window -h -t "${SESSION_NAME}:recording.0" -c "${ROOT_DIR}"
tmux send-keys -t "${SESSION_NAME}:recording.1" "bash -lc 'while true; do clear; date; echo; printf \"Trajectory files\\n---------------\\n\"; ls -lh trajectories 2>/dev/null; echo; printf \"Line counts\\n-----------\\n\"; wc -l trajectories/*.jsonl 2>/dev/null || true; sleep 1; done'" C-m
tmux split-window -v -t "${SESSION_NAME}:recording.0" -c "${ROOT_DIR}"
tmux send-keys -t "${SESSION_NAME}:recording.2" "tail -n 60 -F logs/demo/advocate.log" C-m
tmux split-window -v -t "${SESSION_NAME}:recording.1" -c "${ROOT_DIR}"
tmux send-keys -t "${SESSION_NAME}:recording.3" "tail -n 60 -F logs/demo/skeptic.log" C-m
tmux split-window -h -t "${SESSION_NAME}:recording.2" -c "${ROOT_DIR}"
tmux send-keys -t "${SESSION_NAME}:recording.4" "tail -n 60 -F logs/demo/arbiter.log" C-m
tmux select-layout -t "${SESSION_NAME}:recording" tiled

tmux select-pane -t "${SESSION_NAME}:recording.0" -T "Master Log"
tmux select-pane -t "${SESSION_NAME}:recording.1" -T "Trajectory Counter"
tmux select-pane -t "${SESSION_NAME}:recording.2" -T "Advocate"
tmux select-pane -t "${SESSION_NAME}:recording.3" -T "Skeptic"
tmux select-pane -t "${SESSION_NAME}:recording.4" -T "Arbiter"

tmux set-option -t "${SESSION_NAME}" mouse on
tmux set-option -t "${SESSION_NAME}" pane-border-status top
tmux select-window -t "${SESSION_NAME}:recording"

echo "Created tmux session: ${SESSION_NAME}"
echo "Window 1: control"
echo "Window 2: recording"
echo
echo "Attach with:"
echo "tmux attach -t ${SESSION_NAME}"
