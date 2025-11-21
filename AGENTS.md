# Stressnet Dashboard — Agent Notes

## Project shape
- Workspace root (`package.json`) uses Bun workspaces: `packages/core`, `packages/server`, `packages/client`.
- TypeScript project references: root `tsconfig.json` points to each package; shared compiler defaults in `tsconfig.base.json`.
- Core (`packages/core`): pure logic & types (`src/logic.ts`, `src/types.ts`, `src/index.ts` barrel). No I/O.
- Server (`packages/server`): Express API reading JSON reports from `REPORT_DIR` (default `./reports`), builds in-memory state, serves `/api/timeline` and `/api/workload/:hash/history`.
- Client (`packages/client`): Vite + React TS app; Tailwind configured; main component `src/components/Timeline.tsx`.

## Commands (run from repo root)
- Install deps: `bun install`
- Dev servers: `bun run dev:server` (API), `bun run dev:client` (Vite)
- Typecheck all packages: `bun run typecheck`
- Lint/format (Biome): `bun run lint` / `bun run format`
- Full sanity pass: `bun run check` (format → typecheck → lint)
- Build TS outputs: `bun run build` (tsc -b across packages)

## Notes
- Uses `@stressnet/core` path alias (`tsconfig.base.json`) and workspace dep.
- Node built-ins should be imported with `node:` protocol (Biome rule).
- Server expects JSON reports in `REPORT_DIR`; watching with debounce 500ms.
- Client proxies `/api` to `http://localhost:3000` via `vite.config.ts`.
