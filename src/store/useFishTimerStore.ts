import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DailyRecord {
  date: string;
  fishingTime: number;
  overtimeHours: number;
  fishingEarnings: number;
  overtimeEarnings: number;
  netEarnings: number;
}

interface FishTimerState {
  salaryType: 'monthly' | 'yearly';
  salary: number;
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
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
  setWorkTime: (amStart: string, amEnd: string, pmStart: string, pmEnd: string) => void;
  startFishing: () => void;
  stopFishing: () => void;
  setOvertimeHours: (hours: number) => void;
  reset: () => void;
}

const WORK_DAYS_PER_MONTH = 22;

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function createEmptyRecord(date: string): DailyRecord {
  return {
    date,
    fishingTime: 0,
    overtimeHours: 0,
    fishingEarnings: 0,
    overtimeEarnings: 0,
    netEarnings: 0,
  };
}

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
      currentSessionTime: 0,
      records: {},

      getTodayKey: () => getTodayKey(),

      getTodayRecord: () => {
        const key = getTodayKey();
        return get().records[key] || createEmptyRecord(key);
      },

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
        return -todayRecord.overtimeHours * hourlyRate;
      },

      getTodayNetEarnings: () => {
        return get().getTodayFishingEarnings() + get().getTodayOvertimeEarnings();
      },

      isDuringWorkTime: () => {
        const { amStartTime, amEndTime, pmStartTime, pmEndTime } = get();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const toMinutes = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const amStart = toMinutes(amStartTime);
        const amEnd = toMinutes(amEndTime);
        const pmStart = toMinutes(pmStartTime);
        const pmEnd = toMinutes(pmEndTime);
        return (currentMinutes >= amStart && currentMinutes < amEnd) ||
               (currentMinutes >= pmStart && currentMinutes < pmEnd);
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
          return {
            records: {
              ...state.records,
              [key]: {
                ...todayRecord,
                fishingEarnings: (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate,
                overtimeEarnings: -todayRecord.overtimeHours * hourlyRate,
                netEarnings: (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate - todayRecord.overtimeHours * hourlyRate,
              },
            },
          };
        });
      },

      setWorkTime: (amStart, amEnd, pmStart, pmEnd) => {
        set({ amStartTime: amStart, amEndTime: amEnd, pmStartTime: pmStart, pmEndTime: pmEnd });
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
          const newFishingTime = todayRecord.fishingTime + newSessionTime;
          const newFishingEarnings = (newFishingTime / (1000 * 60 * 60)) * hourlyRate;
          const newOvertimeEarnings = -todayRecord.overtimeHours * hourlyRate;

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
          const fishingEarnings = (todayRecord.fishingTime / (1000 * 60 * 60)) * hourlyRate;
          const overtimeEarnings = -hours * hourlyRate;
          return {
            records: {
              ...state.records,
              [key]: {
                date: key,
                fishingTime: todayRecord.fishingTime,
                overtimeHours: hours,
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
