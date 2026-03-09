# DAY 1 — Foundation
## Goal: Hermes installed, configured, Telegram connected, subagent test passing

---

## CODEX PROMPT — Copy this exactly

> "I am building a project called Hermes Ouroboros on a Linux VPS. Help me complete all steps below in order. After each step, confirm what was done and show any output.
>
> **STEP 1: Install Hermes Agent**
> Run this on the VPS:
> ```bash
> curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
> ```
> Verify installation by running `hermes --version`
>
> **STEP 2: Create project directory**
> ```bash
> mkdir -p ~/hermes-ouroboros
> cd ~/hermes-ouroboros
> ```
>
> **STEP 3: Create config file**
> Copy `~/.hermes/cli-config.yaml.example` to `~/.hermes/cli-config.yaml`
> Set the following:
> - provider: nous_portal
> - model: hermes-3-llama-3.1-8b (or latest available)
> - api_key: placeholder NOUS_API_KEY
>
> **STEP 4: Create .env file**
> Create `~/hermes-ouroboros/.env` with:
> ```
> NOUS_API_KEY=your_key_here
> TELEGRAM_BOT_TOKEN=your_token_here
> TELEGRAM_ALLOWED_USERS=your_telegram_user_id
> MODAL_TOKEN_ID=your_modal_token_id
> MODAL_TOKEN_SECRET=your_modal_token_secret
> ```
>
> **STEP 5: Set up Telegram gateway**
> Follow Hermes docs to configure the Telegram gateway.
> Edit `~/.hermes/cli-config.yaml` to add Telegram bot token.
> Start the gateway process.
>
> **STEP 6: Write test script**
> Create `~/hermes-ouroboros/test_subagent.py`:
> ```python
> # Test that one Hermes subagent spawns and responds correctly
> # Spawn a subagent with prompt: "What is 2+2? Show your reasoning step by step."
> # Print the full response
> # Exit cleanly
> ```
> Implement this using the Hermes Python SDK or subprocess call.
>
> **STEP 7: Run the test**
> Execute `python test_subagent.py` and show the output.
>
> Document every file created, every command run, and every output received."

---

## WHAT SUCCESS LOOKS LIKE

- `hermes --version` returns a version number
- `.env` file exists with all 5 placeholders
- `config.yaml` points to Nous Portal
- Telegram gateway starts without errors
- `test_subagent.py` runs and prints a coherent response

---

## WHAT TO DO AFTER CODEX FINISHES

1. Fill in your real API keys in `.env`
2. Send "hello" to your Telegram bot — it should respond
3. Screenshot the subagent test output
4. Report back — move to DAY2.md

---

## IF SOMETHING FAILS

- Hermes install fails → check Python 3.10+ is installed: `python3 --version`
- Telegram not responding → verify bot token with @BotFather, check allowed users ID
- Subagent test errors → share the error, check Nous Portal API key is valid
