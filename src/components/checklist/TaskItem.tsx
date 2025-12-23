import React, { useState } from 'react';
import { Circle, CheckCircle2, StickyNote, Trash2, ChevronUp, ChevronDown, Play, Pause, AlertTriangle, ListPlus, ListMinus } from 'lucide-react';
import { clsx } from 'clsx';
import { theme } from '../../styles/theme';
import { Task } from '../../types';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Button } from '../ui/Button';
import { useLocation } from 'react-router-dom';

interface TaskItemProps {
  task: Task;
  subsectionId: string;
  onOpenNotes: (task: Task) => void;
}

const TomatoIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* Tomato Body */}
    <path 
      d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" 
      fill="#EA4335" 
    />
    {/* Green Stem */}
    <path 
      d="M12 3C12 3 11 1.5 12 1C13 0.5 14 2 13 3" 
      stroke="#34A853" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M9 3.5L12 4.5L15 3.5" 
      stroke="#34A853" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
    />
    {/* Clock Face Overlay */}
    <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1" fill="white" fillOpacity="0.2" />
    <path d="M12 9.5V12L13.5 13" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * TaskItem component represents a single task in the checklist.
 * It handles task completion, title editing (in master mode), notes/files triggers,
 * and the Pomodoro timer logic.
 */
export const TaskItem = ({ task, subsectionId, onOpenNotes }: TaskItemProps) => {
  const { mode, toggleTask, renameTask, deleteTask, moveTask, setTaskTimer, resetTaskTimer, toggleTaskTimer, activeInstance, currentUser, activeProject, toggleTaskFocus, toggleTaskInActionSet, users } = useTasklistStore();

  const isInstance = mode === 'project';
  const isActive = isInstance && currentUser?.activeFocus?.taskId === task.id; // Highlight if this task is currently being focused/edited
  const isInActionSet = currentUser?.actionSet?.some(i => i.taskId === task.id);
  const isAnyTaskActive = isInstance && !!currentUser?.activeFocus?.taskId;
  const shouldRecede = isInstance && isAnyTaskActive && !isActive;

  const [showTimerWidget, setShowTimerWidget] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('20');

  // Presence Indicators: Find other users who have this task active
  const otherActiveUsers = Object.entries(activeInstance?.activeUsers || {})
    .filter(([uid, info]) => info.taskId === task.id && uid !== currentUser?.id && Date.now() - info.lastSeen < 45000)
    .map(([_, info]) => info);

  // Claim Badges: Find other users who have this task in their Action Set
  const otherClaimants = users
    .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => i.taskId === task.id))
    .map(u => ({ id: u.id, name: u.name }));

  const isMultiUser = (otherActiveUsers.length + (isActive ? 1 : 0)) >= 2;

  const [localTitle, setLocalTitle] = useState(task.title);

  // Sync local title with store title when task changes externally
  React.useEffect(() => {
    if (!isInstance) {
      setLocalTitle(task.title);
    }
  }, [task.title, isInstance]);

  const handleTaskClick = (e: React.MouseEvent) => {
    if (!isInstance || !activeProject || !activeInstance) return;
    e.stopPropagation(); // Prevent triggering the SubsectionItem's background click (which clears selection)
    
    toggleTaskFocus(activeProject.id, activeInstance.id, task.id);
  };

  const location = useLocation();

  // Auto-resize textarea on mount to fit title content
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [task.title]);

  // Scroll into view if this task is active via URL parameter
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlTaskId = searchParams.get('task');
    if (urlTaskId === task.id && containerRef.current) {
      // Small delay to ensure the project/instance view is fully loaded and expanded
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [task.id, location.search]);

  // Removed individual timer logic to prevent race conditions

  const formatTime = (seconds: number | undefined | null, duration?: number) => {
    const val = seconds ?? duration ?? (20 * 60);
    const hrs = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    const secs = val % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetTimer = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins)) {
      setTaskTimer(task.id, mins * 60);
      setShowTimerWidget(false);
    }
  };

  // Check if task has any attached content to decide if the notes icon should be highlighted
  const hasNotes = (task.notes && task.notes !== '<p></p>') || (task.userNotes && task.userNotes !== '<p></p>');
  const hasFiles = (task.files && task.files.length > 0) || (task.userFiles && task.userFiles.length > 0);
  const shouldHighlight = hasNotes || hasFiles;

  return (
    <div 
      ref={containerRef}
      onClick={handleTaskClick}
      className={clsx(
        theme.components.checklist.container,
        isMultiUser 
          ? theme.components.checklist.containerMulti
          : isActive 
            ? theme.components.checklist.containerActive
            : clsx(
                theme.components.checklist.containerInactive,
                !isAnyTaskActive ? "dark:bg-black/60" : "dark:bg-[#121212]"
              ),
        shouldRecede && !isMultiUser && "opacity-40 grayscale-[0.5] scale-[0.98]"
      )}
    >
      {/* Top Tier: Primary Content (Title & Completion) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {isInstance ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleTask(task.id);
            }}
            className={clsx(
              "transition-colors flex-shrink-0 flex items-center justify-center",
              isMultiUser ? "text-white" : "text-gray-500 hover:text-google-blue"
            )}
          >
            {task.completed ? (
              <CheckCircle2 className={clsx("w-5 h-5 sm:w-6 sm:h-6 opacity-100 fill-current", isMultiUser ? "" : "text-google-blue fill-google-blue/20")} />
            ) : (
              <Circle className={clsx("w-5 h-5 sm:w-6 sm:h-6 opacity-100 hover:text-google-blue border-2 border-transparent rounded-full", isMultiUser ? "text-white/60" : "text-gray-400 dark:text-gray-300")} />
            )}
          </button>
        ) : (
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => moveTask(subsectionId, task.id, 'up')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => moveTask(subsectionId, task.id, 'down')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 flex items-center min-w-0 gap-2">
          {!isInstance && (!task.guide?.description || task.guide.description.trim() === '') && (
            <AlertTriangle 
              className="w-4 h-4 text-orange-400 flex-shrink-0 animate-pulse" 
            />
          )}
          <div className="flex-1 flex flex-col min-w-0">
            {!isInstance ? (
              <textarea
                ref={textareaRef}
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-600 dark:text-gray-300 text-sm font-medium py-0.5 px-1 rounded hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 transition-colors resize-none overflow-hidden min-h-[1.5rem]"
                value={localTitle}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setLocalTitle(newVal);
                  renameTask(task.id, newVal);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onFocus={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="Task title..."
              />
            ) : (
              <div className="flex flex-col min-w-0">
              <span 
                className={clsx(
                  'w-full py-0.5 px-1 cursor-pointer select-none break-words whitespace-pre-wrap text-sm font-medium transition-colors duration-300', 
                  isMultiUser ? "text-white" : (task.completed ? 'line-through text-gray-400 dark:text-gray-500' : (shouldRecede ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'))
                )}
              >
                  {task.title}
                </span>
                
                {/* Other User Claim Badges */}
                {otherClaimants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-1">
                    {otherClaimants.map(u => (
                      <span 
                        key={u.id}
                        className={clsx(
                          theme.components.checklist.badge,
                          isActive 
                            ? theme.components.checklist.badgeActive
                            : theme.components.checklist.badgeInactive
                        )}
                      >
                        [{u.name.charAt(0).toUpperCase()}{u.name.charAt(1).toUpperCase()}] GATHERED
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions Row: Visible on Desktop, or on Mobile for INACTIVE tasks */}
        <div className={clsx(
          "items-center gap-1 sm:gap-2 ml-auto",
          isActive ? "hidden sm:flex" : "flex"
        )}>
          {isActive && isInstance && (
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mr-1">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimerWidget(!showTimerWidget);
                }}
                className="relative"
              >
                <div className={clsx(
                  "flex items-center transition-opacity hover:opacity-80",
                  task.timerRemaining !== undefined ? "gap-1.5" : ""
                )}>
                  <TomatoIcon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" />
                  <span className={clsx(
                    "text-[9px] sm:text-[11px] font-black tabular-nums",
                    isMultiUser ? "text-white" : "text-red-600 dark:text-red-400"
                  )}>
                    {formatTime(task.timerRemaining, task.timerDuration)}
                  </span>
                </div>

                {showTimerWidget && (
                  <>
                    <div className="fixed inset-0 z-[45]" onClick={(e) => { e.stopPropagation(); setShowTimerWidget(false); }} />
                    <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-50 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                        <TomatoIcon className="w-4 h-4" />
                        Set Session Duration
                      </div>
                      <div className="flex gap-2">
                        <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none focus:ring-2 focus:ring-google-blue font-bold text-gray-800 dark:text-gray-300" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetTimer()} />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={handleSetTimer} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); resetTaskTimer(task.id); setShowTimerWidget(false); }} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTaskTimer(task.id);
                }}
                className={clsx(
                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center border transition-all",
                  isMultiUser ? "bg-white/20 border-white/30 text-white" : "bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:scale-110"
                )}
              >
                {task.timerIsRunning ? <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> : <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5 fill-current" />}
              </button>
            </div>
          )}

          {otherActiveUsers.length > 0 && (
            <div className="flex -space-x-2 mr-1">
              {otherActiveUsers.map((user, i) => (
                <div 
                  key={i}
                  title={`${user.userName} is working here`}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-google-yellow border-2 border-white dark:border-[#121212] flex items-center justify-center text-[10px] font-black text-gray-900 shadow-sm animate-in fade-in zoom-in duration-300 ring-1 ring-black/5"
                  style={{ zIndex: 10 - i }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {isInstance && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (activeProject && activeInstance) {
                toggleTaskInActionSet(activeProject.id, activeInstance.id, task.id);
              }
            }}
            title={isInActionSet ? "Remove from Setlist" : "Add to Setlist"}
            className={clsx(
              "p-1 rounded-lg transition-all border-2 flex-shrink-0",
              isMultiUser 
                ? (isInActionSet ? "bg-white text-google-red border-white" : "bg-white/20 text-white border-white/30") 
                : (isInActionSet 
                    ? "bg-google-blue text-white border-google-blue shadow-sm" 
                    : "bg-gray-50 dark:bg-black/20 text-gray-400 border-transparent hover:border-google-blue hover:text-google-blue")
            )}
          >
              {isInActionSet ? <ListMinus className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
            </button>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onOpenNotes(task);
            }}
            className={clsx(
              'h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all rounded-full border-2', 
              isMultiUser ? "text-white border-white/30 hover:bg-white/10" :
              shouldHighlight 
                ? 'text-google-blue bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-800 opacity-100 shadow-sm' 
                : 'text-gray-400 dark:text-gray-300 border-transparent sm:opacity-0 sm:group-hover:opacity-100 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <StickyNote className={clsx("w-3.5 h-3.5 sm:w-4 sm:h-4 font-black", shouldHighlight && "animate-pulse-slow")} />
          </Button>

          {!isInstance && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-400 hover:text-google-red h-7 w-7 sm:h-8 sm:w-8 p-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity border-2 border-transparent hover:border-red-200 dark:hover:border-red-900/40"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                  deleteTask(task.id);
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Control Tier: Mobile Action Row (Visible only when Active on Mobile) */}
      {isActive && isInstance && (
        <div className="flex sm:hidden items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            {/* Pomodoro Mobile */}
            <div className="flex items-center gap-2">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimerWidget(!showTimerWidget);
                }}
                className="relative"
              >
                <div className={clsx(
                  "flex items-center gap-1.5 p-1.5 rounded-xl border transition-all",
                  isMultiUser ? "bg-white/20 border-white/30" : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40"
                )}>
                  <TomatoIcon className="w-5 h-5" />
                  <span className={clsx(
                    "text-[11px] font-black tabular-nums",
                    isMultiUser ? "text-white" : "text-red-600 dark:text-red-400"
                  )}>
                    {formatTime(task.timerRemaining, task.timerDuration)}
                  </span>
                </div>

                {showTimerWidget && (
                  <>
                    <div className="fixed inset-0 z-[45]" onClick={(e) => { e.stopPropagation(); setShowTimerWidget(false); }} />
                    <div onClick={(e) => e.stopPropagation()} className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-50 min-w-[120px]">
                      <div className="flex gap-2">
                        <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold text-gray-800 dark:text-gray-300" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} />
                        <Button size="sm" onClick={handleSetTimer} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); toggleTaskTimer(task.id); }}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all",
                  isMultiUser ? "bg-white text-google-red" : "bg-red-500 text-white"
                )}
              >
                {task.timerIsRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            </div>

            {/* Presence Mobile */}
            {otherActiveUsers.length > 0 && (
              <div className="flex -space-x-2">
                {otherActiveUsers.map((user, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-google-yellow border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-black text-gray-900 shadow-sm">
                    {user.userName.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sidebar Toggle Mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (activeProject && activeInstance) toggleTaskInActionSet(activeProject.id, activeInstance.id, task.id);
              }}
              className={clsx(
                "w-12 h-12 rounded-2xl transition-all border-2 flex items-center justify-center shadow-sm",
                isMultiUser 
                  ? (isInActionSet ? "bg-white text-google-red border-white" : "bg-white/20 text-white border-white/30")
                  : (isInActionSet ? "bg-google-blue text-white border-google-blue" : "bg-white dark:bg-black/20 text-gray-400 border-gray-200 dark:border-gray-800")
              )}
            >
              {isInActionSet ? <ListMinus className="w-6 h-6" /> : <ListPlus className="w-6 h-6" />}
            </button>

            {/* Notes Icon Mobile - Larger as requested */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotes(task);
              }}
              className={clsx(
                'h-12 w-12 p-0 transition-all rounded-2xl border-2 shadow-sm', 
                isMultiUser ? "text-white border-white/30" :
                shouldHighlight 
                  ? 'text-google-blue bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-800 opacity-100' 
                  : 'text-gray-400 dark:text-gray-300 bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
              )}
            >
              <StickyNote className={clsx("w-6 h-6 font-black", shouldHighlight && "animate-pulse-slow")} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

