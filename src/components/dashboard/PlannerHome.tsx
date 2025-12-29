import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowRight,
  TrendingUp,
  Briefcase,
  Zap,
  ClipboardList,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trophy,
  RotateCcw,
  X,
  Bell,
  Calendar,
  Target,
  StickyNote
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScratchpadWidget } from './ScratchpadWidget';
import { TasklistInstance, Project, ScratchpadItem } from '../../types';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

interface PlannerHomeProps {
  onOpenFocus: () => void;
  projects: Project[];
  instances: TasklistInstance[];
  masters: any[];
}

export const PlannerHome: React.FC<PlannerHomeProps> = ({ 
  onOpenFocus, 
  projects,
  instances
}) => {
  const { 
    getTodayAlerts,
    getValidActionSet, 
    setTaskFocus, 
    toggleNoteInActionSet, 
    currentUser,
    toggleTask,
    toggleScratchpadTask,
    toggleTaskInActionSet,
    injectTaskIntoSession
  } = useTasklistStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const validActionSet = getValidActionSet();

  // Filter for wins today
  const winningLedger = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return validActionSet.filter(item => {
      if (!item.completedAt) return false;
      const completedDate = new Date(item.completedAt);
      return completedDate >= today;
    }).map(item => {
      if (item.type === 'note') {
        const note = currentUser?.scratchpad?.find(n => n.id === item.taskId);
        return { ...item, title: note?.text || 'Note', category: note?.category || 'Personal' };
      } else {
        const instance = instances.find(i => i.id === item.instanceId);
        const task = instance?.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === item.taskId);
        return { ...item, title: task?.title || 'Task', category: instance?.title || 'Project' };
      }
    });
  }, [validActionSet, currentUser?.scratchpad, instances]);

  const [activeSpotlightId, setActiveSpotlightId] = useState<string | null>(() => {
    return localStorage.getItem('planner_active_spotlight_id');
  });

  const [isSpotlightExpanded, setIsSpotlightExpanded] = useState(() => {
    const saved = localStorage.getItem('planner_spotlight_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const [isNotesExpanded, setIsNotesExpanded] = useState(() => {
    const saved = localStorage.getItem('planner_notes_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('planner_spotlight_expanded', isSpotlightExpanded.toString());
  }, [isSpotlightExpanded]);

  useEffect(() => {
    localStorage.setItem('planner_notes_expanded', isNotesExpanded.toString());
  }, [isNotesExpanded]);

  useEffect(() => {
    if (activeSpotlightId) {
      localStorage.setItem('planner_active_spotlight_id', activeSpotlightId);
    }
  }, [activeSpotlightId]);

  // Get the top 3 staged items from the action set with full data
  const stagedItems = useMemo(() => {
    return validActionSet.slice(0, 3).map(item => {
      const isActive = item.type === 'note'
        ? (!currentUser?.activeFocus?.projectId && currentUser?.activeFocus?.taskId === item.taskId)
        : (currentUser?.activeFocus?.projectId === item.projectId && 
           currentUser?.activeFocus?.instanceId === item.instanceId && 
           currentUser?.activeFocus?.taskId === item.taskId);

      if (item.type === 'note') {
        const note = currentUser?.scratchpad?.find(n => n.id === item.taskId);
        return { 
          ...item, 
          displayTitle: note?.text || 'Note', 
          displayCategory: note?.category || 'Personal',
          projectName: note?.category || 'Personal',
          priority: note?.priority,
          completed: note?.completed,
          isActive
        };
      } else {
        const instance = instances.find(i => i.id === item.instanceId);
        const project = projects.find(p => p.id === item.projectId);
        const task = instance?.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === item.taskId);
        return { 
          ...item, 
          displayTitle: task?.title || 'Task', 
          displayCategory: instance?.title || 'Project',
          projectName: project?.name || 'Project',
          completed: task?.completed,
          priority: false,
          isActive
        };
      }
    });
  }, [validActionSet, currentUser?.scratchpad, currentUser?.activeFocus, instances, projects]);

  const todayAlerts = getTodayAlerts();

  // DERIVED DATA: Active Projects & Checklists with "Skin in the Game"
  const activeCommitments = useMemo(() => {
    const projectMap = new Map<string, { 
      project: Project, 
      activeInstances: TasklistInstance[], 
      associatedNotes: ScratchpadItem[] 
    }>();

    // 1. Find projects and instances from the current session (actionSet)
    validActionSet.forEach(item => {
      if (item.type !== 'note' && item.projectId) {
        const project = projects.find(p => p.id === item.projectId);
        const instance = instances.find(i => i.id === item.instanceId);
        if (project) {
          if (!projectMap.has(project.id)) {
            projectMap.set(project.id, { project, activeInstances: [], associatedNotes: [] });
          }
          const entry = projectMap.get(project.id)!;
          if (instance && !entry.activeInstances.find(i => i.id === instance.id)) {
            entry.activeInstances.push(instance);
          }
        }
      }
    });

    // 2. Find projects from associated notes
    currentUser?.scratchpad?.forEach(note => {
      if (note.category && note.category !== 'Personal' && !note.completed) {
        const project = projects.find(p => p.name === note.category);
        if (project) {
          if (!projectMap.has(project.id)) {
            projectMap.set(project.id, { project, activeInstances: [], associatedNotes: [] });
          }
          const entry = projectMap.get(project.id)!;
          if (!entry.associatedNotes.find(n => n.id === note.id)) {
            entry.associatedNotes.push(note);
          }
        }
      }
    });

    return Array.from(projectMap.values());
  }, [validActionSet, projects, instances, currentUser?.scratchpad]);

  // Set initial spotlight focus or fix stale selection
  useEffect(() => {
    const isCurrentValid = activeCommitments.some(c => c.project.id === activeSpotlightId);
    
    if ((!activeSpotlightId || !isCurrentValid) && activeCommitments.length > 0) {
      // Find project with most staged items
      const projectCounts = activeCommitments.map(c => ({
        id: c.project.id,
        count: stagedItems.filter(s => s.projectId === c.project.id).length
      }));
      const topProject = projectCounts.sort((a, b) => b.count - a.count)[0];
      setActiveSpotlightId(topProject.id);
    }
  }, [activeCommitments, stagedItems, activeSpotlightId]);

  const spotlightData = useMemo(() => {
    return activeCommitments.find(c => c.project.id === activeSpotlightId) || activeCommitments[0] || null;
  }, [activeCommitments, activeSpotlightId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLaunchSession = async () => {
    if (stagedItems.length > 0) {
      const first = stagedItems[0];
      await setTaskFocus(first.projectId || '', first.instanceId || '', first.taskId);
    }
    onOpenFocus();
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24">
      {/* Today's Horizon Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-[var(--planner-pulse-bg)] p-8 rounded-[2.5rem] border-2 border-[var(--planner-pulse-border)] shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-google-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform group-hover:scale-110 duration-1000" />
        
        {/* Column 1: The Pulse (Time & Alerts) */}
        <div className="xl:col-span-4 space-y-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-google-blue font-black uppercase tracking-[0.2em] text-[10px]">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-5xl font-black text-[var(--planner-pulse-text)] tabular-nums tracking-tighter">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-[var(--planner-section-title)] tracking-[0.2em] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-google-yellow" />
                Winning Ledger
              </div>
              {winningLedger.length > 0 && (
                <span className="bg-google-yellow/20 text-google-yellow px-2 py-0.5 rounded-full text-[9px] animate-pulse">
                  {winningLedger.length} Wins Today
                </span>
              )}
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
              {winningLedger.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl opacity-60">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No wins recorded today.</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1">Complete tasks to see them here!</p>
                </div>
              ) : (
                winningLedger.map((win, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800 group/win hover:border-google-yellow/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-google-yellow/10 flex items-center justify-center text-google-yellow shrink-0 group-hover/win:scale-110 transition-transform">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300 break-words line-clamp-2 line-through opacity-70" dangerouslySetInnerHTML={{ __html: win.title }} />
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-black uppercase text-google-yellow/60 tracking-wider italic">Victory at {new Date(win.completedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover/win:opacity-100 transition-opacity">
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (win.type === 'note') {
                            await toggleScratchpadTask(win.taskId);
                          } else {
                            await toggleTask(win.taskId, win.instanceId || '');
                          }
                        }}
                        className="p-1.5 hover:bg-google-yellow/10 text-google-yellow rounded-lg transition-colors"
                        title="Revert Task"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (win.type === 'note') {
                            await toggleNoteInActionSet(win.taskId);
                          } else {
                            await toggleTaskInActionSet(win.projectId || '', win.instanceId || '', win.taskId);
                          }
                        }}
                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        title="Clear from Session"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: The Staging Zone (The Daily Trio) */}
        <div className="xl:col-span-5 flex flex-col gap-4 relative z-10 border-l border-r border-[var(--planner-pulse-border)] px-6">
          <h3 className="text-[10px] font-black uppercase text-[var(--planner-section-title)] tracking-[0.2em] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-google-yellow" />
            Session Sprint Staging
          </h3>
          <div className="flex-1 grid grid-cols-1 gap-2">
            {[0, 1, 2].map(idx => {
              const item = stagedItems[idx];
              const isActive = item?.isActive;
              return (
                <div 
                  key={idx}
                  onClick={() => {
                    if (item) {
                      setTaskFocus(item.projectId || '', item.instanceId || '', item.taskId);
                    }
                  }}
                  style={{
                    backgroundColor: item 
                      ? (item.completed ? undefined : (item.type === 'note' ? (item.priority ? 'var(--note-priority-bg)' : (item.displayCategory === 'Personal' ? 'var(--note-personal-bg)' : 'var(--note-project-bg)')) : 'var(--note-project-bg)'))
                      : undefined
                  }}
                  className={clsx(
                    "relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all group/slot min-h-[60px] cursor-pointer",
                    isActive
                      ? "border-google-blue bg-blue-50/10 shadow-[0_0_15px_rgba(66,133,244,0.3)] animate-pulse-slow"
                      : item 
                        ? (item.type === 'note' && item.priority ? "border-red-200 dark:border-red-900/30 shadow-md hover:border-google-blue/50" : "border-google-blue shadow-md hover:border-google-blue/50")
                        : "bg-gray-50/50 dark:bg-black/20 border-dashed border-gray-200 dark:border-gray-800"
                  )}
                >
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all",
                    isActive ? "bg-google-blue text-white scale-110 shadow-lg" : (item ? "bg-google-blue/20 text-google-blue" : "bg-gray-200 dark:bg-gray-800 text-gray-400")
                  )}>
                    {isActive ? <Zap className="w-3 h-3 fill-current" /> : idx + 1}
                  </div>
                  
                  {item ? (
                    <div className="flex-1 min-w-0 animate-fly-in">
                      <div className="flex items-center justify-between gap-2">
                        <p className={clsx(
                          "text-[9px] font-black uppercase tracking-wider mb-0.5",
                          isActive ? "text-google-blue" : (item.type === 'note' && item.priority ? "text-red-900/60" : "text-google-blue/60")
                        )}>{item.projectName}</p>
                        
                        {item.completed ? (
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (item.type === 'note') {
                                  await toggleScratchpadTask(item.taskId);
                                } else {
                                  await toggleTask(item.taskId, item.instanceId || '');
                                }
                              }}
                              className="p-1 hover:bg-google-yellow/10 text-google-yellow rounded-lg transition-colors"
                              title="Revert Task"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (item.type === 'note') {
                                  await toggleNoteInActionSet(item.taskId);
                                } else {
                                  await toggleTaskInActionSet(item.projectId || '', item.instanceId || '', item.taskId);
                                }
                              }}
                              className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                              title="Clear from Session"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          isActive && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-google-blue animate-pulse">
                              Active Now
                            </span>
                          )
                        )}
                      </div>
                      <p className={clsx(
                        "text-xs font-bold break-words",
                        item.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"
                      )} dangerouslySetInnerHTML={{ 
                        __html: item.displayTitle
                      }} />
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{item.displayCategory}</p>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Empty Slot
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Launchpad */}
        <div className="xl:col-span-3 flex flex-col items-center justify-center gap-6 relative z-10 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Ready to <span className="text-google-blue">Focus?</span></h2>
            <p className="text-xs text-gray-500 font-medium max-w-[200px] leading-relaxed">
              {stagedItems.length > 0 
                ? `You've staged ${stagedItems.length} tasks for this sprint.` 
                : "Select tasks below to stage your session."}
            </p>
          </div>
          
          <Button 
            onClick={handleLaunchSession}
            disabled={stagedItems.length === 0}
            className={clsx(
              "relative h-16 w-full rounded-2xl text-white shadow-2xl transition-all group overflow-hidden",
              stagedItems.length > 0 
                ? "bg-google-blue shadow-google-blue/20 hover:scale-105" 
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
            )}
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <TrendingUp className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-wider">
                    {stagedItems.every(i => i.completed) ? 'Review Wins' : 'Begin Sprint'}
                  </span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
          </Button>
        </div>
      </div>

      {/* Today's Critical Alerts Panel (Conditional) */}
      {todayAlerts.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 
              className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: 'var(--planner-alert-text, #ef4444)' }}
            >
              <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--planner-alert-text, #ef4444)' }} />
              Time-Critical Alerts: Today
            </h2>
            <span 
              className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--planner-alert-time-bg)', color: 'var(--planner-alert-time-text)' }}
            >
              {todayAlerts.length} Pending
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayAlerts.map((alert, idx) => (
              <div 
                key={idx}
                onClick={async () => {
                  if (alert.type === 'note') {
                    await injectTaskIntoSession({ type: 'note', taskId: alert.item.id, addedAt: Date.now() });
                  } else {
                    // Find the project ID for the task
                    const instance = instances.find(i => i.sections.some(s => s.subsections.some(ss => ss.tasks.some(t => t.id === alert.item.id))));
                    const project = projects.find(p => p.instanceIds.includes(instance?.id || ''));
                    if (project && instance) {
                      await injectTaskIntoSession({ type: 'task', projectId: project.id, instanceId: instance.id, taskId: alert.item.id, addedAt: Date.now() });
                    }
                  }
                  navigate('/session');
                }}
                className="group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-[var(--planner-alert-bg)] border-[var(--planner-alert-border)] hover:shadow-lg hover:shadow-red-500/10"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-all bg-[var(--planner-alert-icon-bg)] text-[var(--planner-alert-icon)]"
                >
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-wider truncate text-[var(--planner-alert-category)]">
                      {alert.category}
                    </span>
                    <span 
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-[var(--planner-alert-time-bg)] text-[var(--planner-alert-time-text)]"
                    >
                      {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 
                    className="text-sm font-bold break-words group-hover:opacity-80 transition-colors text-[var(--planner-alert-title)]"
                    dangerouslySetInnerHTML={{ __html: alert.title }}
                  />
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Spotlight Switchboard */}
      <div className="space-y-6">
        <div 
          className="flex items-center justify-between px-2 cursor-pointer group/header"
          onClick={() => setIsSpotlightExpanded(!isSpotlightExpanded)}
        >
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-[var(--planner-section-title)] tracking-[0.2em]">
            <Target className="w-5 h-5 text-google-green" />
            Project Activity Spotlight
            <div className="ml-1 p-1 rounded-full bg-[var(--planner-pulse-bg)] border border-[var(--planner-pulse-border)] transition-colors group-hover/header:bg-google-green/10">
              {isSpotlightExpanded ? (
                <ChevronUp className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </h2>
        </div>

        {isSpotlightExpanded && (
          <>
            {activeCommitments.length === 0 ? (
              <div className="py-12 text-center bg-[var(--planner-spotlight-bg)] rounded-[2.5rem] border-2 border-dashed border-[var(--planner-spotlight-border)]">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active commitments found.</p>
                <p className="text-xs text-gray-500 mt-2">Stage a task or add a note to see your projects here.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* The Switchboard Ribbon */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2 px-1 custom-scrollbar no-scrollbar">
                  {activeCommitments.map(({ project }) => {
                    const isActive = activeSpotlightId === project.id;

                    return (
                      <button
                        key={project.id}
                        onClick={() => setActiveSpotlightId(project.id)}
                        className={clsx(
                          "flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all relative group",
                          isActive 
                            ? "bg-[var(--planner-token-active-bg)] border-[var(--planner-token-active-bg)] text-[var(--planner-token-active-text)] shadow-lg scale-105 z-10" 
                            : "bg-[var(--planner-token-inactive-bg)] border-[var(--planner-token-inactive-border)] text-[var(--planner-token-inactive-text)] hover:border-google-green/50"
                        )}
                      >
                        <div className={clsx(
                          "p-1.5 rounded-lg transition-colors",
                          isActive ? "bg-white/20 text-white" : "text-[var(--planner-token-icon)] bg-[var(--planner-token-icon)]/10 group-hover:bg-[var(--planner-token-icon)]/20"
                        )}>
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black whitespace-nowrap tracking-tight">{project.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* The Spotlight Container (Dynamic Elastic Height) */}
                {spotlightData && (
                  <div className="bg-[var(--planner-spotlight-bg)] rounded-[2.5rem] border-2 border-[var(--planner-spotlight-border)] overflow-hidden shadow-xl animate-fade-in transition-[height] duration-300">
                    <div className="flex flex-col lg:flex-row h-full">
                      {/* Column 1: Project Identity (22%) - Defines the Floor Height */}
                      <div className="w-full lg:w-[22%] bg-[var(--planner-spotlight-identity-bg)] border-b lg:border-b-0 lg:border-r border-[var(--planner-spotlight-separator)] p-6 flex flex-col justify-between gap-6 group shrink-0 min-h-[240px]">
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-[var(--planner-pulse-text)] tracking-tighter leading-tight break-words">
                            {spotlightData.project.name}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-google-blue/10 flex items-center justify-center text-google-blue shrink-0">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Active Tasks</span>
                                <span className="text-xs font-bold text-[var(--planner-pulse-text)]">
                                  {validActionSet.filter(i => i.projectId === spotlightData.project.id).length} in session
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                                <StickyNote className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Knowledge</span>
                                <span className="text-xs font-bold text-[var(--planner-pulse-text)]">
                                  {spotlightData.associatedNotes.length} linked notes
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          onClick={() => navigate(`/project/${spotlightData.project.id}`)}
                          className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-google-green hover:text-white hover:border-google-green transition-all mt-auto"
                        >
                          Deep Dive <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Column 2: Live Checklists (43%) */}
                      <div className="flex-[43] p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-[var(--planner-spotlight-separator)] flex flex-col min-w-0">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-1 shrink-0">
                          <ClipboardList className="w-4 h-4 text-google-blue" />
                          Live Checklists
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pr-1 max-h-[380px]">
                          <div className="grid grid-cols-1 gap-3">
                            {spotlightData.activeInstances.length === 0 ? (
                              <div className="min-h-[120px] flex items-center justify-center bg-[var(--planner-card-bg)] rounded-2xl text-[10px] font-bold text-gray-400 italic text-center px-4">
                                No specific checklists staged.
                              </div>
                            ) : (
                              spotlightData.activeInstances.map(instance => {
                                const totalTasks = instance.sections.reduce((acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.tasks.length, 0), 0);
                                const completedTasks = instance.sections.reduce((acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.tasks.filter(t => t.completed).length, 0), 0);
                                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                
                                const sessionItem = validActionSet.find(i => i.type !== 'note' && i.instanceId === instance.id);
                                const nextTask = sessionItem 
                                  ? instance.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === sessionItem.taskId)
                                  : instance.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => !t.completed);

                                return (
                                  <div 
                                    key={instance.id}
                                    onClick={() => navigate(`/project/${spotlightData.project.id}/instance/${instance.id}${nextTask ? `?task=${nextTask.id}&scroll=true` : ''}`)}
                                    className="bg-[var(--planner-card-bg)] border border-[var(--planner-card-border)] rounded-2xl p-4 hover:border-google-blue hover:shadow-lg transition-all cursor-pointer group/pill min-h-[100px]"
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-black text-[var(--planner-card-text)] truncate flex-1 pr-2">{instance.title}</span>
                                      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                                        <svg className="w-8 h-8 -rotate-90">
                                          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--planner-progress-ring-base)]" />
                                          <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={88} strokeDashoffset={88 - (88 * progress) / 100} className="text-[var(--planner-progress-ring-fill)] transition-all duration-1000" />
                                        </svg>
                                        <span className="absolute text-[8px] font-black text-[var(--planner-card-text)]">{progress}%</span>
                                      </div>
                                    </div>
                                    {nextTask && (
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--planner-next-task-text)] group-hover/pill:text-google-blue transition-colors">
                                        <ChevronRight className="w-3 h-3 shrink-0" />
                                        <span>Next: {nextTask.title}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Associated Notes (35%) */}
                      <div className="flex-[35] p-6 space-y-4 bg-[var(--planner-spotlight-bg)] flex flex-col min-w-0">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-1 shrink-0">
                          <StickyNote className="w-4 h-4 text-indigo-500" />
                          Associated Notes
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pr-1 max-h-[380px]">
                          <div className="grid grid-cols-1 gap-3">
                            {spotlightData.associatedNotes.length === 0 ? (
                              <div className="min-h-[120px] flex items-center justify-center bg-[var(--planner-card-bg)] rounded-2xl text-[10px] font-bold text-gray-400 italic text-center px-4">
                                No notes tagged for this project.
                              </div>
                            ) : (
                              spotlightData.associatedNotes.map(note => (
                                <div 
                                  key={note.id}
                                  style={{ backgroundColor: note.priority ? 'var(--note-priority-bg)' : 'var(--note-project-bg)' }}
                                  className={clsx(
                                    "border rounded-2xl p-4 transition-all cursor-pointer group/note shadow-sm hover:shadow-md flex flex-col gap-2 min-h-[100px]",
                                    note.priority ? "border-red-200 dark:border-red-900/30 shadow-red-100/50" : "border-gray-100 dark:border-gray-800"
                                  )}
                                  onClick={() => toggleNoteInActionSet(note.id)}
                                >
                                  <div 
                                    className="text-[11px] font-bold text-[var(--planner-card-text)] line-clamp-4 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: note.text }}
                                  />
                                  {note.reminder && (
                                    <div className="mt-auto flex items-center gap-1 text-[8px] font-black text-orange-600 animate-pulse">
                                      <Bell className="w-2.5 h-2.5 fill-current" />
                                      {new Date(note.reminder.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* MY NOTES AND TASKS */}
      <div className="space-y-6">
        <div 
          className="flex items-center justify-between px-2 cursor-pointer group/header"
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
        >
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-[var(--planner-section-title)] tracking-[0.2em]">
            <StickyNote className="w-5 h-5 text-google-blue" />
            MY NOTES AND TASKS
            <div className="ml-1 p-1 rounded-full bg-[var(--planner-pulse-bg)] border border-[var(--planner-pulse-border)] transition-colors group-hover/header:bg-google-blue/10">
              {isNotesExpanded ? (
                <ChevronUp className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </h2>
        </div>
        
        {isNotesExpanded && (
          <div className="px-4 md:px-8 py-4 bg-[var(--planner-spotlight-bg)] rounded-[2.5rem] border-2 border-[var(--planner-spotlight-border)] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <ScratchpadWidget projects={projects} />
          </div>
        )}
      </div>
    </div>
  );
};

