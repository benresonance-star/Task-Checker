import React from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { theme } from '../../styles/theme';
import { LayoutGrid, Target, Play, Pause, RotateCcw, ThumbsUp, CheckCircle2, X, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { ScratchpadWidget } from './ScratchpadWidget';
import { KnowledgeHub } from './KnowledgeHub';

const TomatoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" opacity="0.2"/>
    <path d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z" fill="currentColor"/>
    <path d="M12 4V2M10 3L14 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 6L17 4M16 5.5L16.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface FocusDashboardProps {
  onOpenNotes?: (taskId: string) => void;
}

export const FocusDashboard: React.FC<FocusDashboardProps> = ({ onOpenNotes }) => {
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
    showPlaylistSidebar,
    setShowPlaylistSidebar,
    showMainSidebar
  } = useTasklistStore();

  const isWide = !showPlaylistSidebar && !showMainSidebar;

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
      .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => 
        i.projectId === focus.projectId && 
        i.instanceId === focus.instanceId && 
        i.taskId === foundTask.id
      ))
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
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar text-[var(--text-primary)]">
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex flex-col gap-1">
                      <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3 text-[var(--text-heading)]">
                        <LayoutGrid className="w-8 h-8 md:w-10 md:h-10 text-google-blue" />
                        <span>My Dashboard</span>
                      </h1>
                      <p className="text-sm md:text-base font-bold text-[var(--text-secondary)] uppercase tracking-widest ml-11 md:ml-13 opacity-60">
                        Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                      <button 
                        onClick={() => setShowPlaylistSidebar(!showPlaylistSidebar)}
                        className={clsx(
                          "h-12 px-6 flex items-center gap-3 border-2 transition-all duration-500 font-black rounded-2xl shadow-lg uppercase tracking-widest text-xs",
                          showPlaylistSidebar 
                            ? "opacity-0 pointer-events-none translate-x-4" 
                            : (currentUser?.actionSet?.length || 0) > 0
                              ? "bg-google-blue/10 text-google-blue border-google-blue/30 hover:bg-google-blue hover:text-white"
                              : "bg-white dark:bg-black/40 text-gray-400 border-gray-300 dark:border-gray-700 hover:border-google-blue hover:text-google-blue"
                        )}
                      >
                        <Music className={clsx("w-5 h-5", (currentUser?.actionSet?.length || 0) > 0 && "animate-pulse")} />
                        <span>My Session</span>
                        {(currentUser?.actionSet?.length || 0) > 0 && (
                          <span className="flex items-center justify-center bg-white dark:bg-google-blue text-google-blue dark:text-gray-300 w-5 h-5 rounded-full text-[10px] font-black shadow-sm">
                            {currentUser?.actionSet?.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

      {/* Main Bento Grid */}
      <div className="flex flex-col gap-8 text-[var(--text-primary)]">
        
        {/* Active Focus Card */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Current Focus</h3>
          
          {focusData && cardTheme ? (
            <div className={clsx(
              "p-8 md:p-10 rounded-[3rem] border-4 transition-all shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col justify-between text-[var(--text-primary)]",
              cardTheme,
              focusData.task.timerIsRunning && !isYellow && "ring-8 ring-google-green/20 animate-pulse",
              focusData.task.timerIsRunning && isYellow && "ring-8 ring-google-yellow/20 animate-pulse"
            )}>
              <div className="relative z-10 flex flex-col h-full space-y-8">
                {/* ... existing content ... */}
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
                              onClick={() => navigate(`/project/${focusData.projectId}/instance/${focusData.instance.id}?task=${focusData.task.id}&scroll=true`)}
                              className={clsx(
                                "hidden md:flex rounded-2xl transition-all border shadow-sm flex-shrink-0 active:scale-95",
                                showPlaylistSidebar ? "p-2" : "p-3",
                                isYellow ? "bg-black/5 border-black/10 text-gray-600 hover:bg-black/10" : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                              )}
                              title="Open in Full Checklist"
                            >
                              <RotateCcw className={clsx("rotate-180", showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6")} />
                            </button>
                </div>

                <div className="flex-1 flex flex-col justify-center py-4">
                  <h2 className={clsx(
                    "text-2xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight break-words",
                    isWide && "lg:text-7xl",
                    isYellow ? "text-gray-900" : "text-white"
                  )}>
                    {focusData.task.title}
                  </h2>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">

                  <div className="flex items-center gap-6">
                    <div className={clsx(
                      "flex items-center bg-white/10 dark:bg-black/20 p-2 rounded-2xl border border-white/10 shadow-inner relative",
                      showPlaylistSidebar ? "gap-2 pl-2" : "gap-4 pl-3"
                    )}>
                      <div className="relative group/timer">
                        <button 
                          onClick={() => toggleTaskTimer(focusData.task.id)}
                          className={clsx(
                            "rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 border-2",
                            showPlaylistSidebar ? "w-10 h-10" : "w-12 h-12",
                            focusData.task.timerIsRunning 
                              ? "bg-google-red border-white/40 text-white animate-pulse" 
                              : "bg-white text-google-red border-google-red/20 hover:bg-red-50"
                          )}
                        >
                          {focusData.task.timerIsRunning ? <Pause className={showPlaylistSidebar ? "w-5 h-5 fill-current" : "w-6 h-6 fill-current"} /> : <Play className={clsx(showPlaylistSidebar ? "w-5 h-5 ml-0.5 fill-current" : "w-6 h-6 ml-0.5 fill-current")} />}
                        </button>

                        {!focusData.task.timerIsRunning && (
                          <button 
                            onClick={() => setShowSetTimer(!showSetTimer)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-gray-800 text-google-blue rounded-full flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700 hover:scale-110 transition-transform"
                          >
                            <TomatoIcon className="w-3 h-3 text-google-red" />
                          </button>
                        )}

                        {showSetTimer && (
                          <div className="absolute bottom-full left-0 mb-4 p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200 z-50 text-[var(--text-primary)]">
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

                      <div className="flex flex-col">
                        <div className={clsx(
                          "font-black tracking-tighter tabular-nums leading-none",
                          showPlaylistSidebar ? "text-2xl" : "text-3xl",
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
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenNotes?.(focusData.task.id); }}
                      className={clsx(
                        "transition-all active:scale-90 flex items-center justify-center p-2",
                        isYellow ? "text-gray-900/60 hover:text-gray-900" : "text-white/60 hover:text-white"
                      )}
                      title="Open Task Info"
                    >
                      <FileText className={clsx("w-10 h-10", (focusData.task.notes || focusData.task.userNotes || focusData.task.files?.length || focusData.task.userFiles?.length) && "fill-current")} />
                    </button>

                    <button 
                      onClick={() => navigate(`/project/${focusData.projectId}/instance/${focusData.instance.id}?task=${focusData.task.id}&scroll=true`)}
                      className={clsx(
                        "md:hidden transition-all active:scale-90 flex items-center justify-center p-2",
                        isYellow ? "text-gray-900/60 hover:text-gray-900" : "text-white/60 hover:text-white"
                      )}
                      title="Open in Full Checklist"
                    >
                      <RotateCcw className="w-10 h-10 rotate-180" />
                    </button>
                  </div>

                  <button 
                    onClick={() => toggleTask(focusData.task.id, focusData.instance.id)}
                    className={clsx(
                      "rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] border-4 flex-1 md:flex-none",
                      showPlaylistSidebar ? "h-14 md:h-16 px-4 md:px-6 text-sm md:text-lg" : "h-16 md:h-20 px-8 md:px-12 text-lg md:text-2xl",
                      "font-black uppercase tracking-[0.1em]",
                      focusData.task.completed 
                        ? (focusData.isMultiUserActive ? "bg-white text-google-red border-white" : (isYellow ? "bg-white text-google-yellow border-white animate-pulse" : "bg-white text-google-green border-white animate-pulse"))
                        : (isYellow 
                            ? "bg-google-yellow text-gray-900 border-white/30 hover:animate-pulse-gold" 
                            : (focusData.isMultiUserActive ? "bg-google-red text-white border-white/30 hover:animate-pulse-gold" : "bg-google-green-light text-white border-white/20 hover:animate-pulse-gold")
                          )
                    )}
                  >
                    {focusData.task.completed ? (
                      <>
                        <CheckCircle2 className={clsx(showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8", focusData.isMultiUserActive ? "text-google-red" : (isYellow ? "text-google-yellow" : "text-google-green"))} />
                        <span className={clsx(focusData.isMultiUserActive ? "text-google-red" : (isYellow ? "text-google-yellow" : "text-google-green"))}>Task Completed</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className={showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8"} />
                        <span>TASK DONE?</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-6 bg-white/30 dark:bg-black/10 min-h-[400px]">
              <div className="p-6 bg-gray-100 dark:bg-white/5 rounded-full text-[var(--text-primary)]">
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

        {/* Scratchpad (My Notes) */}
        <div className="space-y-4">
          <ScratchpadWidget />
        </div>

        {/* Knowledge Hub (Phase 3) */}
        <KnowledgeHub />
      </div>
    </div>
  );
};
