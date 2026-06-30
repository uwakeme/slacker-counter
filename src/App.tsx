import { useFishTimerStore } from '@/store/useFishTimerStore';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';

function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

type ViewMode = 'timer' | 'calendar' | 'stats' | 'settings';

const DAILY_QUOTES = [
  '摸鱼一时爽,一直摸鱼一直爽',
  '努力不一定成功,但不努力真的好舒服',
  '今天的摸鱼,明天的回忆',
  '只要我不努力,老板就赚不到我的剩余价值',
  '打工是为了更好地摸鱼',
  '我上班就是为了下班',
  '摸鱼是对生活最起码的尊重',
  '上班如戏,全靠演技',
  '今天的班,明天的退休',
  '摸鱼赚钱两不误,人生赢家就是我',
];

export default function App() {
  const {
    salaryType,
    salary,
    workDaysType,
    workDaysPerMonth,
    overtimeRates,
    segments,
    isFishing,
    fishingStartTime,
    records,
    getHourlyRate,
    getWorkHoursPerDay,
    getTodayFishingEarnings,
    getTodayOvertimeEarnings,
    getTodayNetEarnings,
    getTodayRecord,
    isDuringWorkTime,
    getMonthRecords,
    getYearRecords,
    setSalary,
    setWorkDays,
    addSegment,
    removeSegment,
    updateSegment,
    setOvertimeRate,
    setOvertimeType,
    startFishing,
    stopFishing,
    setOvertimeHours,
    reset,
  } = useFishTimerStore();

  const [displayTime, setDisplayTime] = useState(0);
  const [tempSalary, setTempSalary] = useState(salary.toString());
  const [tempOvertime, setTempOvertime] = useState(getTodayRecord().overtimeHours.toString());
  const [tempCustomDays, setTempCustomDays] = useState(workDaysPerMonth.toString());
  const [tempWeekdayRate, setTempWeekdayRate] = useState(overtimeRates.weekday?.toString() ?? '');
  const [tempWeekendRate, setTempWeekendRate] = useState(overtimeRates.weekend?.toString() ?? '');
  const [tempHolidayRate, setTempHolidayRate] = useState(overtimeRates.holiday?.toString() ?? '');
  const [viewMode, setViewMode] = useState<ViewMode>('timer');
  // 日历 + 统计页共用的当前年月 — 切月后两边同步
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  // 年份/月份 picker 独立展开(同时只能开一个)
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // 切 tab 时自动收起 picker(避免 picker 跑到别的 view 还开着的视觉残留)
  useEffect(() => {
    setYearPickerOpen(false);
    setMonthPickerOpen(false);
  }, [viewMode]);
  // 默认选中今天 — 日历页下方记录面板总在显示
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // 设备卡片 ref — 量它的真实高度来决定窗口高度
  // (不能量 body,因为外层 min-h-screen 会跟着 viewport 涨,触发反馈循环)
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const todayRecord = getTodayRecord();
      if (isFishing && fishingStartTime) {
        setDisplayTime(todayRecord.fishingTime + (Date.now() - fishingStartTime));
      } else {
        setDisplayTime(todayRecord.fishingTime);
      }
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [isFishing, fishingStartTime, records]);

  const handleSalarySubmit = () => {
    const val = parseFloat(tempSalary);
    if (!isNaN(val) && val > 0) {
      setSalary(salaryType, val);
    }
  };

  const handleOvertimeSubmit = () => {
    const val = parseFloat(tempOvertime);
    if (!isNaN(val) && val >= 0) {
      setOvertimeHours(val);
    }
  };

  const handleCustomDaysSubmit = () => {
    const val = parseInt(tempCustomDays, 10);
    if (!isNaN(val) && val > 0 && val <= 31) {
      setWorkDays('custom', val);
    } else {
      setTempCustomDays(workDaysPerMonth.toString());
    }
  };

  const handleRateSubmit = (
    type: 'weekday' | 'weekend' | 'holiday',
    val: string,
  ) => {
    if (val.trim() === '') {
      // 空 = 没设置
      setOvertimeRate(type, null);
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setOvertimeRate(type, num);
    }
  };

  const todayFishingEarnings = getTodayFishingEarnings();
  const todayOvertimeEarnings = getTodayOvertimeEarnings();
  const todayNetEarnings = getTodayNetEarnings();
  const hourlyRate = getHourlyRate();
  const workHours = getWorkHoursPerDay();
  const statusText = isFishing ? '摸鱼中' : isDuringWorkTime() ? '工作中' : '待机';

  // 日历逻辑
  const calendarDays = useMemo(() => {
    const year = viewYear;
    const month = viewMonth - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { day: number | null; date: string | null }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, date: dateStr });
    }

    return days;
  }, [viewYear, viewMonth]);

  const monthRecords = useMemo(() => {
    return getMonthRecords(viewYear, viewMonth - 1);
  }, [viewYear, viewMonth, records]);

  const monthStats = useMemo(() => {
    const totalFish = monthRecords.reduce((sum, r) => sum + r.fishingTime, 0);
    const totalOvertime = monthRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalFishEarn = monthRecords.reduce((sum, r) => sum + r.fishingEarnings, 0);
    const totalOverEarn = monthRecords.reduce((sum, r) => sum + r.overtimeEarnings, 0);
    const totalNet = totalFishEarn + totalOverEarn;
    return { totalFish, totalOvertime, totalFishEarn, totalOverEarn, totalNet, days: monthRecords.length };
  }, [monthRecords]);

  // 热力图色阶基准 — 当月 |净收益| 最大值;无记录时 fallback 0.5,避免除零
  const monthHeatMax = useMemo(() => {
    if (monthRecords.length === 0) return 0.5;
    return Math.max(0.5, ...monthRecords.map((r) => Math.abs(r.netEarnings)));
  }, [monthRecords]);

  // 热力色:绿赚红亏,深浅 = |value|/monthHeatMax,幂函数让小数值也看得出梯度
  const heatColor = (value: number): string | null => {
    if (value === 0) return null;
    const ratio = Math.min(1, Math.abs(value) / monthHeatMax);
    const alpha = 0.22 + Math.pow(ratio, 0.55) * 0.6;
    return value > 0
      ? `rgba(64, 168, 72, ${alpha.toFixed(2)})`
      : `rgba(208, 72, 72, ${alpha.toFixed(2)})`;
  };

  const yearRecords = useMemo(() => {
    return getYearRecords(viewYear);
  }, [viewYear, records]);

  const yearStats = useMemo(() => {
    const totalFish = yearRecords.reduce((sum, r) => sum + r.fishingTime, 0);
    const totalOvertime = yearRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalFishEarn = yearRecords.reduce((sum, r) => sum + r.fishingEarnings, 0);
    const totalOverEarn = yearRecords.reduce((sum, r) => sum + r.overtimeEarnings, 0);
    const totalNet = totalFishEarn + totalOverEarn;
    return { totalFish, totalOvertime, totalFishEarn, totalOverEarn, totalNet, days: yearRecords.length };
  }, [yearRecords]);

  // 工时进度 — 当前时间在工作时间窗口里的百分比
  const workdayProgress = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const totalMin = getWorkHoursPerDay() * 60;
    if (totalMin <= 0) return 0;
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    let elapsed = 0;
    for (const s of segments) {
      const sStart = toMin(s.start);
      const sEnd = toMin(s.end);
      if (sStart === sEnd) continue;
      if (sStart < sEnd) {
        // 正常段
        if (curMin >= sStart) elapsed += Math.min(curMin, sEnd) - sStart;
      } else {
        // 跨夜段(22:00~06:00)— curMin 在 sStart..24h 或 0..sEnd 都算工作
        if (curMin >= sStart) {
          elapsed += curMin - sStart;
        } else if (curMin < sEnd) {
          elapsed += (24 * 60 - sStart) + curMin;
        }
      }
    }
    return Math.min(100, Math.max(0, (elapsed / totalMin) * 100));
  }, [segments, records, getWorkHoursPerDay]);

  // 近 7 日每日净收益
  const last7Days = useMemo(() => {
    const days: { date: string; value: number; weekday: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = records[key];
      days.push({ date: key, value: rec ? rec.netEarnings : 0, weekday: d.getDay() });
    }
    return days;
  }, [records]);

  const weekNet = useMemo(() => last7Days.reduce((s, d) => s + d.value, 0), [last7Days]);

  // 今日摸鱼宣言 — 按日期轮换
  const dailyQuote = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
  }, []);

  // 选中日期的记录 — 没记录的日期 fallback 为 0,记录面板永远显示
  const selFishTime = (selectedDate ? records[selectedDate]?.fishingTime : 0) ?? 0;
  const selFishEarn = (selectedDate ? records[selectedDate]?.fishingEarnings : 0) ?? 0;
  const selOverH = (selectedDate ? records[selectedDate]?.overtimeHours : 0) ?? 0;
  const selOverE = (selectedDate ? records[selectedDate]?.overtimeEarnings : 0) ?? 0;
  const selNet = (selectedDate ? records[selectedDate]?.netEarnings : 0) ?? 0;
  const selHasRecord = !!(selectedDate && records[selectedDate]);

  // 切月后,如果选中的日期不在新月,自动跳到新月 1 号(避免"看不见的高亮")
  useEffect(() => {
    if (!selectedDate) return;
    const [y, m] = selectedDate.split('-').map(Number);
    if (y !== viewYear || m !== viewMonth) {
      setSelectedDate(`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`);
    }
  }, [viewYear, viewMonth, selectedDate]);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.error('[window] close failed:', err);
    }
  };
  const handleMinimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch (err) {
      console.error('[window] minimize failed:', err);
    }
  };
  const setWindowSize = (height: number) => {
    void getCurrentWindow().setSize(new LogicalSize(480, height)).catch((err) => {
      console.error('[window] setSize failed:', err);
    });
  };

  // 把窗口贴到当前显示器的右下角(避开任务栏)
  // 用 currentMonitor() 而不是 primaryMonitor(),多屏场景下能贴到窗口所在的屏幕
  const parkBottomRight = async () => {
    try {
      const win = getCurrentWindow();
      const monitor = await currentMonitor();
      if (!monitor) return;
      // 工作区 = 显示器减去任务栏(dock);都转成逻辑像素跟窗口对齐
      const scale = monitor.scaleFactor;
      const workX = monitor.workArea.position.x / scale;
      const workY = monitor.workArea.position.y / scale;
      const workW = monitor.workArea.size.width / scale;
      const workH = monitor.workArea.size.height / scale;
      // 拿当前窗口外尺寸(物理像素 → 逻辑)
      const winSize = await win.outerSize();
      const winW = winSize.width / scale;
      const winH = winSize.height / scale;
      // 距离右/下边缘各留 16px 留白
      const x = Math.round(workX + workW - winW - 16);
      const y = Math.round(workY + workH - winH - 16);
      await win.setPosition(new LogicalPosition(x, y));
    } catch (err) {
      console.error('[window] parkBottomRight failed:', err);
    }
  };

  // 自适应高度 + 贴右下:量 card 真实高度来决定窗口高度,然后把窗口甩到右下角
  // (不能量 body — 外层 min-h-screen 让 body 跟着 viewport 涨,会触发反馈循环窗口疯涨)
  useEffect(() => {
    const fit = () => {
      if (!cardRef.current) return;
      const cardH = cardRef.current.offsetHeight;
      // 窗口高度 = 标题栏 (36) + 卡片 + 内容区 pb (16) + 4px buffer 抗亚像素
      const targetH = 36 + cardH + 16 + 4;
      setWindowSize(targetH);
      // setSize 后等窗口稳住再 setPosition,否则 outerSize 拿到的还是旧值
      void parkBottomRight();
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (cardRef.current) ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [viewMode]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #d4cfc5 0%, #c9c3b8 8%, #b8b2a6 60%, #aca698 100%)',
      }}
    >
      {/* 自定义标题栏 — 左上角红 × / 黄 — 按钮,中间品牌标签,整条可拖拽 */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{
          height: 36,
          WebkitAppRegion: 'drag',
          ['webkit-app-region' as string]: 'drag',
          userSelect: 'none',
        } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2"
          style={{
            WebkitAppRegion: 'no-drag',
            ['webkit-app-region' as string]: 'no-drag',
          } as React.CSSProperties}
        >
          <button
            onClick={handleClose}
            aria-label="关闭"
            title="关闭"
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              background: 'radial-gradient(circle at 35% 35%, #ff6b6b 0%, #d83a3a 60%, #8a1818 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            <span style={{ color: 'rgba(0,0,0,0.55)', fontSize: 10, fontWeight: 700, lineHeight: 1, marginTop: -1 }}>×</span>
          </button>
          <button
            onClick={handleMinimize}
            aria-label="最小化"
            title="最小化"
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              background: 'radial-gradient(circle at 35% 35%, #f5d04a 0%, #e0b020 60%, #a88010 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.3)',
            }}
          />
        </div>
        <span
          className="text-[10px] tracking-[0.3em] font-bold uppercase pointer-events-none"
          style={{ color: '#6b6558', fontFamily: 'monospace' }}
        >
          ◈ FISHER-PRO 9000 ◈
        </span>
        <div style={{ width: 56 }} aria-hidden />
      </div>

      {/* 设备面板 — 不再被外层深色背景包住,直接铺满窗口 */}
      {/* overflow-hidden:窗口总是 setSize 成刚好包住卡片,scrollbar 是 bug,不该出现 */}
      <div className="flex-1 px-4 pb-4 overflow-hidden">
        <div className="max-w-[440px] mx-auto">
          <div
            ref={cardRef}
            className="relative rounded-[20px] p-5 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #d4cfc5 0%, #c9c3b8 10%, #bdb6a9 50%, #b0a89c 90%, #a59e92 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
            }}
          >

          {/* 模式切换 */}
          <div className="flex gap-1 mb-3">
            {(['timer', 'calendar', 'stats', 'settings'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex-1 py-2 rounded text-[12px] font-bold tracking-wider transition-all"
                style={{
                  fontFamily: 'monospace',
                  background: viewMode === mode
                    ? 'linear-gradient(180deg, #5a6878 0%, #3e4c5c 100%)'
                    : 'linear-gradient(180deg, #908878 0%, #787060 100%)',
                  color: viewMode === mode ? '#fff' : '#c9c3b8',
                  boxShadow: viewMode === mode ? '0 2px 0 #2a3440' : '0 2px 0 #504a40',
                }}
              >
                {mode === 'timer' ? '◉ 计时' : mode === 'calendar' ? '▤ 日历' : mode === 'stats' ? '▦ 统计' : '⚙ 设置'}
              </button>
            ))}
          </div>

          {/* LCD 屏幕 — settings tab 不包,直接显示设置面板 */}
          {viewMode !== 'settings' && (
          <div
            className="relative rounded-lg p-4 mb-4 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #8fa37d 0%, #7a8e68 30%, #6d805c 100%)',
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)',
              minHeight: viewMode === 'timer' ? 'auto' : '280px',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
              }}
            />
            <div className="relative" style={{ fontFamily: '"Courier New", monospace' }}>

              {viewMode === 'timer' && (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[12px]" style={{ color: '#1a2e0a' }}>
                      ● {statusText}
                    </span>
                    <span className="text-[11px]" style={{ color: '#1a2e0a' }}>
                      {segments.length <= 2
                        ? segments.map((s) => `${s.start}-${s.end}`).join(' / ')
                        : `${segments.slice(0, 2).map((s) => `${s.start}-${s.end}`).join(' / ')} ...+${segments.length - 2}`}
                    </span>
                  </div>
                  <div className="text-center mb-3">
                    <div
                      className="text-5xl font-bold tracking-[0.15em]"
                      style={{ color: '#0d1f04', textShadow: '0 0 8px rgba(13,31,4,0.3)' }}
                    >
                      {formatTime(displayTime)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end mb-1">
                    <div>
                      <div className="text-[10px] mb-0.5" style={{ color: '#2a3f1a' }}>EARNED</div>
                      <div className="text-2xl font-bold" style={{ color: '#0d1f04' }}>
                        ¥{todayFishingEarnings.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] mb-0.5" style={{ color: '#2a3f1a' }}>RATE/H</div>
                      <div className="text-lg font-bold" style={{ color: '#0d1f04' }}>
                        ¥{hourlyRate.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {viewMode === 'calendar' && (
                <>
                  {/* 标题栏:跟统计页同款 ◀ [年 ▾] [月 ▾] ▶ */}
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <button
                      onClick={() => {
                        if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
                        else setViewMonth(viewMonth - 1);
                      }}
                      className="px-2 py-1 rounded text-[12px] shrink-0"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >◀</button>
                    <button
                      onClick={() => { setYearPickerOpen(!yearPickerOpen); setMonthPickerOpen(false); }}
                      className="flex-1 py-1 rounded text-[13px] font-bold tabular-nums"
                      style={{
                        background: yearPickerOpen ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                        color: '#0d1f04',
                        fontFamily: 'monospace',
                      }}
                    >{viewYear} 年 {yearPickerOpen ? '▴' : '▾'}</button>
                    <button
                      onClick={() => { setMonthPickerOpen(!monthPickerOpen); setYearPickerOpen(false); }}
                      className="flex-1 py-1 rounded text-[13px] font-bold tabular-nums"
                      style={{
                        background: monthPickerOpen ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                        color: '#0d1f04',
                        fontFamily: 'monospace',
                      }}
                    >{viewMonth} 月 {monthPickerOpen ? '▴' : '▾'}</button>
                    <button
                      onClick={() => {
                        if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
                        else setViewMonth(viewMonth + 1);
                      }}
                      className="px-2 py-1 rounded text-[12px] shrink-0"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >▶</button>
                  </div>

                  {/* 年份 picker — 跟统计页同款 */}
                  {yearPickerOpen && (
                    <div className="rounded p-2 mb-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setViewYear(viewYear - 1)}
                          className="px-2 py-0.5 rounded text-[12px]"
                          style={{ background: 'rgba(0,0,0,0.2)', color: '#1a2e0a' }}
                        >◀</button>
                        <span className="text-[14px] font-bold tabular-nums" style={{ color: '#0d1f04', fontFamily: 'monospace' }}>{viewYear}</span>
                        <button
                          onClick={() => setViewYear(viewYear + 1)}
                          className="px-2 py-0.5 rounded text-[12px]"
                          style={{ background: 'rgba(0,0,0,0.2)', color: '#1a2e0a' }}
                        >▶</button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 16 }, (_, i) => viewYear - 4 + i).map((y) => {
                          const active = y === viewYear;
                          const isCurrent = y === new Date().getFullYear();
                          return (
                            <button
                              key={y}
                              onClick={() => { setViewYear(y); setYearPickerOpen(false); }}
                              className="py-1.5 rounded text-[12px] font-bold transition-all tabular-nums"
                              style={{
                                fontFamily: 'monospace',
                                background: active
                                  ? 'linear-gradient(180deg, #5a6878, #3e4c5c)'
                                  : isCurrent
                                    ? 'rgba(232,144,64,0.3)'
                                    : 'rgba(0,0,0,0.1)',
                                color: active ? '#fff' : '#1a2e0a',
                                boxShadow: active ? '0 1px 0 #2a3440' : 'none',
                              }}
                            >{y}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 月份 picker — 跟统计页同款 */}
                  {monthPickerOpen && (
                    <div className="rounded p-2 mb-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const active = m === viewMonth;
                          const isCurrent = m === new Date().getMonth() + 1 && viewYear === new Date().getFullYear();
                          return (
                            <button
                              key={m}
                              onClick={() => { setViewMonth(m); setMonthPickerOpen(false); }}
                              className="py-1.5 rounded text-[12px] font-bold transition-all tabular-nums"
                              style={{
                                fontFamily: 'monospace',
                                background: active
                                  ? 'linear-gradient(180deg, #5a6878, #3e4c5c)'
                                  : isCurrent
                                    ? 'rgba(232,144,64,0.3)'
                                    : 'rgba(0,0,0,0.1)',
                                color: active ? '#fff' : '#1a2e0a',
                                boxShadow: active ? '0 1px 0 #2a3440' : 'none',
                              }}
                            >{m} 月</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {weekDays.map((d, i) => (
                      <div key={i} className="text-center text-[11px] font-bold py-0.5" style={{ color: '#2a3f1a' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((item, i) => {
                      const hasRecord = item.date && records[item.date];
                      const record = hasRecord ? records[item.date!] : null;
                      const isToday = item.date === new Date().toISOString().split('T')[0];
                      const isSelected = item.date === selectedDate;
                      const heat = record ? heatColor(record.netEarnings) : null;
                      // 选中/今日 圈边:无热力色时仍可覆盖;有热力色时用 inset ring 圈出,避免盖掉色块
                      const ring = isSelected
                        ? 'inset 0 0 0 2px rgba(0,0,0,0.55)'
                        : isToday
                        ? 'inset 0 0 0 2px rgba(232,144,64,0.9)'
                        : 'none';
                      return (
                        <button
                          key={i}
                          onClick={() => item.date && setSelectedDate(item.date)}
                          disabled={!item.day}
                          className="aspect-square flex flex-col items-center justify-center rounded text-[13px] font-bold relative transition-all"
                          style={{
                            background: heat
                              ?? (isSelected
                                ? 'rgba(0,0,0,0.3)'
                                : isToday
                                ? 'rgba(232,144,64,0.3)'
                                : 'rgba(0,0,0,0.08)'),
                            color: record
                              ? record.netEarnings >= 0
                                ? '#0d3f04'
                                : '#3f0d04'
                              : isToday
                              ? '#8a5020'
                              : '#3a4a2a',
                            boxShadow: ring,
                            opacity: item.day ? 1 : 0,
                          }}
                          title={record ? `${record.date} · ${record.netEarnings >= 0 ? '+' : ''}¥${record.netEarnings.toFixed(1)}` : undefined}
                        >
                          {item.day}
                        </button>
                      );
                    })}
                  </div>

                  {/* 热力图图例 */}
                  <div
                    className="mt-1.5 mb-1 flex items-center gap-1 text-[10px] tabular-nums"
                    style={{ color: '#2a3f1a', fontFamily: 'monospace' }}
                  >
                    <span className="shrink-0">亏</span>
                    <div
                      className="flex-1 h-2 rounded-sm"
                      style={{ background: 'linear-gradient(90deg, rgba(208,72,72,0.18) 0%, rgba(208,72,72,0.85) 100%)' }}
                    />
                    <span className="shrink-0 mx-0.5">少</span>
                    <span className="shrink-0">多</span>
                    <div
                      className="flex-1 h-2 rounded-sm"
                      style={{ background: 'linear-gradient(90deg, rgba(64,168,72,0.18) 0%, rgba(64,168,72,0.85) 100%)' }}
                    />
                    <span className="shrink-0">赚</span>
                  </div>

                  {selectedDate && (
                    <div
                      className="mt-2 p-2 rounded text-[11px]"
                      style={{ background: 'rgba(0,0,0,0.1)', color: '#1a2e0a' }}
                    >
                      <div className="font-bold mb-1">
                        {selectedDate} 记录
                        {!selHasRecord && <span style={{ color: '#6b8068', fontWeight: 400 }}> · 暂无</span>}
                      </div>
                      <div className="flex justify-between">
                        <span>摸鱼: {formatTime(selFishTime)}</span>
                        <span style={{ color: '#0d4f04' }}>+¥{selFishEarn.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>加班: {selOverH}h</span>
                        <span style={{ color: '#4f0d04' }}>{selOverE.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between font-bold mt-1 pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                        <span>净利:</span>
                        <span>{selNet >= 0 ? '+' : ''}¥{selNet.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {viewMode === 'stats' && (
                <>
                  {/* 标题栏:◀ + [年 ▾] [月 ▾] + ▶ — 年/月各自独立 picker */}
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <button
                      onClick={() => {
                        if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
                        else setViewMonth(viewMonth - 1);
                      }}
                      className="px-2 py-1 rounded text-[12px] shrink-0"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >◀</button>
                    <button
                      onClick={() => { setYearPickerOpen(!yearPickerOpen); setMonthPickerOpen(false); }}
                      className="flex-1 py-1 rounded text-[13px] font-bold tabular-nums"
                      style={{
                        background: yearPickerOpen ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                        color: '#0d1f04',
                        fontFamily: 'monospace',
                      }}
                    >{viewYear} 年 {yearPickerOpen ? '▴' : '▾'}</button>
                    <button
                      onClick={() => { setMonthPickerOpen(!monthPickerOpen); setYearPickerOpen(false); }}
                      className="flex-1 py-1 rounded text-[13px] font-bold tabular-nums"
                      style={{
                        background: monthPickerOpen ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                        color: '#0d1f04',
                        fontFamily: 'monospace',
                      }}
                    >{viewMonth} 月 {monthPickerOpen ? '▴' : '▾'}</button>
                    <button
                      onClick={() => {
                        if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
                        else setViewMonth(viewMonth + 1);
                      }}
                      className="px-2 py-1 rounded text-[12px] shrink-0"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >▶</button>
                  </div>

                  {/* 年份 picker */}
                  {yearPickerOpen && (
                    <div
                      className="rounded p-2 mb-2"
                      style={{ background: 'rgba(0,0,0,0.18)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setViewYear(viewYear - 1)}
                          className="px-2 py-0.5 rounded text-[12px]"
                          style={{ background: 'rgba(0,0,0,0.2)', color: '#1a2e0a' }}
                        >◀</button>
                        <span className="text-[14px] font-bold tabular-nums" style={{ color: '#0d1f04', fontFamily: 'monospace' }}>{viewYear}</span>
                        <button
                          onClick={() => setViewYear(viewYear + 1)}
                          className="px-2 py-0.5 rounded text-[12px]"
                          style={{ background: 'rgba(0,0,0,0.2)', color: '#1a2e0a' }}
                        >▶</button>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 16 }, (_, i) => viewYear - 4 + i).map((y) => {
                          const active = y === viewYear;
                          const isCurrent = y === new Date().getFullYear();
                          return (
                            <button
                              key={y}
                              onClick={() => { setViewYear(y); setYearPickerOpen(false); }}
                              className="py-1.5 rounded text-[12px] font-bold transition-all tabular-nums"
                              style={{
                                fontFamily: 'monospace',
                                background: active
                                  ? 'linear-gradient(180deg, #5a6878, #3e4c5c)'
                                  : isCurrent
                                    ? 'rgba(232,144,64,0.3)'
                                    : 'rgba(0,0,0,0.1)',
                                color: active ? '#fff' : '#1a2e0a',
                                boxShadow: active ? '0 1px 0 #2a3440' : 'none',
                              }}
                            >{y}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 月份 picker */}
                  {monthPickerOpen && (
                    <div
                      className="rounded p-2 mb-2"
                      style={{ background: 'rgba(0,0,0,0.18)' }}
                    >
                      <div className="grid grid-cols-4 gap-1">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const active = m === viewMonth;
                          const isCurrent = m === new Date().getMonth() + 1 && viewYear === new Date().getFullYear();
                          return (
                            <button
                              key={m}
                              onClick={() => { setViewMonth(m); setMonthPickerOpen(false); }}
                              className="py-1.5 rounded text-[12px] font-bold transition-all tabular-nums"
                              style={{
                                fontFamily: 'monospace',
                                background: active
                                  ? 'linear-gradient(180deg, #5a6878, #3e4c5c)'
                                  : isCurrent
                                    ? 'rgba(232,144,64,0.3)'
                                    : 'rgba(0,0,0,0.1)',
                                color: active ? '#fff' : '#1a2e0a',
                                boxShadow: active ? '0 1px 0 #2a3440' : 'none',
                              }}
                            >{m} 月</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div
                    className="rounded p-2 mb-2"
                    style={{ background: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="text-[11px] mb-1 font-bold" style={{ color: '#2a3f1a' }}>{viewYear} 年累计</div>
                    <div className="grid grid-cols-2 gap-1 text-[12px]" style={{ color: '#0d1f04' }}>
                      <div>摸鱼天数: {yearStats.days}天</div>
                      <div>摸鱼时长: {formatTime(yearStats.totalFish)}</div>
                      <div>加班时长: {yearStats.totalOvertime}h</div>
                      <div>净收益: <span style={{ color: yearStats.totalNet >= 0 ? '#0d4f04' : '#4f0d04' }}>
                        {yearStats.totalNet >= 0 ? '+' : ''}¥{yearStats.totalNet.toFixed(0)}
                      </span></div>
                    </div>
                  </div>

                  <div
                    className="rounded p-2"
                    style={{ background: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                      <div>
                        <div style={{ color: '#0d4f04' }}>摸鱼收入</div>
                        <div className="text-[13px] font-bold" style={{ color: '#0d3f04' }}>+¥{monthStats.totalFishEarn.toFixed(0)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#4f0d04' }}>加班亏损</div>
                        <div className="text-[13px] font-bold" style={{ color: '#3f0d04' }}>-¥{Math.abs(monthStats.totalOverEarn).toFixed(0)}</div>
                      </div>
                      <div>
                        <div style={{ color: monthStats.totalNet >= 0 ? '#0d4f04' : '#4f0d04' }}>
                          {monthStats.totalNet >= 0 ? '净赚' : '净亏'}
                        </div>
                        <div className="text-[13px] font-bold" style={{ color: monthStats.totalNet >= 0 ? '#0d3f04' : '#3f0d04' }}>
                          {monthStats.totalNet >= 0 ? '+' : ''}¥{monthStats.totalNet.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px]" style={{ color: '#2a3f1a' }}>
                      {viewMonth}月摸鱼 {formatTime(monthStats.totalFish)} / 加班 {monthStats.totalOvertime}h / {monthStats.days}天有记录
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* 统计行 - 仅计时模式显示 */}
          {viewMode === 'timer' && (
            <div className="flex gap-2 mb-4">
              <div
                className="flex-1 rounded-md p-2 text-center"
                style={{ background: 'linear-gradient(180deg, #a8c490 0%, #8fb374 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' }}
              >
                <div className="text-[10px] mb-0.5" style={{ color: '#2a3f1a', fontFamily: 'monospace' }}>FISH +</div>
                <div className="text-sm font-bold" style={{ fontFamily: '"Courier New", monospace', color: '#0d1f04' }}>
                  +¥{todayFishingEarnings.toFixed(1)}
                </div>
              </div>
              <div
                className="flex-1 rounded-md p-2 text-center"
                style={{ background: 'linear-gradient(180deg, #c49090 0%, #b37474 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' }}
              >
                <div className="text-[10px] mb-0.5" style={{ color: '#3f1a1a', fontFamily: 'monospace' }}>WORK -</div>
                <div className="text-sm font-bold" style={{ fontFamily: '"Courier New", monospace', color: '#1f0404' }}>
                  -¥{Math.abs(todayOvertimeEarnings).toFixed(1)}
                </div>
              </div>
              <div
                className="flex-1 rounded-md p-2 text-center"
                style={{
                  background: todayNetEarnings >= 0
                    ? 'linear-gradient(180deg, #c4b090 0%, #b39f74 100%)'
                    : 'linear-gradient(180deg, #c49090 0%, #b37474 100%)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                }}
              >
                <div className="text-[10px] mb-0.5" style={{ color: '#3f341a', fontFamily: 'monospace' }}>NET</div>
                <div
                  className="text-sm font-bold"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    color: todayNetEarnings >= 0 ? '#0d1f04' : '#3f0d04',
                  }}
                >
                  {todayNetEarnings >= 0 ? '+' : ''}¥{todayNetEarnings.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {/* 按钮区 - 计时模式 */}
          {viewMode === 'timer' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={isFishing ? stopFishing : startFishing}
                  className="flex-1 py-3 rounded-lg font-bold text-sm tracking-wider transition-all active:translate-y-0.5 active:shadow-inner"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    background: isFishing
                      ? 'linear-gradient(180deg, #c95050 0%, #a83838 100%)'
                      : 'linear-gradient(180deg, #e89040 0%, #d07830 100%)',
                    color: '#fff8e8',
                    boxShadow: isFishing
                      ? '0 3px 0 #7a2424, 0 5px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : '0 3px 0 #945418, 0 5px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {isFishing ? '■ 停止摸鱼' : '▶ 开始摸鱼'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* 加班 — 挪到重置今日左边填空白 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] tracking-wider shrink-0" style={{ color: '#5a5448', fontFamily: 'monospace' }}>加班</span>
                  <div className="flex gap-0.5 shrink-0">
                    {([
                      { v: 'weekday' as const, label: '工', title: '工作日' },
                      { v: 'weekend' as const, label: '休', title: '周末' },
                      { v: 'holiday' as const, label: '假', title: '节假日' },
                    ]).map((opt) => {
                      const active = getTodayRecord().overtimeType === opt.v;
                      return (
                        <button
                          key={opt.v}
                          onClick={() => setOvertimeType(opt.v)}
                          title={opt.title}
                          className="w-6 h-5 rounded-sm text-[10px] font-bold transition-all"
                          style={{
                            fontFamily: 'monospace',
                            background: active
                              ? 'linear-gradient(180deg, #d89040, #c07830)'
                              : 'linear-gradient(180deg, #908878, #787060)',
                            color: active ? '#fff' : '#c9c3b8',
                            boxShadow: active ? '0 1px 0 #804818' : '0 1px 0 #504a40',
                          }}
                        >{opt.label}</button>
                      );
                    })}
                  </div>
                  <input
                    type="number"
                    value={tempOvertime}
                    onChange={(e) => setTempOvertime(e.target.value)}
                    onBlur={handleOvertimeSubmit}
                    step="0.5"
                    min="0"
                    className="w-14 py-0.5 px-1.5 rounded text-[11px] font-bold text-right tabular-nums"
                    style={{
                      fontFamily: '"Courier New", monospace',
                      background: '#1a2a1a',
                      color: '#c48080',
                      border: '2px solid #0d1a0d',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  />
                  <span className="text-[9px]" style={{ color: '#6b6558' }}>h</span>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{
                      color: todayOvertimeEarnings > 0 ? '#5a8030'
                        : todayOvertimeEarnings < 0 ? '#a85040'
                        : '#6b6558',
                    }}
                  >
                    {todayOvertimeEarnings >= 0 ? '+' : ''}¥{todayOvertimeEarnings.toFixed(1)}
                  </span>
                </div>

                {/* 重置今日 — 推到右边 */}
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-md text-[13px] font-bold transition-all active:translate-y-0.5 ml-auto"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    background: 'linear-gradient(180deg, #687888 0%, #4c5c6c 100%)',
                    color: '#d4e0eb',
                    boxShadow: '0 2px 0 #303c48, 0 3px 5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  ⟳ 重置今日
                </button>
              </div>
            </div>
          )}

          {/* 今日状态面板 - 仅计时模式,填补空白 */}
          {viewMode === 'timer' && (
            <div
              className="mt-3 rounded-md p-2.5"
              style={{
                background: 'linear-gradient(180deg, #1a2418 0%, #0e1a0e 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(120,160,90,0.15), 0 1px 0 rgba(255,255,255,0.04)',
                fontFamily: '"Courier New", monospace',
              }}
            >
              {/* 工时进度 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] tracking-wider shrink-0" style={{ color: '#5a7040' }}>工时</span>
                <div
                  className="flex-1 relative h-3 rounded-sm overflow-hidden"
                  style={{ background: '#0a1408', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }}
                >
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.min(100, Math.max(0, workdayProgress))}%`,
                      background: 'linear-gradient(180deg, #7aa050 0%, #4a7030 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(90deg, transparent 0, transparent 7px, rgba(0,0,0,0.35) 7px, rgba(0,0,0,0.35) 8px)' }}
                  />
                </div>
                <span className="text-[11px] font-bold w-9 text-right shrink-0 tabular-nums" style={{ color: '#8fa37d' }}>
                  {Math.round(workdayProgress)}%
                </span>
              </div>

              {/* 近 7 日柱状图 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-wider shrink-0" style={{ color: '#5a7040' }}>7日</span>
                <div className="flex-1 flex items-end gap-0.5 h-7">
                  {last7Days.map((d, i) => {
                    const maxAbs = Math.max(1, ...last7Days.map(x => Math.abs(x.value)));
                    const heightPct = d.value === 0 ? 8 : Math.max(12, (Math.abs(d.value) / maxAbs) * 92);
                    const isToday = i === last7Days.length - 1;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full relative" title={`${d.date}: ${d.value >= 0 ? '+' : ''}¥${d.value.toFixed(1)}`}>
                        {isToday && (
                          <span className="absolute -top-2 text-[8px] leading-none" style={{ color: '#a0c080' }}>▼</span>
                        )}
                        <div
                          className="w-full rounded-sm"
                          style={{
                            height: `${heightPct}%`,
                            background: d.value >= 0
                              ? 'linear-gradient(180deg, #7aa050 0%, #5a8030 100%)'
                              : 'linear-gradient(180deg, #b07050 0%, #804030 100%)',
                            boxShadow: isToday
                              ? '0 0 6px rgba(143,180,100,0.7), inset 0 1px 0 rgba(255,255,255,0.2)'
                              : 'inset 0 1px 0 rgba(255,255,255,0.1)',
                            minHeight: 2,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[11px] font-bold w-12 text-right shrink-0 tabular-nums" style={{ color: weekNet >= 0 ? '#8fa37d' : '#c49080' }}>
                  {weekNet >= 0 ? '+' : ''}¥{weekNet.toFixed(0)}
                </span>
              </div>

              {/* 今日摸鱼宣言 */}
              <div
                className="mt-2 pt-1.5 text-[11px] text-center italic tracking-wide"
                style={{ color: '#6a8050', borderTop: '1px dashed rgba(120,160,90,0.18)' }}
              >
                「 {dailyQuote} 」
              </div>
            </div>
          )}

          {/* 设置页 */}
          {viewMode === 'settings' && (
            <div className="space-y-3 mt-1">

              {/* 0. 当前状态 */}
              <div className="rounded-lg p-3" style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}>
                <div className="text-[12px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 当前状态</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" style={{ fontFamily: 'monospace', color: '#3a4a30' }}>
                  <div>月均工作日 <b>{workDaysPerMonth}</b> 天</div>
                  <div>每日工时 <b>{workHours.toFixed(1)}</b> h</div>
                  <div>时薪 <b style={{ color: '#5a8030' }}>¥{hourlyRate.toFixed(2)}</b></div>
                  <div>加班费 <b style={{ color: '#5a5020', fontFamily: 'monospace' }}>
                    工{overtimeRates.weekday === null ? '—' : `${overtimeRates.weekday.toFixed(0)}`} 休{ overtimeRates.weekend === null ? '—' : `${overtimeRates.weekend.toFixed(0)}`} 假{ overtimeRates.holiday === null ? '—' : `${overtimeRates.holiday.toFixed(0)}`}
                  </b></div>
                </div>
              </div>

              {/* 1. 薪酬 */}
              <div className="rounded-lg p-3" style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}>
                <div className="text-[12px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 薪酬</div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSalary('monthly', salary)}
                    className="flex-1 py-2 rounded text-[13px] font-bold transition-all"
                    style={{
                      fontFamily: 'monospace',
                      background: salaryType === 'monthly' ? 'linear-gradient(180deg, #d89040, #c07830)' : 'linear-gradient(180deg, #908878, #787060)',
                      color: salaryType === 'monthly' ? '#fff' : '#c9c3b8',
                      boxShadow: salaryType === 'monthly' ? '0 2px 0 #804818' : '0 2px 0 #504a40',
                    }}
                  >月薪</button>
                  <button
                    onClick={() => setSalary('yearly', salary)}
                    className="flex-1 py-2 rounded text-[13px] font-bold transition-all"
                    style={{
                      fontFamily: 'monospace',
                      background: salaryType === 'yearly' ? 'linear-gradient(180deg, #d89040, #c07830)' : 'linear-gradient(180deg, #908878, #787060)',
                      color: salaryType === 'yearly' ? '#fff' : '#c9c3b8',
                      boxShadow: salaryType === 'yearly' ? '0 2px 0 #804818' : '0 2px 0 #504a40',
                    }}
                  >年薪</button>
                  <input
                    type="number"
                    value={tempSalary}
                    onChange={(e) => setTempSalary(e.target.value)}
                    onBlur={handleSalarySubmit}
                    className="w-24 py-1.5 px-2 rounded text-xs font-bold text-right"
                    style={{
                      fontFamily: '"Courier New", monospace',
                      background: '#1a2a1a',
                      color: '#8fa37d',
                      border: '2px solid #0d1a0d',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  />
                  <span className="text-xs flex items-center" style={{ color: '#6b6558', fontFamily: 'monospace' }}>元</span>
                </div>
                <div className="text-[10px]" style={{ color: '#6b6558', fontFamily: 'monospace' }}>
                  时薪 ¥{hourlyRate.toFixed(2)} = ¥{(salaryType === 'monthly' ? salary : salary / 12).toFixed(0)} ÷ {workDaysPerMonth}天 ÷ {workHours.toFixed(1)}h
                </div>
              </div>

              {/* 2. 工作日 */}
              <div className="rounded-lg p-3" style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}>
                <div className="text-[12px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 工作日 (月均)</div>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'rest2', label: '双休 22天' },
                    { v: 'rest1', label: '单休 26天' },
                    { v: 'bigSmall', label: '大小周 24天' },
                    { v: 'custom', label: '自定义' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setWorkDays(opt.v, workDaysPerMonth)}
                      className="py-2 rounded text-[12px] font-bold transition-all"
                      style={{
                        fontFamily: 'monospace',
                        background: workDaysType === opt.v ? 'linear-gradient(180deg, #d89040, #c07830)' : 'linear-gradient(180deg, #908878, #787060)',
                        color: workDaysType === opt.v ? '#fff' : '#c9c3b8',
                        boxShadow: workDaysType === opt.v ? '0 2px 0 #804818' : '0 2px 0 #504a40',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
                {workDaysType === 'custom' && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      value={tempCustomDays}
                      onChange={(e) => setTempCustomDays(e.target.value)}
                      onBlur={handleCustomDaysSubmit}
                      className="w-20 py-1.5 px-2 rounded text-xs font-bold text-right"
                      style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}
                      step="1"
                      min="1"
                      max="31"
                    />
                    <span className="text-xs" style={{ color: '#6b6558', fontFamily: 'monospace' }}>天/月</span>
                  </div>
                )}
              </div>

              {/* 3. 工时安排 */}
              <div className="rounded-lg p-3" style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}>
                <div className="text-[12px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 工时安排</div>
                <div className="space-y-2">
                  {segments.map((seg, idx) => {
                    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                    const mins = (toMin(seg.end) - toMin(seg.start) + 1440) % 1440;
                    const isEmpty = mins === 0 && seg.start === seg.end;
                    return (
                      <div key={seg.id} className="flex items-center gap-2">
                        <span className="text-[10px] w-10 shrink-0 tabular-nums" style={{ color: '#5a5448', fontFamily: 'monospace' }}>工时 {idx + 1}</span>
                        <input
                          type="time"
                          value={seg.start}
                          onChange={(e) => updateSegment(seg.id, 'start', e.target.value)}
                          className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                          style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                        />
                        <span className="text-xs" style={{ color: '#6b6558' }}>~</span>
                        <input
                          type="time"
                          value={seg.end}
                          onChange={(e) => updateSegment(seg.id, 'end', e.target.value)}
                          className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                          style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                        />
                        <span className="text-[10px] w-10 text-right tabular-nums" style={{ color: isEmpty ? '#7a7868' : '#5a5020', fontFamily: 'monospace' }}>
                          {isEmpty ? '—' : `${(mins / 60).toFixed(1)}h`}
                        </span>
                        <button
                          onClick={() => removeSegment(seg.id)}
                          disabled={segments.length <= 1}
                          className="w-5 h-5 rounded text-[10px] font-bold transition-all"
                          style={{
                            fontFamily: 'monospace',
                            background: segments.length <= 1 ? '#a8a098' : 'linear-gradient(180deg, #c95050, #a83838)',
                            color: segments.length <= 1 ? '#c9c3b8' : '#fff',
                            boxShadow: segments.length <= 1 ? 'none' : '0 1px 0 #7a2424',
                            cursor: segments.length <= 1 ? 'not-allowed' : 'pointer',
                            opacity: segments.length <= 1 ? 0.5 : 1,
                          }}
                          title="删除该段"
                        >×</button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={addSegment}
                  className="mt-2 w-full py-1.5 rounded text-[11px] font-bold transition-all"
                  style={{
                    fontFamily: 'monospace',
                    background: 'linear-gradient(180deg, #908878, #787060)',
                    color: '#c9c3b8',
                    boxShadow: '0 2px 0 #504a40',
                  }}
                >+ 添加工时段</button>
                <div className="text-[10px] mt-2" style={{ color: '#6b6558', fontFamily: 'monospace' }}>
                  每日工时 {workHours.toFixed(1)}h · 跨夜段:开始&gt;结束
                </div>
              </div>

              {/* 4. 加班费 */}
              <div className="rounded-lg p-3" style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-bold" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 加班费 (元/小时)</div>
                  <div className="text-[10px]" style={{ color: '#6b6558', fontFamily: 'monospace' }}>时薪 ¥{hourlyRate.toFixed(2)}</div>
                </div>
                <div className="text-[10px] mb-2" style={{ color: '#6b6558', fontFamily: 'monospace' }}>
                  留空 = 没设置,加班 = 亏满
                </div>
                {([
                  { type: 'weekday' as const, label: '普通工作日', temp: tempWeekdayRate, setTemp: setTempWeekdayRate },
                  { type: 'weekend' as const, label: '周末', temp: tempWeekendRate, setTemp: setTempWeekendRate },
                  { type: 'holiday' as const, label: '节假日', temp: tempHolidayRate, setTemp: setTempHolidayRate },
                ]).map(({ type, label, temp, setTemp }) => {
                  const rate = overtimeRates[type];
                  const setByUser = rate !== null;
                  // 每小时净盈亏 = otRate - 时薪(null 时按 0 算 = 亏满)
                  const earnPerHour = (rate ?? 0) - hourlyRate;
                  const status = earnPerHour > 0
                    ? { text: `赚 ¥${earnPerHour.toFixed(0)}/h`, color: '#0d4f04' }
                    : earnPerHour === 0
                      ? { text: '±¥0/h', color: '#5a5020' }
                      : { text: `亏 ¥${Math.abs(earnPerHour).toFixed(0)}/h`, color: '#4f0d04' };
                  return (
                    <div key={type} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] w-20 shrink-0" style={{ color: '#5a5448', fontFamily: 'monospace' }}>{label}</span>
                      <input
                        type="number"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        onBlur={() => handleRateSubmit(type, temp)}
                        step="0.5"
                        min="0"
                        placeholder="—"
                        className="w-20 py-1 px-2 rounded text-xs font-bold text-right"
                        style={{
                          fontFamily: '"Courier New", monospace',
                          background: setByUser ? '#1a2a1a' : '#2a2a2a',
                          color: setByUser ? '#8fa37d' : '#7a7868',
                          border: '2px solid #0d1a0d',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: '#6b6558', fontFamily: 'monospace' }}>元/小时</span>
                      <span
                        className="text-[10px] font-bold ml-auto tabular-nums"
                        style={{ color: status.color, fontFamily: 'monospace' }}
                      >
                        {status.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 底部装饰 */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#8a3030', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: isFishing ? '#508030' : '#3a4a30', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)' }} />
            </div>
            <span className="text-[9px]" style={{ color: '#7a7468', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              MADE FOR SLACKERS
            </span>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
