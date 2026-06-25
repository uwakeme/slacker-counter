import { useFishTimerStore } from '@/store/useFishTimerStore';
import { Fish, Coffee, Moon, RotateCcw, Clock } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] bg-slate-900 flex items-center justify-center p-4">
      <div className="w-[380px] relative">
        {/* 毛玻璃主体 */}
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

          <div className="p-5">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Fish className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-white/90 text-sm">摸鱼计时器</span>
              </div>
              <span className="text-xs text-white/40">
                {salaryType === 'monthly' ? '月薪' : '年薪'} ¥{salary.toLocaleString()}
              </span>
            </div>

            {/* 计时核心区 */}
            <div className={`relative rounded-xl p-4 mb-4 transition-all duration-300 ${
              isFishing
                ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/40'
                : 'bg-white/5 border border-white/10'
            }`}>
              {isFishing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse pointer-events-none" />
              )}

              <div className="relative text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isFishing ? (
                    <Coffee className="w-5 h-5 text-amber-400 animate-bounce" />
                  ) : (
                    <Fish className="w-5 h-5 text-amber-400" />
                  )}
                  <span className={`text-xs font-medium ${isFishing ? 'text-amber-300' : 'text-white/50'}`}>
                    {isFishing ? '摸鱼中' : '待机中'}
                  </span>
                </div>

                <div className="text-4xl font-mono font-bold text-white mb-2 tracking-wider">
                  {formatTime(currentTime)}
                </div>

                <div className="text-sm text-white/60">
                  时薪 <span className="text-amber-400 font-medium">¥{getHourlyRate().toFixed(1)}</span>
                </div>

                <div className={`text-lg font-bold mt-2 ${isFishing ? 'text-amber-300' : 'text-white/40'}`}>
                  ¥{currentEarnings.toFixed(2)}
                </div>
              </div>

              <button
                onClick={isFishing ? stopFishing : startFishing}
                className={`w-full mt-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  isFishing
                    ? 'bg-red-500/80 hover:bg-red-400/80 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25'
                }`}
              >
                {isFishing ? (
                  <>
                    <span>结束摸鱼</span>
                  </>
                ) : (
                  <>
                    <Fish className="w-4 h-4" />
                    <span>开始摸鱼</span>
                  </>
                )}
              </button>
            </div>

            {/* 次要信息区 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 加班录入 */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <Moon className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-white/50">加班</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={tempOvertime}
                    onChange={(e) => setTempOvertime(e.target.value)}
                    onBlur={handleOvertimeSubmit}
                    className="w-16 bg-white/10 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="0"
                    step="0.5"
                    min="0"
                  />
                  <span className="text-xs text-white/40">小时</span>
                </div>
                <div className="text-xs text-red-400 mt-1">-¥{Math.abs(getOvertimeEarnings()).toFixed(1)}</div>
              </div>

              {/* 快速设置 */}
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs text-white/50">时薪设置</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSalary('monthly', salary)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      salaryType === 'monthly' ? 'bg-amber-500/50 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    月
                  </button>
                  <button
                    onClick={() => setSalary('yearly', salary)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      salaryType === 'yearly' ? 'bg-amber-500/50 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'
                    }`}
                  >
                    年
                  </button>
                  <input
                    type="number"
                    value={tempSalary}
                    onChange={(e) => setTempSalary(e.target.value)}
                    onBlur={handleSalarySubmit}
                    className="w-20 bg-white/10 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="10000"
                  />
                </div>
              </div>
            </div>

            {/* 上班时间设置 */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-white/50">上班时间</span>
                <span className="text-[10px] text-white/30 ml-auto">每日{workHours.toFixed(1)}小时</span>
              </div>

              {/* 上午 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-amber-400/70 w-6">上午</span>
                <input
                  type="time"
                  value={amStartTime}
                  onChange={(e) => setWorkTime(e.target.value, amEndTime, pmStartTime, pmEndTime)}
                  className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-white/30 text-xs">~</span>
                <input
                  type="time"
                  value={amEndTime}
                  onChange={(e) => setWorkTime(amStartTime, e.target.value, pmStartTime, pmEndTime)}
                  className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* 下午 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-purple-400/70 w-6">下午</span>
                <input
                  type="time"
                  value={pmStartTime}
                  onChange={(e) => setWorkTime(amStartTime, amEndTime, e.target.value, pmEndTime)}
                  className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <span className="text-white/30 text-xs">~</span>
                <input
                  type="time"
                  value={pmEndTime}
                  onChange={(e) => setWorkTime(amStartTime, amEndTime, pmStartTime, e.target.value)}
                  className="flex-1 bg-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* 统计栏 */}
            <div className="bg-black/20 rounded-lg p-3 border border-white/5">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-green-400/70 mb-0.5">摸鱼</div>
                  <div className="text-sm font-bold text-green-400">¥{getFishingEarnings().toFixed(1)}</div>
                </div>
                <div className="text-center border-x border-white/10">
                  <div className="text-[10px] text-red-400/70 mb-0.5">加班</div>
                  <div className="text-sm font-bold text-red-400">-¥{Math.abs(getOvertimeEarnings()).toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] mb-0.5 ${netEarnings >= 0 ? 'text-amber-400/70' : 'text-red-400/70'}`}>
                    {netEarnings >= 0 ? '净赚' : '净亏'}
                  </div>
                  <div className={`text-sm font-bold ${netEarnings >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    ¥{netEarnings.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <span className="text-[10px] text-white/30">数据本地保存</span>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                重置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
