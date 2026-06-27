<div align="center">

# FISHER-PRO 9000

### 一个复古风格的计时器,把摸鱼分钟和加班小时都换算成 ¥。

填好薪资,摸鱼的时候按一下 `▶ 开始摸鱼`,看 LCD 屏上的数字随时间滚动 —— 算出你这会儿"没在干活反而赚了多少"。外壳是致敬 90 年代工业硬件的小玩具。

[功能](#功能) · [快速开始](#快速开始) · [手动验证清单](#手动验证清单) · [路线图](#路线图)

</div>

---

## 目录

<details>
<summary>点击展开</summary>

- [关于这个项目](#关于这个项目)
- [功能](#功能)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [使用](#使用)
- [项目结构](#项目结构)
- [手动验证清单](#手动验证清单)
- [路线图](#路线图)
- [许可证](#许可证)
- [致谢](#致谢)

</details>

---

## 关于这个项目

上班摸鱼加班计算器 —— 一个单页 React 应用,给你的"今天"标个价。填好月薪或年薪,设好上下班时间,开始划水的时候点一下 `▶ 开始摸鱼`,LCD 屏就开始实时累加你这段时间"反向赚到的钱"。下班后输入加班小时数,同一块屏就会告诉你亏了多少。

**FISHER-PRO 9000** 的外壳是对 90 年代工业硬件的小小致敬:橄榄灰机身、绿色 LCD 加扫描线、到处都是等宽字体。它是个小玩具,但数学是诚实的。

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
> 这是一个 side-project 玩具,不是生产力工具。数字就图一乐,别当真。

### 技术栈一览

[![React][react-shield]][react-url]
[![Vite][vite-shield]][vite-url]
[![TypeScript][ts-shield]][ts-url]
[![Tailwind CSS][tailwind-shield]][tailwind-url]
[![Zustand][zustand-shield]][zustand-url]
[![本地优先][storage-shield]](#技术栈)

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 功能

- 实时摸鱼计时。按 `▶ 开始摸鱼` / `■ 停止摸鱼`,收益每 100ms 按实时时薪刷新。
- 月薪 / 年薪随时切换。时薪自动重算。
- 自定义上下午工时。两段时间分别设置,自动算出实际日工时(按每月 22 个工作日)。
- 加班录入。下班后输入小时数,在摸鱼收益上扣一笔 `-¥`。
- 日历视图。月度日历,有记录的日子用彩色圆点标注:净赚绿、净亏红。
- 月度 / 年度统计。累计摸鱼时长、加班小时、净收益。
- 本地优先存储。Zustand `persist` 中间件写到 `localStorage` 的 `fish-timer-storage-v2` 键里。没后端、没注册、没埋点。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| UI 框架 | React 18 | 只用函数组件 + hooks |
| 语言 | TypeScript(`strict: false`) | 实用主义,很多严格选项有意关掉 |
| 构建工具 | Vite 6 | dev server 快,HMR 即时 |
| 样式 | Tailwind CSS 3 + 大量内联 `style` | 工具类 + 复古渐变 / 多层阴影 |
| 状态 | Zustand 5 + `persist` 中间件 | 本地状态 + `localStorage` 一步到位 |
| 图标 | lucide-react | 几个点缀图标 |
| 插件 | `vite-plugin-trae-solo-badge` | 生产构建注入 Trae 角标 |

> [!TIP]
> FISHER-PRO 9000 的外观依赖大量内联 `style={{...}}`(渐变和多层 `box-shadow`)。除非你想让视觉走样,不要把它们重构成 Tailwind utility。

### 计算公式

- **时薪(月薪)** = `salary / 22 / workHoursPerDay`
- **时薪(年薪)** = `salary / 12 / 22 / workHoursPerDay`
- **摸鱼收益** = `摸鱼时长(h) × 时薪`,计为正。
- **加班收益** = `-加班小时数 × 时薪`,计为负(本该赚到但你摸掉的)。
- **净收益** = 摸鱼收益 + 加班收益。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9(pnpm / yarn 也行,下面命令用的是 npm)

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动 dev server(Vite,默认 http://localhost:5173)
npm run dev
```

打开 Vite 打印的 URL,FISHER-PRO 9000 就启动了。

### 其他脚本

```bash
npm run build       # tsc -b && vite build
npm run preview     # 本地预览生产构建
npm run check       # 仅做类型检查(tsc -b --noEmit)
npm run lint        # ESLint 9 flat config
```

> [!IMPORTANT]
> 提交前跑一遍 `npm run lint && npm run check && npm run build`。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 使用

1. 打开应用,点 `▼ 设置` 展开设置面板。
2. 选 `月薪` 或 `年薪`,输入薪资数字,Tab 出去就保存了。
3. 如果你的上下班不是 09:00–12:00 / 13:00–18:00,调一下 `上午` / `下午` 工时。
4. 回到计时 Tab,划水的时候按 `▶ 开始摸鱼`。
5. 结束按 `■ 停止摸鱼`,LCD 会保留累计数。
6. 下班后,在设置面板输入加班小时数。`NET` 卡如果亏了会变红。
7. 切到 `▤ 日历` 看历史,切到 `▦ 统计` 看月度和年度汇总。

所有设置和记录都存在 `localStorage` 里。关掉标签页,明天回来,东西还在。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 项目结构

```
slacker-counter/
├── src/
│   ├── App.tsx                          # 单页 UI(计时 / 日历 / 统计三个 Tab)
│   ├── main.tsx                         # React 根,StrictMode
│   ├── components/
│   │   └── Empty.tsx                    # 占位,目前未使用
│   ├── hooks/
│   │   └── useTheme.ts                  # 主题 hook,目前未使用
│   ├── lib/
│   │   └── utils.ts                     # cn() class merge 工具
│   ├── pages/
│   │   └── Home.tsx                     # 空路由页(react-router-dom 没接)
│   └── store/
│       └── useFishTimerStore.ts         # Zustand store,所有业务逻辑 + persist
├── public/
│   └── favicon.svg
├── .trae/                               # Trae IDE 本地配置(无敏感信息)
├── .harness/                            # Agent team 配置
├── AGENTS.md                            # AI agent 指令(不是给终端用户的)
├── eslint.config.js
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

Store 拥有一切:薪资、工时、当前摸鱼状态、每日记录字典。`App.tsx` 是纯视图,从 store 读取数据、派发几个变更 action,通过 store 的 selector 重算派生值。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 手动验证清单

现在还没有自动化测试框架。提交改动前,过一遍这个清单:

1. `npm run dev` → 打开应用。
2. 设置薪资 → 切换 `月薪` / `年薪` → 刷新标签页 → 值还在。
3. 点 `▶ 开始摸鱼` → 等几秒 → 点 `■ 停止摸鱼` → 计时器和 `+¥` 更新;刷新确认持久化。
4. 设置加班小时 → `NET` 卡更新。
5. 切到 `▤ 日历` → 点某一天 → 显示记录详情;有记录的日子显示彩色圆点。
6. 切到 `▦ 统计` → 月度 / 年度合计渲染,不出现 `NaN` 或 `undefined`。
7. 点 `⟳` 重置 → 当天记录清空,摸鱼状态停止。

> [!IMPORTANT]
> 之后加测试框架,优先用 **Vitest**:Vite 原生,零配置。用 `*.test.ts` / `*.test.tsx` 与源码同目录。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 路线图

- [ ] 把 `react-router-dom` 接上(已装,但 `pages/Home.tsx` 是空的)。
- [ ] 用上或删掉未使用的 `components/Empty.tsx` 和 `hooks/useTheme.ts`。
- [ ] 加 Vitest,覆盖 `useFishTimerStore` 的 selector。
- [ ] 可选:CSV / JSON 导出记录。
- [ ] 可选:真正能切换的暗色模式(hook 在,UI 还没接)。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 许可证

仓库里目前还没有 `LICENSE` 文件。在添加之前按 MIT 对待即可 —— fork、改改、做成你自己的版本都行。如果你打算公开发布,请先加一个正式的 `LICENSE`。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

---

## 致谢

- FISHER-PRO 9000 外壳的灵感来自 80 年代末 / 90 年代初的工业控制器和笨重的 LCD 计算器。
- 生产构建右下角的 Trae 角标是 `vite-plugin-trae-solo-badge` 注入的,不想要就从 `vite.config.ts` 里去掉。
- 基于 Vite + React + TypeScript 模板构建。

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

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
[storage-shield]: https://img.shields.io/badge/存储-localStorage-F7DF1E?style=for-the-badge
