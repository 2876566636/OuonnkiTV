# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test & Lint Commands

```bash
pnpm install                           # Install all dependencies (frozen-lockfile in CI)
pnpm dev                               # Start Vite dev server on port 3000
pnpm build                             # TypeScript check + Vite production build (prebuild runs cms-core build first)
pnpm test                              # Run all Vitest tests (jsdom environment)
pnpm lint                              # Run ESLint across the project
pnpm --filter @ouonnki/cms-core build  # Build only the CMS core package
pnpm --filter @ouonnki/cms-core test   # Run only CMS core tests
pnpm docker:build                      # Docker Compose build
pnpm docker:up                         # Docker Compose up (port 3000:80)
```

Tests use Vitest with `jsdom`, globals enabled, and only match `src/**/*.test.ts` files. CMS core package has its own Vitest setup.

## Project Architecture

### Monorepo Structure (pnpm workspace)

```
OuonnkiTV/
├── src/                     # Main React app (feature-sliced)
│   ├── app/                 # Entry point, layouts, router
│   ├── features/            # Feature modules (see below)
│   ├── shared/              # Shared components, stores, hooks, lib, types, config
│   └── middleware/           # Vite plugin: proxy-middleware for dev server
├── packages/cms-core/       # @ouonnki/cms-core — headless video source aggregation library
├── shared/proxy-core.js     # Proxy core logic shared across ALL deployment targets
├── api/proxy.ts             # Vercel Serverless Function proxy handler
├── functions/proxy.ts       # Cloudflare Pages Function proxy handler (inline logic)
├── netlify/functions/       # Netlify Serverless Function proxy handler
├── proxy-server.js          # Docker Express proxy (used with Nginx)
├── nginx.conf               # Nginx config for Docker: reverse proxies /proxy → Express, serves SPA
└── supervisord.conf         # Supervisord runs Nginx + Express in Docker
```

### @ouonnki/cms-core (`packages/cms-core/`)

A headless, pure-function, event-driven CMS video source aggregation engine. Framework-agnostic.

Key exports (3 entry points):
- **`@ouonnki/cms-core`** — `createCmsClient`, adapters, search/aggregate/detail/list, parser, events, URL builders
- **`@ouonnki/cms-core/m3u8`** — M3U8 stream filtering, HLS loading, processing
- **`@ouonnki/cms-core/source`** — Video source import, validation, store

Core flow: `createCmsClient(config)` → `client.aggregatedSearch(query, sources, page, signal?)` → concurrent fetch across sources with dedup → `client.getDetail(id, source)` → parsed episodes with play URLs.

Built with `tsup` targeting ESM, with `exports` conditions for `development` (raw TS source) vs production (compiled JS). The monorepo `tsconfig.json` path aliases directly resolve to `packages/cms-core/src/` in development.

### Multi-Platform Proxy Architecture

All proxy implementations serve the same purpose: forward cross-origin requests from the browser to third-party video source APIs. They share the core logic in `shared/proxy-core.js` (plain JS for runtime portability):

- **Vite dev**: `src/middleware/proxy.dev.ts` — a Vite plugin that intercepts `/proxy?url=...` requests
- **Vercel**: `api/proxy.ts` — uses `@vercel/node` types
- **Cloudflare**: `functions/proxy.ts` — **inlines** the proxy logic (Cloudflare Workers cannot import shared modules)
- **Netlify**: `netlify/functions/proxy.ts` — imports from `src/shared/lib/proxy` (which re-exports `shared/proxy-core.js`)
- **Docker**: `proxy-server.js` → Express on port 3001, Nginx reverse-proxies `/proxy` to it

The proxy timeout is configurable via `PROXY_TIMEOUT_MS` env var (range 1000–120000ms, default 15000ms).

### Frontend Architecture (Feature-Sliced Design)

Each feature under `src/features/<name>/` follows a consistent structure:
`components/`, `views/`, `hooks/`, `lib/`, `store/`, `types/`, `constants/`, `index.ts` (public API barrel export).

**Key features**:
| Feature | Purpose |
|---------|---------|
| `home` | Landing page with CMS content carousels, TMDB trending, continue-watching |
| `search` | Federated search across video sources using `@ouonnki/cms-core` aggregated search |
| `media` | TMDB detail page with playlist matching (matches CMS video sources to TMDB metadata) |
| `player` | Unified video player (Artplayer + hls.js), handles both TMDB and CMS direct routes |
| `favorites` | Favorites CRUD with local Zustand store (persisted, covers both TMDB and CMS items) |
| `history` | Viewing history tracking |
| `settings` | Source management (add/edit/import/export, multi-select batch delete via edit mode), playback, network, system, personal config |
| `auth` | Thin re-export of `AuthGuard` component from shared |

