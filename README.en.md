<div align="center">

# FISHER-PRO 9000

### A retro timer that turns slacking minutes and overtime hours into ¥ earnings.

Type in your salary, hit `▶ 开始摸鱼` when you zone out, and watch the LCD count up the money you've effectively earned by not working. Built as a love letter to chunky 90s industrial hardware.

[Features](#features) · [Quick Start](#getting-started) · [Smoke Test](#manual-smoke-test) · [Roadmap](#roadmap)

</div>

---

## Table of Contents

<details>
<summary>Click to expand</summary>

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Layout](#project-layout)
- [Manual Smoke Test](#manual-smoke-test)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgments](#acknowledgments)

</details>

---

## About the Project

上班摸鱼加班计算器 — literally "workplace slacking & overtime calculator" — is a single-page React app that puts a number on your day. Punch in your monthly or yearly salary, set your work hours, click `▶ 开始摸鱼` whenever you zone out, and the LCD screen keeps a live tally of the money you've effectively earned by not working. Punch in overtime hours at the end of the day and the same screen shows you the damage.

The **FISHER-PRO 9000** shell is a love letter to chunky 90s industrial hardware: olive-grey chassis, green LCD with scan lines, monospace everywhere. It's a small toy, but it's honest about the math.

```
   ┌─────────────────────────────────┐
   │  ◈  FISHER-PRO 9000  ◈          │
   │                                 │
   │  ● 摸鱼中       09:00–18:00     │
   │                                 │
   │       00 : 23 : 47              │
   │                                 │
   │  EARNED           RATE/H        │
   │  ¥3.91            ¥56.8         │
   └─────────────────────────────────┘
```

> [!NOTE]
> This is a side-project toy, not a productivity tool. Treat the numbers as a vibe, not financial advice.

### Built with

[![React][react-shield]][react-url]
[![Vite][vite-shield]][vite-url]
[![TypeScript][ts-shield]][ts-url]
[![Tailwind CSS][tailwind-shield]][tailwind-url]
[![Zustand][zustand-shield]][zustand-url]
[![Local-First][storage-shield]](#tech-stack)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Features

- Live fishing timer with `▶ 开始摸鱼` / `■ 停止摸鱼`. Earnings update every 100ms against your real-time hourly rate.
- Toggle between monthly and yearly salary on the fly. Hourly rate recalculates instantly.
- Custom AM / PM work hours. Set both shifts; the app figures out your effective hourly rate (22 working days / month).
- Overtime logging. Enter hours after work, see them as a red `-¥` against your fishing earnings.
- Calendar view. Month-by-month heatmap of days with records; coloured dots flag positive (green) vs negative (red) net days.
- Monthly and yearly stats. Totals, fish time, overtime hours, net earnings per period.
- Local-first persistence. Zustand `persist` middleware writes to `localStorage` key `fish-timer-storage-v2`. No backend, no signup, no telemetry.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Tech Stack

| Layer | Choice | Why |
| ----- | ------ | --- |
| UI framework | React 18 | Functional components + hooks only |
| Language | TypeScript (`strict: false`) | Pragmatic; many strict flags intentionally off |
| Build tool | Vite 6 | Fast dev server, instant HMR |
| Styling | Tailwind CSS 3 + heavy inline `style` | Utility classes plus retro gradients and layered shadows |
| State | Zustand 5 + `persist` middleware | Local state + `localStorage` in one move |
| Icons | lucide-react | A few accent icons where needed |
| Plugin | `vite-plugin-trae-solo-badge` | Injects a Trae badge on production builds |

> [!TIP]
> The FISHER-PRO 9000 look depends on heavy inline `style={{...}}` (gradients and layered `box-shadow`). Don't refactor those into Tailwind utilities unless you want the aesthetic to drift.

### How the math works

- **Hourly rate (monthly salary)** = `salary / 22 / workHoursPerDay`
- **Hourly rate (yearly salary)** = `salary / 12 / 22 / workHoursPerDay`
- **Fishing earnings** = `fishingTime(h) × hourlyRate`, counted as positive.
- **Overtime earnings** = `-overtimeHours × hourlyRate`, counted as negative (money you should have earned but slacked off).
- **Net earnings** = fishing earnings + overtime earnings.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (pnpm or yarn also work; commands below use npm)

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (Vite, default http://localhost:5173)
npm run dev
```

Open the URL Vite prints, and the FISHER-PRO 9000 will boot up.

### Other scripts

```bash
npm run build       # tsc -b && vite build
npm run preview     # Serve the production build locally
npm run check       # Typecheck only (tsc -b --noEmit)
npm run lint        # ESLint 9 flat config
```

> [!IMPORTANT]
> Run `npm run lint && npm run check && npm run build` before committing.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Usage

1. Open the app, click `▼ 设置` to expand the settings panel.
2. Pick `月薪` (monthly) or `年薪` (yearly), type your salary, tab away to save.
3. Adjust `上午` / `下午` work hours if your schedule isn't 09:00–12:00 / 13:00–18:00.
4. Back on the timer tab, hit `▶ 开始摸鱼` whenever you zone out.
5. Hit `■ 停止摸鱼` when you're done. The LCD keeps the running tally.
6. After work, enter overtime hours in the settings panel. The `NET` card flips red if you're in the hole.
7. Switch to `▤ 日历` to browse past days, `▦ 统计` for monthly + yearly totals.

All settings and records persist in `localStorage`. Close the tab, come back tomorrow, it's all still there.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Project Layout

```
slacker-counter/
├── src/
│   ├── App.tsx                          # Single-page UI (timer / calendar / stats tabs)
│   ├── main.tsx                         # React root, StrictMode
│   ├── components/
│   │   └── Empty.tsx                    # Placeholder, currently unused
│   ├── hooks/
│   │   └── useTheme.ts                  # Light/dark theme hook, currently unused
│   ├── lib/
│   │   └── utils.ts                     # cn() class merge helper
│   ├── pages/
│   │   └── Home.tsx                     # Empty route page (react-router-dom not wired up)
│   └── store/
│       └── useFishTimerStore.ts         # Zustand store, all business logic + persist
├── public/
│   └── favicon.svg
├── .trae/                               # Trae IDE local config (safe in repo)
├── .harness/                            # Agent team config
├── AGENTS.md                            # AI agent instructions (not for end users)
├── eslint.config.js
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

The store owns everything: salary, work hours, current fishing state, and the per-day records dictionary. `App.tsx` is a pure view. It reads from the store, dispatches the few mutating actions, and recomputes derived numbers through the store's selectors.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Manual Smoke Test

There's no automated test framework yet. Before you ship a change, run through this checklist:

1. `npm run dev` → open the app.
2. Set a salary → toggle `月薪` / `年薪` → reload the tab → value persists.
3. Click `▶ 开始摸鱼` → wait a few seconds → click `■ 停止摸鱼` → timer and `+¥` update; reload to confirm persistence.
4. Set overtime hours → `NET` card updates.
5. Switch to `▤ 日历` → click a date → record details appear; days with records show a coloured dot.
6. Switch to `▦ 统计` → monthly + yearly totals render without `NaN` or `undefined`.
7. Click `⟳` reset → today's record cleared, fishing state stopped.

> [!IMPORTANT]
> When you add a test framework later, prefer **Vitest**. It's Vite-native and zero-config. Co-locate as `*.test.ts` / `*.test.tsx`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Roadmap

- [ ] Wire `react-router-dom` (it's installed but `pages/Home.tsx` is empty).
- [ ] Either use or remove the unused `components/Empty.tsx` and `hooks/useTheme.ts`.
- [ ] Add Vitest and a small suite covering `useFishTimerStore` selectors.
- [ ] Optional CSV / JSON export of records.
- [ ] Optional dark mode that actually toggles (the hook is there, the UI isn't).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## License

There's no `LICENSE` file in the repo yet. Treat it as MIT until one is added. Fork it, tweak it, ship your own variant. If you plan to publish, please drop in a real `LICENSE` first.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## Acknowledgments

- The FISHER-PRO 9000 shell is inspired by late-80s / early-90s industrial controllers and chunky LCD calculators.
- The Trae badge on production builds is injected by `vite-plugin-trae-solo-badge`. Strip it from `vite.config.ts` if you don't want it.
- Built on the Vite + React + TypeScript template.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

[react-shield]: https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=for-the-badge
[react-url]: https://react.dev
[vite-shield]: https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=for-the-badge
[vite-url]: https://vitejs.dev
[ts-shield]: https://img.shields.io/badge/TypeScript-pragmatic-3178C6?logo=typescript&logoColor=white&style=for-the-badge
[ts-url]: https://www.typescriptlang.org
[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge
[tailwind-url]: https://tailwindcss.com
[zustand-shield]: https://img.shields.io/badge/Zustand-5-443E38?logo=zustand&logoColor=white&style=for-the-badge
[zustand-url]: https://zustand-demo.pmnd.rs
[storage-shield]: https://img.shields.io/badge/Storage-localStorage-F7DF1E?style=for-the-badge
