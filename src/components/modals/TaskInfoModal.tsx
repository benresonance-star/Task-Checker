import React, { useState, useEffect, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Section, Complexity } from '../../types';
import { Button } from '../ui/Button';
import { NoteEditor } from '../editor/NoteEditor';
import { TaskGuidePanel } from '../editor/TaskGuidePanel';
import { TaskTimerControls } from './TaskInfoModal/TaskTimerControls';
import { 
  Zap, Paperclip, Loader2, ClipboardList, Target
} from 'lucide-react';
import { clsx } from 'clsx';

interface TaskInfoModalProps {
  taskId: string;
  containerId: string;
  onClose: () => void;
  isDarkMode: boolean;
  focusFeedback?: boolean;
}

export const TaskInfoModal: React.FC<TaskInfoModalProps> = ({ taskId, containerId, onClose, isDarkMode, focusFeedback }) => {
  const { 
    mode, masters, instances, currentUser, 
    updateTaskNotes, updateTaskGuide,
    handleFileUpload, handleFileDownload
  } = useTasklistStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const feedbackRef = React.useRef<HTMLDivElement>(null);

  // Derive the current task from store - Memoized to only change when essential task properties change
  const task = useMemo(() => {
    if (!taskId || !containerId) return null;
    const searchTasks = (sections: Section[]) => {
      if (!Array.isArray(sections)) return null;
      for (const s of sections) {
        if (!s.subsections) continue;
        for (const ss of s.subsections) {
          if (!ss.tasks) continue;
          const found = ss.tasks.find(t => t?.id === taskId);
          // Return a stable version of the task without the timer properties to avoid re-renders on every tick
          if (found) {
            // No longer stripping timer props here, isolation is handled by TaskTimerControls
            return found;
          }
        }
      }
      return null;
    };

    if (mode === 'master') {
      const master = (masters || []).find(m => m.id === containerId);
      if (master) return searchTasks(master.sections || []);
    } else {
      const instance = (instances || []).find(i => i.id === containerId);
      if (instance) return searchTasks(instance.sections || []);
    }
    return null;
  }, [taskId, containerId, mode, masters, instances]);

  // Handle mobile detection and hydration delays
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    
    // Mount stabilization
    const readyTimer = setTimeout(() => setIsReady(true), 20);
    // Hydration delay
    const hydrateTimer = setTimeout(() => setIsHydrated(true), mobile ? 500 : 100);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(hydrateTimer);
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle auto-scroll to feedback
  useEffect(() => {
    if (isHydrated && focusFeedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isHydrated, focusFeedback]);

  if (!task || !isReady) return null;

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isUserFile: boolean) => {
    handleFileUpload(e, task.id, containerId, isUserFile);
  };

  const isActiveFocus = currentUser?.activeFocus?.taskId === task.id;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-[2000] cursor-pointer"
      onClick={onClose}
    >
      <div 
        className={clsx(
          "bg-blue-50/95 dark:bg-[#121212] w-full max-w-5xl rounded-2xl sm:rounded-container shadow-2xl p-4 sm:p-8 flex flex-col h-[90vh] sm:h-[85vh] border transition-all duration-300 overscroll-contain relative z-[2001] cursor-default animate-in fade-in duration-200",
          isDarkMode ? "border-gray-700" : "border-blue-200",
          isActiveFocus && "ring-4 ring-google-green border-google-green shadow-[0_0_25px_rgba(52,168,83,0.3)]",
          !isMobile && "zoom-in-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Mobile Header Row: Pomodoro + Close */}
            <div className="flex items-center justify-between sm:hidden w-full mb-1 relative z-10">
              {mode === 'project' && isActiveFocus ? (
                <TaskTimerControls taskId={task.id} isMobile={true} />
              ) : <div />}
              <Button 
                variant="secondary" 
                onClick={onClose} 
                className="h-10 px-4 text-[13px] font-bold border border-blue-200 dark:border-gray-700 bg-white/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl"
              >
                Close
              </Button>
            </div>
            
            <div className="flex items-center">
              {mode === 'master' ? (
                <select
                  className={clsx(
                    "bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-gray-700 rounded-button px-3 py-1.5 text-xs font-black outline-none transition-all cursor-pointer",
                    task.guide?.complexity === 'Easy' && "text-green-600 border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10",
                    task.guide?.complexity === 'Moderate' && "text-amber-600 border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10",
                    task.guide?.complexity === 'Complex' && "text-red-600 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10",
                    !task.guide?.complexity && "text-gray-400 dark:text-gray-300/60"
                  )}
                  value={task.guide?.complexity || ''}
                  onChange={(e) => {
                    const val = e.target.value as Complexity | '';
                    updateTaskGuide(task.id, { complexity: val || undefined }, containerId, true);
                  }}
                >
                  <option value="" className="text-gray-500 dark:text-gray-300/60">Complexity...</option>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Complex">Complex</option>
                </select>
              ) : (
                task.guide?.complexity && (
                  <div className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    task.guide.complexity === 'Easy' && "bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30",
                    task.guide.complexity === 'Moderate' && "bg-amber-50/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
                    task.guide.complexity === 'Complex' && "bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30"
                  )}>
                    <Zap className="w-3 h-3 fill-current" />
                    {task.guide.complexity}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Desktop-only Pomodoro controls and Close button */}
          <div className="hidden sm:flex items-center gap-4">
            {mode === 'project' && isActiveFocus && (
              <TaskTimerControls taskId={task.id} isMobile={false} />
            )}
            <Button variant="secondary" onClick={onClose} className="font-bold border border-blue-200 dark:border-gray-700 bg-white/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white">Close</Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex-shrink-0 mb-8">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest">TASK</h4>
            </div>
            <div className="bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-800 rounded-container p-6 mb-8 shadow-sm h-fit transition-all">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 break-words leading-relaxed px-2">
                {task.title}
              </h3>
            </div>

            <TaskGuidePanel 
              task={task as any} 
              mode={mode} 
              containerId={containerId}
              showComplexityHeader={false} 
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {task.files?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-white dark:bg-black/40 border border-blue-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
              {mode === 'master' && (
                <label className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-xs font-black text-google-blue dark:text-gray-300 cursor-pointer border border-blue-200 dark:border-blue-800 hover:bg-blue-200 transition-all">
                  <Paperclip className="w-3 h-3 inline mr-1" /> Attach Reference File
                  <input type="file" className="hidden" onChange={(e) => onFileUpload(e, false)} />
                </label>
              )}
            </div>
          </div>
          
          {mode === 'project' && (
            <div ref={feedbackRef} className="flex-shrink-0 border-t-2 pt-10 pb-4 border-gray-400 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4 px-2">
                <ClipboardList className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h4 className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest">MY TASK FEEDBACK</h4>
              </div>
              <div className="bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-800 rounded-container overflow-hidden shadow-sm min-h-[300px]">
                {isHydrated ? (
                  <NoteEditor 
                    content={String(task.userNotes || '')} 
                    onChange={(n, imm) => { 
                      updateTaskNotes(task.id, n, containerId, true, imm); 
                    }} 
                  />
                ) : (
                  <div className="w-full h-[300px] flex flex-col items-center justify-center gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Editor...</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {task.userFiles?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-white dark:bg-black/40 border border-gray-400 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
                <label className="px-3 py-2 bg-white/50 dark:bg-blue-900/40 rounded-xl text-xs font-black text-gray-700 dark:text-gray-300 cursor-pointer border border-gray-400 dark:border-blue-800 hover:bg-white transition-all">
                  <Paperclip className="w-3 h-3 inline mr-1" /> Attach File
                  <input type="file" className="hidden" onChange={(e) => onFileUpload(e, true)} />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
