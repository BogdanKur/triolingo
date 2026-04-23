# Triolingo Backend (MVP)

## Stack
- Node.js + TypeScript
- Express
- PostgreSQL
- Redis

## Modules
- `auth`
- `profile`
- `learning`
- `exercise`
- `progress`
- `gamification`
- `notifications`
- `analytics`
- `store`

## Quick Start
1. Copy env:
   - `cp .env.example .env`
2. Install:
   - `npm install`
3. Run migrations:
   - `npm run migrate`
4. Seed data:
   - `npm run seed`
5. Start API:
   - `npm run dev`

API default URL: `http://localhost:4000`

## Real OAuth Setup (Google + Telegram)
Set these variables in `backend/.env` (or compose `.env` in repo root):

- `PUBLIC_API_BASE_URL` (example: `http://localhost:4000`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TELEGRAM_CLIENT_ID`
- `TELEGRAM_CLIENT_SECRET`

### Google OAuth (free)
1. Create project in Google Cloud.
2. Configure OAuth consent screen.
3. Create OAuth Client ID (`Web application`).
4. Add redirect URI:
   - `http://localhost:4000/api/auth/google/callback`
5. Put client id/secret into env vars.

### Telegram OAuth (free)
1. Create bot via `@BotFather`.
2. Configure Telegram Login / OAuth credentials and get:
   - client id
   - client secret
3. Add redirect URI:
   - `http://localhost:4000/api/auth/telegram/callback`
4. Put credentials into env vars.

## Docker Compose
From repo root:
- `npm run infra:up`
- `npm run infra:down`

## Tests
- Unit + integration + contract:
  - `npm run test`
