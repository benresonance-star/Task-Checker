import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, 
  Target, 
  Search,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Briefcase,
  Bell,
  Calendar,
  Zap,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScratchpadWidget } from './ScratchpadWidget';
import { TasklistInstance, ActionSetItem } from '../../types';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';

interface PlannerHomeProps {
  onOpenFocus: () => void;
  projects: any[];
  instances: TasklistInstance[];
  masters: any[];
}

export const PlannerHome: React.FC<PlannerHomeProps> = ({ 
  onOpenFocus, 
  projects,
  instances
}) => {
  const { getTodayAlerts, getValidActionSet, setActionSet, setTaskFocus, toggleTaskInActionSet, currentUser } = useTasklistStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const todayAlerts = getTodayAlerts();
  const validActionSet = getValidActionSet();

  // Get the top 3 staged items from the action set with full data
  const stagedItems = useMemo(() => {
    return validActionSet.slice(0, 3).map(item => {
      if (item.type === 'note') {
        const note = currentUser?.scratchpad?.find(n => n.id === item.taskId);
        return { ...item, displayTitle: note?.text || 'Note', displayCategory: note?.category || 'Personal' };
      } else {
        const instance = instances.find(i => i.id === item.instanceId);
        const task = instance?.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === item.taskId);
        return { ...item, displayTitle: task?.title || 'Task', displayCategory: instance?.title || 'Project' };
      }
    });
  }, [validActionSet, currentUser?.scratchpad, instances]);

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
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
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
              <span className="text-xl ml-1 opacity-40">{currentTime.toLocaleTimeString([], { second: '2-digit' })}</span>
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
                  className={clsx(
                    "relative flex items-center gap-3 p-3 rounded-2xl border-2 transition-all group/slot min-h-[60px]",
                    item 
                      ? "bg-white dark:bg-white/5 border-google-blue shadow-md" 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Pulse Widget */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="flex items-center gap-3 text-sm font-black uppercase text-gray-500 tracking-[0.2em]">
              <Target className="w-5 h-5 text-google-green" />
              Project Pulse
            </h2>
            <Button variant="ghost" size="sm" className="text-xs font-black text-google-blue">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map(project => {
              const projectInstances = instances.filter(i => i.projectId === project.id);
              const hasActiveReminder = projectInstances.some(inst => 
                inst.sections.some(s => 
                  s.subsections.some(ss => 
                    ss.tasks.some(t => t.reminder && t.reminder.status === 'active' && !t.completed)
                  )
                )
              );

              return (
                <div 
                  key={project.id}
                  className="bg-white dark:bg-black/40 p-6 rounded-container border-2 border-gray-100 dark:border-gray-800 hover:border-google-green/50 transition-all cursor-pointer group shadow-sm hover:shadow-lg relative"
                >
                  {hasActiveReminder && (
                    <div className="absolute top-4 right-4 text-orange-500 animate-pulse">
                      <Bell className="w-5 h-5 fill-current" />
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-google-green/60">Project</span>
                      <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 line-clamp-1">{project.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-google-green/30 text-google-green hover:bg-google-green/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Find first pending task across all instances of this project
                          const firstPending = projectInstances
                            .flatMap(inst => inst.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)))
                            .find(t => !t.completed);
                          
                          if (firstPending) {
                            const instance = projectInstances.find(inst => 
                              inst.sections.some(s => s.subsections.some(ss => ss.tasks.some(t => t.id === firstPending.id)))
                            );
                            if (instance) {
                              toggleTaskInActionSet(project.id, instance.id, firstPending.id);
                            }
                          }
                        }}
                      >
                        Stage Next
                      </Button>
                      {!hasActiveReminder && (
                        <div className="p-2 bg-google-green/10 rounded-xl text-google-green group-hover:scale-110 transition-transform">
                          <Briefcase className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {project.instanceIds?.length || 0} Checklists
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Active Now
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-black/10 rounded-container border-2 border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No active projects</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Access Sidebar */}
        <div className="space-y-6">
          <div className="bg-google-blue/5 dark:bg-blue-900/10 p-6 rounded-container border-2 border-google-blue/10 space-y-6">
            <h2 className="text-sm font-black uppercase text-google-blue tracking-[0.2em]">Quick Access</h2>
            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800">
                <Search className="w-4 h-4" /> Search Global Logic
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3 h-12 bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800">
                <LayoutGrid className="w-4 h-4" /> Browse Templates
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Width My Notes */}
      <div className="space-y-4">
        <div className="p-8 bg-white dark:bg-black/40 rounded-[2.5rem] border-2 border-gray-100 dark:border-gray-800 min-h-[500px] shadow-xl">
          <ScratchpadWidget />
        </div>
      </div>
    </div>
  );
};