**Router** (`src/app/router/index.tsx`): React Router 7 with `createBrowserRouter`. All routes lazy-loaded via `React.lazy`. Key routes: `/` (Home), `/search`, `/favorites`, `/history`, `/media/:type/:tmdbId` (TMDB detail), `/play/:type/:tmdbId` (TMDB-based player), `/play/cms/:sourceCode/:vodId` (CMS direct player), `/settings/*` (nested settings).

### State Management (Zustand)

All stores live in `src/shared/store/`, use Zustand with `immer` + `persist` middlewares, and are DevTools-instrumented. Key stores:

| Store | Key | Purpose |
|-------|-----|---------|
| `useSettingStore` | `ouonnki-tv-setting-store` (v13) | All app settings: network, search, playback, system. Has migration logic across 13 schema versions. |
| `useSearchStore` | `ouonnki-tv-search-store` | Search query + history (respects search settings). |
| `useApiStore` | `ouonnki-tv-api-store` (v6) | Video source CRUD: add/update, remove (single + batch `removeVideoAPIs`), enable/disable, select/deselect all, import, reorder, subscription source management. Wraps `@ouonnki/cms-core/source` pure functions. |
| `useFavoritesStore` | `ouonnki-tv-favorites-store` (v2) | Favorites list with filtering, sorting, tagging. Uses `partialize` to only persist `favorites`. CMS items use `utf8ToBase64` for ID generation (supports CJK characters). |
| `useTmdbStore` | (not persisted) | TMDB search/discover/trending/recommendations with filtering. Uses `latestSearchRequestId` pattern to prevent race conditions. |
| `useViewingHistoryStore` | `ouonnki-tv-viewing-history-store` | Watch progress tracking. |

Store naming convention: persisted stores use `ouonnki-tv-<name>` localStorage keys under Zustand's `persist` middleware.

### TMDB Integration & Playlist Matching

- **TMDB client**: Created via `tmdb-ts`, configured in `src/shared/lib/tmdb.ts` using `OKI_TMDB_API_TOKEN` env var (build-time inlined by Vite) or user-provided token from settings.
- **TMDB base URL proxying**: Both `OKI_TMDB_API_BASE_URL` and `OKI_TMDB_IMAGE_BASE_URL` support absolute URLs or relative paths (e.g., `/tmdb-api`) to proxy through the same origin.
- **Playlist matching** (`src/features/media/components/tmdb-detail/playlistMatcher.ts`): Matches CMS video source items to TMDB titles using Dice coefficient similarity scoring, Chinese number parsing, season hint extraction, and media-type scoring heuristics.

### Environment Variables

All env vars are prefixed with `OKI_` (configured in `vite.config.ts` via `envPrefix: 'OKI_'`). They are **build-time inlined** by Vite for the static frontend. Key variables:

- `OKI_INITIAL_VIDEO_SOURCES` — JSON array or remote URL for initial video sources
- `OKI_TMDB_API_TOKEN` — TMDB Read Access Token
- `OKI_TMDB_API_BASE_URL` / `OKI_TMDB_IMAGE_BASE_URL` — TMDB API/image proxy URLs
- `OKI_ACCESS_PASSWORD` — Site-wide access password (empty = public)
- `OKI_DISABLE_ANALYTICS` — Set to `true` to disable Vercel Analytics/Speed Insights
- `OKI_INITIAL_CONFIG` — Full JSON config import (overrides `OKI_INITIAL_VIDEO_SOURCES`)

### Docker Deployment

Multi-stage Docker build:
1. **Builder stage**: Installs pnpm, copies workspace files, runs `pnpm install --frozen-lockfile`, copies source, builds with `pnpm build`
2. **Production stage**: Alpine + nginx + supervisor, copies dist to `/usr/share/nginx/html`, installs Express for proxy, runs `supervisord` to manage both nginx and the Express proxy

### CSS & Component System

- **TailwindCSS 4** with `@tailwindcss/vite` plugin (Vite-native, no PostCSS config needed)
- **shadcn/ui** (New York style) with `components.json` configured. Base components in `src/shared/components/ui/`, utility in `src/shared/lib/utils.ts` (`cn()` function).
- **CSS variables** enabled for theming (dark/light via `next-themes`)

### CI/CD (`.github/workflows/ci-cd.yml`)

Three jobs: `lint` → `build-and-push` (Docker multi-arch: amd64 + arm64, pushes to GHCR + optionally Docker Hub) → `security-scan` (Trivy on main branch only). Triggered on push to main/develop/tags and PRs to main.

### Commit Convention

`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:`
