import React, { useState } from 'react';
import { useTasklistStore } from '../../../store/useTasklistStore';
import { Button } from '../../ui/Button';
import { TomatoIcon } from '../../icons/TomatoIcon';
import { Play, Pause } from 'lucide-react';
import { clsx } from 'clsx';

interface TaskTimerControlsProps {
  taskId: string;
  isMobile?: boolean;
}

export const TaskTimerControls: React.FC<TaskTimerControlsProps> = React.memo(({ taskId, isMobile }) => {
  const { instances, setTaskTimer, resetTaskTimer, updateTaskTimer, toggleTaskTimer } = useTasklistStore();
  const [showWidget, setShowWidget] = useState(false);
  const [customMins, setCustomMins] = useState('20');

  // Find the specific task to get its latest timer state without re-rendering the parent modal
  const task = React.useMemo(() => {
    for (const inst of instances) {
      for (const s of inst.sections) {
        for (const ss of s.subsections) {
          const t = ss.tasks.find(t => t.id === taskId);
          if (t) return t;
        }
      }
    }
    return null;
  }, [instances, taskId]);

  if (!task) return null;

  const formatTime = (seconds: number | undefined | null, duration?: number) => {
    let val = seconds ?? duration ?? (20 * 60);
    if (isNaN(val) || val < 0) val = 20 * 60;
    const hrs = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    const secs = val % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSet = () => {
    const mins = parseInt(customMins);
    if (!isNaN(mins)) {
      setTaskTimer(taskId, mins * 60);
      setShowWidget(false);
    }
  };

  if (isMobile) {
    return (
      <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative">
          <button 
            onClick={() => setShowWidget(!showWidget)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition-all text-[10px] font-black"
          >
            <TomatoIcon className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {formatTime(task.timerRemaining, task.timerDuration)}
            </span>
          </button>

          {showWidget && (
            <>
              <div className="fixed inset-0 z-[2010]" onClick={() => setShowWidget(false)} />
              <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[2020] min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 px-1">Set Duration</div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold dark:text-gray-300" 
                    value={customMins} 
                    onChange={(e) => setCustomMins(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSet()} 
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={handleSet} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                    <Button size="sm" variant="secondary" onClick={() => { resetTaskTimer(taskId); setShowWidget(false); }} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => resetTaskTimer(taskId)}
            className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[9px] font-black border border-gray-200 dark:border-gray-700"
          >
            Reset
          </button>
          <button 
            onClick={() => updateTaskTimer(taskId, (task.timerRemaining || 0) + (5 * 60))}
            className="p-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-black"
          >
            +5m
          </button>
          <button 
            onClick={() => toggleTaskTimer(taskId)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm"
          >
            {task.timerIsRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="relative">
        <button 
          onClick={() => setShowWidget(!showWidget)}
          title="Set Duration"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 transition-all hover:bg-red-100"
        >
          <TomatoIcon className={clsx("w-5 h-5", !task.timerIsRunning && "grayscale-[0.5]")} />
          <span className="text-sm font-black tabular-nums">
            {formatTime(task.timerRemaining, task.timerDuration)}
          </span>
        </button>

        {showWidget && (
          <>
            <div className="fixed inset-0 z-[2010]" onClick={() => setShowWidget(false)} />
            <div onClick={(e) => e.stopPropagation()} className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[2020] min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 px-1">Set Duration</div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold dark:text-gray-300" 
                  value={customMins} 
                  onChange={(e) => setCustomMins(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSet()} 
                />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={handleSet} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                  <Button size="sm" variant="secondary" onClick={() => { resetTaskTimer(taskId); setShowWidget(false); }} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={() => updateTaskTimer(taskId, (task.timerRemaining || 0) + (5 * 60))}
          className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors text-[10px] font-black"
          title="Add 5 Minutes"
        >
          Add 5mins
        </button>
        <button 
          onClick={() => toggleTaskTimer(taskId)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm hover:scale-110 transition-all"
        >
          {task.timerIsRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
      </div>
    </div>
  );
});


