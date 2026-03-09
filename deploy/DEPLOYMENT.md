# Hermes Deployment

## What this stack does

- `hermes-api`: runs the browser dashboard and JSON API on port `8000`
- `hermes-bot`: runs the Telegram bot against the same shared data directories
- optional `caddy`: terminates HTTPS and reverse-proxies a real domain to the API

## Prerequisites

- Docker Engine with Compose
- A real `.env` in the repo root
- `HERMES_WEB_TOKEN` set
- `HERMES_AUTH_SECRET` set
- `OPENAI_API_KEY` set
- `HERMES_PUBLIC_BASE_URL` set to the final HTTPS origin you will expose, for example `https://hermes.example.com`
- `HERMES_AUTH_SECRET` must be a random 32+ byte secret

## Bring up the core stack

```bash
cd deploy
docker compose up -d --build
```

## Check health

```bash
docker compose ps
docker compose logs hermes-api --tail=100
docker compose logs hermes-bot --tail=100
curl http://127.0.0.1:8000/api/health
```

## Run behind a real domain

1. Copy `Caddyfile.example` to `Caddyfile`
2. Replace `your-domain.example.com` with the real domain
3. Set `HERMES_PUBLIC_BASE_URL=https://your-domain.example.com` in the repo-root `.env`
4. Point DNS to the server
5. Start the proxy:

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml up -d
```

## Persistent data

The compose stack stores these as Docker named volumes:

- `/app/logs`
- `/app/sessions`
- `/app/trajectories`
- `/app/skills`
- `/app/users`
- `/app/models`

## Important production note

The current `/trained` route still falls back because the Modal trained backend is rate-limited/spend-limited. The deployed product works, but the real adapter-backed path still needs Modal capacity restored.

The Modal inference app is configured to scale to zero when idle. That keeps cost down, but the first request after an idle period will incur a cold start.

`scripts/deploy_modal_inference.py` now generates and persists `MODAL_INFERENCE_TOKEN` automatically when missing. The Modal `/generate` route requires this token; keep it private.

## Share links

- Shared verdict pages are generated at `/share/{share_id}`
- The app will use `HERMES_PUBLIC_BASE_URL` for canonical public share URLs when it is set
- If `HERMES_PUBLIC_BASE_URL` is missing, share links still work, but they fall back to a relative path and are not a safe default for public deployment
