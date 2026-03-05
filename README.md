# og

A self-hosted Open Graph image generation service. Author dynamic OG image templates as React (TSX) components with Tailwind CSS, render them on demand via a REST API, and manage everything through a built-in browser-based editor.

## Features

- **Browser-based template editor** — full Monaco (VS Code) editor with live preview and hot-reloading
- **TSX + Tailwind CSS** — write templates as React components; Tailwind utility classes are resolved to inline styles at render time via Satori
- **Variable schemas** — define typed variables in your `Props` interface; the editor syncs them automatically to a form for easy testing
- **Font management** — upload local font files (TTF/OTF/WOFF) or pull any variant directly from Google Fonts
- **Image gallery** — upload named assets and reference them inside templates via a `Gallery` helper
- **REST API** — render any template as a PNG via `GET /og/:uuid?var=value`; protected by scoped API keys
- **LRU cache** — rendered PNGs are cached in memory (50 MB, 24 h) and invalidated automatically when a template is saved
- **GitHub OAuth** — allowlist-based authentication; no database of users to manage
- **Single container** — ships as a multi-arch Docker image (`linux/amd64`, `linux/arm64`) with SQLite and all assets on a single volume

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| API framework | [Hono](https://hono.dev) |
| Database | SQLite via [Drizzle ORM](https://orm.drizzle.team) |
| OG rendering | [Satori](https://github.com/vercel/satori) + [resvg-js](https://github.com/yisibl/resvg-js) |
| CSS processing | Tailwind CSS v4 (`compile()` API) |
| Frontend | React 18 + Vite 6 |
| Code editor | Monaco Editor |
| Auth | GitHub OAuth2 via [Arctic](https://arcticjs.dev) |
| Monorepo | npm workspaces + [Turborepo](https://turbo.build) |

## Quick Start

### Docker (recommended)

```bash
docker run -d \
  --name og \
  -p 3000:3000 \
  -v og-data:/app/data \
  -e GITHUB_CLIENT_ID=your_client_id \
  -e GITHUB_CLIENT_SECRET=your_client_secret \
  -e ALLOWED_EMAILS=you@example.com \
  -e SESSION_SECRET=a_long_random_secret \
  ghcr.io/neikow/og:latest
```

Then open `http://localhost:3000`.

### Docker Compose

```yaml
services:
  og:
    image: ghcr.io/neikow/og:latest
    ports:
      - "3000:3000"
    volumes:
      - og-data:/app/data
    environment:
      GITHUB_CLIENT_ID: your_client_id
      GITHUB_CLIENT_SECRET: your_client_secret
      ALLOWED_EMAILS: you@example.com
      SESSION_SECRET: a_long_random_secret
      # FRONTEND_URL: https://og.yourdomain.com  # set in production

volumes:
  og-data:
```

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` to get started.

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | — | GitHub OAuth App client secret |
| `ALLOWED_EMAILS` | Yes | — | Comma-separated list of GitHub email addresses allowed to log in |
| `SESSION_SECRET` | Yes | — | Random string used to sign session cookies (min 32 characters) |
| `DATABASE_URL` | No | `./data/og.db` | Path to the SQLite database file |
| `FONT_DIR` | No | `./data/fonts` | Directory for uploaded font files |
| `ASSET_DIR` | No | `./data/assets` | Directory for uploaded gallery image files |
| `PORT` | No | `3000` | HTTP port the server listens on |
| `FRONTEND_URL` | No | `http://localhost:5173` | Public URL of the frontend (used for OAuth redirect URI in development) |
| `NODE_ENV` | No | `development` | Set to `production` to serve the frontend SPA from the API |

### GitHub OAuth App

Create a GitHub OAuth App at **Settings → Developer settings → OAuth Apps** with:

- **Homepage URL:** `http://localhost:3000` (or your production URL)
- **Authorization callback URL:** `http://localhost:3000/auth/callback` (or your production URL)

## API

### Render an OG image

```
GET /og/:templateId?variable=value
```

Requires an `Authorization: Bearer <api-key>` header or an `api_key` query parameter.

Returns a `image/png` response. Rendered images are cached; the response includes `ETag` and `Cache-Control: public, max-age=86400` headers.

**Example:**

```bash
curl -H "Authorization: Bearer og_..." \
  "https://og.yourdomain.com/og/abc-123?title=Hello+World&author=Jane" \
  --output og.png
```

### API Keys

API keys are created in the dashboard. Each key can optionally be restricted to specific template tags. Keys are stored as SHA-256 hashes; the raw value is shown only once on creation.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

**Quick start:**

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# 3. Run migrations
npm run db:migrate

# 4. Start all services
npm run dev
```

The API starts at `http://localhost:3000` and the frontend dev server at `http://localhost:5173`.

## Deployment

### Docker

Build the image locally:

```bash
docker build -t og .
```

The image is also published automatically to GHCR on every version tag:

```
ghcr.io/neikow/og:latest          # latest stable release
ghcr.io/neikow/og:1.2.3           # specific version
ghcr.io/neikow/og:develop         # latest develop build
```

### Releasing a new version

Releases follow [Conventional Commits](https://www.conventionalcommits.org/). From the `main` branch with a clean working directory:

```bash
npm run release
```

This runs `release-it`, which bumps the version, updates `CHANGELOG.md`, creates a git tag (`v1.2.3`), and creates a GitHub Release. The `release.yml` workflow then builds and pushes the Docker image automatically.

## Project Structure

```
og/
├── apps/
│   ├── api/          # Hono backend — rendering, auth, CRUD, migrations
│   └── web/          # React SPA — editor, dashboard, font/asset management
├── packages/
│   └── shared/       # Shared TypeScript types consumed by both apps
├── .github/
│   ├── workflows/    # CI (typecheck, test, build) and Release (Docker push)
│   └── dependabot.yml
├── Dockerfile        # Multi-stage production image
├── turbo.json        # Turborepo task graph
└── .env.example      # Environment variable reference
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Security

Please do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

[AGPL-3.0](LICENSE)
