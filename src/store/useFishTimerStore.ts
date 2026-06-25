import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FishTimerState {
  // 薪资信息
  salaryType: 'monthly' | 'yearly';
  salary: number;
  // 上班时间（上午）
  amStartTime: string;
  amEndTime: string;
  // 上班时间（下午）
  pmStartTime: string;
  pmEndTime: string;
  // 摸鱼状态
  isFishing: boolean;
  fishingStartTime: number | null;
  totalFishingTime: number;
  // 加班时间
  overtimeHours: number;
  // 计算属性
  getHourlyRate: () => number;
  getWorkHoursPerDay: () => number;
  getFishingEarnings: () => number;
  getOvertimeEarnings: () => number;
  getNetEarnings: () => number;
  // 操作
  setSalary: (type: 'monthly' | 'yearly', salary: number) => void;
  setWorkTime: (amStart: string, amEnd: string, pmStart: string, pmEnd: string) => void;
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
      amStartTime: '09:00',
      amEndTime: '12:00',
      pmStartTime: '13:00',
      pmEndTime: '18:00',
      isFishing: false,
      fishingStartTime: null,
      totalFishingTime: 0,
      overtimeHours: 0,

      getHourlyRate: () => {
        const { salaryType, salary } = get();
        const workHoursPerDay = get().getWorkHoursPerDay();
        if (salaryType === 'monthly') {
          return salary / WORK_DAYS_PER_MONTH / workHoursPerDay;
        }
        return salary / 12 / WORK_DAYS_PER_MONTH / workHoursPerDay;
      },

      getWorkHoursPerDay: () => {
        const { amStartTime, amEndTime, pmStartTime, pmEndTime } = get();
        const toMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const amMinutes = toMinutes(amEndTime) - toMinutes(amStartTime);
        const pmMinutes = toMinutes(pmEndTime) - toMinutes(pmStartTime);
        return (amMinutes + pmMinutes) / 60;
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
        return -overtimeHours * hourlyRate;
      },

      getNetEarnings: () => {
        return get().getFishingEarnings() + get().getOvertimeEarnings();
      },

      setSalary: (type, salary) => set({ salaryType: type, salary }),

      setWorkTime: (amStart, amEnd, pmStart, pmEnd) =>
        set({ amStartTime: amStart, amEndTime: amEnd, pmStartTime: pmStart, pmEndTime: pmEnd }),

      startFishing: () =>
        set({
          isFishing: true,
          fishingStartTime: Date.now(),
        }),

      stopFishing: () =>
        set((state) => {
          if (!state.fishingStartTime) {
            return { isFishing: false, fishingStartTime: null };
          }
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
