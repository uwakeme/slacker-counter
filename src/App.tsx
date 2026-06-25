import { useFishTimerStore } from '@/store/useFishTimerStore';
import { Fish, Coffee, Clock, Moon, Calculator, RotateCcw, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toFixed(2)}`;
}

export default function App() {
  const {
    salaryType,
    salary,
    workStartTime,
    workEndTime,
    isFishing,
    fishingStartTime,
    totalFishingTime,
    overtimeHours,
    getHourlyRate,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <Fish className="w-10 h-10 text-amber-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              摸鱼计时器
            </h1>
          </div>
          <p className="text-slate-400 text-sm">记录你的每一分"赚到的"摸鱼时间</p>
        </div>

        {/* 薪资设置 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 mb-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-slate-200">薪资设置</span>
          </div>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setSalary('monthly', salary)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                salaryType === 'monthly'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              月薪
            </button>
            <button
              onClick={() => setSalary('yearly', salary)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                salaryType === 'yearly'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              年薪
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              value={tempSalary}
              onChange={(e) => setTempSalary(e.target.value)}
              onBlur={handleSalarySubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleSalarySubmit()}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="输入薪资"
            />
            <button
              onClick={handleSalarySubmit}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg transition-colors font-medium"
            >
              确认
            </button>
          </div>
          <div className="mt-3 text-sm text-slate-400">
            当前时薪: <span className="text-green-400 font-semibold">¥{getHourlyRate().toFixed(2)}</span>
          </div>
        </div>

        {/* 上下班时间 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 mb-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-slate-200">上下班时间</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">上班</label>
              <input
                type="time"
                value={workStartTime}
                onChange={(e) => setWorkTime(e.target.value, workEndTime)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="text-slate-500 pt-5">→</div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">下班</label>
              <input
                type="time"
                value={workEndTime}
                onChange={(e) => setWorkTime(workStartTime, e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 摸鱼计时 */}
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur rounded-2xl p-6 mb-4 border border-amber-500/30">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              {isFishing ? (
                <Coffee className="w-6 h-6 text-amber-400 animate-bounce" />
              ) : (
                <Fish className="w-6 h-6 text-amber-400" />
              )}
              <span className="font-semibold text-amber-300">
                {isFishing ? '摸鱼中...' : '开始摸鱼'}
              </span>
            </div>

            <div className="text-5xl font-mono font-bold text-white mb-6 tracking-wider">
              {formatTime(currentTime)}
            </div>

            <div className="text-lg text-amber-300 mb-6">
              已赚: <span className="font-bold">¥{((currentTime / (1000 * 60 * 60)) * getHourlyRate()).toFixed(2)}</span>
            </div>

            <button
              onClick={isFishing ? stopFishing : startFishing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${
                isFishing
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/30 hover:scale-105'
              }`}
            >
              {isFishing ? '结束摸鱼' : '🎣 开始摸鱼'}
            </button>
          </div>
        </div>

        {/* 加班录入 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 mb-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-slate-200">加班时间</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={tempOvertime}
                onChange={(e) => setTempOvertime(e.target.value)}
                onBlur={handleOvertimeSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleOvertimeSubmit()}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="加班小时数"
                step="0.5"
                min="0"
              />
            </div>
            <span className="text-slate-400 pt-2.5">小时</span>
          </div>
          <div className="mt-3 text-sm text-slate-400">
            加班费 (1.5x): <span className="text-purple-400 font-semibold">¥{getOvertimeEarnings().toFixed(2)}</span>
          </div>
        </div>

        {/* 统计面板 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-slate-200">今日统计</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-500/10 rounded-xl p-3 text-center border border-green-500/20">
              <div className="text-xs text-green-400 mb-1">摸鱼收入</div>
              <div className="text-lg font-bold text-green-400">{formatCurrency(getFishingEarnings())}</div>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-3 text-center border border-purple-500/20">
              <div className="text-xs text-purple-400 mb-1">加班收入</div>
              <div className="text-lg font-bold text-purple-400">{formatCurrency(getOvertimeEarnings())}</div>
            </div>
            <div className={`rounded-xl p-3 text-center border ${
              netEarnings >= 0
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className={`text-xs mb-1 ${netEarnings >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {netEarnings >= 0 ? '净赚' : '净亏'}
              </div>
              <div className={`text-lg font-bold ${netEarnings >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {formatCurrency(netEarnings)}
              </div>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
            重置统计
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          数据仅保存在本地浏览器中
        </div>
      </div>
    </div>
  );
}
