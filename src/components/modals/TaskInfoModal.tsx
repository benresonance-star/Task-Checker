import React, { useState, useEffect, useCallback } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Section, Complexity } from '../../types';
import { Button } from '../ui/Button';
import { NoteEditor } from '../editor/NoteEditor';
import { TaskGuidePanel } from '../editor/TaskGuidePanel';
import { TaskTimerControls } from './TaskInfoModal/TaskTimerControls';
import { 
  Zap, Paperclip, Loader2, ClipboardList, Target, Bell
} from 'lucide-react';
import { clsx } from 'clsx';

interface TaskInfoModalProps {
  taskId: string;
  containerId: string;
  onClose: () => void;
  focusFeedback?: boolean;
}

export const TaskInfoModal: React.FC<TaskInfoModalProps> = ({ taskId, containerId, onClose, focusFeedback }) => {
  // Use specific selectors to avoid unnecessary re-renders when other parts of the store change
  const mode = useTasklistStore(state => state.mode);
  const currentUser = useTasklistStore(state => state.currentUser);
  const updateTaskNotes = useTasklistStore(state => state.updateTaskNotes);
  const updateTaskGuide = useTasklistStore(state => state.updateTaskGuide);
  const handleFileUpload = useTasklistStore(state => state.handleFileUpload);
  const handleFileDownload = useTasklistStore(state => state.handleFileDownload);
  const updateTaskReminder = useTasklistStore(state => state.updateTaskReminder);

  // Selector for the task that stabilizes the object to prevent re-renders on every timer tick
  const task = useTasklistStore(state => {
    const searchTasks = (sections: Section[]) => {
      if (!Array.isArray(sections)) return null;
      for (const s of sections) {
        if (!s.subsections) continue;
        for (const ss of s.subsections) {
          if (!ss.tasks) continue;
          const found = ss.tasks.find(t => t?.id === taskId);
          if (found) return found;
        }
      }
      return null;
    };

    let foundTask = null;
    if (state.mode === 'master') {
      // First check activeMaster for speed and reliability in the Template view
      if (state.activeMaster?.id === containerId) {
        foundTask = searchTasks(state.activeMaster.sections || []);
      }
      // Fallback to searching all masters if not found or activeMaster doesn't match
      if (!foundTask) {
        const master = (state.masters || []).find(m => m.id === containerId);
        if (master) foundTask = searchTasks(master.sections || []);
      }
    } else {
      // First check activeInstance for speed and reliability in the Project view
      if (state.activeInstance?.id === containerId) {
        foundTask = searchTasks(state.activeInstance.sections || []);
      }
      // Fallback to searching all instances
      if (!foundTask) {
        const instance = (state.instances || []).find(i => i.id === containerId);
        if (instance) foundTask = searchTasks(instance.sections || []);
      }
    }

    // FINAL GLOBAL FALLBACK: If still not found (e.g. containerId mismatch or stale props),
    // search EVERYTHING as a safety measure to prevent the modal from auto-closing unnecessarily.
    if (!foundTask) {
      for (const master of state.masters || []) {
        foundTask = searchTasks(master.sections || []);
        if (foundTask) break;
      }
    }
    if (!foundTask) {
      for (const inst of state.instances || []) {
        foundTask = searchTasks(inst.sections || []);
        if (foundTask) break;
      }
    }

    return foundTask;
  }, (prev, next) => {
    // Custom equality check: Ignore timer-related changes to prevent modal re-renders every second
    if (!prev || !next) return prev === next;
    
    // Check core properties that should trigger a re-render
    return (
      prev.id === next.id &&
      prev.title === next.title &&
      prev.completed === next.completed &&
      prev.notes === next.notes &&
      prev.userNotes === next.userNotes &&
      prev.workbench === next.workbench &&
      JSON.stringify(prev.guide) === JSON.stringify(next.guide) &&
      (prev.files?.length === next.files?.length) &&
      (prev.userFiles?.length === next.userFiles?.length)
    );
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState<string>('');
  const feedbackRef = React.useRef<HTMLDivElement>(null);

  const handleSaveReminder = () => {
    const date = new Date(tempReminderTime);
    if (!isNaN(date.getTime()) && task) {
      updateTaskReminder(task.id, { 
        dateTime: date.getTime(), 
        status: 'active', 
        snoozeCount: 0 
      }, containerId);
      setShowReminderPicker(false);
    }
  };

  const handleNotesChange = useCallback((n: string, imm?: boolean) => {
    updateTaskNotes(taskId, n, containerId, true, imm);
  }, [taskId, containerId, updateTaskNotes]);

  const onFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, isUserFile: boolean) => {
    handleFileUpload(e, taskId, containerId, isUserFile);
  }, [taskId, containerId, handleFileUpload]);

  // Handle mobile detection and mount stabilization
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    
    const hydrateTimer = setTimeout(() => {
      setIsHydrated(true);
    }, mobile ? 300 : 100);

    // Prevent body scroll only if the modal is actually going to render a task
    if (task) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      clearTimeout(hydrateTimer);
      document.body.style.overflow = 'unset';
    };
  }, [!!task]); // Depend on task existence to manage scroll lock

  // AUTO-CLOSE SAFETY: If the task is missing (e.g. deleted or ID mismatch), close the modal
  // to prevent "ghost" states and interface crashes.
  useEffect(() => {
    if (!task) {
      onClose();
    }
  }, [task, onClose]);

  // Handle auto-scroll to feedback
  useEffect(() => {
    if (isHydrated && focusFeedback && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isHydrated, focusFeedback]);

  if (!task) return null;

  const isActiveFocus = currentUser?.activeFocus?.taskId === task.id;

  return (
    <div 
      className="fixed inset-0 bg-[var(--modal-overlay)] flex items-center justify-center p-2 sm:p-4 z-[2000] cursor-pointer"
      onClick={onClose}
    >
      <div 
        className={clsx(
          "bg-[var(--modal-bg)] w-full max-w-5xl rounded-[var(--radius-container)] shadow-2xl p-4 sm:p-8 flex flex-col h-[90vh] sm:h-[85vh] border transition-all duration-300 overscroll-contain relative z-[2001] cursor-default animate-in fade-in duration-200 border-[var(--modal-border)]",
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
                className="h-10 px-4 text-[13px] font-bold border border-[var(--modal-section-border)] bg-[var(--modal-btn-secondary-bg)] text-[var(--modal-btn-secondary-text)] rounded-[var(--radius-modal-input)]"
              >
                Close
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              {mode === 'master' ? (
                <select
                  className={clsx(
                    "bg-[var(--modal-input-bg)] border-2 border-[var(--modal-input-border)] rounded-[var(--radius-modal-input)] px-3 py-1.5 text-xs font-black outline-none transition-all cursor-pointer",
                    task.guide?.complexity === 'Easy' && "text-green-600 border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10",
                    task.guide?.complexity === 'Moderate' && "text-amber-600 border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10",
                    task.guide?.complexity === 'Complex' && "text-red-600 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10",
                    !task.guide?.complexity && "text-[var(--text-secondary)]"
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

              {/* Reminder/Alert Control */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowReminderPicker(!showReminderPicker);
                    if (!showReminderPicker) {
                      setTempReminderTime(task.reminder?.dateTime ? new Date(task.reminder.dateTime).toISOString().slice(0, 16) : '');
                    }
                  }}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-modal-input)] border-2 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm",
                    task.reminder 
                      ? "bg-orange-500 border-orange-400 text-white shadow-orange-500/20" 
                      : "bg-[var(--modal-input-bg)] border-[var(--modal-input-border)] text-[var(--text-secondary)] hover:border-orange-500 hover:text-orange-500"
                  )}
                >
                  <Bell className={clsx("w-3.5 h-3.5", task.reminder && "fill-current animate-pulse")} />
                  {task.reminder ? new Date(task.reminder.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Set Alert"}
                </button>

                {showReminderPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-[45]" 
                      onClick={(e) => { e.stopPropagation(); setShowReminderPicker(false); }} 
                    />
                    <div className="absolute top-full left-0 mt-2 bg-[var(--modal-bg)] border-2 border-orange-200 dark:border-orange-900/50 rounded-2xl p-4 shadow-2xl z-50 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] mb-3 flex items-center justify-between">
                        <span>Set Time Critical Alert</span>
                      </div>
                      <input 
                        type="datetime-local" 
                        className="w-full bg-[var(--modal-input-bg)] border-2 border-[var(--modal-input-border)] rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-orange-500 transition-all mb-3 text-[var(--text-primary)]"
                        value={tempReminderTime}
                        onChange={(e) => setTempReminderTime(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveReminder();
                          if (e.key === 'Escape') setShowReminderPicker(false);
                        }}
                        autoFocus
                      />
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {[15, 60].map(mins => (
                          <button 
                            key={mins}
                            onClick={() => {
                              setTempReminderTime(new Date(Date.now() + (mins * 60000)).toISOString().slice(0, 16));
                            }}
                            className="py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-gray-800 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            +{mins}m
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={handleSaveReminder}
                          disabled={!tempReminderTime}
                          className="w-full py-2 bg-google-blue text-white hover:bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Set Alert
                        </button>
                        {task.reminder && (
                          <button 
                            onClick={() => { updateTaskReminder(task.id, null, containerId); setShowReminderPicker(false); }}
                            className="w-full py-2 bg-google-red/10 text-google-red hover:bg-google-red/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                          >
                            Remove Alert
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop-only Pomodoro controls and Close button */}
          <div className="hidden sm:flex items-center gap-4">
            {mode === 'project' && isActiveFocus && (
              <TaskTimerControls taskId={task.id} isMobile={false} />
            )}
            <Button variant="secondary" onClick={onClose} className="font-bold border border-[var(--modal-section-border)] bg-[var(--modal-btn-secondary-bg)] text-[var(--modal-btn-secondary-text)] rounded-[var(--radius-modal-input)] hover:opacity-80">Close</Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex-shrink-0 mb-8">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Target className="w-5 h-5 text-[var(--modal-icon)]" />
              <h4 className="text-sm font-black uppercase text-[var(--modal-section-title)] tracking-widest">TASK</h4>
            </div>
            <div className="bg-[var(--modal-section-bg)] border border-[var(--modal-section-border)] rounded-[var(--radius-modal-section)] p-6 mb-8 shadow-sm h-fit transition-all">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] break-words leading-relaxed px-2">
                {task.title}
              </h3>
            </div>

            <TaskGuidePanel 
              task={task} 
              mode={mode} 
              containerId={containerId}
              showComplexityHeader={false} 
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {task.files?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-[var(--modal-btn-secondary-bg)] border border-[var(--modal-section-border)] rounded-[var(--radius-modal-input)] text-xs font-bold text-[var(--modal-btn-secondary-text)] hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
              {mode === 'master' && (
                <label className="px-3 py-2 bg-[var(--modal-btn-secondary-bg)] rounded-[var(--radius-modal-input)] text-xs font-black text-[var(--modal-btn-secondary-text)] cursor-pointer border border-[var(--modal-section-border)] hover:opacity-80 transition-all">
                  <Paperclip className="w-3 h-3 inline mr-1" /> Attach Reference File
                  <input type="file" className="hidden" onChange={(e) => onFileUpload(e, false)} />
                </label>
              )}
            </div>
          </div>
          
          {mode === 'project' && (
            <div ref={feedbackRef} className="flex-shrink-0 border-t-2 pt-10 pb-4 border-[var(--modal-section-border)]">
              <div className="flex items-center gap-2 mb-4 px-2">
                <ClipboardList className="w-5 h-5 text-[var(--modal-icon)]" />
                <h4 className="text-sm font-black uppercase text-[var(--modal-section-title)] tracking-widest">MY TASK FEEDBACK</h4>
              </div>
              <div className="bg-[var(--modal-section-bg)] border border-[var(--modal-section-border)] rounded-[var(--radius-modal-section)] overflow-hidden shadow-sm min-h-[300px]">
                {isHydrated ? (
                  <NoteEditor 
                    content={String(task.userNotes || '')} 
                    onChange={handleNotesChange} 
                  />
                ) : (
                  <div className="w-full h-[300px] flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Editor...</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {task.userFiles?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-[var(--modal-btn-secondary-bg)] border border-[var(--modal-section-border)] rounded-[var(--radius-modal-input)] text-xs font-bold text-[var(--modal-btn-secondary-text)] hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
                <label className="px-3 py-2 bg-[var(--modal-btn-secondary-bg)] rounded-[var(--radius-modal-input)] text-xs font-black text-[var(--modal-btn-secondary-text)] cursor-pointer border border-[var(--modal-section-border)] hover:opacity-80 transition-all">
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
