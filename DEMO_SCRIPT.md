# DEMO SCRIPT — 90 Seconds to $7,500

---

## RECORDING SETUP

**Tools needed:**
- OBS Studio or any screen recorder
- tmux (5-pane terminal layout on VPS)
- Telegram Desktop (visible on screen)
- SSH into VPS

**Resolution**: 1920x1080 minimum
**Audio**: Optional narration OR text overlays
**Length**: 60-90 seconds (no longer)

### Fast VPS commands

```bash
chmod +x scripts/setup_demo_tmux.sh scripts/record_demo.sh
./scripts/record_demo.sh
tmux attach -t hermes-demo
```

Use the live provider when you are ready for the real take:

```bash
HERMES_DEMO_PROVIDER=openai_compatible HERMES_DEMO_PAUSE_SECONDS=10 ./scripts/record_demo.sh
```

Supporting helpers for the later scenes:

```bash
python -X utf8 scripts/show_title_card.py --delay 0.002
python -X utf8 scripts/show_benchmark.py
python -X utf8 scripts/show_loop_complete.py --delay 0.01
```

---

## EXACT SEQUENCE

### [0:00] TITLE CARD — 5 seconds
```
HERMES OUROBOROS
The agent that rewrites its own brain.
```

Optional helper:

```bash
python -X utf8 scripts/show_title_card.py --delay 0.002
```

### [0:05] SHOW THE ARCHITECTURE — 5 seconds
Quick flash of the system diagram from ARCHITECTURE.md
(Screenshot it, show it for 5 seconds)

### [0:10] TELEGRAM QUERY SENT — 5 seconds
Show Telegram Desktop
Type and send: **"Is DeFi the future of finance?"**
Bot replies: **"Council convened. 5 agents dispatched..."**

### [0:15] THE COUNCIL FIRES — 25 seconds
Switch to tmux terminal (5 panes)
Watch ALL 5 panels activate simultaneously:
- Agent outputs start streaming
- Each agent visibly has a different perspective
- Contrarian challenging the consensus
- Oracle pulling raw data
- Conflict detected message appears
- Additional research triggered
- Arbiter begins synthesis

Pane map from the tmux launcher:
- top-left: master log
- top-right: trajectory counter
- bottom-left: advocate
- bottom-middle: skeptic
- bottom-right: arbiter

### [0:40] TELEGRAM VERDICT ARRIVES — 10 seconds
Switch back to Telegram
Show the formatted verdict:
```
🔍 HERMES COUNCIL VERDICT

Query: Is DeFi the future of finance?

VERDICT: DeFi represents a structural shift...
Confidence: 79/100
Key Conflict: Security vs. Accessibility
```

### [0:50] THE LEARNING LOOP — 20 seconds
Show 3 things quickly (5-7 seconds each):

1. Trajectories folder: `ls -la trajectories/` — files accumulating
2. Modal dashboard: GPU job running, loss going down
3. Model registry: v0 → v1 → (v2 incoming)

### [1:10] BENCHMARK PROOF — 10 seconds
Show the comparison table:
```
v0 (base):    Avg Confidence 71/100
v1 (trained): Avg Confidence 79/100  (+11%)
```

### [1:20] THE CLOSE — 10 seconds
Show terminal:
```
LOOP 2 TRIGGERED
52 new trajectories
Training job submitted...
Hermes is becoming.
```

Final text: **"Hermes Ouroboros. Built for @NousResearch hackathon."**

After the council segment, keep one terminal tab ready for:

```bash
python -X utf8 scripts/show_benchmark.py
python -X utf8 scripts/show_loop_complete.py --delay 0.01
```

---

## IF YOU CAN'T GET THE FULL LOOP WORKING

Use this shorter version (Council only — still competitive):

```
[0:00-0:05] Title: "HERMES COUNCIL — 5 agents that argue to find truth"
[0:05-0:10] Send Telegram query
[0:10-0:40] Show 5 terminals firing simultaneously
[0:40-0:55] Show Telegram verdict with confidence score
[0:55-1:10] Run same query again — show it's faster (skills used)
[1:10-1:20] Show skills folder with auto-created files
[1:20-1:30] "The council learns. Every argument makes it smarter."
```

---

## THE TWEET (copy-paste ready)

```
Just shipped Hermes Ouroboros for the @NousResearch hackathon.

5 adversarial agents argue over every question simultaneously.
Their reasoning becomes training data.
The data fine-tunes their own model.
The loop fires again.

Not an agent that does tasks.
An agent that becomes.

[VIDEO]
```

Keep it under 280 characters. Attach the video directly to the tweet.

---

## AFTER POSTING

1. Copy the tweet URL
2. Go to Nous Research Discord
3. Find #submissions channel
4. Paste the tweet URL
5. Done.
