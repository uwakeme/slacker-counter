import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OvertimeType = 'weekday' | 'weekend' | 'holiday';
export type OvertimeRates = Record<OvertimeType, number | null>;

interface WorkSegment {
  id: string;
  start: string;  // 'HH:mm'
  end: string;
}

function newSegmentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeSeg(start: string, end: string): WorkSegment {
  return { id: newSegmentId(), start, end };
}

interface DailyRecord {
  date: string;
  fishingTime: number;
  overtimeHours: number;
  // 当日加班类型,决定按哪个 overtimeRates 算
  overtimeType: OvertimeType;
  fishingEarnings: number;
  overtimeEarnings: number;
  netEarnings: number;
}

interface FishTimerState {
  salaryType: 'monthly' | 'yearly';
  salary: number;
  // 工作日配置 — 双休 / 单休 / 大小周 / 自定义
  workDaysType: 'rest2' | 'rest1' | 'bigSmall' | 'custom';
  workDaysPerMonth: number;
  // 工时段(动态)— 任意多段,跨夜自动按 (end-start+24h)%24h 算
  segments: WorkSegment[];
  // 三档加班费(元/小时)— null = 没设置,加班全亏;填了才按 (otRate − 时薪) × 小时算
  overtimeRates: OvertimeRates;
  isFishing: boolean;
  fishingStartTime: number | null;
  currentSessionTime: number;
  records: Record<string, DailyRecord>;
  getTodayKey: () => string;
  getTodayRecord: () => DailyRecord;
  getHourlyRate: () => number;
  getWorkHoursPerDay: () => number;
  getCurrentFishingTime: () => number;
  getTodayFishingEarnings: () => number;
  getTodayOvertimeEarnings: () => number;
  getTodayNetEarnings: () => number;
  isDuringWorkTime: () => boolean;
  getMonthRecords: (year: number, month: number) => DailyRecord[];
  getYearRecords: (year: number) => DailyRecord[];
  setSalary: (type: 'monthly' | 'yearly', salary: number) => void;
  setWorkDays: (type: 'rest2' | 'rest1' | 'bigSmall' | 'custom', customDays?: number) => void;
  addSegment: () => void;
  removeSegment: (id: string) => void;
  updateSegment: (id: string, field: 'start' | 'end', value: string) => void;
  setOvertimeRate: (type: OvertimeType, rate: number | null) => void;
  setOvertimeType: (type: OvertimeType) => void;
  startFishing: () => void;
  stopFishing: () => void;
  setOvertimeHours: (hours: number) => void;
  reset: () => void;
}

// 工作日类型 → 每月天数(法定月均工作日)
const WORK_DAYS_MAP = {
  rest2: 22,     // 双休(标准) — 5 天/周 × 52 ÷ 12 ≈ 21.67 → 22
  rest1: 26,     // 单休 — 6 天/周 × 52 ÷ 12 ≈ 26
  bigSmall: 24,  // 大小周 — 隔周单休,双月 22 + 单月 26,平均 24
} as const;

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function createEmptyRecord(date: string): DailyRecord {
  return {
    date,
    fishingTime: 0,
    overtimeHours: 0,
    overtimeType: 'weekday',
    fishingEarnings: 0,
    overtimeEarnings: 0,
    netEarnings: 0,
  };
}

// 加班盈亏 = (加班费 − 时薪) × 小时数
// otRate === null → 没设置,全亏(−时薪 × 小时)
// otRate = 时薪 → 平;> 时薪 → 赚
// 法定:1.5×时薪(工作日) / 2×(周末) / 3×(节假日)
function calcOvertimeEarnings(otHours: number, hourlyRate: number, otRate: number | null): number {
  if (otHours <= 0) return 0;
  if (otRate === null || otRate === undefined) return -otHours * hourlyRate;
  return (otRate - hourlyRate) * otHours;
}

