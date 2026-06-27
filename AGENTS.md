# AGENTS.md

上班摸鱼加班计算器 — a single-page React timer that tracks "fishing" (slacking) minutes and overtime hours, converts them to ¥ earnings against your salary, and visualises monthly / yearly stats on a retro "FISHER-PRO 9000" hardware-style UI. Packaged as a Tauri 2 desktop app (system WebView2, ~2 MB installer). State is persisted in `localStorage` via Zustand (data lives in `%APPDATA%\com.slacker.counter\EBWebView\`).

## Setup commands

- Install deps: `npm install`
- Install Rust: `winget install --id Rustlang.Rustup -e` — required for Tauri
- Start dev:    `npm run dev`                # Tauri dev (Rust main + Vite HMR)
- Web-only dev: `npm run dev:web`            # Pure Vite, no Rust — browser preview only
- Build web:    `npm run build`              # tsc -b && vite build (frontend only)
- Typecheck:    `npm run check`              # tsc -b --noEmit
- Lint:         `npm run lint`               # ESLint 9 flat config
- Preview build:`npm run preview`
- Package Win:  `npm run pack:win`           # tauri build → NSIS installer (~2 MB)

## Project layout

- `src/` — frontend application code
  - `App.tsx` — single-page UI (timer / calendar / stats tabs). Uses `@tauri-apps/api/window` for close/minimize/resize.
  - `main.tsx` — React root, StrictMode
  - `components/Empty.tsx` — placeholder (currently unused by `App.tsx`)
  - `hooks/useTheme.ts` — light/dark theme hook (currently unused by `App.tsx`)
  - `lib/utils.ts` — `cn()` class merge helper
  - `pages/Home.tsx` — empty route page (`react-router-dom` is installed but not wired up)
  - `store/useFishTimerStore.ts` — Zustand store, all business logic + `persist` middleware (localStorage)
- `src-tauri/` — Rust main process (Tauri 2)
  - `src/main.rs` — entry point, delegates to `lib::run`
  - `src/lib.rs` — Tauri builder, registers shell plugin, sets window background color
  - `tauri.conf.json` — window config (decorations: false), bundle targets (NSIS), identifier `com.slacker.counter`
  - `capabilities/default.json` — Tauri 2 permission system (core:default, shell:default)
  - `Cargo.toml` — release profile optimised for size (`lto`, `opt-level="s"`, `strip`)
  - `icons/` — generated icon set (run `cargo tauri icon icons/icon.png` to regenerate)
- `scripts/gen-icon.cjs` — Node script that renders the 1024x1024 placeholder icon (run `node scripts/gen-icon.cjs` if `icons/icon.png` is missing)
- `public/` — static assets (`favicon.svg`)
- `.trae/` — Trae IDE local config (no secrets, safe in repo)
- `index.html` — Vite entry HTML

## Why Tauri

Tauri uses the system WebView2 (Edge) instead of bundling Chromium, so the installer is ~2 MB vs Electron's ~90 MB. Runtime memory is also ~3x lower. Frontend code (React + Zustand) is unchanged — only the 3 window-control IPC calls in `App.tsx` were migrated from `window.slackerAPI` to `getCurrentWindow()`.

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
  1. `npm run dev` → Tauri window opens (NOT a browser tab). First run takes a few minutes while Rust compiles.
  2. Set salary → switch between 月薪 / 年薪 → value persists after restart (data lives in `%APPDATA%\com.slacker.counter\EBWebView\`).
  3. Click red `×` button → window closes. Click yellow `—` → window minimises.
  4. Click `▶ 开始摸鱼` → wait a few seconds → click `■ 停止摸鱼` → timer and `+¥` earned update; persists after restart.
  5. Set overtime hours → net earnings recalculates.
  6. Switch to `▤ 日历` → click a date → record details appear; days with records show a coloured dot.
  7. Switch to `▦ 统计` → monthly + yearly totals render without `NaN` / `undefined`.
  8. Click `⟳` reset → today's record cleared, fishing state stopped.
  9. Resize window (drag corner) — UI reflows correctly. Min width 400, min height 580.
- When adding a test framework later, prefer **Vitest** (Vite-native, zero config) and co-locate as `*.test.ts` / `*.test.tsx`.

## PR & commit conventions

- Branch from `main`; never push directly.
- Commit messages so far are `feat: <chinese description>` — match that style.
- Open PRs via `gh pr create` once `npm run lint && npm run check && npm run build` is green.

## Security

- No secrets committed; no `.env` is used in this project.
- `.gitignore` covers `node_modules`, `dist`, `src-tauri/target`, `release`, and editor cruft — keep it that way.
- Tauri 2 capability system is enforced — frontend can only invoke commands explicitly allowed in `src-tauri/capabilities/default.json`.
- Tauri uses the system WebView2 (sandboxed) instead of bundling Chromium.