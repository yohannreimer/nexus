# Docker VPS + GitHub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Nexus for VPS deployment with Docker Compose and push the project to `github.com/yohannreimer/nexus.git`.

**Architecture:** Build the Vite frontend and Express server in a Node builder stage, then run the compiled server in a slim runtime image. The Express server serves API routes and production static assets from `dist`, while Docker Compose provides Postgres with a persistent volume and runs SQL migrations before app startup.

**Tech Stack:** Docker, Docker Compose, Node 22, Express, Vite, Postgres 16, `pg`.

---

## File Structure

- Create `Dockerfile`: multi-stage Node image for build and runtime.
- Create `docker-compose.yml`: `postgres` and `app` services.
- Create `.dockerignore`: exclude local/build/cache files from Docker context.
- Create `.env.vps.example`: VPS-oriented environment template.
- Create `scripts/run-postgres-migrations.mjs`: runs `postgres/migrations/*.sql` against `DATABASE_URL`.
- Modify `package.json`: add `db:migrate` script.
- Modify `server.ts`: serve `dist` static assets in production.
- Initialize Git repository and push to `https://github.com/yohannreimer/nexus.git`.

## Task 1: Production Static Serving

- [ ] Import Node `fs`/`path` helpers in `server.ts`.
- [ ] Add production-only static serving after API routes and before `app.listen`.
- [ ] Verify `npm run build:server`.

## Task 2: Migration Runner

- [ ] Create `scripts/run-postgres-migrations.mjs`.
- [ ] Add `npm run db:migrate`.
- [ ] Verify script fails clearly without `DATABASE_URL`.

## Task 3: Docker Files

- [ ] Create `.dockerignore`.
- [ ] Create `Dockerfile`.
- [ ] Create `docker-compose.yml`.
- [ ] Create `.env.vps.example`.

## Task 4: Verification

- [ ] Run `npm run build:server`.
- [ ] Run `npm run build`.
- [ ] Run `npm run test`.
- [ ] Run Docker config validation if Docker is available.

## Task 5: GitHub Push

- [ ] Initialize Git repository if missing.
- [ ] Add remote `origin` pointing to `https://github.com/yohannreimer/nexus.git`.
- [ ] Commit all non-ignored project files.
- [ ] Push `main` to origin.
