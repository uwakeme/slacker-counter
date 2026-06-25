import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FishTimerState {
  // 薪资信息
  salaryType: 'monthly' | 'yearly';
  salary: number;
  // 上下班时间
  workStartTime: string;
  workEndTime: string;
  // 摸鱼状态
  isFishing: boolean;
  fishingStartTime: number | null;
  totalFishingTime: number;
  // 加班时间
  overtimeHours: number;
  // 计算属性
  getHourlyRate: () => number;
  getFishingEarnings: () => number;
  getOvertimeEarnings: () => number;
  getNetEarnings: () => number;
  // 操作
  setSalary: (type: 'monthly' | 'yearly', salary: number) => void;
  setWorkTime: (start: string, end: string) => void;
  startFishing: () => void;
  stopFishing: () => void;
  setOvertimeHours: (hours: number) => void;
  reset: () => void;
}

const WORK_DAYS_PER_MONTH = 22;
const WORK_HOURS_PER_DAY = 8;

export const useFishTimerStore = create<FishTimerState>()(
  persist(
    (set, get) => ({
      salaryType: 'monthly',
      salary: 10000,
      workStartTime: '09:00',
      workEndTime: '18:00',
      isFishing: false,
      fishingStartTime: null,
      totalFishingTime: 0,
      overtimeHours: 0,

      getHourlyRate: () => {
        const { salaryType, salary } = get();
        if (salaryType === 'monthly') {
          return salary / WORK_DAYS_PER_MONTH / WORK_HOURS_PER_DAY;
        }
        return salary / 12 / WORK_DAYS_PER_MONTH / WORK_HOURS_PER_DAY;
      },

      getFishingEarnings: () => {
        const { totalFishingTime } = get();
        const hourlyRate = get().getHourlyRate();
        const hours = totalFishingTime / (1000 * 60 * 60);
        return hours * hourlyRate;
      },

      getOvertimeEarnings: () => {
        const { overtimeHours } = get();
        const hourlyRate = get().getHourlyRate();
        return overtimeHours * hourlyRate * 1.5;
      },

      getNetEarnings: () => {
        return get().getFishingEarnings() + get().getOvertimeEarnings();
      },

      setSalary: (type, salary) => set({ salaryType: type, salary }),

      setWorkTime: (start, end) => set({ workStartTime: start, workEndTime: end }),

      startFishing: () =>
        set({
          isFishing: true,
          fishingStartTime: Date.now(),
        }),

      stopFishing: () =>
        set((state) => {
          if (!state.fishingStartTime) return state;
          const elapsed = Date.now() - state.fishingStartTime;
          return {
            isFishing: false,
            fishingStartTime: null,
            totalFishingTime: state.totalFishingTime + elapsed,
          };
        }),

      setOvertimeHours: (hours) => set({ overtimeHours: hours }),

      reset: () =>
        set({
          isFishing: false,
          fishingStartTime: null,
          totalFishingTime: 0,
          overtimeHours: 0,
        }),
    }),
    {
      name: 'fish-timer-storage',
    }
  )
);
