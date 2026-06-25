# AGENTS.md

上班摸鱼加班计算器 — a single-page React timer that tracks "fishing" (slacking) minutes and overtime hours, converts them to ¥ earnings against your salary, and visualises monthly / yearly stats on a retro "FISHER-PRO 9000" hardware-style UI. State is persisted in `localStorage` via Zustand.

## Setup commands

- Install deps: `npm install`
- Start dev:    `npm run dev`                # Vite, default http://localhost:5173
- Build:        `npm run build`              # tsc -b && vite build
- Typecheck:    `npm run check`              # tsc -b --noEmit
- Lint:         `npm run lint`               # ESLint 9 flat config
- Preview build:`npm run preview`

## Project layout

- `src/` — application code
  - `App.tsx` — single-page UI (timer / calendar / stats tabs)
  - `main.tsx` — React root, StrictMode
  - `components/Empty.tsx` — placeholder (currently unused by `App.tsx`)
  - `hooks/useTheme.ts` — light/dark theme hook (currently unused by `App.tsx`)
  - `lib/utils.ts` — `cn()` class merge helper
  - `pages/Home.tsx` — empty route page (`react-router-dom` is installed but not wired up)
  - `store/useFishTimerStore.ts` — Zustand store, all business logic + `persist` middleware
- `public/` — static assets (`favicon.svg`)
- `.trae/` — Trae IDE local config (no secrets, safe in repo)
- `index.html` — Vite entry HTML

## Code style

- TypeScript with `strict: false` — many strict flags are intentionally off; respect the lenient setup, do not enable `strict` without user consent
- Path alias `@/*` → `./src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- ESLint 9 flat config: `tseslint.configs.recommended` + `react-hooks/recommended` + `react-refresh/only-export-components`
- Tailwind CSS v3 with class-based dark mode (`tailwind.config.js`, `postcss.config.js`)
- Functional components + hooks only; no class components
- The FISHER-PRO 9000 hardware aesthetic relies on heavy inline `style={{...}}` (gradients, layered box-shadow). Don't refactor to Tailwind utilities unless the user asks.
- Run `npm run lint && npm run check` before committing.

## Testing instructions

- **No automated test framework is installed yet.** Verification today is `lint` + `typecheck` + manual smoke.
- Manual smoke checklist after any UI / store change:
  1. `npm run dev` → open the app.
  2. Set salary → switch between 月薪 / 年薪 → value persists after reload.
  3. Click `▶ 开始摸鱼` → wait a few seconds → click `■ 停止摸鱼` → timer and `+¥` earned update; persists after reload.
  4. Set overtime hours → net earnings recalculates.
  5. Switch to `▤ 日历` → click a date → record details appear; days with records show a coloured dot.
  6. Switch to `▦ 统计` → monthly + yearly totals render without `NaN` / `undefined`.
  7. Click `⟳` reset → today's record cleared, fishing state stopped.
- When adding a test framework later, prefer **Vitest** (Vite-native, zero config) and co-locate as `*.test.ts` / `*.test.tsx`.

## PR & commit conventions

- Branch from `main`; never push directly.
- Commit messages so far are `feat: <chinese description>` — match that style.
- Open PRs via `gh pr create` once `npm run lint && npm run check && npm run build` is green.

## Security

- No secrets committed; no `.env` is used in this project.
- `.gitignore` covers `node_modules`, `dist`, and editor cruft — keep it that way.
- `vite-plugin-trae-solo-badge` injects a Trae badge on prod builds — be aware before stripping it from `vite.config.ts`.