export const useFishTimerStore = create<FishTimerState>()(
  persist(
    (set, get) => ({
      salaryType: 'monthly',
      salary: 10000,
      workDaysType: 'rest2',
      workDaysPerMonth: 22,
      overtimeRates: { weekday: null, weekend: null, holiday: null },
      segments: [
        makeSeg('09:00', '12:00'),
        makeSeg('13:00', '18:00'),
      ],
      isFishing: false,
      fishingStartTime: null,
      currentSessionTime: 0,
      records: {},

      getTodayKey: () => getTodayKey(),

      getTodayRecord: () => {
        const key = getTodayKey();
        return get().records[key] || createEmptyRecord(key);
      },

      getHourlyRate: () => {
        const { salaryType, salary, workDaysPerMonth } = get();
        const workHoursPerDay = get().getWorkHoursPerDay();
        if (workDaysPerMonth <= 0 || workHoursPerDay <= 0) return 0;
        if (salaryType === 'monthly') {
          return salary / workDaysPerMonth / workHoursPerDay;
        }
        return salary / 12 / workDaysPerMonth / workHoursPerDay;
      },

      getWorkHoursPerDay: () => {
        const { segments } = get();
        const toMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        // (end - start + 24h) % 24h — 同时支持正常(09-12)和跨夜(22-06)
        const segMin = (end: string, start: string) =>
          (toMinutes(end) - toMinutes(start) + 1440) % 1440;
        const total = segments.reduce(
          (sum, s) => sum + segMin(s.end, s.start),
          0,
        );
        return total / 60;
      },

      getCurrentFishingTime: () => {
        const { isFishing, fishingStartTime, currentSessionTime, getTodayRecord } = get();
        const todayRecord = getTodayRecord();
        if (isFishing && fishingStartTime) {
          return todayRecord.fishingTime + currentSessionTime + (Date.now() - fishingStartTime);
        }
        return todayRecord.fishingTime + currentSessionTime;
      },

      getTodayFishingEarnings: () => {
        const fishingTime = get().getCurrentFishingTime();
        const hourlyRate = get().getHourlyRate();
        return (fishingTime / (1000 * 60 * 60)) * hourlyRate;
      },

      getTodayOvertimeEarnings: () => {
        const todayRecord = get().getTodayRecord();
        const hourlyRate = get().getHourlyRate();
        const otType = todayRecord.overtimeType || 'weekday';
        const otRate = get().overtimeRates[otType];
        return calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);
      },

      getTodayNetEarnings: () => {
        return get().getTodayFishingEarnings() + get().getTodayOvertimeEarnings();
      },

      isDuringWorkTime: () => {
        const { segments } = get();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const toMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        return segments.some((s) => {
          const start = toMinutes(s.start);
          const end = toMinutes(s.end);
          if (start === end) return false;
          if (start < end) return currentMinutes >= start && currentMinutes < end;
          return currentMinutes >= start || currentMinutes < end; // 跨夜
        });
      },

      getMonthRecords: (year: number, month: number) => {
        const { records } = get();
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        return Object.values(records).filter(r => r.date.startsWith(prefix));
      },

      getYearRecords: (year: number) => {
        const { records } = get();
        const prefix = `${year}-`;
        return Object.values(records).filter(r => r.date.startsWith(prefix));
      },

      setSalary: (type, salary) => {
        set({ salaryType: type, salary });
        const hourlyRate = get().getHourlyRate();
        set((state) => {
          const key = getTodayKey();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otType = todayRecord.overtimeType || 'weekday';
          const otRate = state.overtimeRates[otType];
          const fishEarn = (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate;
          const otEarn = calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);
          return {
            records: {
              ...state.records,
              [key]: {
                ...todayRecord,
                fishingEarnings: fishEarn,
                overtimeEarnings: otEarn,
                netEarnings: fishEarn + otEarn,
              },
            },
          };
        });
      },

      addSegment: () => {
        set((state) => ({
          segments: [...state.segments, makeSeg('00:00', '00:00')],
        }));
      },
      removeSegment: (id) => {
        set((state) => {
          if (state.segments.length <= 1) return state;
          return { segments: state.segments.filter((s) => s.id !== id) };
        });
      },
      updateSegment: (id, field, value) => {
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === id ? { ...s, [field]: value } : s,
          ),
        }));
      },

      startFishing: () => {
        set({
          isFishing: true,
          fishingStartTime: Date.now(),
        });
      },

      stopFishing: () => {
        set((state) => {
          if (!state.fishingStartTime) {
            return { isFishing: false, fishingStartTime: null };
          }
          const elapsed = Date.now() - state.fishingStartTime;
          const newSessionTime = state.currentSessionTime + elapsed;
          const key = getTodayKey();
          const hourlyRate = get().getHourlyRate();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otType = todayRecord.overtimeType || 'weekday';
          const otRate = state.overtimeRates[otType];
          const newFishingTime = todayRecord.fishingTime + newSessionTime;
          const newFishingEarnings = (newFishingTime / (1000 * 60 * 60)) * hourlyRate;
          const newOvertimeEarnings = calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);

          return {
            isFishing: false,
            fishingStartTime: null,
            currentSessionTime: 0,
            records: {
              ...state.records,
              [key]: {
                date: key,
                fishingTime: newFishingTime,
                overtimeHours: todayRecord.overtimeHours,
                overtimeType: otType,
                fishingEarnings: newFishingEarnings,
                overtimeEarnings: newOvertimeEarnings,
                netEarnings: newFishingEarnings + newOvertimeEarnings,
              },
            },
          };
        });
      },

      setOvertimeHours: (hours) => {
        const hourlyRate = get().getHourlyRate();
        set((state) => {
          const key = getTodayKey();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otType = todayRecord.overtimeType || 'weekday';
          const otRate = state.overtimeRates[otType];
          const fishingEarnings = (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate;
          const overtimeEarnings = calcOvertimeEarnings(hours, hourlyRate, otRate);
          return {
            records: {
              ...state.records,
              [key]: {
                date: key,
                fishingTime: todayRecord.fishingTime,
                overtimeHours: hours,
                overtimeType: otType,
                fishingEarnings,
                overtimeEarnings,
                netEarnings: fishingEarnings + overtimeEarnings,
              },
            },
          };
        });
      },

      setOvertimeRate: (type, rate) => {
        set((state) => ({
          overtimeRates: { ...state.overtimeRates, [type]: rate },
        }));
        // 重算今日记录(今日用的费率变了)
        const hourlyRate = get().getHourlyRate();
        set((state) => {
          const key = getTodayKey();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otType = todayRecord.overtimeType || 'weekday';
          const otRate = state.overtimeRates[otType];
          const overtimeEarnings = calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);
          return {
            records: {
              ...state.records,
              [key]: {
                ...todayRecord,
                overtimeEarnings,
                netEarnings: todayRecord.fishingEarnings + overtimeEarnings,
              },
            },
          };
        });
      },

      setOvertimeType: (type) => {
        // 只切今日加班类型,根据新类型对应的费率重算今日记录
        const hourlyRate = get().getHourlyRate();
        set((state) => {
          const key = getTodayKey();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otRate = state.overtimeRates[type];
          const overtimeEarnings = calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);
          return {
            records: {
              ...state.records,
              [key]: {
                ...todayRecord,
                overtimeType: type,
                overtimeEarnings,
                netEarnings: todayRecord.fishingEarnings + overtimeEarnings,
              },
            },
          };
        });
      },

      setWorkDays: (type, customDays) => {
        const days = type === 'custom' ? (customDays ?? get().workDaysPerMonth) : WORK_DAYS_MAP[type];
        set({ workDaysType: type, workDaysPerMonth: days });
        // 时薪变了,重算今日记录
        const hourlyRate = get().getHourlyRate();
        set((state) => {
          const key = getTodayKey();
          const todayRecord = state.records[key] || createEmptyRecord(key);
          const otType = todayRecord.overtimeType || 'weekday';
          const otRate = state.overtimeRates[otType];
          const fishingEarnings = (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate;
          const overtimeEarnings = calcOvertimeEarnings(todayRecord.overtimeHours, hourlyRate, otRate);
          return {
            records: {
              ...state.records,
              [key]: {
                ...todayRecord,
                fishingEarnings,
                overtimeEarnings,
                netEarnings: fishingEarnings + overtimeEarnings,
              },
            },
          };
        });
      },

      reset: () => {
        const key = getTodayKey();
        set((state) => ({
          isFishing: false,
          fishingStartTime: null,
          currentSessionTime: 0,
          records: {
            ...state.records,
            [key]: createEmptyRecord(key),
          },
        }));
      },
    }),
    {
      name: 'fish-timer-storage-v2',
    }
  )
);
