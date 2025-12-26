import React from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { theme } from '../../styles/theme';
import { LayoutGrid, Target, Play, Pause, RotateCcw, ThumbsUp, CheckCircle2, StickyNote } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { ScratchpadWidget } from './ScratchpadWidget';
import { KnowledgeHub } from './KnowledgeHub';

import { TomatoIcon } from '../icons/TomatoIcon';

interface FocusDashboardProps {
  onOpenNotes?: (taskId: string, containerId: string) => void;
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
    const otherClaimants = users
      .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => 
        i.projectId === focus.projectId && 
        i.instanceId === focus.instanceId && 
        i.taskId === foundTask.id
      ))
      .map(u => ({ id: u.id, name: u.name }));

    // NEW LOGIC: Trigger danger alert if multiple users have this EXACT task focused in their profiles,
    // regardless of their current online heartbeat status.
    const concurrentFocusCount = users.filter(u => 
      u.activeFocus?.projectId === focus.projectId &&
      u.activeFocus?.instanceId === focus.instanceId &&
      u.activeFocus?.taskId === foundTask.id
    ).length;

    const isMultiUserActive = concurrentFocusCount >= 2;
    const isYellowState = otherClaimants.length > 0;

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

  const shouldHighlightNotes = React.useMemo(() => {
    if (!focusData?.task) return false;
    return (focusData.task.notes && focusData.task.notes.length > 0) || 
           (focusData.task.userNotes && focusData.task.userNotes.length > 0);
  }, [focusData?.task]);

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
              "p-8 md:p-10 rounded-focus-card border-4 transition-all shadow-2xl relative overflow-hidden group min-h-[400px] flex flex-col justify-between text-[var(--text-primary)]",
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
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <div className={clsx(
                      theme.components.pomodoro.button,
                      isYellow && theme.components.pomodoro.buttonYellow
                    )}>
                      <button 
                        onClick={() => toggleTaskTimer(focusData.task.id)} 
                        title="Start/Pause Pomodoro Timer"
                        className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        {focusData.task.timerIsRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    </div>

                    {/* Timer Controls Box */}
                    <div className={clsx(
                      theme.components.pomodoro.container,
                      isYellow ? "bg-black/10 text-gray-900" : "bg-white/10 text-white"
                    )}>
                      <div className="relative flex items-center gap-1 min-w-0 px-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowSetTimer(!showSetTimer); }}
                          title="Set Timer"
                          className="flex items-center gap-1 transition-all hover:bg-black/5 rounded-lg px-1 shrink-0"
                        >
                          <TomatoIcon className="w-4 h-4 shrink-0" />
                          <span className="text-[11px] font-black tabular-nums min-w-[38px] text-center">
                            {formatTime(focusData.task.timerRemaining ?? focusData.task.timerDuration ?? 20 * 60)}
                          </span>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button 
                            onClick={() => resetTaskTimer(focusData.task.id)}
                            className={clsx(
                              "px-1 py-0.5 text-[6px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                              isYellow ? "text-gray-900" : "text-white"
                            )}
                          >
                            Reset
                          </button>
                          <button 
                            onClick={() => updateTaskTimer(focusData.task.id, (focusData.task.timerRemaining ?? 20 * 60) + 300)}
                            className={clsx(
                              "px-1 py-0.5 text-[6px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                              isYellow ? "text-gray-900" : "text-white"
                            )}
                          >
                            +5m
                          </button>
                        </div>

                        {showSetTimer && (
                          <>
                            <div className="fixed inset-0 z-[65]" onClick={(e) => { e.stopPropagation(); setShowSetTimer(false); }} />
                            <div onClick={(e) => e.stopPropagation()} className="absolute bottom-full left-0 mb-4 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[70] min-w-[140px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 mb-2">Set Session Duration</div>
                              <div className="flex gap-2 text-[var(--text-primary)]">
                                <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold text-gray-800 dark:text-gray-300" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetTimerSubmit()} />
                                <div className="flex flex-col gap-1">
                                  <button onClick={handleSetTimerSubmit} className="h-7 px-2 bg-google-blue text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Set</button>
                                  <button onClick={() => { resetTaskTimer(focusData.task.id); setShowSetTimer(false); }} className="h-7 px-2 bg-gray-100 text-gray-700 rounded-lg font-black uppercase text-[10px] tracking-widest border border-gray-200 active:scale-95 transition-all">Reset</button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Task Info Button - Matching sidebar style */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenNotes?.(focusData.task.id, focusData.instance.id); }}
                      title="Open Task Info"
                      className={clsx(
                        "w-12 h-10 shrink-0 flex items-center justify-center transition-all hover:scale-110",
                        isYellow ? "text-gray-900" : "text-white"
                      )}
                    >
                      <StickyNote className={clsx("w-6 h-6", shouldHighlightNotes && "animate-pulse-slow")} />
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
                      "rounded-task-button flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] border-4 flex-1 md:flex-none",
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
            <div className="p-12 rounded-focus-card border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-6 bg-white/30 dark:bg-black/10 min-h-[400px]">
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

        {/* Knowledge Hub (Task Intelligence) */}
        <KnowledgeHub task={focusData?.task || null} />

        {/* Scratchpad (My Notes) */}
        <div className="space-y-4">
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
};
