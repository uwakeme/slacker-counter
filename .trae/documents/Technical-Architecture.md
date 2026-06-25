# 摸鱼计时器 - 技术架构文档

## 1. 架构设计

```mermaid
flowchart LR
    A[前端界面] --> B[状态管理]
    B --> C[本地存储]
    C --> D[数据持久化]
```

- **架构类型**：单页应用 (SPA)，纯前端实现
- **数据存储**：LocalStorage 本地持久化

## 2. 技术选型

- **前端框架**：React@18
- **样式方案**：Tailwind CSS@3
- **构建工具**：Vite
- **动画库**：CSS Transitions + requestAnimationFrame
- **图标**：Lucide React

## 3. 组件结构

| 组件 | 功能 |
|------|------|
| App | 根组件，状态管理 |
| SalarySettings | 薪资设置面板 |
| WorkTimeSettings | 上下班时间设置 |
| FishTimer | 摸鱼计时器核心组件 |
| OvertimeInput | 加班时间录入 |
| Statistics | 统计面板 |

## 4. 数据模型

```typescript
interface AppState {
  // 薪资信息
  salaryType: 'monthly' | 'yearly';
  salary: number;
  hourlyRate: number;

  // 上下班时间
  workStartTime: string; // HH:mm
  workEndTime: string;   // HH:mm

  // 摸鱼状态
  isFishing: boolean;
  fishingStartTime: number | null;
  totalFishingTime: number; // 毫秒

  // 加班时间
  overtimeHours: number;

  // 统计结果
  fishingEarnings: number;
  overtimeEarnings: number;
  netEarnings: number;
}
```

## 5. 核心计算公式

- **时薪计算**：
  - 月薪 → 时薪 = 月薪 / 22 / 8
  - 年薪 → 时薪 = 年薪 / 12 / 22 / 8

- **摸鱼收益**：摸鱼时长(小时) × 时薪

- **加班收益**：加班时长(小时) × 时薪 × 1.5

- **净收益**：摸鱼收益 + 加班收益
