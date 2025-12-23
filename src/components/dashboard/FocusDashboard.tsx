import React from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { LayoutGrid, Target, Zap, Clock, Play, Pause, RotateCcw, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

export const FocusDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    instances,
    updateTaskTimer,
    resetTaskTimer,
    toggleTaskTimer,
    toggleTask,
  } = useTasklistStore();

  // Find the actual task object for the active focus
  const focusData = React.useMemo(() => {
    const focus = currentUser?.activeFocus;
    if (!focus) return null;

    const instance = instances.find(i => i.id === focus.instanceId);
    if (!instance) return null;

    let foundTask = null;
    for (const section of instance.sections) {
      for (const subsection of section.subsections) {
        const task = subsection.tasks.find(t => t.id === focus.taskId);
        if (task) {
          foundTask = task;
          break;
        }
      }
      if (foundTask) break;
    }

    if (!foundTask) return null;
    return { task: foundTask, instance, projectId: focus.projectId };
  }, [currentUser?.activeFocus, instances]);

  const formatTime = (val: number) => {
    const mins = Math.floor(val / 60);
    const secs = val % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3 text-[var(--text-heading)]">
          <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 text-google-blue" />
          <span>My Dashboard</span>
        </h1>
        <p className="text-sm md:text-base font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-11 md:ml-13 text-gray-500">
          Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
        </p>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Focus Card (Phase 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Current Focus</h3>
          
          {focusData ? (
            <div className={clsx(
              "p-8 md:p-12 rounded-[3rem] border transition-all shadow-2xl relative overflow-hidden group min-h-[450px] flex flex-col justify-between",
              "bg-white dark:bg-black/40 border-gray-200 dark:border-gray-800",
              focusData.task.timerIsRunning && "ring-4 ring-google-blue/20 shadow-blue-500/10"
            )}>
              {/* Subtle Background Icon - Moved and Faded */}
              <Target className="absolute -top-10 -right-10 w-80 h-80 text-google-blue/5 dark:text-google-blue/10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-1000" />

              <div className="relative z-10 flex flex-col h-full space-y-10">
                {/* 1. TOP BAR: Context & Source Jump */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 px-4 py-1.5 bg-google-blue/10 text-google-blue rounded-full border border-google-blue/20 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.1em] truncate max-w-[250px] md:max-w-md">
                      {focusData.instance.title}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/project/${focusData.projectId}/instance/${focusData.instance.id}?task=${focusData.task.id}`)}
                    className="p-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-google-blue hover:bg-google-blue/10 transition-all border border-transparent hover:border-google-blue/20 flex-shrink-0"
                    title="Open in Full Checklist"
                  >
                    <RotateCcw className="w-6 h-6 rotate-180" />
                  </button>
                </div>

                {/* 2. CENTER: Task Title */}
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-3xl md:text-6xl font-black leading-[1.1] text-[var(--text-heading)] tracking-tight">
                    {focusData.task.title}
                  </h2>
                </div>

                {/* 3. BOTTOM: Timer & Primary Action */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-end">
                  {/* Timer Side (3 columns) */}
                  <div className="md:col-span-3 flex items-center gap-8">
                    <button 
                      onClick={() => toggleTaskTimer(focusData.task.id)}
                      className={clsx(
                        "w-24 h-24 md:w-28 md:h-24 rounded-[2rem] flex items-center justify-center transition-all shadow-xl active:scale-95 border-4",
                        focusData.task.timerIsRunning 
                          ? "bg-google-blue text-white border-white/20 shadow-blue-500/30" 
                          : "bg-white dark:bg-white/5 text-google-blue border-google-blue shadow-md hover:border-google-blue/60"
                      )}
                    >
                      {focusData.task.timerIsRunning ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-1.5" />}
                    </button>

                    <div className="space-y-2">
                      <div className="text-6xl md:text-8xl font-black tracking-tighter tabular-nums text-[var(--text-heading)] leading-none">
                        {formatTime(focusData.task.timerRemaining ?? focusData.task.timerDuration ?? 20 * 60)}
                      </div>
                      <div className="flex items-center gap-3 ml-1">
                        <button 
                          onClick={() => resetTaskTimer(focusData.task.id)}
                          className="px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 text-[11px] font-black uppercase text-gray-500 hover:text-google-blue transition-colors border border-transparent hover:border-google-blue/20"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => updateTaskTimer(focusData.task.id, (focusData.task.timerRemaining ?? 20 * 60) + 300)}
                          className="px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 text-[11px] font-black uppercase text-gray-500 hover:text-google-blue transition-colors border border-transparent hover:border-google-blue/20"
                        >
                          +5 Mins
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Done Side (2 columns) */}
                  <div className="md:col-span-2 w-full">
                    <button 
                      onClick={() => toggleTask(focusData.task.id)}
                      className={clsx(
                        "w-full h-24 md:h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 text-xl md:text-3xl font-black uppercase tracking-[0.15em] transition-all shadow-2xl active:scale-[0.98]",
                        "bg-[var(--active-task-done)] text-white shadow-green-500/20 hover:animate-pulse-gold border-4 border-white/20"
                      )}
                    >
                      <ThumbsUp className="w-8 h-8 md:w-10 md:h-10" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-6 bg-white/30 dark:bg-black/10 min-h-[400px]">
              <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-full">
                <Target className="w-16 h-16 text-gray-300 dark:text-gray-700" />
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="font-black text-xl text-gray-400 uppercase tracking-tight">No Active Focus</h3>
                <p className="text-gray-500 font-bold leading-relaxed uppercase text-[10px] tracking-widest">
                  You aren't currently focused on a task. Go to your projects and pick a task to get started!
                </p>
              </div>
              <button 
                onClick={() => navigate('/project')}
                className="px-8 h-14 bg-google-blue text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                Browse Projects <Target className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Phase 3 & 4 Right Column */}
        <div className="space-y-8 flex flex-col h-full">
          
          {/* Knowledge Hub (Phase 3 Placeholder) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Knowledge Hub</h3>
            <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 bg-white/30 dark:bg-black/10 flex-1 min-h-[200px]">
              <Zap className="w-10 h-10 text-gray-300 dark:text-gray-700" />
              <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Phase 3: Smart Widgets</h4>
            </div>
          </div>

          {/* Scratchpad (Phase 4 Placeholder) */}
          <div className="space-y-4 flex-1 flex flex-col">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Personal Scratchpad</h3>
            <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 bg-white/30 dark:bg-black/10 flex-1 min-h-[200px]">
              <Clock className="w-10 h-10 text-gray-300 dark:text-gray-700" />
              <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Phase 4: Private Tasks</h4>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
