import React from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { theme } from '../../styles/theme';
import { LayoutGrid, Target, Zap, Clock, Play, Pause, RotateCcw, ThumbsUp, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

export const FocusDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    instances,
    projects,
    users,
    updateTaskTimer,
    resetTaskTimer,
    toggleTaskTimer,
    setTaskTimer,
    toggleTask,
  } = useTasklistStore();

  const [showSetTimer, setShowSetTimer] = React.useState(false);
  const [customMinutes, setCustomMinutes] = React.useState('20');

  // Find the actual task object for the active focus
  const focusData = React.useMemo(() => {
    const focus = currentUser?.activeFocus;
    if (!focus) return null;

    const instance = instances.find(i => i.id === focus.instanceId);
    if (!instance) return null;

    const project = projects.find(p => p.id === focus.projectId);

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

    // Presence & Session logic for matching sidebar colors
    const otherActiveUsers = Object.entries(instance?.activeUsers || {})
      .filter(([uid, info]: [string, any]) => info.taskId === foundTask.id && uid !== currentUser?.id && Date.now() - info.lastSeen < 45000)
      .map(([_, info]: [string, any]) => info);

    const otherClaimants = users
      .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => i.taskId === foundTask.id))
      .map(u => ({ id: u.id, name: u.name }));

    const isMultiUserActive = otherActiveUsers.length >= 1; // At least one other person is looking
    const isYellowState = otherClaimants.length > 0; // At least one other person has it in their session

    return { 
      task: foundTask, 
      instance, 
      project,
      projectId: focus.projectId,
      isMultiUserActive,
      isYellowState
    };
  }, [currentUser?.activeFocus, instances, projects, users]);

  const formatTime = (val: number) => {
    const mins = Math.floor(val / 60);
    const secs = val % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetTimerSubmit = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins) && focusData) {
      setTaskTimer(focusData.task.id, mins * 60);
      setShowSetTimer(false);
    }
  };

  // Determine card theme based on focus state
  const cardTheme = React.useMemo(() => {
    if (!focusData) return null;
    if (focusData.isMultiUserActive) return theme.components.sidebar.activeTaskMulti;
    if (focusData.isYellowState) return theme.components.sidebar.activeTaskYellow;
    return theme.components.sidebar.activeTaskFocus;
  }, [focusData]);

  const isYellow = focusData?.isYellowState && !focusData?.isMultiUserActive;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3 text-[var(--text-heading)]">
          <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 text-google-blue" />
          <span>My Dashboard</span>
        </h1>
        <p className="text-sm md:text-base font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-11 md:ml-13 opacity-60">
          Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
        </p>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Focus Card (Phase 2 Polished) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Current Focus</h3>
          
          {focusData && cardTheme ? (
            <div className={clsx(
              "p-8 md:p-10 rounded-[3rem] border-4 transition-all shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col justify-between",
              cardTheme,
              focusData.task.timerIsRunning && !isYellow && "ring-8 ring-google-green/20 animate-pulse",
              focusData.task.timerIsRunning && isYellow && "ring-8 ring-google-yellow/20 animate-pulse"
            )}>
              <div className="relative z-10 flex flex-col h-full space-y-8">
                {/* 1. TOP BAR: Project & Checklist Context */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={clsx("text-lg md:text-2xl font-black uppercase tracking-tight truncate", isYellow ? "text-gray-900" : "text-white")}>
                        {focusData.project?.name || 'Unknown Project'}
                      </h4>
                    </div>
                    <div className={clsx(
                      "flex items-center gap-2 px-3 py-1 rounded-full w-fit border shadow-sm transition-colors",
                      isYellow ? "bg-black/5 border-black/10 text-gray-700" : "bg-white/10 border-white/20 text-white/80"
                    )}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[200px] md:max-w-md">
                        {focusData.instance.title}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/project/${focusData.projectId}/instance/${focusData.instance.id}?task=${focusData.task.id}`)}
                    className={clsx(
                      "p-3 rounded-2xl transition-all border shadow-sm flex-shrink-0 active:scale-95",
                      isYellow ? "bg-black/5 border-black/10 text-gray-600 hover:bg-black/10" : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                    )}
                    title="Open in Full Checklist"
                  >
                    <RotateCcw className="w-6 h-6 rotate-180" />
                  </button>
                </div>

                {/* 2. CENTER: Task Title */}
                <div className="flex-1 flex flex-col justify-center py-4">
                  <h2 className={clsx(
                    "text-3xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight break-words",
                    isYellow ? "text-gray-900" : "text-white"
                  )}>
                    {focusData.task.title}
                  </h2>
                </div>

                {/* 3. BOTTOM: Compact Pomodoro & Task Done */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-white/10">
                  
                  {/* Reduced Pomodoro Widget */}
                  <div className="flex items-center gap-4 bg-white/10 dark:bg-black/20 p-2 pl-3 rounded-2xl border border-white/10 shadow-inner">
                    {/* Tomato Icon / Play Pause */}
                    <div className="relative group/timer">
                      <button 
                        onClick={() => toggleTaskTimer(focusData.task.id)}
                        className={clsx(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 border-2",
                          focusData.task.timerIsRunning 
                            ? "bg-google-red border-white/40 text-white animate-pulse" 
                            : "bg-white text-google-red border-google-red/20 hover:bg-red-50"
                        )}
                      >
                        {focusData.task.timerIsRunning ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                      </button>
                      
                      {/* Optional Set Duration Hover */}
                      {!focusData.task.timerIsRunning && (
                        <button 
                          onClick={() => setShowSetTimer(!showSetTimer)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-gray-800 text-google-blue rounded-full flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                        >
                          <Clock className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <div className={clsx(
                        "text-3xl font-black tracking-tighter tabular-nums leading-none",
                        isYellow ? "text-gray-900" : "text-white"
                      )}>
                        {formatTime(focusData.task.timerRemaining ?? focusData.task.timerDuration ?? 20 * 60)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => resetTaskTimer(focusData.task.id)}
                          className={clsx(
                            "text-[9px] font-black uppercase transition-colors px-1.5 py-0.5 rounded-md",
                            isYellow ? "bg-black/5 text-gray-600 hover:bg-black/10" : "bg-white/10 text-white/60 hover:bg-white/20"
                          )}
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => updateTaskTimer(focusData.task.id, (focusData.task.timerRemaining ?? 20 * 60) + 300)}
                          className={clsx(
                            "text-[9px] font-black uppercase transition-colors px-1.5 py-0.5 rounded-md",
                            isYellow ? "bg-black/5 text-gray-600 hover:bg-black/10" : "bg-white/10 text-white/60 hover:bg-white/20"
                          )}
                        >
                          +5m
                        </button>
                      </div>
                    </div>

                    {showSetTimer && (
                      <div className="absolute bottom-full left-0 mb-4 p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 z-50">
                        <input 
                          type="number" 
                          className="w-16 h-10 bg-gray-100 dark:bg-gray-900 border-none rounded-xl text-center font-black text-google-blue focus:ring-2 focus:ring-google-blue transition-all"
                          value={customMinutes}
                          onChange={(e) => setCustomMinutes(e.target.value)}
                          autoFocus
                        />
                        <button onClick={handleSetTimerSubmit} className="h-10 px-4 bg-google-blue text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Set</button>
                        <button onClick={() => setShowSetTimer(false)} className="p-2 text-gray-400 hover:text-google-red transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>

                  {/* Smaller Done Button */}
                  <button 
                    onClick={() => toggleTask(focusData.task.id)}
                    className={clsx(
                      "h-16 md:h-20 px-8 md:px-12 rounded-[2rem] flex items-center justify-center gap-3 text-lg md:text-2xl font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-[0.98] border-4",
                      "bg-white text-google-green border-white/20 hover:scale-105"
                    )}
                  >
                    <ThumbsUp className="w-6 h-6 md:w-8 md:h-8" />
                    <span>Done</span>
                  </button>
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
