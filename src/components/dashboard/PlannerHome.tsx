import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  ArrowRight,
  TrendingUp,
  Briefcase,
  Bell,
  Calendar,
  Zap,
  ClipboardList,
  StickyNote,
  ChevronUp,
  ChevronDown,
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
      if (item.type === 'note') {
        const note = currentUser?.scratchpad?.find(n => n.id === item.taskId);
        return { 
          ...item, 
          displayTitle: note?.text || 'Note', 
          displayCategory: note?.category || 'Personal',
          projectName: note?.category || 'Personal',
          priority: note?.priority,
          completed: note?.completed 
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
          priority: false
        };
      }
    });
  }, [validActionSet, currentUser?.scratchpad, instances, projects]);

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
                      <p className={clsx(
                        "text-[9px] font-black uppercase tracking-wider mb-0.5",
                        item.type === 'note' && item.priority ? "text-red-900/60" : "text-google-blue/60"
                      )}>{item.projectName}</p>
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

      {/* Project Spotlight Switchboard */}
      <div className="space-y-6">
        <div 
          className="flex items-center justify-between px-2 cursor-pointer group/header"
          onClick={() => setIsSpotlightExpanded(!isSpotlightExpanded)}
        >
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
            <Target className="w-5 h-5 text-google-green" />
            Project Activity Spotlight
            <div className="ml-1 p-1 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors group-hover/header:bg-gray-200 dark:group-hover/header:bg-gray-700">
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
              <div className="py-12 text-center bg-gray-50 dark:bg-black/10 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
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
                            ? "bg-google-green border-google-green text-white shadow-lg shadow-google-green/20 scale-105 z-10" 
                            : "bg-white dark:bg-black/20 border-gray-100 dark:border-gray-800 text-gray-500 hover:border-google-green/50"
                        )}
                      >
                        <div className={clsx(
                          "p-1.5 rounded-lg transition-colors",
                          isActive ? "bg-white/20 text-white" : "bg-google-green/10 text-google-green group-hover:bg-google-green/20"
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
                  <div className="bg-white dark:bg-black/20 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 overflow-hidden shadow-xl animate-fade-in transition-[height] duration-300">
                    <div className="flex flex-col lg:flex-row h-full">
                      {/* Column 1: Project Identity (20%) - Defines the Floor Height */}
                      <div className="w-full lg:w-[22%] bg-gray-50/50 dark:bg-black/40 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between gap-6 group shrink-0 min-h-[240px]">
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tighter leading-tight break-words">
                            {spotlightData.project.name}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-google-blue/10 flex items-center justify-center text-google-blue shrink-0">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">Active Tasks</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
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
                                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
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
                      <div className="flex-[43] p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 flex flex-col min-w-0">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-1 shrink-0">
                          <ClipboardList className="w-4 h-4 text-google-blue" />
                          Live Checklists
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pr-1 max-h-[380px]">
                          <div className="grid grid-cols-1 gap-3">
                            {spotlightData.activeInstances.length === 0 ? (
                              <div className="min-h-[120px] flex items-center justify-center bg-gray-50/50 dark:bg-white/5 rounded-2xl text-[10px] font-bold text-gray-400 italic text-center px-4">
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
                                    className="bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:border-google-blue hover:shadow-lg transition-all cursor-pointer group/pill min-h-[100px]"
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
                      <div className="flex-[35] p-6 space-y-4 bg-gray-50/30 dark:bg-black/20 flex flex-col min-w-0">
                        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2 mb-1 shrink-0">
                          <StickyNote className="w-4 h-4 text-indigo-500" />
                          Associated Notes
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar pr-1 max-h-[380px]">
                          <div className="grid grid-cols-1 gap-3">
                            {spotlightData.associatedNotes.length === 0 ? (
                              <div className="min-h-[120px] flex items-center justify-center bg-gray-50/50 dark:bg-white/5 rounded-2xl text-[10px] font-bold text-gray-400 italic text-center px-4">
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
                                    className="text-[11px] font-bold text-gray-800 dark:text-gray-200 line-clamp-4 prose prose-sm dark:prose-invert max-w-none"
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
          <h2 className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
            <StickyNote className="w-5 h-5 text-google-blue" />
            MY NOTES AND TASKS
            <div className="ml-1 p-1 rounded-full bg-gray-100 dark:bg-gray-800 transition-colors group-hover/header:bg-gray-200 dark:group-hover/header:bg-gray-700">
              {isNotesExpanded ? (
                <ChevronUp className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </h2>
        </div>
        
        {isNotesExpanded && (
          <div className="p-4 md:p-6 bg-white dark:bg-black/40 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <ScratchpadWidget projects={projects} />
          </div>
        )}
      </div>
    </div>
  );
};

