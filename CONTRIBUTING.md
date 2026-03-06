# Contributing to og

Thank you for your interest in contributing. This document covers everything you need to get a local development environment running, the conventions this project follows, and the process for submitting changes.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
  - [Branching](#branching)
  - [Commit Messages](#commit-messages)
  - [Pull Requests](#pull-requests)
- [Code Style](#code-style)
- [Testing](#testing)
- [Database Migrations](#database-migrations)
- [Building for Production](#building-for-production)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to abide by its terms.

---

## Getting Started

### Prerequisites

| Tool    | Minimum version |
|---------|-----------------|
| Node.js | 20              |
| npm     | 10              |
| Git     | 2.x             |

A GitHub account with OAuth credentials is required to run the full authentication flow locally (see [Environment Setup](#environment-setup)).

### Installation

```bash
git clone https://github.com/neikow/og.git
cd og
npm install
```

> `npm install` triggers a `postinstall` script in `apps/api` that rebuilds `better-sqlite3` native bindings for your platform. This is expected and required.

### Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

**Required variables:**

| Variable               | How to obtain                                                                                                                               |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `GITHUB_CLIENT_ID`     | Create a GitHub OAuth App at **Settings → Developer settings → OAuth Apps**. Set the callback URL to `http://localhost:3000/auth/callback`. |
| `GITHUB_CLIENT_SECRET` | Shown once when creating the OAuth App.                                                                                                     |
| `ALLOWED_EMAILS`       | Comma-separated list of GitHub email addresses that are allowed to log in. Add your own.                                                    |
| `SESSION_SECRET`       | Any random string ≥ 32 characters. Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate one.          |

### Running the Project

**Run the database migration first (only needed once, or after pulling schema changes):**

```bash
npm run db:migrate
```

**Start all services in watch mode:**

```bash
npm run dev
```

This uses Turborepo to start both `apps/api` (on port 3000) and `apps/web` (Vite dev server on port 5173) in parallel, with file watching. The Vite dev server proxies all API calls to port 3000, so you only need to open `http://localhost:5173`.

To start a single workspace:

```bash
npm run dev --workspace=apps/api
npm run dev --workspace=apps/web
```

---

## Project Structure

```
og/
├── apps/
│   ├── api/          # Hono backend
│   │   └── src/
│   │       ├── db/           # Drizzle schema + migration runner
│   │       ├── routes/       # One file per resource (templates, fonts, auth, …)
│   │       ├── services/     # Rendering pipeline (transpile, tailwind, satori, cache)
│   │       └── env.ts        # Typed, validated environment config
│   └── web/          # React SPA
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── pages/        # Route-level page components
│           ├── hooks/        # Custom React hooks
│           ├── lib/          # API client, utilities
│           ├── providers/    # React context providers
│           └── test/         # Test files (mirrors src/ structure)
└── packages/
    └── shared/       # Shared TypeScript types — no runtime code
        └── src/
            └── types.ts
```

---

## Development Workflow

### Branching

This project follows [Gitflow](https://nvie.com/posts/a-successful-git-branching-model/).

| Branch | Purpose | Branches from | Merges into |
|---|---|---|---|
| `main` | Production-ready code. Every commit on this branch is a release. Direct pushes are not allowed. | — | — |
| `develop` | Integration branch. All finished work lands here. Merges here trigger a `develop` Docker image build. | `main` | `main` (at release time) |
| `feat/<name>` | New features | `develop` | `develop` |
| `fix/<name>` | Non-urgent bug fixes | `develop` | `develop` |
| `chore/<name>` | Tooling, dependency updates, refactoring | `develop` | `develop` |
| `release/<version>` | Stabilisation before a release (e.g. `release/1.2.0`). Only bugfixes — no new features. | `develop` | `main` + `develop` |
| `hotfix/<name>` | Emergency fix for a production bug. | `main` | `main` + `develop` |

#### Feature / fix / chore branches

Branch from `develop`, do your work, then open a PR back to `develop`.

```bash
git checkout develop && git pull
git checkout -b feat/my-feature
# ... work ...
git push -u origin feat/my-feature
# open PR → develop
```

#### Release branches

When `develop` is ready to ship, cut a `release/<version>` branch for final stabilisation:

```bash
git checkout develop && git pull
git checkout -b release/1.2.0
# Only bugfixes from here — no new features
# Bump version if needed, update CHANGELOG draft
git push -u origin release/1.2.0
```

Once stable, merge into `main` (triggers the Docker image build), tag it (triggers the versioned release), then merge back into `develop` to bring in any stabilisation fixes:

```bash
# Merge into main (via PR or locally)
git checkout main && git merge --no-ff release/1.2.0
npm run release        # bumps version, tags, creates GitHub Release
# Merge back into develop
git checkout develop && git merge --no-ff release/1.2.0
git branch -d release/1.2.0
```

#### Hotfix branches

For urgent production bugs, branch directly from `main`:

```bash
git checkout main && git pull
git checkout -b hotfix/fix-render-crash
# ... fix ...
git push -u origin hotfix/fix-render-crash
```

Open **two** PRs: one targeting `main`, one targeting `develop`. Both must be merged so the fix is not lost when `develop` is next released. After the `main` PR merges, tag it and run the release:

```bash
git checkout main && git pull
npm run release
```

### Commit Messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Commit messages drive the automated changelog and version bumping.

**Format:**

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

**Accepted types:**

| Type       | Changelog section |
|------------|-------------------|
| `feat`     | Features          |
| `fix`      | Bug Fixes         |
| `perf`     | Performance       |
| `refactor` | Refactoring       |
| `docs`     | Documentation     |
| `chore`    | (hidden)          |
| `ci`       | (hidden)          |

**Examples:**

```
feat(api): add tag-based API key restrictions
fix(render): resolve race condition in LRU cache invalidation
perf(tailwind): cache compiled CSS per template
docs: document ASSET_DIR environment variable
chore(deps): update Satori to 0.26.0
```

A commit with a `!` after the type or a `BREAKING CHANGE:` footer creates a major version bump:

```
feat(auth)!: replace cookie sessions with JWT
```

### Pull Requests

1. Open the PR against `develop` (not `main`).
2. Fill in the pull request template.
3. Ensure all CI checks pass (typecheck, tests, build).
4. Request a review. At least one approving review is required before merging.
5. Squash-merge is preferred to keep the history linear.

---

## Code Style

Linting is handled by [ESLint](https://eslint.org) with the [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) preset (flat config, no Prettier).

```bash
# Check for lint errors
npm run lint

# Auto-fix fixable issues
npm run lint:fix
```

The ESLint config enforces consistent formatting (via `eslint-plugin-format`), so there is no separate Prettier step. Your editor will benefit from the ESLint VS Code extension with format-on-save enabled.

**Key conventions:**

- TypeScript strict mode is on everywhere. Avoid `any`; use `unknown` + narrowing.
- Do not use `@ts-ignore`. Use `@ts-expect-error` with a comment explaining why.
- All shared types live in `packages/shared/src/types.ts`. Do not duplicate type definitions between `apps/api` and `apps/web`.
- React components use function declarations, not arrow functions at the top level.
- Hooks go in `apps/web/src/hooks/`, one hook per file.
- API route handlers go in `apps/api/src/routes/`, one file per resource.

---

## Testing

Tests are written with [Vitest](https://vitest.dev) and [Testing Library](https://testing-library.com) (for the web app).

```bash
# Run all tests across the monorepo
npm run test

# Run tests for a single workspace
npm run test --workspace=apps/api
npm run test --workspace=apps/web

# Watch mode (re-runs on file save)
npm run test:watch --workspace=apps/web

# Coverage report
npm run test:coverage --workspace=apps/api
```

**Conventions:**

- Test files live under `src/test/` in each workspace, mirroring the source tree.
- Use `renderWithProviders()` (from `apps/web/src/test/setup.tsx`) instead of bare `render()` for any component that uses `useToast()` or other context-dependent hooks.
- Mock external dependencies (`fetch`, file system, APIs) at the module boundary. Do not make real network calls in tests.
- Test the behaviour, not the implementation. Prefer queries by role, label, or `data-testid` over CSS selectors or component internals.

---

## Database Migrations

The database schema is managed by [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview).

**After modifying `apps/api/src/db/schema.ts`:**

```bash
# Generate a new migration file under apps/api/drizzle/migrations/
npm run db:generate

# Apply all pending migrations to the local database
npm run db:migrate
```

Commit generated migration files alongside the schema change. Never edit migration files that have already been applied to production.

---

## Building for Production

```bash
# Build all workspaces
npm run build
```

Or build the full Docker image:

```bash
docker build -t og .
```

The Dockerfile uses a multi-stage build:

1. **deps** — install all workspace dependencies and rebuild native modules.
2. **build-api** — compile `apps/api` TypeScript to `dist/`.
3. **build-web** — run the Vite build for `apps/web`.
4. **runner** — minimal Node 22 Alpine image; copies only the compiled output, `node_modules`, migrations, and the built SPA.

The final image serves both the API and the frontend SPA on port 3000 under `NODE_ENV=production`.
