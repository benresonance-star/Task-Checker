import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  ArrowRight,
  TrendingUp,
  Briefcase,
  Bell,
  Calendar,
  Zap,
  X,
  ClipboardList,
  StickyNote,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScratchpadWidget } from './ScratchpadWidget';
import { TasklistInstance, ActionSetItem, Project, ScratchpadItem } from '../../types';
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
  const { getTodayAlerts, getValidActionSet, setActionSet, setTaskFocus, toggleNoteInActionSet, currentUser } = useTasklistStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const todayAlerts = getTodayAlerts();
  const validActionSet = getValidActionSet();

  // Get the top 3 staged items from the action set with full data
  const stagedItems = useMemo(() => {
    return validActionSet.slice(0, 3).map(item => {
      if (item.type === 'note') {
        const note = currentUser?.scratchpad?.find(n => n.id === item.taskId);
        return { 
          ...item, 
          displayTitle: note?.text || 'Note', 
          displayCategory: note?.category || 'Personal',
          priority: note?.priority,
          completed: note?.completed 
        };
      } else {
        const instance = instances.find(i => i.id === item.instanceId);
        const task = instance?.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === item.taskId);
        return { 
          ...item, 
          displayTitle: task?.title || 'Task', 
          displayCategory: instance?.title || 'Project',
          completed: task?.completed,
          priority: false
        };
      }
    });
  }, [validActionSet, currentUser?.scratchpad, instances]);

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
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-white dark:bg-black/20 p-8 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-google-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform group-hover:scale-110 duration-1000" />
        
        {/* Column 1: The Pulse (Time & Alerts) */}
        <div className="xl:col-span-4 space-y-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-google-blue font-black uppercase tracking-[0.2em] text-[10px]">
              <Calendar className="w-4 h-4" />
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-5xl font-black text-gray-900 dark:text-gray-100 tabular-nums tracking-tighter">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-orange-500" />
              Today's Alerts
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
              {todayAlerts.length === 0 ? (
                <p className="text-xs font-medium text-gray-400 italic">No alerts scheduled for today.</p>
              ) : (
                todayAlerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-gray-800 group/alert cursor-pointer hover:border-google-blue transition-all"
                    onClick={() => {
                      // Click to stage logic
                      const newItem: ActionSetItem = {
                        type: alert.type,
                        projectId: alert.type === 'task' ? alert.item.projectId : '',
                        instanceId: alert.type === 'task' ? alert.item.instanceId : '',
                        taskId: alert.item.id,
                        addedAt: Date.now()
                      };
                      // Prepend to action set
                      const currentSet = [...validActionSet];
                      const existsIdx = currentSet.findIndex(i => i.taskId === newItem.taskId);
                      if (existsIdx !== -1) currentSet.splice(existsIdx, 1);
                      setActionSet([newItem, ...currentSet]);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 shrink-0 group-hover/alert:scale-110 transition-transform">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 break-words line-clamp-2" dangerouslySetInnerHTML={{ __html: alert.title }} />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{alert.category}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg ml-2 shrink-0">
                      {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: The Staging Zone (The Daily Trio) */}
        <div className="xl:col-span-5 flex flex-col gap-4 relative z-10 border-l border-r border-gray-100 dark:border-gray-800 px-6">
          <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-google-yellow" />
            Session Sprint Staging
          </h3>
          <div className="flex-1 grid grid-cols-1 gap-2">
            {[0, 1, 2].map(idx => {
              const item = stagedItems[idx];
              return (
                <div 
                  key={idx}
                  style={{
                    backgroundColor: item 
                      ? (item.completed ? undefined : (item.type === 'note' ? (item.priority ? 'var(--note-priority-bg)' : (item.displayCategory === 'Personal' ? 'var(--note-personal-bg)' : 'var(--note-project-bg)')) : 'var(--note-project-bg)'))
                      : undefined
                  }}
                  className={clsx(
                    "relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all group/slot min-h-[60px]",
                    item 
                      ? (item.type === 'note' && item.priority ? "border-red-200 dark:border-red-900/30 shadow-md" : "border-google-blue shadow-md")
                      : "bg-gray-50/50 dark:bg-black/20 border-dashed border-gray-200 dark:border-gray-800"
                  )}
                >
                  <div className={clsx(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                    item ? "bg-google-blue text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                  )}>
                    {idx + 1}
                  </div>
                  
                  {item ? (
                    <div className="flex-1 min-w-0 animate-fly-in">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 break-words line-clamp-2" dangerouslySetInnerHTML={{ 
                        __html: item.displayTitle
                      }} />
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{item.displayCategory}</p>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Empty Slot
                    </div>
                  )}

                  {item && (
                    <button 
                      onClick={() => {
                        const newSet = validActionSet.filter((_, i) => i !== idx);
                        setActionSet(newSet);
                      }}
                      className="opacity-0 group-hover/slot:opacity-100 p-1 text-gray-400 hover:text-google-red transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
              <span className="text-sm font-black uppercase tracking-wider">Begin Sprint</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
        </div>
      </div>

      {/* Main Commitment Section */}
      <div className="space-y-12">
        <div className="flex items-center justify-between px-2">
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
            <Target className="w-5 h-5 text-google-green" />
            My Projects & Checklists
          </h2>
          <Button variant="ghost" size="sm" className="text-[10px] font-black text-google-blue uppercase tracking-widest">Explore All</Button>
        </div>

        <div className="space-y-6">
          {activeCommitments.length === 0 ? (
            <div className="py-20 text-center bg-gray-50 dark:bg-black/10 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active commitments found.</p>
              <p className="text-xs text-gray-500 mt-2">Stage a task or add a note to see your projects here.</p>
            </div>
          ) : (
            activeCommitments.map(({ project, activeInstances, associatedNotes }) => {
              const taskCount = validActionSet.filter(i => i.projectId === project.id).length;
              const noteCount = associatedNotes.length;

              return (
                <div 
                  key={project.id}
                  className="bg-white dark:bg-black/20 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
                >
                  {/* Project Header */}
                  <div className="p-6 border-b border-gray-50 dark:border-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-google-green/10 rounded-2xl text-google-green group-hover:scale-110 transition-transform">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">{project.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-google-blue">
                            {taskCount} {taskCount === 1 ? 'TASK' : 'TASKS'} IN SESSION
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            {noteCount} {noteCount === 1 ? 'NOTE' : 'NOTES'} ASSOCIATED
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="h-10 px-4 rounded-xl border border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest gap-2 hover:bg-google-green/5 hover:text-google-green hover:border-google-green/30"
                    >
                      Enter Project Dashboard <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Activity Islands (Ribbons) */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Zone A: Live Checklists */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em] flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-google-blue" />
                        Live Checklists
                      </h4>
                      <div className="flex flex-nowrap overflow-x-auto pb-4 gap-3 custom-scrollbar snap-x">
                        {activeInstances.length === 0 ? (
                          <div className="h-[60px] flex items-center px-4 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 italic">
                            No specific checklists staged.
                          </div>
                        ) : (
                          activeInstances.map(instance => {
                            // Calculate completion for the instance
                            const totalTasks = instance.sections.reduce((acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.tasks.length, 0), 0);
                            const completedTasks = instance.sections.reduce((acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.tasks.filter(t => t.completed).length, 0), 0);
                            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                            const nextTask = instance.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => !t.completed);

                            return (
                              <div 
                                key={instance.id}
                                onClick={() => navigate(`/project/${project.id}/instance/${instance.id}`)}
                                className="snap-start flex-shrink-0 w-[240px] bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:border-google-blue transition-all cursor-pointer group/pill"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-black text-gray-900 dark:text-gray-100 truncate flex-1 pr-2">{instance.title}</span>
                                  <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                                    <svg className="w-8 h-8 -rotate-90">
                                      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-800" />
                                      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={88} strokeDashoffset={88 - (88 * progress) / 100} className="text-google-blue transition-all duration-1000" />
                                    </svg>
                                    <span className="absolute text-[8px] font-black">{progress}%</span>
                                  </div>
                                </div>
                                {nextTask && (
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 group-hover/pill:text-google-blue transition-colors">
                                    <ChevronRight className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Next: {nextTask.title}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Zone B: Associated Notes */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em] flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-indigo-500" />
                        Project Notes
                      </h4>
                      <div className="flex flex-nowrap overflow-x-auto pb-4 gap-3 custom-scrollbar snap-x">
                        {associatedNotes.length === 0 ? (
                          <div className="h-[60px] flex items-center px-4 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-bold text-gray-400 italic">
                            No notes tagged for this project.
                          </div>
                        ) : (
                          associatedNotes.map(note => (
                            <div 
                              key={note.id}
                              style={{ backgroundColor: note.priority ? 'var(--note-priority-bg)' : 'var(--note-project-bg)' }}
                              className={clsx(
                                "snap-start flex-shrink-0 w-[180px] border rounded-2xl p-4 transition-all cursor-pointer group/note shadow-sm hover:shadow-md h-[100px] flex flex-col",
                                note.priority ? "border-red-200 dark:border-red-900/30" : "border-transparent"
                              )}
                              onClick={() => {
                                // Find where this note is being rendered and focus it, or stage it
                                toggleNoteInActionSet(note.id);
                              }}
                            >
                              <div 
                                className="text-[11px] font-bold text-gray-800 dark:text-gray-200 line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
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
              );
            })
          )}
        </div>
      </div>

      {/* MY NOTES (Full Width) */}
      <div className="space-y-6">
        <div className="px-2">
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
            <StickyNote className="w-5 h-5 text-google-blue" />
            My Notes
          </h2>
        </div>
        
        <div className="p-8 bg-white dark:bg-black/40 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 min-h-[400px] shadow-xl">
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
};

