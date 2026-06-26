import { useFishTimerStore } from '@/store/useFishTimerStore';
import { useState, useEffect, useMemo } from 'react';

function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

type ViewMode = 'timer' | 'calendar' | 'stats';

export default function App() {
  const {
    salaryType,
    salary,
    amStartTime,
    amEndTime,
    pmStartTime,
    pmEndTime,
    isFishing,
    fishingStartTime,
    records,
    getHourlyRate,
    getWorkHoursPerDay,
    getCurrentFishingTime,
    getTodayFishingEarnings,
    getTodayOvertimeEarnings,
    getTodayNetEarnings,
    getTodayRecord,
    isDuringWorkTime,
    getMonthRecords,
    getYearRecords,
    setSalary,
    setWorkTime,
    startFishing,
    stopFishing,
    setOvertimeHours,
    reset,
  } = useFishTimerStore();

  const [displayTime, setDisplayTime] = useState(0);
  const [tempSalary, setTempSalary] = useState(salary.toString());
  const [tempOvertime, setTempOvertime] = useState(getTodayRecord().overtimeHours.toString());
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('timer');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const todayFishingEarnings = getTodayFishingEarnings();
  const todayOvertimeEarnings = getTodayOvertimeEarnings();
  const todayNetEarnings = getTodayNetEarnings();
  const hourlyRate = getHourlyRate();
  const workHours = getWorkHoursPerDay();
  const statusText = isFishing ? '摸鱼中' : isDuringWorkTime() ? '工作中' : '待机';

  // 日历逻辑
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
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
  }, [currentDate]);

  const monthRecords = useMemo(() => {
    return getMonthRecords(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate, records]);

  const monthStats = useMemo(() => {
    const totalFish = monthRecords.reduce((sum, r) => sum + r.fishingTime, 0);
    const totalOvertime = monthRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalFishEarn = monthRecords.reduce((sum, r) => sum + r.fishingEarnings, 0);
    const totalOverEarn = monthRecords.reduce((sum, r) => sum + r.overtimeEarnings, 0);
    const totalNet = totalFishEarn + totalOverEarn;
    return { totalFish, totalOvertime, totalFishEarn, totalOverEarn, totalNet, days: monthRecords.length };
  }, [monthRecords]);

  const yearRecords = useMemo(() => {
    return getYearRecords(currentDate.getFullYear());
  }, [currentDate, records]);

  const yearStats = useMemo(() => {
    const totalFish = yearRecords.reduce((sum, r) => sum + r.fishingTime, 0);
    const totalOvertime = yearRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
    const totalFishEarn = yearRecords.reduce((sum, r) => sum + r.fishingEarnings, 0);
    const totalOverEarn = yearRecords.reduce((sum, r) => sum + r.overtimeEarnings, 0);
    const totalNet = totalFishEarn + totalOverEarn;
    return { totalFish, totalOvertime, totalFishEarn, totalOverEarn, totalNet, days: yearRecords.length };
  }, [yearRecords]);

  const selectedRecord = selectedDate ? records[selectedDate] : null;

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handleClose = () => {
    (window as unknown as { slackerAPI?: { closeWindow?: () => void } }).slackerAPI?.closeWindow?.();
  };
  const handleMinimize = () => {
    (window as unknown as { slackerAPI?: { minimizeWindow?: () => void } }).slackerAPI?.minimizeWindow?.();
  };
  const setWindowSize = (height: number) => {
    (window as unknown as { slackerAPI?: { setWindowSize?: (w: number, h: number) => void } })
      .slackerAPI?.setWindowSize?.(480, height);
  };

  // 根据 viewMode + 设置面板展开状态动态调整窗口高度,避免下方空白
  useEffect(() => {
    // 高度估算:标题栏(36) + 内容区 pt(16) + 卡片 padding(40)
    //         + 模式按钮(38) + LCD(计时 200 / 日历·统计 280) + mb(16)
    //         + 统计行(仅计时,76) + 按钮区(仅计时,92) + mt(16)
    //         + 底部装饰(20) + 内容区 pb(16)
    let h = 36 + 16 + 40 + 38 + 16 + 20 + 16; // 共享部分
    h += viewMode === 'timer' ? 200 : 280;     // LCD 屏
    if (viewMode === 'timer') {
      h += 76 + 92;                            // 统计行 + 按钮区
      if (showSettings) h += 250;              // 设置面板
    }
    setWindowSize(h);
  }, [viewMode, showSettings]);

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
        style={{ height: 36, WebkitAppRegion: 'drag', userSelect: 'none' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={handleClose}
            aria-label="关闭"
            title="关闭"
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{
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
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <div className="max-w-[440px] mx-auto">
          <div
            className="relative rounded-[20px] p-5 shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #d4cfc5 0%, #c9c3b8 10%, #bdb6a9 50%, #b0a89c 90%, #a59e92 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
            }}
          >

          {/* 模式切换 */}
          <div className="flex gap-1 mb-3">
            {(['timer', 'calendar', 'stats'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex-1 py-1.5 rounded text-[10px] font-bold tracking-wider transition-all"
                style={{
                  fontFamily: 'monospace',
                  background: viewMode === mode
                    ? 'linear-gradient(180deg, #5a6878 0%, #3e4c5c 100%)'
                    : 'linear-gradient(180deg, #908878 0%, #787060 100%)',
                  color: viewMode === mode ? '#fff' : '#c9c3b8',
                  boxShadow: viewMode === mode ? '0 2px 0 #2a3440' : '0 2px 0 #504a40',
                }}
              >
                {mode === 'timer' ? '◉ 计时' : mode === 'calendar' ? '▤ 日历' : '▦ 统计'}
              </button>
            ))}
          </div>

          {/* LCD 屏幕 */}
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
                    <span className="text-[10px]" style={{ color: '#1a2e0a' }}>
                      ● {statusText}
                    </span>
                    <span className="text-[10px]" style={{ color: '#1a2e0a' }}>
                      {amStartTime}-{amEndTime}/{pmStartTime}-{pmEndTime}
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
                      <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a' }}>EARNED</div>
                      <div className="text-2xl font-bold" style={{ color: '#0d1f04' }}>
                        ¥{todayFishingEarnings.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a' }}>RATE/H</div>
                      <div className="text-lg font-bold" style={{ color: '#0d1f04' }}>
                        ¥{hourlyRate.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {viewMode === 'calendar' && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="text-[12px] px-2 py-1 rounded"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >
                      ◀
                    </button>
                    <span className="text-sm font-bold" style={{ color: '#0d1f04' }}>
                      {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                    </span>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="text-[12px] px-2 py-1 rounded"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >
                      ▶
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {weekDays.map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-bold py-0.5" style={{ color: '#2a3f1a' }}>
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
                      return (
                        <button
                          key={i}
                          onClick={() => item.date && setSelectedDate(isSelected ? null : item.date)}
                          disabled={!item.day}
                          className="aspect-square flex flex-col items-center justify-center rounded text-[10px] font-bold relative transition-all"
                          style={{
                            background: isSelected
                              ? 'rgba(0,0,0,0.3)'
                              : isToday
                              ? 'rgba(232,144,64,0.3)'
                              : 'rgba(0,0,0,0.08)',
                            color: record
                              ? record.netEarnings >= 0
                                ? '#0d3f04'
                                : '#3f0d04'
                              : isToday
                              ? '#8a5020'
                              : '#3a4a2a',
                            opacity: item.day ? 1 : 0,
                          }}
                        >
                          {item.day}
                          {record && record.netEarnings !== 0 && (
                            <div
                              className="w-1.5 h-1.5 rounded-full absolute bottom-0.5"
                              style={{
                                background: record.netEarnings >= 0 ? '#208020' : '#802020',
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedRecord && (
                    <div
                      className="mt-2 p-2 rounded text-[9px]"
                      style={{ background: 'rgba(0,0,0,0.1)', color: '#1a2e0a' }}
                    >
                      <div className="font-bold mb-1">{selectedDate} 记录:</div>
                      <div className="flex justify-between">
                        <span>摸鱼: {formatTime(selectedRecord.fishingTime)}</span>
                        <span style={{ color: '#0d4f04' }}>+¥{selectedRecord.fishingEarnings.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>加班: {selectedRecord.overtimeHours}h</span>
                        <span style={{ color: '#4f0d04' }}>{selectedRecord.overtimeEarnings.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between font-bold mt-1 pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                        <span>净利:</span>
                        <span>{selectedRecord.netEarnings >= 0 ? '+' : ''}¥{selectedRecord.netEarnings.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {viewMode === 'stats' && (
                <>
                  <div className="text-center text-sm font-bold mb-3" style={{ color: '#0d1f04' }}>
                    {currentDate.getFullYear()}年 年度统计
                  </div>

                  <div
                    className="rounded p-2 mb-2"
                    style={{ background: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="text-[9px] mb-1 font-bold" style={{ color: '#2a3f1a' }}>本年累计</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]" style={{ color: '#0d1f04' }}>
                      <div>摸鱼天数: {yearStats.days}天</div>
                      <div>摸鱼时长: {formatTime(yearStats.totalFish)}</div>
                      <div>加班时长: {yearStats.totalOvertime}h</div>
                      <div>净收益: <span style={{ color: yearStats.totalNet >= 0 ? '#0d4f04' : '#4f0d04' }}>
                        {yearStats.totalNet >= 0 ? '+' : ''}¥{yearStats.totalNet.toFixed(0)}
                      </span></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                      className="text-[10px] px-2 py-1 rounded"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >
                      ◀
                    </button>
                    <span className="text-xs font-bold" style={{ color: '#0d1f04' }}>
                      {currentDate.getMonth() + 1}月统计
                    </span>
                    <button
                      onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                      className="text-[10px] px-2 py-1 rounded"
                      style={{ background: 'rgba(0,0,0,0.15)', color: '#1a2e0a' }}
                    >
                      ▶
                    </button>
                  </div>

                  <div
                    className="rounded p-2"
                    style={{ background: 'rgba(0,0,0,0.08)' }}
                  >
                    <div className="grid grid-cols-3 gap-1 text-center text-[9px]">
                      <div>
                        <div style={{ color: '#0d4f04' }}>摸鱼收入</div>
                        <div className="text-[11px] font-bold" style={{ color: '#0d3f04' }}>+¥{monthStats.totalFishEarn.toFixed(0)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#4f0d04' }}>加班亏损</div>
                        <div className="text-[11px] font-bold" style={{ color: '#3f0d04' }}>-¥{Math.abs(monthStats.totalOverEarn).toFixed(0)}</div>
                      </div>
                      <div>
                        <div style={{ color: monthStats.totalNet >= 0 ? '#0d4f04' : '#4f0d04' }}>
                          {monthStats.totalNet >= 0 ? '净赚' : '净亏'}
                        </div>
                        <div className="text-[11px] font-bold" style={{ color: monthStats.totalNet >= 0 ? '#0d3f04' : '#3f0d04' }}>
                          {monthStats.totalNet >= 0 ? '+' : ''}¥{monthStats.totalNet.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px]" style={{ color: '#2a3f1a' }}>
                      本月摸鱼 {formatTime(monthStats.totalFish)} / 加班 {monthStats.totalOvertime}h / {monthStats.days}天有记录
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 统计行 - 仅计时模式显示 */}
          {viewMode === 'timer' && (
            <div className="flex gap-2 mb-4">
              <div
                className="flex-1 rounded-md p-2 text-center"
                style={{ background: 'linear-gradient(180deg, #a8c490 0%, #8fb374 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' }}
              >
                <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a', fontFamily: 'monospace' }}>FISH +</div>
                <div className="text-sm font-bold" style={{ fontFamily: '"Courier New", monospace', color: '#0d1f04' }}>
                  +¥{todayFishingEarnings.toFixed(1)}
                </div>
              </div>
              <div
                className="flex-1 rounded-md p-2 text-center"
                style={{ background: 'linear-gradient(180deg, #c49090 0%, #b37474 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)' }}
              >
                <div className="text-[9px] mb-0.5" style={{ color: '#3f1a1a', fontFamily: 'monospace' }}>WORK -</div>
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
                <div className="text-[9px] mb-0.5" style={{ color: '#3f341a', fontFamily: 'monospace' }}>NET</div>
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

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex-1 py-2 rounded-md text-xs font-bold tracking-wider transition-all active:translate-y-0.5"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    background: 'linear-gradient(180deg, #787060 0%, #5e584c 100%)',
                    color: '#d4cfc5',
                    boxShadow: '0 2px 0 #3e3a32, 0 3px 5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  {showSettings ? '▲ 收起' : '▼ 设置'}
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-md text-xs font-bold transition-all active:translate-y-0.5"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    background: 'linear-gradient(180deg, #687888 0%, #4c5c6c 100%)',
                    color: '#d4e0eb',
                    boxShadow: '0 2px 0 #303c48, 0 3px 5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  ⟳
                </button>
              </div>
            </div>
          )}

          {/* 设置面板 */}
          {viewMode === 'timer' && showSettings && (
            <div
              className="mt-4 rounded-lg p-3"
              style={{ background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}
            >
              <div className="mb-3">
                <div className="text-[10px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 薪酬</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSalary('monthly', salary)}
                    className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
                    style={{
                      fontFamily: 'monospace',
                      background: salaryType === 'monthly' ? 'linear-gradient(180deg, #d89040, #c07830)' : 'linear-gradient(180deg, #908878, #787060)',
                      color: salaryType === 'monthly' ? '#fff' : '#c9c3b8',
                      boxShadow: salaryType === 'monthly' ? '0 2px 0 #804818' : '0 2px 0 #504a40',
                    }}
                  >
                    月薪
                  </button>
                  <button
                    onClick={() => setSalary('yearly', salary)}
                    className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
                    style={{
                      fontFamily: 'monospace',
                      background: salaryType === 'yearly' ? 'linear-gradient(180deg, #d89040, #c07830)' : 'linear-gradient(180deg, #908878, #787060)',
                      color: salaryType === 'yearly' ? '#fff' : '#c9c3b8',
                      boxShadow: salaryType === 'yearly' ? '0 2px 0 #804818' : '0 2px 0 #504a40',
                    }}
                  >
                    年薪
                  </button>
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
                </div>
              </div>

              <div className="mb-3">
                <div className="text-[10px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 加班(亏)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempOvertime}
                    onChange={(e) => setTempOvertime(e.target.value)}
                    onBlur={handleOvertimeSubmit}
                    className="w-20 py-1.5 px-2 rounded text-xs font-bold text-right"
                    style={{
                      fontFamily: '"Courier New", monospace',
                      background: '#2a1a1a',
                      color: '#c48080',
                      border: '2px solid #1a0d0d',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                    }}
                    step="0.5"
                    min="0"
                  />
                  <span className="text-xs" style={{ color: '#6b6558', fontFamily: 'monospace' }}>小时</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>▸ 工时 ({workHours.toFixed(1)}h/天)</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-6" style={{ color: '#8a6030', fontFamily: 'monospace' }}>上午</span>
                    <input
                      type="time"
                      value={amStartTime}
                      onChange={(e) => setWorkTime(e.target.value, amEndTime, pmStartTime, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                    />
                    <span className="text-xs" style={{ color: '#6b6558' }}>~</span>
                    <input
                      type="time"
                      value={amEndTime}
                      onChange={(e) => setWorkTime(amStartTime, e.target.value, pmStartTime, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-6" style={{ color: '#603080', fontFamily: 'monospace' }}>下午</span>
                    <input
                      type="time"
                      value={pmStartTime}
                      onChange={(e) => setWorkTime(amStartTime, amEndTime, e.target.value, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                    />
                    <span className="text-xs" style={{ color: '#6b6558' }}>~</span>
                    <input
                      type="time"
                      value={pmEndTime}
                      onChange={(e) => setWorkTime(amStartTime, amEndTime, pmStartTime, e.target.value)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{ fontFamily: '"Courier New", monospace', background: '#1a2a1a', color: '#8fa37d', border: '2px solid #0d1a0d' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 底部装饰 */}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: '#8a3030', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: isFishing ? '#508030' : '#3a4a30', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.3)' }} />
            </div>
            <span className="text-[8px]" style={{ color: '#7a7468', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              MADE FOR SLACKERS
            </span>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
