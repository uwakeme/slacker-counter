import { useFishTimerStore } from '@/store/useFishTimerStore';
import { useState, useEffect } from 'react';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

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
    totalFishingTime,
    overtimeHours,
    getHourlyRate,
    getWorkHoursPerDay,
    getFishingEarnings,
    getOvertimeEarnings,
    getNetEarnings,
    isDuringWorkTime,
    setSalary,
    setWorkTime,
    startFishing,
    stopFishing,
    setOvertimeHours,
    reset,
  } = useFishTimerStore();

  const [currentTime, setCurrentTime] = useState(totalFishingTime);
  const [tempSalary, setTempSalary] = useState(salary.toString());
  const [tempOvertime, setTempOvertime] = useState(overtimeHours.toString());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isFishing && fishingStartTime) {
      const interval = setInterval(() => {
        setCurrentTime(totalFishingTime + (Date.now() - fishingStartTime));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setCurrentTime(totalFishingTime);
    }
  }, [isFishing, fishingStartTime, totalFishingTime]);

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

  const netEarnings = getNetEarnings();
  const currentEarnings = (currentTime / (1000 * 60 * 60)) * getHourlyRate();
  const workHours = getWorkHoursPerDay();

  const statusText = isFishing ? '摸鱼中' : isDuringWorkTime() ? '工作中' : '待机';
  const statusColor = isFishing ? 'text-orange-400' : isDuringWorkTime() ? 'text-green-400' : 'text-gray-500';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #2a2520 0%, #1a1510 50%, #0f0d0a 100%)',
      }}
    >
      <div className="w-[360px]">
        {/* 设备主体 */}
        <div
          className="relative rounded-[20px] p-5 shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #d4cfc5 0%, #c9c3b8 10%, #bdb6a9 50%, #b0a89c 90%, #a59e92 100%)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.15)',
          }}
        >
          {/* 品牌标签 */}
          <div className="text-center mb-3">
            <span
              className="text-[10px] tracking-[0.3em] font-bold uppercase"
              style={{ color: '#6b6558', fontFamily: 'monospace' }}
            >
              ◈ FISHER-PRO 9000 ◈
            </span>
          </div>

          {/* LCD 屏幕 */}
          <div
            className="relative rounded-lg p-4 mb-4 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #8fa37d 0%, #7a8e68 30%, #6d805c 100%)',
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* CRT 扫描线 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)',
              }}
            />
            {/* 屏幕内容 */}
            <div className="relative">
              {/* 顶部状态栏 */}
              <div className="flex justify-between items-center mb-3" style={{ fontFamily: '"Courier New", monospace' }}>
                <span className="text-[10px]" style={{ color: '#1a2e0a' }}>● {statusText}</span>
                <span className="text-[10px]" style={{ color: '#1a2e0a' }}>
                  {amStartTime}-{amEndTime} / {pmStartTime}-{pmEndTime}
                </span>
              </div>

              {/* 时间显示 */}
              <div className="text-center mb-3">
                <div
                  className="text-5xl font-bold tracking-[0.15em]"
                  style={{
                    fontFamily: '"Courier New", monospace',
                    color: '#0d1f04',
                    textShadow: '0 0 8px rgba(13,31,4,0.3)',
                  }}
                >
                  {formatTime(currentTime)}
                </div>
              </div>

              {/* 金额显示 */}
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a', fontFamily: 'monospace' }}>EARNED</div>
                  <div
                    className="text-2xl font-bold"
                    style={{ fontFamily: '"Courier New", monospace', color: '#0d1f04' }}
                  >
                    ¥{currentEarnings.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a', fontFamily: 'monospace' }}>RATE/H</div>
                  <div
                    className="text-lg font-bold"
                    style={{ fontFamily: '"Courier New", monospace', color: '#0d1f04' }}
                  >
                    ¥{getHourlyRate().toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 统计行 */}
          <div className="flex gap-2 mb-4">
            <div
              className="flex-1 rounded-md p-2 text-center"
              style={{
                background: 'linear-gradient(180deg, #a8c490 0%, #8fb374 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              <div className="text-[9px] mb-0.5" style={{ color: '#2a3f1a', fontFamily: 'monospace' }}>FISH +</div>
              <div className="text-sm font-bold" style={{ fontFamily: '"Courier New", monospace', color: '#0d1f04' }}>
                +¥{getFishingEarnings().toFixed(1)}
              </div>
            </div>
            <div
              className="flex-1 rounded-md p-2 text-center"
              style={{
                background: 'linear-gradient(180deg, #c49090 0%, #b37474 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              <div className="text-[9px] mb-0.5" style={{ color: '#3f1a1a', fontFamily: 'monospace' }}>WORK -</div>
              <div className="text-sm font-bold" style={{ fontFamily: '"Courier New", monospace', color: '#1f0404' }}>
                -¥{Math.abs(getOvertimeEarnings()).toFixed(1)}
              </div>
            </div>
            <div
              className="flex-1 rounded-md p-2 text-center"
              style={{
                background: netEarnings >= 0
                  ? 'linear-gradient(180deg, #c4b090 0%, #b39f74 100%)'
                  : 'linear-gradient(180deg, #c49090 0%, #b37474 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              <div className="text-[9px] mb-0.5" style={{ color: '#3f341a', fontFamily: 'monospace' }}>NET</div>
              <div className={`text-sm font-bold ${statusColor}`} style={{ fontFamily: '"Courier New", monospace' }}>
                {netEarnings >= 0 ? '+' : ''}¥{netEarnings.toFixed(1)}
              </div>
            </div>
          </div>

          {/* 按钮区 */}
          <div className="space-y-2">
            {/* 主按钮行 */}
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

            {/* 次级按钮行 */}
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
                {showSettings ? '▲ 收起设置' : '▼ 设置'}
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

          {/* 设置面板 */}
          {showSettings && (
            <div
              className="mt-4 rounded-lg p-3"
              style={{
                background: 'linear-gradient(180deg, #b8b2a6 0%, #aca698 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              {/* 薪酬设置 */}
              <div className="mb-3">
                <div className="text-[10px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>
                  ▸ 薪酬
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSalary('monthly', salary)}
                    className="flex-1 py-1.5 rounded text-xs font-bold transition-all"
                    style={{
                      fontFamily: 'monospace',
                      background: salaryType === 'monthly'
                        ? 'linear-gradient(180deg, #d89040, #c07830)'
                        : 'linear-gradient(180deg, #908878, #787060)',
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
                      background: salaryType === 'yearly'
                        ? 'linear-gradient(180deg, #d89040, #c07830)'
                        : 'linear-gradient(180deg, #908878, #787060)',
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

              {/* 加班设置 */}
              <div className="mb-3">
                <div className="text-[10px] font-bold mb-2" style={{ color: '#5a5448', fontFamily: 'monospace' }}>
                  ▸ 加班(亏)
                </div>
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

              {/* 工作时间 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold" style={{ color: '#5a5448', fontFamily: 'monospace' }}>
                    ▸ 工时 ({workHours.toFixed(1)}h/天)
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-6" style={{ color: '#8a6030', fontFamily: 'monospace' }}>上午</span>
                    <input
                      type="time"
                      value={amStartTime}
                      onChange={(e) => setWorkTime(e.target.value, amEndTime, pmStartTime, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{
                        fontFamily: '"Courier New", monospace',
                        background: '#1a2a1a',
                        color: '#8fa37d',
                        border: '2px solid #0d1a0d',
                      }}
                    />
                    <span className="text-xs" style={{ color: '#6b6558' }}>~</span>
                    <input
                      type="time"
                      value={amEndTime}
                      onChange={(e) => setWorkTime(amStartTime, e.target.value, pmStartTime, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{
                        fontFamily: '"Courier New", monospace',
                        background: '#1a2a1a',
                        color: '#8fa37d',
                        border: '2px solid #0d1a0d',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] w-6" style={{ color: '#603080', fontFamily: 'monospace' }}>下午</span>
                    <input
                      type="time"
                      value={pmStartTime}
                      onChange={(e) => setWorkTime(amStartTime, amEndTime, e.target.value, pmEndTime)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{
                        fontFamily: '"Courier New", monospace',
                        background: '#1a2a1a',
                        color: '#8fa37d',
                        border: '2px solid #0d1a0d',
                      }}
                    />
                    <span className="text-xs" style={{ color: '#6b6558' }}>~</span>
                    <input
                      type="time"
                      value={pmEndTime}
                      onChange={(e) => setWorkTime(amStartTime, amEndTime, pmStartTime, e.target.value)}
                      className="flex-1 py-1.5 px-2 rounded text-xs font-bold"
                      style={{
                        fontFamily: '"Courier New", monospace',
                        background: '#1a2a1a',
                        color: '#8fa37d',
                        border: '2px solid #0d1a0d',
                      }}
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

        {/* 投在桌面上的影子 */}
        <div
          className="mx-auto mt-[-8px] rounded-[50%]"
          style={{
            width: '80%',
            height: '20px',
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.4) 0%, transparent 70%)',
          }}
        />
      </div>
    </div>
  );
}
