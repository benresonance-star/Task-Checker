import React from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { theme } from '../../styles/theme';
import { LayoutGrid, Target, Zap, Clock, ThumbsUp } from 'lucide-react';
import { clsx } from 'clsx';

export const FocusDashboard: React.FC = () => {
  const { 
    currentUser, 
    activeInstance, 
    activeTaskId,
    instances 
  } = useTasklistStore();

  // Find the actual task object for the active focus
  const activeTask = React.useMemo(() => {
    if (!activeInstance || !activeTaskId) return null;
    for (const section of activeInstance.sections) {
      for (const subsection of section.subsections) {
        const task = subsection.tasks.find(t => t.id === activeTaskId);
        if (task) return { task, instanceTitle: activeInstance.title };
      }
    }
    return null;
  }, [activeInstance, activeTaskId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
          <LayoutGrid className="w-8 h-8 text-google-blue" />
          <span>My Dashboard</span>
        </h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
        </p>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Placeholder: Active Focus Card (Phase 2) */}
        <div className={clsx(
          "col-span-1 md:col-span-2 p-8 rounded-container border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]",
          "bg-white/30 dark:bg-black/10"
        )}>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Target className="w-10 h-10 text-gray-400" />
          </div>
          <div>
            <h3 className="font-black text-xl uppercase tracking-tight text-gray-400">Phase 2: Active Focus</h3>
            <p className="text-gray-500 font-bold">Your primary workspace will live here.</p>
          </div>
        </div>

        {/* Placeholder: Knowledge Hub (Phase 3) */}
        <div className="p-6 rounded-container border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
          <Zap className="w-8 h-8 text-gray-400" />
          <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Phase 3: Widgets</h4>
        </div>

        {/* Placeholder: Scratchpad (Phase 4) */}
        <div className="p-6 rounded-container border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px]">
          <Clock className="w-8 h-8 text-gray-400" />
          <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Phase 4: Scratchpad</h4>
        </div>

      </div>
    </div>
  );
};

