import React, { useEffect } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { theme } from '../../styles/theme';
import { LayoutGrid, Target, Play, Pause, RotateCcw, ThumbsUp, CheckCircle2, StickyNote, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { formatTime } from '../../utils/time';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { ScratchpadWidget } from './ScratchpadWidget';
import { KnowledgeHub } from './KnowledgeHub';
import { FocusStage } from '../../types';

import { TomatoIcon } from '../icons/TomatoIcon';

interface FocusDashboardProps {
  onOpenNotes?: (taskId: string, containerId: string, focusFeedback?: boolean) => void;
}

const CompletionTransition = () => (
  <div className="absolute inset-0 z-0 pointer-events-none bg-[var(--brand-green-light)]">
    <div className="absolute inset-0 bg-[var(--brand-green-pulse)] animate-completion-breathing" />
  </div>
);

const FocusTransition = () => (
  <div className="absolute inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[var(--brand-focus-pulse)] animate-focus-breathing" />
  </div>
);

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
    setFocusStage,
    showPlaylistSidebar,
    setShowPlaylistSidebar,
    showMainSidebar,
    isDarkMode,
    getValidActionSet
  } = useTasklistStore();

  const validActionSet = getValidActionSet();
  const isWide = !showPlaylistSidebar && !showMainSidebar;

  const [showSetTimer, setShowSetTimer] = React.useState(false);
  const [customMinutes, setCustomMinutes] = React.useState('20');
  const [showRefinementPrompt, setShowRefinementPrompt] = React.useState(false);
  const [completedTaskId, setCompletedTaskId] = React.useState<string | null>(null);
  const [completedInstanceId, setCompletedInstanceId] = React.useState<string | null>(null);

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

  const currentStage = focusData?.task.completed ? (currentUser?.activeFocus?.stage || 'executing') : (currentUser?.activeFocus?.stage || 'staged');
  const isExecuting = currentStage === 'executing';

  const ProgressFill = ({ progress, isRunning }: { progress: number; isRunning: boolean }) => (
    <div 
      className={clsx(
        "absolute bottom-0 left-0 right-0 z-0 pointer-events-none transition-all duration-1000 ease-linear",
        isRunning ? "opacity-100" : "opacity-60",
        // Snap back to bottom instantly if progress is 0 (reset state)
        progress === 0 && "duration-0"
      )}
      style={{ 
        height: `${Math.min(100, Math.max(0, progress * 100))}%`,
        backgroundColor: 'var(--focus-water)',
      }}
    />
  );

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

  useEffect(() => {
    if (isExecuting) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExecuting]);

  const WorkflowTracker = () => {
    const stages: { id: FocusStage; label: string }[] = [
      { id: 'staged', label: 'TASK ESTABLISHED' },
      { id: 'preparing', label: 'PREPARING' },
      { id: 'executing', label: 'IN FOCUS' },
    ];

    const currentIdx = stages.findIndex(s => s.id === currentStage);

    return (
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6 px-2">
        {stages.map((stage, idx) => {
          const isActive = idx === currentIdx;
          const isPast = idx < currentIdx;
          const stepNum = idx + 1;
          
          return (
            <div key={stage.id} className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    // If moving back to staged/preparing manually, and it's marked completed, un-complete it
                    const isMovingBack = (stage.id === 'staged' || stage.id === 'preparing') && currentStage !== stage.id;
                    if (focusData?.task.completed && isMovingBack) {
                      await toggleTask(focusData.task.id, focusData.instance.id);
                    }
                    
                    await setFocusStage(stage.id);
                    if (stage.id === 'executing' && focusData && !focusData.task.timerIsRunning) {
                      await toggleTaskTimer(focusData.task.id);
                    }
                  }}
                className={clsx(
                  "flex items-center gap-2 transition-all duration-500",
                  isActive ? "opacity-100 scale-105 text-orange-950" : "opacity-50 scale-95 hover:opacity-80 text-white",
                )}
              >
                <div className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border transition-all",
                  isActive ? "border-orange-950 bg-orange-950 text-white scale-110 shadow-lg" : "border-white/40 text-white",
                  isActive && stage.id === 'preparing' && "animate-pulse"
                )}>
                  {stepNum}
                </div>
                <span className={clsx(
                  "text-[12px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-colors",
                  isActive ? "text-orange-950" : "text-white"
                )}>{stage.label}</span>
              </button>
              {idx < stages.length - 1 && (
                <div className={clsx(
                  "hidden md:block w-8 h-[1px] transition-all duration-1000",
                  isPast ? "bg-white" : "bg-white/30"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={clsx(
      "flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar text-[var(--text-primary)] transition-all duration-1000",
      isExecuting && (isDarkMode ? "bg-[#050505]" : "bg-gray-50")
    )}>
                  {/* Header Section */}
                  <div className={clsx(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all duration-700",
                    isExecuting && "opacity-0 -translate-y-10 pointer-events-none"
                  )}>
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
                            : validActionSet.length > 0
                              ? "bg-google-blue/10 text-google-blue border-google-blue/30 hover:bg-google-blue hover:text-white"
                              : "bg-white dark:bg-black/40 text-gray-400 border-gray-300 dark:border-gray-700 hover:border-google-blue hover:text-google-blue"
                        )}
                      >
                        <Music className={clsx("w-5 h-5", validActionSet.length > 0 && "animate-pulse")} />
                        <span>My Session</span>
                        {validActionSet.length > 0 && (
                          <span className="flex items-center justify-center bg-white dark:bg-google-blue text-google-blue dark:text-gray-300 w-5 h-5 rounded-full text-[10px] font-black shadow-sm">
                            {validActionSet.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

      {/* Main Bento Grid */}
      <div className="flex flex-col gap-8 text-[var(--text-primary)]">
        
        {/* Active Focus Card */}
        <div className={clsx(
          "space-y-4 transition-all duration-700",
          isExecuting && "transform scale-[1.01]"
        )}>
          {!isExecuting && <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Current Focus</h3>}
          
          {focusData && cardTheme ? (
            <div className={clsx(
              "p-8 md:p-10 rounded-focus-card border-4 transition-all duration-700 shadow-2xl relative overflow-hidden group flex flex-col justify-between text-[var(--text-primary)]",
              isExecuting ? "min-h-[calc(100vh-2rem)] md:min-h-[700px]" : "min-h-[400px]",
              cardTheme,
              focusData.task.timerIsRunning && !isYellow && "ring-8 ring-google-green/20",
              focusData.task.timerIsRunning && isYellow && "ring-8 ring-google-yellow/20"
            )}>
              {isExecuting && (
                <ProgressFill 
                  key={`${focusData.task.id}-${focusData.task.timerDuration}`}
                  progress={(() => {
                    const remaining = focusData.task.timerRemaining ?? focusData.task.timerDuration ?? 0;
                    const duration = focusData.task.timerDuration || 1;
                    // Proportional filling: 0% at start (rem=dur), 100% at end (rem=0)
                    return 1 - (remaining / duration);
                  })()} 
                  isRunning={!!focusData.task.timerIsRunning} 
                />
              )}
              {focusData.task.completed && <CompletionTransition />}
              {isExecuting && !focusData.task.completed && <FocusTransition />}
              <div className="relative z-10 flex flex-col h-full space-y-8">
                <WorkflowTracker />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    {!isExecuting && (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className={clsx("text-sm md:text-lg font-black uppercase tracking-[0.15em] truncate", isYellow ? "text-gray-900" : "text-white/90")}>
                            PROJECT: {focusData.project?.name || 'Unknown Project'}
                          </h4>
                        </div>
                        <div className={clsx(
                          "flex items-center gap-2 transition-colors",
                          isYellow ? "text-gray-700" : "text-white/70"
                        )}>
                          <span className="text-[11px] font-black uppercase tracking-[0.15em] truncate max-w-[250px] md:max-w-md">
                            CHECKLIST: {focusData.instance.title}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {!isExecuting && (
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
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center py-4">
                  <h2 className={clsx(
                    "text-2xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight break-words transition-all duration-700",
                    isExecuting && "md:text-7xl lg:text-8xl",
                    isWide && !isExecuting && "lg:text-7xl",
                    isYellow ? "text-gray-900" : "text-white",
                    focusData.task.timerIsRunning && "animate-pulse-slow"
                  )}>
                    {focusData.task.title}
                  </h2>
                  
                  {focusData.task.guide?.complexity && !isExecuting && (
                    <div className={clsx(
                      "mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit transition-all duration-700 shadow-sm",
                      focusData.task.guide.complexity === 'Easy' && "bg-green-700 text-white border-green-500",
                      focusData.task.guide.complexity === 'Moderate' && "bg-amber-700 text-white border-amber-500",
                      focusData.task.guide.complexity === 'Complex' && "bg-red-700 text-white border-red-500"
                    )}>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{focusData.task.guide.complexity}</span>
                    </div>
                  )}
                </div>

                <div className={clsx(
                  "flex flex-col md:flex-row items-stretch justify-between gap-4 pt-4 border-t border-white/10 transition-all duration-700",
                  isExecuting && "border-transparent"
                )}>
                  <div className="flex items-stretch gap-2">
                    {/* Play/Pause Button */}
                    {(!(!isExecuting && !focusData.task.timerIsRunning)) && (
                      <div className={clsx(
                        theme.components.pomodoro.button,
                        isYellow && theme.components.pomodoro.buttonYellow,
                        "transition-all duration-700",
                        isExecuting ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20"
                      )}>
                        <button 
                          onClick={() => toggleTaskTimer(focusData.task.id)} 
                          title="Start/Pause Pomodoro Timer"
                          className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          {focusData.task.timerIsRunning ? <Pause className={clsx(isExecuting ? "w-10 h-10 md:w-12 md:h-12" : "w-6 h-6 lg:w-8 lg:h-8", "fill-current")} /> : <Play className={clsx(isExecuting ? "w-10 h-10 md:w-12 md:h-12" : "w-6 h-6 lg:w-8 lg:h-8", "fill-current ml-0.5")} />}
                        </button>
                      </div>
                    )}

                    {/* Timer Controls Box */}
                    <div className={clsx(
                      "flex flex-col items-center",
                      !isExecuting && "mt-[-16px] gap-1"
                    )}>
                      {!isExecuting && (
                        <span className="text-[8px] md:text-[9px] font-black uppercase text-white/60 tracking-[0.2em] animate-pulse">Set Time</span>
                      )}
                      <div className={clsx(
                        theme.components.pomodoro.container,
                        isYellow ? "bg-black/10 text-gray-900" : "bg-white/10 text-white",
                        "transition-all duration-700",
                        isExecuting ? "h-20 md:h-24 px-8 md:px-10 shrink-0" : "h-14 md:h-16 lg:h-20"
                      )}>
                        <div className="relative flex items-center gap-1 min-w-0 px-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (!isExecuting) setShowSetTimer(!showSetTimer); }}
                            title={isExecuting ? "" : "Set Timer"}
                            className={clsx(
                              "flex items-center gap-1 transition-all rounded-lg px-1 shrink-0",
                              !isExecuting && "hover:bg-black/5"
                            )}
                          >
                            <TomatoIcon className={clsx(isExecuting ? "w-8 h-8 md:w-10 md:h-10" : "w-4 h-4", "shrink-0")} />
                            <span className={clsx(
                              "font-black tabular-nums text-center",
                              isExecuting ? "text-3xl md:text-4xl min-w-[100px]" : "text-sm md:text-lg lg:text-xl min-w-[38px]"
                            )}>
                              {formatTime(focusData.task.timerRemaining ?? focusData.task.timerDuration ?? 20 * 60)}
                            </span>
                          </button>

                          {!isExecuting && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                onClick={() => resetTaskTimer(focusData.task.id)}
                                className={clsx(
                                  "px-1.5 py-1 text-[8px] md:text-[9px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                                  isYellow ? "text-gray-900" : "text-white"
                                )}
                              >
                                Reset
                              </button>
                              <button 
                                onClick={() => updateTaskTimer(focusData.task.id, (focusData.task.timerRemaining ?? 20 * 60) + 300)}
                                className={clsx(
                                  "px-1.5 py-1 text-[8px] md:text-[9px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                                  isYellow ? "text-gray-900" : "text-white"
                                )}
                              >
                                +5m
                              </button>
                            </div>
                          )}

                          {showSetTimer && !isExecuting && (
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
                    </div>

                    {/* Task Info Button */}
                    {!isExecuting && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onOpenNotes?.(focusData.task.id, focusData.instance.id); }}
                        title="Open Task Info"
                        className={clsx(
                          "w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 shrink-0 flex items-center justify-center transition-all hover:scale-110",
                          isYellow ? "text-gray-900" : "text-white"
                        )}
                      >
                        <StickyNote className={clsx("w-6 h-6 lg:w-8 lg:h-8", shouldHighlightNotes && "animate-pulse-slow")} />
                      </button>
                    )}

                    {!isExecuting && (
                      <button 
                        onClick={() => navigate(`/project/${focusData.projectId}/instance/${focusData.instance.id}?task=${focusData.task.id}&scroll=true`)}
                        className={clsx(
                          "md:hidden transition-all active:scale-90 flex items-center justify-center w-14 h-14",
                          isYellow ? "text-gray-900/60 hover:text-gray-900" : "text-white/60 hover:text-white"
                        )}
                        title="Open in Full Checklist"
                      >
                        <RotateCcw className="w-8 h-8 rotate-180" />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={async () => {
                        if (isExecuting) {
                          const tId = focusData.task.id;
                          const iId = focusData.instance.id;
                          
                          await toggleTask(tId, iId);
                          if (focusData.task.timerIsRunning) await toggleTaskTimer(tId);
                          
                          setCompletedTaskId(tId);
                          setCompletedInstanceId(iId);
                          setShowRefinementPrompt(true);
                        } else if (currentStage === 'staged') {
                          // Moving from Established to Preparing: Un-complete if already completed
                          if (focusData.task.completed) {
                            await toggleTask(focusData.task.id, focusData.instance.id);
                          }
                          await setFocusStage('preparing');
                        } else {
                          await setFocusStage('executing');
                        // Always ensure timer starts when moving to executing stage
                        if (!focusData.task.timerIsRunning) {
                          await toggleTaskTimer(focusData.task.id);
                        }
                      }
                    }}
                    className={clsx(
                      "rounded-task-button flex items-center justify-center gap-2 transition-all duration-700 shadow-xl active:scale-[0.98] border-4 flex-1 md:flex-none",
                      isExecuting ? "h-20 md:h-24 px-12 md:px-20 text-xl md:text-3xl" : (showPlaylistSidebar ? "h-14 md:h-16 px-4 md:px-6 text-sm md:text-lg" : "h-16 md:h-20 px-8 md:px-12 text-lg md:text-2xl"),
                      "font-black uppercase tracking-[0.1em]",
                      isExecuting 
                        ? "bg-white text-google-green border-white shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                        : (currentStage === 'preparing'
                            ? "bg-orange-500 text-white border-orange-400 hover:bg-orange-600"
                            : (focusData.task.completed 
                                ? (focusData.isMultiUserActive ? "bg-white text-google-red border-white" : (isYellow ? "bg-white text-google-yellow border-white animate-pulse" : "bg-white text-google-green border-white animate-pulse"))
                                : (isYellow 
                                    ? "bg-google-yellow text-gray-900 border-white/30 hover:animate-pulse-gold" 
                                    : (focusData.isMultiUserActive ? "bg-google-red text-white border-white/30 hover:animate-pulse-gold" : "bg-google-green-light text-white border-white/20 hover:animate-pulse-gold")
                                  )
                              )
                          )
                    )}
                  >
                    {isExecuting ? (
                      <>
                        <ThumbsUp className="w-8 h-8 md:w-10 md:h-10" />
                        <span>TASK DONE?</span>
                      </>
                    ) : focusData.task.completed ? (
                      <>
                        <CheckCircle2 className={clsx(showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8", focusData.isMultiUserActive ? "text-google-red" : (isYellow ? "text-google-yellow" : "text-google-green"))} />
                        <span className={clsx(focusData.isMultiUserActive ? "text-google-red" : (isYellow ? "text-google-yellow" : "text-google-green"))}>Task Completed</span>
                      </>
                    ) : currentStage === 'staged' ? (
                      <>
                        <Zap className={showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8"} />
                        <span>BEGIN PREPARATION</span>
                      </>
                    ) : (
                      <>
                        <Play className={showPlaylistSidebar ? "w-5 h-5" : "w-6 h-6 md:w-8 md:h-8"} />
                        <span>START FOCUS SESSION</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Post-Completion Refinement Prompt */}
              {showRefinementPrompt && (
                <div className="absolute inset-0 z-50 bg-google-blue/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-300">
                  <div className="max-w-md space-y-6">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ThumbsUp className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Task Completed!</h2>
                    <p className="text-white/80 font-bold text-lg leading-relaxed">
                      Would you like to suggest a refinement for this checklist template before finishing?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button 
                        onClick={async () => {
                          setShowRefinementPrompt(false);
                          // Keep the stage as is (usually 'executing' during completion)
                          setCompletedTaskId(null);
                          setCompletedInstanceId(null);
                        }}
                        className="flex-1 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
                      >
                        No, Just Finish
                      </button>
                      <button 
                        onClick={async () => {
                          const tId = completedTaskId;
                          const iId = completedInstanceId;
                          setShowRefinementPrompt(false);
                          // Keep stage as is
                          if (tId && iId) {
                            onOpenNotes?.(tId, iId, true);
                            // Auto-scroll logic will be handled in TaskInfoModal
                          }
                          setCompletedTaskId(null);
                          setCompletedInstanceId(null);
                        }}
                        className="flex-1 px-8 py-4 bg-white text-google-blue rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                      >
                        Yes, Add Feedback
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
        <div className={clsx(
          "transition-all duration-700",
          isExecuting && "opacity-0 translate-y-20 pointer-events-none"
        )}>
          <KnowledgeHub task={focusData?.task || null} stage={currentStage} />
        </div>

        {/* Scratchpad (My Notes) */}
        <div className={clsx(
          "space-y-4 transition-all duration-1000",
          isExecuting && "opacity-0 translate-y-40 pointer-events-none"
        )}>
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
};
