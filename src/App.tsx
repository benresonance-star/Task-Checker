import React, { useState, useRef, useEffect, useMemo } from 'react';
import JSZip from 'jszip';
import pkg from '../package.json';
import { useTasklistStore } from './store/useTasklistStore';
import { SectionItem } from './components/checklist/SectionItem';
import { Button } from './components/ui/Button';
import { NoteEditor } from './components/editor/NoteEditor';
import { TaskGuidePanel } from './components/editor/TaskGuidePanel';
import { MasterTasklist, Section, Subsection, Complexity, Task } from './types';
import { generateUUID } from './utils/uuid';
import { auth } from './lib/firebase';
import { ProjectDashboard } from './components/project/ProjectDashboard';
import { FocusDashboard } from './components/dashboard/FocusDashboard';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  CheckCircle2, StickyNote, Trash2, ListOrdered, Zap, Music, ListPlus, Play, Pause, X, Paperclip, Menu, LogOut, Mail, Lock, User as UserIcon, Loader2, GripVertical, ThumbsUp, AlertTriangle, Target,
  Plus, LayoutGrid, ClipboardList, Moon, Sun, Download, Upload, UserCircle2, Users, FileText, FileSpreadsheet, File as FileIcon, ChevronUp, ChevronDown, ShieldCheck, Eye, ShieldOff, Eraser, ChevronRight, Palette
} from 'lucide-react';
import { StyleConsole } from './components/ui/StyleConsole';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { 
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { theme } from './styles/theme';
import { 
  useNavigate, 
  useLocation,
  matchPath
} from 'react-router-dom';

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

const SidebarTaskItem = ({ 
  item, 
  task, 
  instance, 
  isActiveFocus, 
  onOpenNotes
}: { 
  item: any, 
  task: Task, 
  instance: any, 
  isActiveFocus: boolean, 
  onOpenNotes: (taskId: string) => void
}) => {
  const { projects, toggleTask, toggleTaskFocus, toggleTaskInActionSet, setTaskTimer, resetTaskTimer, toggleTaskTimer, updateTaskTimer, currentUser, users } = useTasklistStore();
  const navigate = useNavigate();
  const [showTimerWidget, setShowTimerWidget] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('20');

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetTaskTimer(task.id);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.taskId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  } as React.CSSProperties;

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

  const hasNotes = (task.notes && task.notes !== '<p></p>') || (task.userNotes && task.userNotes !== '<p></p>');
  const hasFiles = (task.files && task.files.length > 0) || (task.userFiles && task.userFiles.length > 0);
  const shouldHighlightNotes = hasNotes || hasFiles;

  const otherActiveUsers = Object.entries(instance?.activeUsers || {})
    .filter(([uid, info]: [string, any]) => info.taskId === task.id && uid !== currentUser?.id && Date.now() - info.lastSeen < 45000)
    .map(([_, info]: [string, any]) => info);

  const otherClaimants = users
    .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => i.taskId === task.id))
    .map(u => ({ id: u.id, name: u.name }));

    const isMultiUserActive = (otherActiveUsers.length + (isActiveFocus ? 1 : 0)) >= 2;

    const project = projects.find(p => p.id === item.projectId);
    const isYellowState = isActiveFocus && otherClaimants.length > 0;
    const isDeactivatedCompleted = !isActiveFocus && !isMultiUserActive && task.completed;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskTimer(task.id);
  };

  const handleAdd5Min = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentRemaining = task.timerRemaining || 0;
    updateTaskTimer(task.id, currentRemaining + (5 * 60));
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={clsx(
        theme.components.sidebar.activeTask,
        isMultiUserActive 
          ? theme.components.sidebar.activeTaskMulti
          : isActiveFocus 
            ? (isYellowState 
                ? theme.components.sidebar.activeTaskYellow
                : clsx(
                    theme.components.sidebar.activeTaskFocus,
                    task.completed && "animate-pulse"
                  ))
            : isDeactivatedCompleted
              ? theme.components.sidebar.deactivatedCompleted
              : theme.components.sidebar.inactiveTask
      )}
      onClick={() => {
        if (project && instance) {
          navigate(`/project/${project.id}/instance/${instance.id}?task=${task.id}`, { replace: true });
          toggleTaskFocus(project.id, instance.id, task.id);
        }
      }}
    >
      {/* Top Zone: Identification & Drag Handle */}
      <div className={clsx("flex items-start gap-3 p-4", !isActiveFocus && !isMultiUserActive && "pb-3")}>
        <div 
          {...attributes} 
          {...listeners}
          className={clsx(
            "flex flex-col items-center pt-1 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none",
            (isActiveFocus || isMultiUserActive || (task.completed && !isDeactivatedCompleted)) ? "text-white/40" : (isDeactivatedCompleted ? "text-google-green/40" : "text-gray-400 dark:text-gray-600 opacity-40 group-hover:opacity-100")
          )}
          style={{ touchAction: 'none' }}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {!isActiveFocus && !isMultiUserActive && (
          <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors relative",
            (isActiveFocus || isMultiUserActive || (task.completed && !isDeactivatedCompleted)) ? (isYellowState ? "bg-black/10" : "bg-white/20") : (isDeactivatedCompleted ? "bg-google-green/20" : "bg-gray-100 dark:bg-white/5 text-gray-400")
          )}>
            <button onClick={handlePlayPause} className="w-full h-full flex items-center justify-center transition-transform">
              {(isActiveFocus || isMultiUserActive || task.completed)
                ? (task.timerIsRunning ? <Pause className={clsx("w-4 h-4 fill-current", isYellowState ? "text-gray-900" : (isDeactivatedCompleted ? "text-google-green" : "text-white"))} /> : <Play className={clsx("w-4 h-4 fill-current ml-0.5", isYellowState ? "text-gray-900" : (isDeactivatedCompleted ? "text-google-green" : "text-white"))} />)
                : <Play className="w-3 h-3 fill-current ml-0.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              }
            </button>

            {otherActiveUsers.length > 0 && (
              <div className="absolute -top-1.5 -right-1.5 flex -space-x-1.5">
                {otherActiveUsers.map((user: any, i: number) => (
                  <div 
                    key={i}
                    title={`${user.userName} is looking here`}
                    className="w-4 h-4 rounded-full bg-google-blue border border-white dark:border-gray-900 flex items-center justify-center text-[6px] font-black text-white shadow-sm ring-1 ring-white/20"
                    style={{ zIndex: 5 - i }}
                  >
                    {user.userName.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className={clsx(
            (isActiveFocus || isMultiUserActive) ? "text-base font-bold mb-1" : "text-[13px] font-bold mt-0.5",
            "leading-tight whitespace-pre-wrap break-words", 
            (isMultiUserActive || (isActiveFocus && !isYellowState) || (task.completed && !isDeactivatedCompleted)) ? "text-white" : (isActiveFocus && isYellowState) ? "text-gray-900" : isDeactivatedCompleted ? "text-google-green" : "text-gray-600 dark:text-gray-300"
          )}>
            {task.title}
          </h4>
          <div className="flex flex-col">
            <span className={clsx(
              "text-[9px] font-bold uppercase block opacity-70 whitespace-pre-wrap break-words", 
              (isMultiUserActive || (isActiveFocus && !isYellowState) || (task.completed && !isDeactivatedCompleted)) ? "text-white" : (isActiveFocus && isYellowState) ? "text-gray-900" : isDeactivatedCompleted ? "text-google-green" : "text-gray-500"
            )}>
              {instance?.title}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {otherClaimants.length > 0 && otherClaimants.map(u => (
              <span key={u.id} className={clsx(
                "text-[7px] font-black uppercase px-1 rounded border", 
                isMultiUserActive ? "bg-white/20 border-white/30 text-white animate-pulse" :
                isActiveFocus 
                  ? (isYellowState ? "bg-black/10 border-black/20 text-gray-900 animate-pulse" : "bg-white/10 border-white/20 text-white") 
                  : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400"
              )}>
                [{u.name.substring(0,2).toUpperCase()}] GATHERED
              </span>
            ))}

            {task.guide?.complexity && (
              <span className={clsx(
                "text-[7px] font-black uppercase px-1 rounded-sm border shrink-0",
                (isMultiUserActive || (isActiveFocus && !isYellowState) || (task.completed && !isDeactivatedCompleted)) ? "bg-white/10 border-white/20 text-white" :
                isActiveFocus && isYellowState 
                  ? "bg-black/10 border-black/20 text-gray-900" 
                  : isDeactivatedCompleted 
                    ? "bg-google-green/10 border-google-green/20 text-google-green"
                    : task.guide.complexity === 'Easy' ? "bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800/30"
                    : task.guide.complexity === 'Moderate' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800/30"
                    : "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800/30"
              )}>
                {task.guide.complexity}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {!isActiveFocus && !isMultiUserActive && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskInActionSet(item.projectId, item.instanceId, item.taskId);
              }}
              className="p-1 text-gray-400 hover:text-google-red transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
              title="Remove from Setlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {!isActiveFocus && !isMultiUserActive && task.completed && (
            <CheckCircle2 className="w-4 h-4 text-google-green" />
          )}
        </div>
      </div>

      {/* Middle Zone: Timer Controls (Expanded only for active or multi-user alert) */}
      {(isActiveFocus || isMultiUserActive) && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button - Aligned with left edge of card content */}
            <div className={clsx(
              theme.components.pomodoro.button,
              isYellowState && theme.components.pomodoro.buttonYellow
            )}>
              <button 
                onClick={handlePlayPause} 
                title="Start/Pause Pomodoro Timer"
                className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                {task.timerIsRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>

            {/* Timer Controls Box */}
            <div className={theme.components.pomodoro.container}>
              <div className="relative flex items-center gap-1 min-w-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTimerWidget(!showTimerWidget); }}
                  title="Set Timer"
                  className={clsx(
                    "flex items-center gap-0.5 transition-all hover:bg-black/5 rounded-lg px-0.5 shrink-0",
                    isYellowState ? "text-gray-900" : "text-white"
                  )}
                >
                  <TomatoIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black tabular-nums min-w-[34px] text-center">
                    {formatTime(task.timerRemaining, task.timerDuration)}
                  </span>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button 
                    onClick={handleResetTimer}
                    className={clsx(
                      "px-1 py-0.5 text-[6px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                      isYellowState ? "text-gray-900" : "text-white"
                    )}
                  >
                    Reset
                  </button>
                  <button 
                    onClick={handleAdd5Min}
                    className={clsx(
                      "px-1 py-0.5 text-[6px] font-black uppercase rounded bg-black/10 hover:bg-black/20 transition-colors",
                      isYellowState ? "text-gray-900" : "text-white"
                    )}
                  >
                    +5m
                  </button>
                </div>

                {showTimerWidget && (
                  <>
                    <div className="fixed inset-0 z-[65]" onClick={(e) => { e.stopPropagation(); setShowTimerWidget(false); }} />
                    <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[70] min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300 mb-2">Set Session Duration</div>
                      <div className="flex gap-2">
                        <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold text-gray-800 dark:text-gray-300" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetTimer()} />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={handleSetTimer} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                          <Button size="sm" variant="secondary" onClick={handleResetTimer} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Note Icon - Outside the timer box, same height as play button, aligned with bin icon */}
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenNotes(task.id); }}
              title="Open Task Info"
              className={clsx(
                "w-12 h-10 shrink-0 flex items-center justify-center transition-all hover:scale-110",
                isYellowState ? "text-gray-900" : "text-white"
              )}
            >
              <StickyNote className={clsx("w-6 h-6", shouldHighlightNotes && "animate-pulse-slow")} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Zone: Completion & Management (Expanded only) */}
      {(isActiveFocus || isMultiUserActive) && (
        <div className={clsx(
          "p-4 border-t mt-auto animate-in slide-in-from-bottom-2 duration-200",
          isMultiUserActive ? "border-white/10 bg-white/5" : isYellowState ? "border-black/10 bg-black/5" : "border-white/10 bg-white/5"
        )}>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTask(task.id, item.instanceId);
              }}
              className={clsx(
                theme.components.taskDoneButton.base,
                isMultiUserActive 
                  ? (task.completed ? theme.components.taskDoneButton.multiUserCompleted : theme.components.taskDoneButton.multiUser)
                  : task.completed 
                    ? (isYellowState ? theme.components.taskDoneButton.yellowStateCompleted : theme.components.taskDoneButton.completed) 
                    : (isYellowState 
                        ? theme.components.taskDoneButton.yellowState 
                        : theme.components.taskDoneButton.active
                      )
              )}
            >
              {task.completed && <ThumbsUp className="w-4 h-4" />}
              {task.completed ? "Task Completed" : "TASK DONE!"}
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskInActionSet(item.projectId, item.instanceId, item.taskId);
              }}
              title="Remove from Setlist"
              className={clsx(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:text-google-red",
                isMultiUserActive ? "text-white" : isYellowState ? "text-gray-900" : "text-white"
              )}
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ImportLine {
  id: string;
  text: string;
  type: 'section' | 'subsection' | 'task';
}

const Logo = ({ className = '', showText = true }: { className?: string, showText?: boolean }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative group">
      <svg 
        viewBox="0 0 100 100" 
        className="w-10 h-10 sm:w-11 sm:h-11 drop-shadow-[0_0_8px_rgba(230,126,51,0.4)] dark:drop-shadow-[0_0_12px_rgba(230,126,51,0.6)]"
      >
        <circle cx="50" cy="50" r="45" fill="#E67E33" />
        <path 
          d="M30 50L45 65L70 35" 
          stroke="white" 
          strokeWidth="10" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
        />
      </svg>
    </div>
    {showText && (
      <span className="text-xl sm:text-2xl font-semibold tracking-tight text-[#E67E33] font-sans" style={{ letterSpacing: '-1px' }}>checkMATE</span>
    )}
  </div>
);

const SimulationToggle = ({ isActualAdmin, mode, onToggle }: { isActualAdmin: boolean, mode: 'admin' | 'viewer', onToggle: () => void }) => {
  if (!isActualAdmin) return null;

  const isSimulating = mode === 'viewer';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={clsx(
        "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-black text-[10px] uppercase tracking-widest mb-4",
        isSimulating 
          ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse" 
          : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:border-google-blue hover:text-google-blue"
      )}
    >
      <div className="flex items-center gap-2">
        {isSimulating ? <Eye className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
        <span>{isSimulating ? "Simulation Mode: Viewer" : "Admin Mode: Authorized"}</span>
      </div>
      <div className={clsx(
        "w-8 h-4 rounded-full relative transition-colors duration-300",
        isSimulating ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
      )}>
        <div className={clsx(
          "absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-300",
          isSimulating ? "left-4" : "left-1"
        )} />
      </div>
    </button>
  );
};

function NotificationToast() {
  const { notification } = useTasklistStore();
  if (!notification) return null;

  return (
    <div className={clsx(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300",
      notification.type === 'error' ? "bg-google-red text-white border-2 border-white/20" : "bg-google-green text-white border-2 border-white/20"
    )}>
      {notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
      <span className="font-heading uppercase text-xs tracking-widest">{notification.message}</span>
    </div>
  );
}

function App() {
  const { 
    mode, setMode, 
    masters, activeMaster, addMaster, setActiveMaster, addSection, renameMaster, deleteMaster,
    instances, activeInstance, setActiveInstance,
    projects, activeProject, setActiveProject, addProject, renameProject, deleteProject, addInstanceToProject, removeInstanceFromProject,
    updateProjectDetails, updatePersonalProjectOverride,
    updateTaskNotes, addTaskFile,
    currentUser, users, initializeAuth, loading,
    importMaster, updateUserRole, deleteUser,
    adminClearUserFocus, adminClearUserActionSet,
    activeTaskId, setActiveTaskId, updatePresence,
    moveMaster, setLocalExpanded, clearActionSet,
    setTaskTimer, resetTaskTimer, toggleTaskTimer, updateTaskTimer,
    isDarkMode, toggleDarkMode
  } = useTasklistStore();
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlTaskId = queryParams.get('task');

  const [isTemplatesStacked, setIsTemplatesStacked] = useState(() => {
    return localStorage.getItem('isTemplatesStacked') === 'true';
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const actionSet = currentUser?.actionSet || [];
      const oldIndex = actionSet.findIndex((item) => item.taskId === active.id);
      const newIndex = actionSet.findIndex((item) => item.taskId === over.id);
      
      const newActionSet = arrayMove(actionSet, oldIndex, newIndex);
      const { setActionSet } = useTasklistStore.getState();
      await setActionSet(newActionSet);
    }
  };

  useEffect(() => {
    localStorage.setItem('isTemplatesStacked', isTemplatesStacked.toString());
  }, [isTemplatesStacked]);

  // Manual URL parsing since useParams() requires nested Routes
  const masterMatch = matchPath('/master/:masterId', location.pathname);
  const projectMatch = matchPath('/project/:projectId', location.pathname);
  const instanceMatch = matchPath('/project/:projectId/instance/:instanceId', location.pathname);

  const masterId = masterMatch?.params.masterId;
  const projectId = projectMatch?.params.projectId || instanceMatch?.params.projectId;
  const instanceId = instanceMatch?.params.instanceId;

  const [localMasterTitle, setLocalMasterTitle] = useState('');
  useEffect(() => {
    if (activeMaster?.title) {
      setLocalMasterTitle(activeMaster.title);
    }
  }, [activeMaster?.id, activeMaster?.title]);

  // Auto-resize title textarea
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = 'auto';
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [activeMaster?.title, activeInstance?.title]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showAddChecklistModal, setShowAddChecklistModal] = useState(false);
  const [showPlaylistSidebar, setShowPlaylistSidebar] = useState(() => {
    return localStorage.getItem('playlist_sidebar_open') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('playlist_sidebar_open', showPlaylistSidebar.toString());
  }, [showPlaylistSidebar]);

  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(() => {
    return localStorage.getItem(`checklist_collapsed_${activeInstance?.id}`) === 'true';
  });

  useEffect(() => {
    if (activeInstance) {
      localStorage.setItem(`checklist_collapsed_${activeInstance.id}`, isChecklistCollapsed.toString());
    }
  }, [isChecklistCollapsed, activeInstance?.id]);

  // Derive editingTask from global state to ensure real-time sync in modal
  const editingTask = useMemo(() => {
    if (!editingTaskId) return null;
    const searchTasks = (sections: Section[]) => {
      for (const s of sections) {
        for (const ss of s.subsections) {
          const found = ss.tasks.find(t => t.id === editingTaskId);
          if (found) return found;
        }
      }
      return null;
    };
    return searchTasks((mode === 'master' ? activeMaster : activeInstance)?.sections || []);
  }, [editingTaskId, mode, activeMaster, activeInstance]);

  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false);
  const [showDeleteProjectFinalConfirm, setShowDeleteProjectFinalConfirm] = useState(false);
  const [showDeleteChecklistConfirm, setShowDeleteChecklistConfirm] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<{ projectId: string, instanceId: string } | null>(null);
  const [showClearSessionConfirm, setShowClearSessionConfirm] = useState(false);
  const [adminUserToDeactivate, setAdminUserToDeactivate] = useState<{ id: string, name: string } | null>(null);
  const [adminUserToClearSession, setAdminUserToClearSession] = useState<{ id: string, name: string } | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showModalTimerWidget, setShowModalTimerWidget] = useState(false);
  const [modalCustomMinutes, setModalCustomMinutes] = useState('20');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Partial<MasterTasklist> | null>(null);
  const [importTemplateName, setImportTemplateName] = useState('');
  const [showPlainTextImport, setShowPlainTextImport] = useState(false);
  const [showStyleConsole, setShowStyleConsole] = useState(false);
  const [plainTextContent, setPlainTextContent] = useState('');
  const [importLines, setImportLines] = useState<ImportLine[]>([]);
  const [plainTextPreview, setPlainTextPreview] = useState<MasterTasklist | null>(null);
  const initialFocusSynced = useRef(false);

  const abortPlainTextImport = () => {
    setPlainTextContent('');
    setImportLines([]);
    setPlainTextPreview(null);
    setImportTemplateName('');
    setShowPlainTextImport(false);
  };

  // --- ALL HOOKS MUST BE DECLARED HERE, BEFORE ANY EARLY RETURNS ---

  const isActualAdmin = currentUser?.role === 'admin';
  const { adminSimulationMode, toggleSimulationMode } = useTasklistStore();
  const isAdmin = isActualAdmin && adminSimulationMode === 'admin';

  // 1. Initialize Auth listener
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 1b. Sync Store with URL parameters
  useEffect(() => {
    if (loading || !currentUser) return;

    const path = location.pathname;
    if (path === '/' || path === '') {
      const lastPath = localStorage.getItem('lastActivePath');
      if (lastPath && lastPath !== '/') {
        navigate(lastPath, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // Track last active IDs for smarter navigation
    if (projectId) localStorage.setItem('lastActiveProjectId', projectId);
    if (masterId) localStorage.setItem('lastActiveMasterId', masterId);
    
    // Store the last path to remember if user was on Dashboard
    localStorage.setItem('lastActivePath', path);

    // Mode sync
    if (path.startsWith('/dashboard')) {
      if (mode !== 'project') setMode('project'); // Keep project mode state for sidebar logic
    } else if (path.startsWith('/master')) {
      if (mode !== 'master') setMode('master');
    } else if (path.startsWith('/project')) {
      if (mode !== 'project') setMode('project');
    }

    // Master sync
    if (masterId) {
      const master = masters.find(m => m.id === masterId);
      if (master && activeMaster?.id !== masterId) {
        setActiveMaster(master);
      }
    } else if (path === '/master') {
      setActiveMaster(null);
    }

    // Project sync
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project && activeProject?.id !== projectId) {
        setActiveProject(project);
      }
    } else if (path === '/project') {
      setActiveProject(null);
    }

    // Instance sync
    if (instanceId) {
      const instance = instances.find(i => i.id === instanceId);
      if (instance && activeInstance?.id !== instanceId) {
        setActiveInstance(instance);
      }
    } else if (!instanceId && path.includes('/project/') && activeInstance) {
      setActiveInstance(null);
    }

    // Task sync
    if (urlTaskId) {
      if (activeTaskId !== urlTaskId) {
        setActiveTaskId(urlTaskId);
      }
    } else if (activeTaskId) {
      setActiveTaskId(null);
    }
  }, [masterId, projectId, instanceId, urlTaskId, masters, projects, instances, loading, currentUser, mode, activeMaster, activeProject, activeInstance, activeTaskId, location.pathname]);

  // 1c. Sync persistent focus from user profile
  useEffect(() => {
    if (loading || mode !== 'project' || !currentUser) return;

    if (!currentUser.activeFocus) {
      // If focus is null, clear the task from URL if present
      // This ensures that when the user toggles OFF a task, the URL selection also clears
      const queryParams = new URLSearchParams(location.search);
      if (queryParams.has('task')) {
        queryParams.delete('task');
        navigate({ search: queryParams.toString() }, { replace: true });
      }
      return;
    }

    const { projectId: focusProjectId, instanceId: focusInstanceId, taskId: focusTaskId } = currentUser.activeFocus;
    
    // 1. Initial Sync: Auto-navigate to the focused task on app load
    // CRITICAL: We only auto-navigate if the user is NOT already on a specific page (like the Dashboard)
    if (!initialFocusSynced.current) {
      initialFocusSynced.current = true;
      const currentPath = location.pathname;
      
      // If we are on the dashboard or master mode, don't force away
      if (currentPath === '/dashboard' || currentPath.startsWith('/master')) {
        return;
      }

      if (projectId !== focusProjectId || instanceId !== focusInstanceId) {
        navigate(`/project/${focusProjectId}/instance/${focusInstanceId}?task=${focusTaskId}`, { replace: true });
        return;
      }
    }

    // 2. Continuous Sync: If we are in the focused instance, ensure it's expanded and URL is synced
    if (activeInstance?.id === focusInstanceId) {
      activeInstance.sections.forEach(s => {
        s.subsections.forEach(ss => {
          const hasTask = ss.tasks.some(t => t.id === focusTaskId);
          if (hasTask) {
            setLocalExpanded(s.id, true);
            setLocalExpanded(ss.id, true);
          }
        });
      });

      setLocalExpanded(focusInstanceId, true);
      
      const queryParams = new URLSearchParams(location.search);
      if (queryParams.get('task') !== focusTaskId) {
        queryParams.set('task', focusTaskId);
        navigate({ search: queryParams.toString() }, { replace: true });
      }
    }
  }, [currentUser?.activeFocus, activeInstance?.id, loading, mode, navigate, location.search, instanceId, projectId, setLocalExpanded]);

  // 2. Presence Heartbeat
  useEffect(() => {
    if (!currentUser || !activeInstance || mode !== 'project' || !activeTaskId) return;

    const interval = setInterval(() => {
      updatePresence(activeTaskId);
    }, 10000); // Faster heartbeat (10s) for better responsiveness

    return () => clearInterval(interval);
  }, [currentUser, activeInstance, mode, activeTaskId, updatePresence]);

  // 4. Consolidated Pomodoro Timer Tick (Single Source of Truth)
  useEffect(() => {
    let tickCount = 0;
    const interval = setInterval(() => {
      const { instances, tickTimers, updateTaskTimer, currentUser } = useTasklistStore.getState();
      if (instances.length === 0 || !currentUser) return;

      tickCount++;

      // Identify ALL tasks across ALL instances that are currently running locally
      const runningTaskIds = new Set<string>();
      instances.forEach(inst => {
        inst.sections.forEach(s => {
          s.subsections.forEach(ss => {
            ss.tasks.forEach(t => {
              if (t.timerIsRunning) {
                runningTaskIds.add(t.id);
                
                // Periodic Sync to Firestore (every 10 seconds)
                // This prevents state loss on refresh and keeps other users updated
                if (tickCount % 10 === 0) {
                  const remaining = t.timerRemaining ?? t.timerDuration ?? (20 * 60);
                  updateTaskTimer(t.id, remaining);
                }
              }
            });
          });
        });
      });

      if (runningTaskIds.size > 0) {
        tickTimers(runningTaskIds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // --- EARLY RENDERS ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Logo showText={false} className="animate-pulse scale-150" />
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to CheckMate Cloud...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  // --- EVENT HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isUserFile: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !editingTask) return;
    try {
      await addTaskFile(editingTask.id, file, isUserFile);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    }
    e.target.value = '';
  };

  const handleFileDownload = (file: any) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddSection = () => {
    if (activeMaster) {
      addSection(activeMaster.id, 'New Section');
    }
  };

  const exportJSON = () => {
    const currentList = mode === 'master' ? activeMaster : activeInstance;
    if (!currentList) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentList, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${currentList.title}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportZip = async () => {
    const currentList = mode === 'master' ? activeMaster : activeInstance;
    if (!currentList) return;
    const zip = new JSZip();
    zip.file("data.json", JSON.stringify(currentList, null, 2));
    zip.file("info.txt", `Exported from TaskFlow\nTitle: ${currentList.title}\nDate: ${new Date().toLocaleString()}`);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentList.title}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCSV = () => {
    const currentList = mode === 'master' ? activeMaster : activeInstance;
    if (!currentList) return;
    let csvContent = "Section,Subsection,Task,Completed,Time Taken,Notes\n";
    currentList.sections.forEach(s => s.subsections.forEach(ss => ss.tasks.forEach(t => {
      csvContent += `"${s.title}","${ss.title}","${t.title}","${t.completed}","${t.timeTaken || ''}","${(t.notes || '').replace(/"/g, '""')}"\n`;
    })));
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentList.title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          setImportPreview(data);
          setImportTemplateName(data.title || 'Imported');
        } catch (err) { alert('Error parsing JSON'); }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
      try {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        const dataJson = await content.file("data.json")?.async("string");
        if (dataJson) {
          const data = JSON.parse(dataJson);
          setImportPreview(data);
          setImportTemplateName(data.title || 'Imported from ZIP');
        } else {
          alert('No data.json found in ZIP package');
        }
      } catch (err) {
        alert('Error parsing ZIP package');
      }
    } else if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const rows = text.split('\n').filter(l => l.trim()).map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              if (line[i] === '"') {
                if (inQuotes && line[i+1] === '"') { current += '"'; i++; } // Handle escaped quotes
                else inQuotes = !inQuotes;
              } else if (line[i] === ',' && !inQuotes) {
                result.push(current);
                current = '';
              } else current += line[i];
            }
            result.push(current);
            return result;
          });

          // Skip header
          const dataRows = rows.slice(1);
          const sections: Section[] = [];
          
          dataRows.forEach(row => {
            const [secTitle, subTitle, taskTitle, completed, , notes] = row;
            if (!secTitle || !subTitle || !taskTitle) return;

            let section = sections.find(s => s.title === secTitle);
            if (!section) {
              section = { id: generateUUID(), title: secTitle, subsections: [], isExpanded: true };
              sections.push(section);
            }
            let subsection = section.subsections.find(ss => ss.title === subTitle);
            if (!subsection) {
              subsection = { id: generateUUID(), title: subTitle, tasks: [], isExpanded: true };
              section.subsections.push(subsection);
            }
            subsection.tasks.push({
              id: generateUUID(),
              title: taskTitle,
              completed: completed?.toLowerCase() === 'true',
              notes: notes || '',
              lastUpdated: Date.now()
            });
          });

          const preview: Partial<MasterTasklist> = {
            title: file.name.replace('.csv', ''),
            sections,
            version: 1
          };
          setImportPreview(preview);
          setImportTemplateName(preview.title || 'Imported from CSV');
        } catch (err) { alert('Error parsing CSV'); }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const processTextToLines = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const newLines: ImportLine[] = lines.map(line => {
      let trimmed = line.trim();
      
      // Notion specific parsing: remove "-", "[", "]" and leading spaces/bullets
      // This cleans up copy-pasted lists and checkboxes from Notion
      trimmed = trimmed.replace(/^[-\[\]\s*xX]+/, ''); 
      
      let type: 'section' | 'subsection' | 'task' = 'task';
      if (line.trim().startsWith('# ')) type = 'section';
      else if (line.trim().startsWith('## ')) type = 'subsection';
      
      return { id: generateUUID(), text: trimmed.replace(/^#+\s+/, ''), type };
    });
    setImportLines(newLines);
  };

  const handlePlainTextPreview = () => {
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let currentSubsection: Subsection | null = null;
    importLines.forEach(line => {
      if (line.type === 'section') {
        currentSection = { id: generateUUID(), title: line.text, subsections: [], isExpanded: true };
        sections.push(currentSection);
        currentSubsection = null;
      } else if (line.type === 'subsection') {
        if (!currentSection) {
          currentSection = { id: generateUUID(), title: 'General', subsections: [], isExpanded: true };
          sections.push(currentSection);
        }
        currentSubsection = { id: generateUUID(), title: line.text, tasks: [], isExpanded: true };
        currentSection.subsections.push(currentSubsection);
      } else {
        if (!currentSubsection) {
          if (!currentSection) {
            currentSection = { id: generateUUID(), title: 'General', subsections: [], isExpanded: true };
            sections.push(currentSection);
          }
          currentSubsection = { id: generateUUID(), title: 'General', tasks: [], isExpanded: true };
          currentSection.subsections.push(currentSubsection);
        }
        currentSubsection.tasks.push({ id: generateUUID(), title: line.text, completed: false, notes: '', lastUpdated: Date.now() });
      }
    });
    setPlainTextPreview({ id: generateUUID(), title: importTemplateName || 'New Template', sections, version: 1, createdAt: Date.now(), updatedAt: Date.now() });
  };

  const formatTime = (seconds: number | undefined | null, duration?: number) => {
    const val = seconds ?? duration ?? (20 * 60);
    const hrs = Math.floor(val / 3600);
    const mins = Math.floor((val % 3600) / 60);
    const secs = val % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={theme.components.layout.screen}>
      {/* Mobile Header */}
      <header className={theme.components.layout.header}>
        <Logo className="scale-75 origin-left" />
        
        <div className="flex items-center gap-2">
          {/* Mobile Simulation Mode Indicator */}
          {adminSimulationMode === 'viewer' && isActualAdmin && (
            <div className="flex items-center px-1.5 py-0.5 bg-amber-500/10 border border-amber-500 rounded-md animate-pulse text-amber-600 flex-shrink-0">
              <span className="text-[8px] font-black uppercase tracking-tighter">Viewer</span>
            </div>
          )}

          {/* Mobile Playlist Button in Header */}
          {mode === 'project' && (
            <button 
              onClick={() => setShowPlaylistSidebar(!showPlaylistSidebar)}
              className={clsx(
                "h-9 px-3 flex items-center gap-2 border-2 transition-all duration-500 font-bold rounded-button shadow-sm text-[10px] uppercase tracking-wider",
                showPlaylistSidebar 
                  ? "opacity-0 pointer-events-none -translate-y-4" 
                  : (currentUser?.actionSet?.length || 0) > 0
                    ? "bg-google-blue/10 text-google-blue border-google-blue/30 hover:bg-google-blue hover:text-white"
                    : "bg-white dark:bg-black/40 text-gray-400 border-gray-300 dark:border-gray-700 hover:border-google-blue hover:text-google-blue"
              )}
            >
              <Music className={clsx("w-3.5 h-3.5", (currentUser?.actionSet?.length || 0) > 0 && "animate-pulse")} />
              <span>My Session</span>
              {(currentUser?.actionSet?.length || 0) > 0 && (
                <span className="flex items-center justify-center bg-white dark:bg-google-blue text-google-blue dark:text-gray-300 w-4 h-4 rounded-full text-[8px] font-black shadow-sm">
                  {currentUser?.actionSet?.length}
                </span>
              )}
            </button>
          )}

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <div className={theme.components.layout.mobileMenu}>
              <nav className="p-4 flex flex-col gap-2">
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg font-bold text-sm transition-colors",
                    location.pathname === '/dashboard' ? "bg-google-blue text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <LayoutGrid className="w-5 h-5" />
                  <span>My Dashboard</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

                {/* Mobile Profile Card */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-black/40 rounded-card border border-gray-200 dark:border-gray-700 mb-2">
                  <div className="w-10 h-10 rounded-full bg-google-blue/10 flex items-center justify-center text-google-blue"><UserCircle2 className="w-7 h-7" /></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{currentUser?.name}</span>
                    <div className="flex">
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md ${isAdmin ? "bg-google-blue text-white shadow-sm" : "bg-google-green text-white shadow-sm"}`}>
                        {currentUser?.role === 'admin' ? (adminSimulationMode === 'admin' ? 'Administrator' : 'Viewer (Simulated)') : 'Project Team'}
                      </span>
                    </div>
                  </div>
                </div>

                {isActualAdmin && (
                  <SimulationToggle 
                    isActualAdmin={isActualAdmin} 
                    mode={adminSimulationMode} 
                    onToggle={toggleSimulationMode} 
                  />
                )}

                <div className="h-px bg-gray-200 dark:bg-gray-700 mb-2" />

                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-button transition-colors ${location.pathname === '/dashboard' ? "bg-blue-50 text-google-blue dark:bg-blue-900/20" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <div className="flex items-center gap-3"><LayoutGrid className="w-5 h-5" /><span className="font-bold">My Dashboard</span></div>
                  {location.pathname === '/dashboard' && <div className="w-1.5 h-1.5 rounded-full bg-google-blue" />}
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

            <button 
              onClick={() => { 
                const lastId = localStorage.getItem('lastActiveProjectId');
                navigate(lastId ? `/project/${lastId}` : '/project'); 
                setIsMobileMenuOpen(false); 
              }} 
              className={`flex items-center justify-between px-4 py-3 rounded-button transition-colors ${mode === 'project' && location.pathname !== '/dashboard' ? "bg-blue-50 text-google-blue dark:bg-blue-900/20" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            >
              <div className="flex items-center gap-3"><Target className="w-5 h-5" /><span className="font-bold">Projects</span></div>
              {mode === 'project' && location.pathname !== '/dashboard' && <div className="w-1.5 h-1.5 rounded-full bg-google-blue" />}
            </button>
            {isAdmin && (
              <button 
                onClick={() => { 
                  const lastId = localStorage.getItem('lastActiveMasterId');
                  navigate(lastId ? `/master/${lastId}` : '/master'); 
                  setIsMobileMenuOpen(false); 
                }} 
                className={`flex items-center justify-between px-4 py-3 rounded-button transition-colors ${mode === 'master' ? "bg-blue-50 text-google-blue dark:bg-blue-900/20" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5" /><span className="font-bold">Checklist Templates</span></div>
                {mode === 'master' && <div className="w-1.5 h-1.5 rounded-full bg-google-blue" />}
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { setShowUserManagement(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <Users className="w-5 h-5" /><span className="font-bold">User Management</span>
              </button>
            )}
            {isAdmin && (
              <button onClick={() => { setShowStyleConsole(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-google-blue">
                <Palette className="w-5 h-5" /><span className="font-bold">Branding Console</span>
              </button>
            )}
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
            
            {isAdmin && (
              <>
                <button 
                  onClick={() => { setShowImportModal(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Upload className="w-5 h-5 text-google-blue" />
                  <span className="font-bold">Import Package</span>
                </button>
                <button 
                  onClick={() => { setShowPlainTextImport(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ClipboardList className="w-5 h-5 text-google-green" />
                  <span className="font-bold">Import Plain Text</span>
                </button>
              </>
            )}

            <button onClick={() => { toggleDarkMode(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}<span className="font-bold">Mode</span>
            </button>
            <button onClick={() => { signOut(auth); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-button hover:bg-red-50 text-google-red transition-colors">
              <LogOut className="w-5 h-5" /><span className="font-bold">Sign Out</span>
            </button>
          </nav>
        </div>
      )}

          {/* Sidebar (Desktop) */}
          <aside className={theme.components.layout.desktopSidebar}>
            <div className="flex flex-col gap-4 mb-4">
              <Logo className="mb-2" />

              {/* Desktop Profile Card */}
              <div className={theme.components.profile.card}>
                <div className={theme.components.profile.avatar}><UserCircle2 className="w-6 h-6" /></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{currentUser?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={clsx("text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md", isAdmin ? "bg-google-blue text-white shadow-sm" : "bg-google-green text-white shadow-sm")}>
                      {currentUser?.role === 'admin' ? (adminSimulationMode === 'admin' ? 'Administrator' : 'Viewer (Simulated)') : 'Project Team'}
                    </span>
                    <button 
                      onClick={() => signOut(auth)}
                      className="text-[8px] font-black uppercase text-google-red hover:underline"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

              {isActualAdmin && (
                <SimulationToggle 
                  isActualAdmin={isActualAdmin} 
                  mode={adminSimulationMode} 
                  onToggle={toggleSimulationMode} 
                />
              )}
            </div>

            <nav className="flex flex-col gap-1">
              <button 
                onClick={() => navigate('/dashboard')} 
                className={clsx(
                  theme.components.nav.item,
                  location.pathname === '/dashboard' ? theme.components.nav.itemActive : theme.components.nav.itemInactive
                )}
              >
                <LayoutGrid className="w-5 h-5" /><span className="font-medium">My Dashboard</span>
              </button>

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2 mx-3" />

              <button 
                onClick={() => {
                  const lastId = localStorage.getItem('lastActiveProjectId');
                  navigate(lastId ? `/project/${lastId}` : '/project');
                }} 
                className={clsx(
                  theme.components.nav.item,
                  mode === 'project' && location.pathname !== '/dashboard' ? theme.components.nav.itemActive : theme.components.nav.itemInactive
                )}
              >
                <Target className="w-5 h-5" /><span className="font-medium">Projects</span>
              </button>
              {isAdmin && (
                <button 
                  onClick={() => {
                    const lastId = localStorage.getItem('lastActiveMasterId');
                    navigate(lastId ? `/master/${lastId}` : '/master');
                  }} 
                  className={clsx(
                    theme.components.nav.item,
                    mode === 'master' ? theme.components.nav.itemActive : theme.components.nav.itemInactive
                  )}
                >
                  <CheckCircle2 className="w-5 h-5" /><span className="font-medium">Checklist Templates</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setShowUserManagement(true)} className={clsx(theme.components.nav.item, theme.components.nav.itemInactive)}>
                  <Users className="w-5 h-5" /><span className="font-medium">User Management</span>
                </button>
              )}
            </nav>

            <div className="flex flex-col gap-1">
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              {isAdmin && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="justify-start h-9 px-3 w-full" 
                    onClick={() => setShowImportModal(true)}
                  >
                    <Upload className="w-4 h-4 text-google-blue" />
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">Import Package</span>
                  </Button>
                  <button 
                    onClick={() => setShowPlainTextImport(true)}
                    className="flex items-center gap-2 px-3 h-9 rounded-google hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group text-left w-full"
                  >
                    <ClipboardList className="w-4 h-4 text-google-green" />
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">Import Plain Text</span>
                  </button>
                  <button 
                    onClick={() => setShowStyleConsole(true)}
                    className="flex items-center gap-2 px-3 h-9 rounded-google hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group text-left w-full text-google-blue"
                  >
                    <Palette className="w-4 h-4" />
                    <span className="text-xs font-bold">Branding Console</span>
                  </button>
                </>
              )}
              <Button variant="ghost" size="sm" className="justify-start h-9 px-3" onClick={() => toggleDarkMode()}>
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}<span className="text-xs">Toggle Mode</span>
              </Button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            </div>
            <div className="mt-auto pt-4 border-t border-gray-300 dark:border-gray-700 flex flex-col gap-1">
              <div className="px-3 py-2">
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">v{pkg.version}</p>
              </div>
            </div>
      </aside>

      {/* Main Content */}
      <main className={theme.components.layout.mainContent}>
        {location.pathname !== '/dashboard' && (
          <header className={theme.components.layout.contentHeader}>
            <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
              <div className="flex items-center gap-3">
                {mode === 'master' ? (
                  <CheckCircle2 className="w-8 h-8 text-google-blue" />
                ) : (
                  <LayoutGrid className="w-8 h-8 text-google-blue" />
                )}
                <div>
                  <h2 className="text-2xl font-black">{mode === 'master' ? 'Checklist Templates' : 'Projects'}</h2>
                  {mode === 'master' && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Manage checklist templates</p>
                  )}
                </div>
              </div>

              {/* Mobile-only New Project Button */}
              {isAdmin && (
                <div className="md:hidden">
                  <Button 
                    size="sm"
                    onClick={() => mode === 'master' ? addMaster('New Template') : addProject('New Project')}
                    className="h-9 px-3 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> 
                    <span className="text-xs">New</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {mode === 'master' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsTemplatesStacked(!isTemplatesStacked)}
                      className="h-10 px-3 border border-gray-300 dark:border-gray-700"
                      title={isTemplatesStacked ? "Switch to Side-by-Side" : "Switch to Stacked View"}
                    >
                      {isTemplatesStacked ? <LayoutGrid className="w-5 h-5" /> : <ListOrdered className="w-5 h-5" />}
                    </Button>
              )}
              {/* Desktop-only New Project Button */}
              {isAdmin && (
                <div className="hidden md:block">
                  <Button onClick={() => mode === 'master' ? addMaster('New Template') : addProject('New Project')}>
                    <Plus className="w-5 h-5" /> New {mode === 'master' ? 'Template' : 'Project'}
                  </Button>
                </div>
              )}
              {/* Desktop-only My Playlist Button */}
              {mode === 'project' && (
                <div className="hidden md:block relative group/playlist">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowPlaylistSidebar(!showPlaylistSidebar)}
                    className={clsx(
                      "h-10 px-4 flex items-center gap-2 border-2 transition-all duration-500 font-bold rounded-button shadow-sm",
                      showPlaylistSidebar 
                        ? "opacity-0 pointer-events-none translate-x-4" 
                        : (currentUser?.actionSet?.length || 0) > 0
                          ? "bg-google-blue/10 text-google-blue border-google-blue/30 hover:bg-google-blue hover:text-white"
                          : "bg-white dark:bg-black/40 text-gray-400 border-gray-300 dark:border-gray-700 hover:border-google-blue hover:text-google-blue"
                    )}
                  >
                    <Music className={clsx("w-4 h-4", (currentUser?.actionSet?.length || 0) > 0 && "animate-pulse")} />
                    <span>My Session</span>
                    {(currentUser?.actionSet?.length || 0) > 0 && (
                      <span className="flex items-center justify-center bg-white dark:bg-google-blue text-google-blue dark:text-gray-300 w-5 h-5 rounded-full text-[10px] font-black ml-1 shadow-sm">
                        {currentUser?.actionSet?.length}
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </header>
        )}

        {location.pathname === '/dashboard' ? (
          <FocusDashboard />
        ) : (
          <>
            {/* Selection Area */}
            <div className={clsx("flex mb-8", isTemplatesStacked && mode === 'master' ? "flex-col gap-3" : "flex-wrap gap-2")}>
              {mode === 'master' ? (
                masters.map((m, idx) => (
                  <div key={m.id} className={clsx("flex items-center gap-2", isTemplatesStacked ? "w-full max-w-2xl" : "contents")}>
                    <button 
                      onClick={() => navigate(`/master/${m.id}`)} 
                      className={clsx(
                        theme.components.nav.pill,
                        isTemplatesStacked ? "flex-1 rounded-2xl py-4 px-6" : "rounded-full",
                        activeMaster?.id === m.id ? theme.components.nav.pillActiveBlue : theme.components.nav.pillInactive
                      )}
                    >
                      {m.title}
                    </button>
                    {isTemplatesStacked && (
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveMaster(m.id, 'up'); }}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-google-blue disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); moveMaster(m.id, 'down'); }}
                          disabled={idx === masters.length - 1}
                          className="p-1 text-gray-400 hover:text-google-blue disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                        >
                          <ChevronDown className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                projects.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => navigate(`/project/${p.id}`)} 
                    className={clsx(
                      theme.components.nav.pill,
                      activeProject?.id === p.id ? theme.components.nav.pillActiveGreen : theme.components.nav.pillInactive
                    )}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>

            {/* Dynamic View based on selection */}
            {mode === 'project' && activeProject && (
          <div className="w-full px-0 sm:px-2 md:px-4 flex flex-col gap-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <input 
                  className={clsx(
                    "text-3xl sm:text-4xl font-black bg-transparent border-none focus:ring-0 w-full rounded-xl transition-all px-2 py-1 -ml-2 text-google-blue", 
                    isAdmin ? "hover:bg-gray-100 dark:hover:bg-gray-800" : "cursor-default"
                  )} 
                  value={activeProject.name} 
                  onChange={(e) => renameProject(activeProject.id, e.target.value)} 
                  readOnly={!isAdmin} 
                  placeholder="Project Name..." 
                />
              </div>
              
              {isAdmin && (
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDeleteProjectConfirm(true)} 
                    className="font-black text-red-600 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/50 hover:bg-red-100 hover:text-red-700 px-4 h-9 transition-all flex items-center gap-2 rounded-xl shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Project
                  </Button>
                </div>
              )}
            </div>

            <ProjectDashboard 
              project={activeProject}
              currentUser={currentUser}
              isAdmin={isAdmin}
              isEditing={isEditingProjectInfo}
              setIsEditing={setIsEditingProjectInfo}
              onUpdate={updateProjectDetails}
              onUpdateOverride={updatePersonalProjectOverride}
              projects={projects}
            />

            {/* Active Checklist Section */}
            {activeInstance && (
              <div className={theme.components.dashboard.checklistContainer}>
                <div 
                  className="flex items-center justify-between p-3 sm:pl-6 sm:pr-10 cursor-pointer hover:bg-blue-200/30 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setIsChecklistCollapsed(!isChecklistCollapsed)}
                >
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-google-blue dark:text-gray-300" />
                      <h3 className="text-lg sm:text-xl font-black text-gray-600 dark:text-gray-300 break-words">
                        {activeInstance.title}
                      </h3>
                      <div className="ml-2 p-1 rounded-full bg-blue-200/50 dark:bg-white/20">
                        {isChecklistCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-google-blue dark:text-gray-300" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-google-blue dark:text-gray-300" />
                        )}
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                      <div className="relative group/tooltip">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); setShowExportModal(true); }}
                          className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-google-blue bg-blue-200/50 dark:bg-white/20 hover:bg-blue-200/70 dark:hover:bg-white/30 border border-blue-300 dark:border-white/30 shadow-sm transition-all"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700/50 transform translate-y-1 group-hover/tooltip:translate-y-0">
                          Export Checklist Data
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {!isChecklistCollapsed && (
                  <div className="p-3 sm:p-4 pt-0 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-6">
                      {activeInstance.sections.map(s => (
                        <div key={s.id} className="px-0 sm:px-1 md:px-2">
                          <SectionItem section={s} onOpenNotes={(t) => setEditingTaskId(t.id)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Persistent Checklist Shelf */}
            <div className={theme.components.dashboard.checklistContainer.replace('p-4 md:p-12', 'p-6')}>
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-google-blue" />
                  <h4 className="text-sm font-black uppercase text-gray-600 dark:text-gray-300 tracking-widest">Project Checklists</h4>
                </div>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddChecklistModal(true)}
                    className="text-google-blue hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Checklist
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProject.instanceIds.map((id: string) => {
                  const instance = instances.find(i => i.id === id);
                  if (!instance) return null;
                  const isActive = activeInstance?.id === id;
                  return (
                    <div 
                      key={id} 
                      onClick={() => navigate(`/project/${activeProject.id}/instance/${instance.id}`)} 
                      className={clsx(
                        "p-5 rounded-container border transition-all cursor-pointer group flex items-center justify-between shadow-sm",
                        isActive 
                          ? "bg-google-blue-muted border-google-blue-muted dark:border-gray-400 text-white shadow-md ring-2 ring-google-blue-muted/20" 
                          : "bg-white/80 dark:bg-black/40 border-blue-200 dark:border-gray-800 hover:border-google-blue"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-black text-base break-words">{instance.title}</h4>
                        <p className={clsx("text-[10px] font-black uppercase tracking-wider", isActive ? "text-white/80" : "text-gray-500")}>v{instance.version}</p>
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={clsx(
                            "opacity-0 group-hover:opacity-100 transition-opacity",
                            isActive ? "text-white hover:bg-white/10" : "text-gray-400 hover:text-google-red"
                          )} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setChecklistToDelete({ projectId: activeProject.id, instanceId: id });
                            setShowDeleteChecklistConfirm(true); 
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                {activeProject.instanceIds.length === 0 && (
                  <div className="col-span-full py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-container text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    No checklists added to this project yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Master Template View */}
        {mode === 'master' && activeMaster && (
          <div className="space-y-4 px-0 sm:px-4 md:px-12">
            <div className={theme.components.dashboard.checklistContainer.replace('p-4 md:p-12', 'p-4 sm:pl-6 sm:pr-7 mb-8')}>
              <div className="flex items-center justify-between gap-2 sm:pl-2.5 sm:pr-6">
                <textarea
                  ref={titleTextareaRef}
                  rows={1}
                  className="text-2xl sm:text-3xl font-black bg-transparent border-none focus:ring-0 flex-1 min-w-0 py-2 sm:py-3 leading-relaxed overflow-visible resize-none"
                  value={localMasterTitle}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setLocalMasterTitle(newVal);
                    renameMaster(activeMaster.id, newVal);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onFocus={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  placeholder="Template Title..."
                />
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="relative group/tooltip">
                    <Button variant="ghost" size="sm" onClick={() => setShowExportModal(true)} className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-google-blue bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700/50 transform translate-y-1 group-hover/tooltip:translate-y-0">
                      Export Template
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                    </div>
                  </div>

                  <div className="relative group/tooltip">
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Delete template?')) deleteMaster(activeMaster.id); }} className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 text-google-red bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-google-red text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl transform translate-y-1 group-hover/tooltip:translate-y-0">
                      Delete Template
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-google-red" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {activeMaster.sections.map(s => (
                  <div key={s.id} className="px-0 sm:px-1 md:px-2">
                    <SectionItem section={s} onOpenNotes={(t) => setEditingTaskId(t.id)} />
                  </div>
                ))}
                <div className="px-0 sm:px-1 md:px-2">
                  <Button onClick={handleAddSection} className="w-full py-10 border-dashed border-2 bg-white/50 dark:bg-black/20 text-gray-500 border-gray-300 dark:border-gray-700 hover:border-google-blue hover:text-google-blue hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all rounded-container font-black">
                    <Plus className="w-6 h-6" /> Add Section
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )}
  </main>

      {/* Playlist Sidebar (The "Now Playing" Tray) */}
      {mode === 'project' && (
        <div className={clsx(
          theme.components.sidebar.shell,
          showPlaylistSidebar ? "w-80 border-l opacity-100 translate-x-0" : "w-0 border-l-0 opacity-0 translate-x-full pointer-events-none"
        )}>
        <div className="w-80 flex flex-col h-full flex-shrink-0">
          <div 
            className={theme.components.sidebar.header}
            onClick={() => setShowPlaylistSidebar(false)}
            title="Collapse Sidebar"
          >
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-white" />
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">My Session</h3>
                <ChevronRight className="w-4 h-4 text-white/50 group-hover/sidebar-header:text-white transition-all group-hover/sidebar-header:translate-x-0.5" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClearSessionConfirm(true);
                }}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title="Clear Session"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {(!currentUser?.actionSet || currentUser.actionSet.length === 0) ? (
                  <div className={theme.components.sidebar.emptyState}>
                    <div className={theme.components.sidebar.emptyIcon}>
                      <ListPlus className="w-8 h-8" />
                    </div>
                    <p className={theme.components.sidebar.emptyText}>
                      Your Setlist is empty.<br/>Browse checklists and add tasks to your session.
                    </p>
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                  >
                    <SortableContext 
                      items={currentUser.actionSet.map(i => i.taskId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {currentUser.actionSet.map((item) => {
                          const instance = instances.find(i => i.id === item.instanceId);
                          const task = instance?.sections.flatMap(s => s.subsections.flatMap(ss => ss.tasks)).find(t => t.id === item.taskId);
                          const isActiveFocus = currentUser.activeFocus?.taskId === item.taskId;

                          if (!task || !instance) return null;

                          return (
                            <SidebarTaskItem 
                              key={item.taskId}
                              item={item}
                              task={task}
                              instance={instance}
                              isActiveFocus={isActiveFocus}
                              onOpenNotes={(taskId) => setEditingTaskId(taskId)}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

          </div>
        </div>
      )}

      {/* Modals */}
      {showClearSessionConfirm && (
        <div className={theme.components.modal.overlay}>
          <div className={clsx(theme.components.modal.container, theme.components.modal.containerBlue)}>
            <div className={clsx(theme.components.modal.iconContainer, theme.components.modal.iconContainerBlue)}>
              <Music className="w-10 h-10 text-google-blue" />
            </div>
            <h3 className={theme.components.modal.title}>Clear Session?</h3>
            <div className={clsx(theme.components.modal.infoBox, theme.components.modal.infoBoxBlue)}>
              <p className={theme.components.modal.message}>
                Are you sure you want to clear your entire session list? This will remove all tasks from your sidebar.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className={clsx(theme.components.modal.buttonPrimary, "bg-google-blue border-google-blue")}
                onClick={() => {
                  clearActionSet();
                  setShowClearSessionConfirm(false);
                }}
              >
                YES, CLEAR LIST
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                className={theme.components.modal.buttonSecondary}
                onClick={() => setShowClearSessionConfirm(false)}
              >
                NO, KEEP IT
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Deactivate Current Task Modal */}
      {adminUserToDeactivate && (
        <div className={clsx(theme.components.modal.overlay, "z-[110]")}>
          <div className={clsx(theme.components.modal.container, theme.components.modal.containerBlue)}>
            <div className={clsx(theme.components.modal.iconContainer, theme.components.modal.iconContainerBlue)}>
              <ShieldOff className="w-10 h-10 text-google-blue" />
            </div>
            <h3 className={theme.components.modal.title}>Deactivate Task?</h3>
            <div className={clsx(theme.components.modal.infoBox, theme.components.modal.infoBoxBlue)}>
              <p className={theme.components.modal.message}>
                Are you sure you want to deactivate the current active task for {adminUserToDeactivate.name}?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className={clsx(theme.components.modal.buttonPrimary, "bg-google-blue border-google-blue")}
                onClick={() => {
                  adminClearUserFocus(adminUserToDeactivate.id);
                  setAdminUserToDeactivate(null);
                }}
              >
                YES, DEACTIVATE
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                className={theme.components.modal.buttonSecondary}
                onClick={() => setAdminUserToDeactivate(null)}
              >
                NO, KEEP IT
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Clear Users Session List Modal */}
      {adminUserToClearSession && (
        <div className={clsx(theme.components.modal.overlay, "z-[110]")}>
          <div className={clsx(theme.components.modal.container, theme.components.modal.containerRed)}>
            <div className={clsx(theme.components.modal.iconContainer, theme.components.modal.iconContainerRed)}>
              <Eraser className="w-10 h-10 text-google-red" />
            </div>
            <h3 className={theme.components.modal.title}>Clear Session?</h3>
            <div className={clsx(theme.components.modal.infoBox, theme.components.modal.infoBoxRed)}>
              <p className={theme.components.modal.message}>
                Are you sure you want to clear the entire session list for {adminUserToClearSession.name}?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className={clsx(theme.components.modal.buttonPrimary, "bg-google-red border-google-red")}
                onClick={() => {
                  adminClearUserActionSet(adminUserToClearSession.id);
                  setAdminUserToClearSession(null);
                }}
              >
                YES, CLEAR LIST
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                className={theme.components.modal.buttonSecondary}
                onClick={() => setAdminUserToClearSession(null)}
              >
                NO, KEEP IT
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteProjectConfirm && activeProject && (
        <div className={theme.components.modal.overlay}>
          <div className={clsx(theme.components.modal.container, theme.components.modal.containerRed)}>
            <div className={clsx(theme.components.modal.iconContainer, "bg-red-100 dark:bg-red-900/30 ring-8 ring-red-50 dark:ring-red-900/10 animate-pulse")}>
              <Trash2 className="w-10 h-10 text-google-red" />
            </div>
            <h3 className={theme.components.modal.title}>Delete Project?</h3>
            <div className={clsx(theme.components.modal.infoBox, theme.components.modal.infoBoxRed)}>
              <p className={theme.components.modal.message}>
                Warning: This action is permanent. All project metadata, checklists, progress, and the Online Documents root folder will be lost forever.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                variant="danger" 
                size="lg" 
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                disabled={isDeletingProject}
                onClick={() => {
                  setShowDeleteProjectConfirm(false);
                  setShowDeleteProjectFinalConfirm(true);
                }}
              >
                Yes, Delete Everything
              </Button>
              <Button 
                size="lg" 
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-google-green border-google-green text-white shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={() => setShowDeleteProjectConfirm(false)}
                disabled={isDeletingProject}
              >
                NO! KEEP THE PROJECT
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteProjectFinalConfirm && activeProject && (
        <div className={theme.components.dangerModal.overlay}>
          <div className={theme.components.dangerModal.container}>
            <div className={theme.components.dangerModal.iconContainer}>
              <AlertTriangle className="w-12 h-12 text-white" />
            </div>
            <h3 className={theme.components.dangerModal.title}>Last Chance...</h3>
            <div className={theme.components.dangerModal.infoBox}>
              <p className={theme.components.dangerModal.message}>
                Are you really sure you want to delete this project?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                variant="danger" 
                size="lg" 
                className={theme.components.dangerModal.buttonPrimary}
                disabled={isDeletingProject}
                onClick={async () => {
                  setIsDeletingProject(true);
                  try {
                    await deleteProject(activeProject.id);
                    setShowDeleteProjectFinalConfirm(false);
                    navigate('/project');
                  } catch (err) {
                    console.error('Failed to delete project:', err);
                    alert('Failed to delete project. Please try again.');
                  } finally {
                    setIsDeletingProject(false);
                  }
                }}
              >
                {isDeletingProject ? 'DELETING...' : 'YES DELETE'}
              </Button>
              <Button 
                size="lg" 
                className={theme.components.dangerModal.buttonSecondary}
                onClick={() => setShowDeleteProjectFinalConfirm(false)}
                disabled={isDeletingProject}
              >
                NO KEEP
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteChecklistConfirm && checklistToDelete && (
        <div className={theme.components.modal.overlay}>
          <div className={clsx(theme.components.modal.container, theme.components.modal.containerRed)}>
            <div className={clsx(theme.components.modal.iconContainer, "bg-red-100 dark:bg-red-900/30 ring-8 ring-red-50 dark:ring-red-900/10")}>
              <Trash2 className="w-10 h-10 text-google-red" />
            </div>
            <h3 className={theme.components.modal.title}>Remove Checklist?</h3>
            <div className={clsx(theme.components.modal.infoBox, theme.components.modal.infoBoxRed)}>
              <p className={theme.components.modal.message}>
                If you delete this checklist any work done on it will also be lost.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button 
                variant="danger" 
                size="lg" 
                className={clsx(theme.components.modal.buttonPrimary, "bg-google-red border-google-red")}
                onClick={() => {
                  removeInstanceFromProject(checklistToDelete.projectId, checklistToDelete.instanceId);
                  setShowDeleteChecklistConfirm(false);
                  setChecklistToDelete(null);
                }}
              >
                YES, REMOVE CHECKLIST
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                className={theme.components.modal.buttonSecondary}
                onClick={() => {
                  setShowDeleteChecklistConfirm(false);
                  setChecklistToDelete(null);
                }}
              >
                NO, KEEP IT
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={clsx(
          "bg-blue-50/95 dark:bg-[#121212] w-full max-w-5xl rounded-container shadow-2xl p-8 flex flex-col h-[85vh] border transition-all duration-300 animate-in zoom-in-95 duration-200",
          isDarkMode ? "border-gray-700" : "border-blue-200",
          currentUser?.activeFocus?.taskId === editingTask.id && "ring-4 ring-google-green border-google-green shadow-[0_0_25px_rgba(52,168,83,0.3)]"
        )}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {/* Mobile Header Row: Pomodoro + Close */}
                <div className="flex items-center justify-between sm:hidden w-full mb-1">
                  {mode === 'project' ? (
                    <div className="flex items-center gap-1.5 bg-white/50 dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="relative">
                        <button 
                          onClick={() => setShowModalTimerWidget(!showModalTimerWidget)}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition-all text-[10px] font-black"
                        >
                          <TomatoIcon className="w-3.5 h-3.5" />
                          <span className="tabular-nums">
                            {formatTime(editingTask.timerRemaining, editingTask.timerDuration)}
                          </span>
                        </button>

                        {showModalTimerWidget && (
                          <>
                            <div className="fixed inset-0 z-[65]" onClick={() => setShowModalTimerWidget(false)} />
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[70] min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 px-1">Set Session Duration</div>
                              <div className="flex gap-2">
                                <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold dark:text-gray-300" value={modalCustomMinutes} onChange={(e) => setModalCustomMinutes(e.target.value)} onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const mins = parseInt(modalCustomMinutes);
                                    if (!isNaN(mins)) {
                                      setTaskTimer(editingTask.id, mins * 60);
                                      setShowModalTimerWidget(false);
                                    }
                                  }
                                }} />
                                <div className="flex flex-col gap-1">
                                  <Button size="sm" onClick={() => {
                                    const mins = parseInt(modalCustomMinutes);
                                    if (!isNaN(mins)) {
                                      setTaskTimer(editingTask.id, mins * 60);
                                      setShowModalTimerWidget(false);
                                    }
                                  }} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                                  <Button size="sm" variant="secondary" onClick={() => {
                                    resetTaskTimer(editingTask.id);
                                    setShowModalTimerWidget(false);
                                  }} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => resetTaskTimer(editingTask.id)}
                          className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[9px] font-black border border-gray-200 dark:border-gray-700"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => updateTaskTimer(editingTask.id, (editingTask.timerRemaining || 0) + (5 * 60))}
                          className="p-1 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-black"
                        >
                          +5m
                        </button>
                        <button 
                          onClick={() => toggleTaskTimer(editingTask.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm"
                        >
                          {editingTask.timerIsRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>
                      </div>
                    </div>
                  ) : <div />}
                  <Button 
                    variant="secondary" 
                    onClick={() => setEditingTaskId(null)} 
                    className="h-8 px-3 text-[11px] font-bold border border-blue-200 dark:border-gray-700 bg-white/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white flex-shrink-0 rounded-xl"
                  >
                    Close
                  </Button>
                </div>
                <div className="flex items-center">
                  {/* Complexity badge logic remains here */}
                  {mode === 'master' ? (
                    <select
                      className={clsx(
                        "bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-gray-700 rounded-button px-3 py-1.5 text-xs font-black outline-none transition-all cursor-pointer",
                        editingTask.guide?.complexity === 'Easy' && "text-green-600 border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10",
                        editingTask.guide?.complexity === 'Moderate' && "text-amber-600 border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10",
                        editingTask.guide?.complexity === 'Complex' && "text-red-600 border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10",
                        !editingTask.guide?.complexity && "text-gray-400 dark:text-gray-300/60"
                      )}
                      value={editingTask.guide?.complexity || ''}
                      onChange={(e) => {
                        const val = e.target.value as Complexity | '';
                        const { updateTaskGuide } = useTasklistStore.getState();
                        updateTaskGuide(editingTask.id, { complexity: val || undefined });
                      }}
                    >
                      <option value="" className="text-gray-500 dark:text-gray-300/60">Complexity...</option>
                      <option value="Easy">Easy</option>
                      <option value="Moderate">Moderate</option>
                      <option value="Complex">Complex</option>
                    </select>
                  ) : (
                    editingTask.guide?.complexity && (
                      <div className={clsx(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        editingTask.guide.complexity === 'Easy' && "bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30",
                        editingTask.guide.complexity === 'Moderate' && "bg-amber-50/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30",
                        editingTask.guide.complexity === 'Complex' && "bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30"
                      )}>
                        <Zap className="w-3 h-3 fill-current" />
                        {editingTask.guide.complexity}
                      </div>
                    )
                  )}
                </div>
                {/* Mobile Pomodoro removed from here as it's now in the top row */}
              </div>

              {/* Desktop-only Pomodoro controls and Close button */}
              <div className="hidden sm:flex items-center gap-4">
                {mode === 'project' && (
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="relative">
                <button 
                  onClick={() => setShowModalTimerWidget(!showModalTimerWidget)}
                  title="Set Duration"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 transition-all hover:bg-red-100"
                >
                  <TomatoIcon className={clsx("w-5 h-5", !editingTask.timerIsRunning && "grayscale-[0.5]")} />
                  <span className="text-sm font-black tabular-nums">
                    {formatTime(editingTask.timerRemaining, editingTask.timerDuration)}
                  </span>
                </button>

                      {showModalTimerWidget && (
                        <>
                          <div className="fixed inset-0 z-[65]" onClick={() => setShowModalTimerWidget(false)} />
                          <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl z-[70] min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 px-1">Set Session Duration</div>
                            <div className="flex gap-2">
                              <input type="number" className="w-16 h-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg px-2 text-sm outline-none font-bold dark:text-gray-300" value={modalCustomMinutes} onChange={(e) => setModalCustomMinutes(e.target.value)} onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const mins = parseInt(modalCustomMinutes);
                                  if (!isNaN(mins)) {
                                    setTaskTimer(editingTask.id, mins * 60);
                                    setShowModalTimerWidget(false);
                                  }
                                }
                              }} />
                              <div className="flex flex-col gap-1">
                                <Button size="sm" onClick={() => {
                                  const mins = parseInt(modalCustomMinutes);
                                  if (!isNaN(mins)) {
                                    setTaskTimer(editingTask.id, mins * 60);
                                    setShowModalTimerWidget(false);
                                  }
                                }} className="h-7 px-2 font-black text-[10px] py-0">Set</Button>
                                <Button size="sm" variant="secondary" onClick={() => {
                                  resetTaskTimer(editingTask.id);
                                  setShowModalTimerWidget(false);
                                }} className="h-7 px-2 font-black text-[10px] py-0">Reset</Button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateTaskTimer(editingTask.id, (editingTask.timerRemaining || 0) + (5 * 60))}
                        className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors text-[10px] font-black"
                        title="Add 5 Minutes"
                      >
                        Add 5mins
                      </button>
                      <button 
                        onClick={() => toggleTaskTimer(editingTask.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white shadow-sm hover:scale-110 transition-all"
                      >
                        {editingTask.timerIsRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                    </div>
                  </div>
                )}
                <Button variant="secondary" onClick={() => setEditingTaskId(null)} className="hidden sm:flex font-bold border border-blue-200 dark:border-gray-700 bg-white/50 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-white">Close</Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex-shrink-0 mb-8">
                {/* New TASK bounding box */}
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Target className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h4 className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest">TASK</h4>
                </div>
                <div className="bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-800 rounded-container p-6 mb-8 shadow-sm h-fit transition-all">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 break-words leading-relaxed px-2">
                    {editingTask.title}
                  </h3>
                </div>

                <TaskGuidePanel task={editingTask} mode={mode} showComplexityHeader={false} />
                <div className="mt-4 flex flex-wrap gap-2">
                  {editingTask.files?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-white dark:bg-black/40 border border-blue-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
                  {mode === 'master' && <label className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-xs font-black text-google-blue dark:text-gray-300 cursor-pointer border border-blue-200 dark:border-blue-800 hover:bg-blue-200 transition-all"><Paperclip className="w-3 h-3 inline mr-1" /> Attach Reference File<input type="file" className="hidden" onChange={(e) => handleFileUpload(e, false)} /></label>}
                </div>
              </div>
              
              {mode === 'project' && (
                <div className="flex-shrink-0 border-t-2 pt-10 pb-4 border-gray-400 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <ClipboardList className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h4 className="text-sm font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest">TEAM TASK FEEDBACK NOTES</h4>
                  </div>
                  <div className="bg-white/50 dark:bg-black/20 border border-gray-300 dark:border-gray-800 rounded-container overflow-hidden shadow-sm">
                    <NoteEditor content={editingTask.userNotes || ''} onChange={(n) => { updateTaskNotes(editingTask.id, n, true); }} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {editingTask.userFiles?.map(f => <button key={f.id} onClick={() => handleFileDownload(f)} className="px-3 py-2 bg-white dark:bg-black/40 border border-gray-400 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-google-blue transition-all shadow-sm">{f.name}</button>)}
                    <label className="px-3 py-2 bg-white/50 dark:bg-blue-900/40 rounded-xl text-xs font-black text-gray-700 dark:text-gray-300 cursor-pointer border border-gray-400 dark:border-blue-800 hover:bg-white transition-all"><Paperclip className="w-3 h-3 inline mr-1" /> Attach File<input type="file" className="hidden" onChange={(e) => handleFileUpload(e, true)} /></label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && showStyleConsole && (
        <StyleConsole onClose={() => setShowStyleConsole(false)} />
      )}

      {isAdmin && showUserManagement && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-container p-8 border border-gray-300 dark:border-gray-700 flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-google-blue" />
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-gray-300">User Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-bold">Manage access and permissions</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setShowUserManagement(false)} className="border border-gray-300 dark:border-gray-700 font-bold">Close</Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {/* Current User Profile Card */}
              <div className="p-6 bg-google-green border-google-green text-white rounded-card border-2 flex items-center gap-4 shadow-lg">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <UserCircle2 className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-lg">{currentUser?.name} (You)</h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-white/20 text-white rounded-md shadow-sm border border-white/30">
                      {currentUser?.role}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white/80">{auth.currentUser?.email}</p>
                </div>
                
                {/* Admin Self-Session Controls */}
                <div className="flex items-center gap-2 bg-white/10 p-1 rounded-xl border border-white/20">
                  <Button 
                    variant="ghost" 
                    className="h-10 w-10 p-0 text-white hover:bg-white/10"
                    title="Deactivate Current Task"
                    onClick={() => {
                      setAdminUserToDeactivate({ id: currentUser!.id, name: "yourself" });
                    }}
                  >
                    <ShieldOff className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-10 w-10 p-0 text-white hover:bg-white/10"
                    title="Clear Users Session List"
                    onClick={() => {
                      setAdminUserToClearSession({ id: currentUser!.id, name: "yourself" });
                    }}
                  >
                    <Eraser className="w-5 h-5" />
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  className="!text-white border-2 border-white hover:bg-white/10 font-black px-4 py-1 rounded-xl transition-all" 
                  onClick={() => signOut(auth)}
                >
                  Sign Out
                </Button>
              </div>

              {isAdmin && (
                <div className="space-y-4 mt-8">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-300">Team Members ({users.length})</h4>
                  </div>
                  
                  <div className="grid gap-2">
                    {users.filter(u => u.id !== currentUser?.id).map(user => {
                      const isOnline = user.activeFocus?.timestamp ? (Date.now() - user.activeFocus.timestamp < 10 * 60 * 1000) : false;
                      return (
                        <div key={user.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-black/40 rounded-card border border-gray-300 dark:border-gray-700 group shadow-sm">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                              <UserIcon className="w-6 h-6" />
                            </div>
                            {isOnline && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-google-green rounded-full border-2 border-white dark:border-[#121212] animate-pulse shadow-sm" title="Online" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-black text-sm flex items-center gap-2">
                              {user.name}
                              {isOnline && <span className="text-[8px] font-black uppercase text-google-green tracking-tighter">Online</span>}
                            </h5>
                            <span className={clsx(
                              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs border",
                              user.role === 'admin' ? "bg-google-blue text-white border-google-blue" : "border-orange-500 text-orange-500 bg-transparent"
                            )}>
                              {user.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Session Controls for Team Members */}
                            <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-gray-500 hover:text-google-blue"
                                title="Deactivate Current Task"
                                onClick={() => {
                                  setAdminUserToDeactivate({ id: user.id, name: user.name });
                                }}
                              >
                                <ShieldOff className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-gray-500 hover:text-google-red"
                                title="Clear Users Session List"
                                onClick={() => {
                                  setAdminUserToClearSession({ id: user.id, name: user.name });
                                }}
                              >
                                <Eraser className="w-4 h-4" />
                              </Button>
                            </div>

                            <select 
                              className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-xs font-black px-2 py-1 outline-none focus:ring-2 focus:ring-google-blue"
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'viewer')}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-gray-400 hover:text-google-red h-8 w-8 p-0"
                              onClick={() => {
                                if (confirm(`Remove profile for ${user.name}? They will still have a Firebase account but no profile record.`)) {
                                  deleteUser(user.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {users.length <= 1 && (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest">No other users found</p>
                        <p className="text-[10px] mt-1 font-bold italic">New users appear here after they sign up</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className={theme.components.generalModal.overlay}>
          <div className={theme.components.generalModal.container}>
            <div className={theme.components.generalModal.header}>
              <h3 className={theme.components.generalModal.title}>Export {mode === 'master' ? 'Template' : 'Checklist'}</h3>
              <Button variant="ghost" onClick={() => setShowExportModal(false)} className="h-10 w-10 p-0 rounded-full border border-gray-200 dark:border-gray-800"><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-3">
              <button onClick={() => { exportZip(); setShowExportModal(false); }} className="w-full flex items-center gap-4 p-4 bg-google-blue/10 rounded-2xl border-2 border-google-blue/50 hover:border-google-blue transition-all text-left group shadow-sm">
                <FileIcon className="w-6 h-6 text-google-blue" />
                <div><span className="font-black text-google-blue block">ZIP Package</span><span className="text-[10px] text-google-blue/70 font-black uppercase tracking-wider">Includes all data + structural backup</span></div>
              </button>
              <button onClick={() => { exportJSON(); setShowExportModal(false); }} className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-google-blue transition-all text-left shadow-sm">
                <FileText className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                <div><span className="font-black text-gray-800 dark:text-gray-300 block">JSON File</span><span className="text-[10px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-wider">Data only (Native Format)</span></div>
              </button>
              <button onClick={() => { exportCSV(); setShowExportModal(false); }} className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-google-green transition-all text-left shadow-sm">
                <FileSpreadsheet className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                <div><span className="font-black text-gray-800 dark:text-gray-300 block">CSV Spreadsheet</span><span className="text-[10px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-wider">Excel / Sheets compatible</span></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className={theme.components.generalModal.overlay}>
          <div className={theme.components.generalModal.container}>
            <div className={theme.components.generalModal.header}>
              <h3 className={theme.components.generalModal.title}>Import Content</h3>
              <Button variant="ghost" onClick={() => setShowImportModal(false)} className="h-10 w-10 p-0 rounded-full border border-gray-200 dark:border-gray-800"><X className="w-5 h-5" /></Button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-black tracking-tight uppercase">Select a file type to import into cloud templates.</p>
              
              <div className="grid gap-3">
                <button 
                  onClick={() => {
                    if (importFileRef.current) {
                      importFileRef.current.accept = ".json";
                      importFileRef.current.click();
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-google-blue transition-all text-left shadow-sm"
                >
                  <FileText className="w-6 h-6 text-google-blue" />
                  <div>
                    <span className="font-black text-gray-800 dark:text-gray-300 block">JSON Template</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-widest">Native Data Format</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (importFileRef.current) {
                      importFileRef.current.accept = ".zip";
                      importFileRef.current.click();
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-google-blue transition-all text-left shadow-sm"
                >
                  <FileIcon className="w-6 h-6 text-orange-500" />
                  <div>
                    <span className="font-black text-gray-800 dark:text-gray-300 block">ZIP Package</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-widest">Package with attachments</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (importFileRef.current) {
                      importFileRef.current.accept = ".csv";
                      importFileRef.current.click();
                    }
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-google-green transition-all text-left shadow-sm"
                >
                  <FileSpreadsheet className="w-6 h-6 text-google-green" />
                  <div>
                    <span className="font-black text-gray-800 dark:text-gray-300 block">CSV Spreadsheet</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-widest">Reconstruct from table</span>
                  </div>
                </button>
              </div>

              <input type="file" ref={importFileRef} className="hidden" onChange={handleImportFile} />
            </div>
          </div>
        </div>
      )}

      {importPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-3xl p-8 flex flex-col h-[80vh] border border-gray-300 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black">Import Preview</h3>
              <Button variant="secondary" onClick={() => setImportPreview(null)} className="font-bold border border-gray-300 dark:border-gray-700">Cancel</Button>
            </div>
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 mb-2 block tracking-widest">New Template Name</label>
              <input className="w-full bg-gray-100 dark:bg-black/40 border-2 border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-google-blue outline-none transition-all" value={importTemplateName} onChange={(e) => setImportTemplateName(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/40 rounded-[2rem] p-6 border border-gray-300 dark:border-gray-700 mb-6 custom-scrollbar">
              {importPreview.sections?.map((s: any, i: number) => (
                <div key={i} className="mb-4">
                  <h4 className="font-black text-gray-900 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 pb-1 mb-2">{s.title}</h4>
                  <div className="ml-4 space-y-1">
                    {s.subsections?.map((ss: any, j: number) => <div key={j} className="text-xs text-gray-600 dark:text-gray-300 uppercase font-black tracking-tight">• {ss.title} ({ss.tasks?.length || 0} tasks)</div>)}
                  </div>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full h-14 rounded-2xl shadow-lg font-black" onClick={() => { if (importPreview) importMaster({ ...importPreview, title: importTemplateName }); setImportPreview(null); }}>Confirm & Create Template</Button>
          </div>
        </div>
      )}

      <PlainTextImportModal 
        show={showPlainTextImport}
        onClose={abortPlainTextImport}
        content={plainTextContent}
        setContent={setPlainTextContent}
        lines={importLines}
        setLines={setImportLines}
        onProcess={processTextToLines}
        preview={plainTextPreview}
        onPreview={handlePlainTextPreview}
        onConvert={() => { if (plainTextPreview) { importMaster(plainTextPreview); abortPlainTextImport(); } }}
        name={importTemplateName}
        setName={setImportTemplateName}
        onBack={() => setPlainTextPreview(null)}
      />

      {/* Add Checklist Modal */}
      {showAddChecklistModal && activeProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-container p-8 border border-gray-300 dark:border-gray-700 flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-google-blue/10 rounded-2xl text-google-blue">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Add Project Checklist</h3>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Select a template to assign to this project</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setShowAddChecklistModal(false)} className="border border-gray-300 dark:border-gray-700 font-bold h-12 w-12 p-0 rounded-full"><X className="w-6 h-6" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {masters.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-container">
                  <p className="text-gray-400 font-black uppercase text-xs tracking-[0.2em]">No templates available</p>
                  <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">Create a template in the Checklist Templates section first</p>
                </div>
              ) : (
                masters.map(m => {
                  const isAssigned = activeProject.instanceIds.some((id: string) => instances.find(inst => inst.id === id)?.masterId === m.id);
                  return (
                    <button 
                      key={m.id} 
                      disabled={isAssigned}
                      onClick={async () => {
                        await addInstanceToProject(activeProject.id, m.id);
                        setShowAddChecklistModal(false);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between p-5 rounded-card border-2 transition-all text-left group",
                        isAssigned 
                          ? "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-gray-800 opacity-60 cursor-not-allowed" 
                          : "bg-white dark:bg-black/40 border-gray-200 dark:border-gray-700 hover:border-google-blue shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isAssigned ? "bg-gray-200 dark:bg-gray-800 text-gray-400" : "bg-google-blue/10 text-google-blue group-hover:bg-google-blue group-hover:text-white"
                        )}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-lg text-gray-800 dark:text-gray-300">{m.title}</span>
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{m.sections.length} Sections • {m.sections.reduce((acc, s) => acc + s.subsections.reduce((a, ss) => a + ss.tasks.length, 0), 0)} Tasks</span>
                        </div>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">Already Active</span>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-google-blue group-hover:text-white transition-all">
                          <Plus className="w-5 h-5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Button variant="ghost" onClick={() => setShowAddChecklistModal(false)} className="font-black uppercase tracking-widest text-xs px-8">Close</Button>
            </div>
          </div>
        </div>
      )}
      <NotificationToast />
    </div>
  );
}

function PlainTextImportModal({ show, onClose, content, setContent, lines, setLines, onProcess, preview, onPreview, onConvert, name, setName, onBack }: any) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-[#121212] w-full max-w-5xl rounded-[2.5rem] p-8 flex flex-col h-[85vh] border border-gray-300 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div><h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">Plain Text Import</h3><p className="text-sm text-gray-600 dark:text-gray-300 font-bold uppercase tracking-tight">Quickly build a template from notes.</p></div>
          <Button variant="ghost" onClick={onClose} className="text-google-red hover:bg-red-50 dark:hover:bg-red-900/20 font-black border-2 border-transparent hover:border-red-200">Abort Import</Button>
        </div>
        {!preview ? (
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            <input className="w-full bg-gray-100 dark:bg-black/40 border-2 border-gray-300 dark:border-gray-700 rounded-2xl px-5 py-3 text-lg font-black" placeholder="Template Name" value={name} onChange={(e) => setName(e.target.value)} />
            {lines.length === 0 ? (
              <textarea className="flex-1 w-full bg-gray-100 dark:bg-black/40 border-2 border-gray-300 dark:border-gray-700 rounded-[2rem] p-6 font-mono text-sm leading-relaxed font-bold custom-scrollbar" placeholder="# SECTION NAME\n## SUBSECTION NAME\n- Task 1\n- Task 2" value={content} onChange={(e) => setContent(e.target.value)} />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-2">Assign Types to Lines</span>
                  <button 
                    onClick={() => setLines([])} 
                    className="text-[10px] font-black uppercase text-google-blue hover:underline px-2 py-1"
                  >
                    ← Edit Original Text
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 bg-gray-100 dark:bg-black/40 rounded-[2rem] p-4 border-2 border-gray-300 dark:border-gray-700 custom-scrollbar">
                  {lines.map((l: any, i: number) => (
                    <div key={l.id} className={clsx("flex items-center gap-2 p-2 rounded-xl border-2 transition-all", l.type === 'section' ? "bg-google-blue border-google-blue shadow-md" : l.type === 'subsection' ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 shadow-xs")}>
                      <div className="flex gap-1 border-r-2 pr-2 border-gray-200/20 dark:border-gray-700/50">
                        <button onClick={() => { const nl = [...lines]; nl[i].type = 'section'; setLines(nl); }} className={clsx("w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-colors", l.type === 'section' ? "bg-white text-google-blue" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300")}>S</button>
                        <button onClick={() => { const nl = [...lines]; nl[i].type = 'subsection'; setLines(nl); }} className={clsx("w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-colors", l.type === 'subsection' ? "bg-google-blue text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300")}>SS</button>
                        <button onClick={() => { const nl = [...lines]; nl[i].type = 'task'; setLines(nl); }} className={clsx("w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-colors", l.type === 'task' ? "bg-gray-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300")}>T</button>
                      </div>
                      <input className={clsx("flex-1 bg-transparent border-none focus:ring-0 px-2 font-bold", l.type === 'section' ? "text-white uppercase font-black" : l.type === 'subsection' ? "text-google-blue" : "text-gray-800 dark:text-gray-300")} value={l.text} onChange={(e) => { const nl = [...lines]; nl[i].text = e.target.value; setLines(nl); }} />
                    </div>
                  ))}
                </div>
              </>
            )}
            <Button size="lg" className="w-full h-14 rounded-2xl shadow-md font-black" onClick={() => lines.length === 0 ? onProcess(content) : onPreview()}>{lines.length === 0 ? 'Analyze Text Structure' : 'Generate Preview'}</Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-6 px-8 py-4 bg-gray-100 dark:bg-black/40 rounded-2xl border-2 border-gray-300 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 tracking-widest mb-1">New Template Title</span>
                <h4 className="text-2xl font-black text-gray-900 dark:text-gray-300">{name || 'Untitled Template'}</h4>
              </div>
              <div className="text-[10px] font-black uppercase bg-google-blue text-white px-3 py-1 rounded-full shadow-sm">Preview Mode</div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-black/40 rounded-[2rem] p-8 border-2 border-gray-300 dark:border-gray-700 mb-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-10">
                {preview.sections.map((s: any, i: number) => (
                  <div key={i} className="relative">
                    <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-300 dark:border-gray-700 shadow-sm"><h3 className="text-xl font-black">{s.title}</h3></div>
                    <div className="space-y-6 ml-6 border-l-2 border-gray-200 dark:border-gray-700/50 pl-8">
                      {s.subsections.map((ss: any, j: number) => (
                        <div key={j} className="bg-white dark:bg-gray-800/40 rounded-[1.5rem] border-2 border-gray-300 dark:border-gray-700 p-6 relative shadow-xs">
                          <div className="absolute -left-[2.15rem] top-10 w-8 h-0.5 bg-gray-200 dark:bg-gray-700/50" />
                          <h4 className="font-black text-gray-800 dark:text-gray-300 mb-4 uppercase text-sm tracking-wide">{ss.title}</h4>
                          <div className="space-y-2">{ss.tasks.map((t: any, k: number) => <div key={k} className="flex items-center gap-3 py-2 px-4 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold">{t.title}</div>)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" size="lg" className="flex-1 h-14 rounded-2xl border border-gray-300 dark:border-gray-700 font-bold" onClick={onBack}>Edit Structure</Button>
              <Button size="lg" className="flex-[2] h-14 rounded-2xl shadow-lg font-black" onClick={onConvert}>Import as New Template</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      }
    } catch (err: any) { setError(err.message.replace('Firebase: ', '')); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-[2.5rem] shadow-2xl p-8 border-2 border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo showText={false} className="scale-150 mb-6" />
          <h1 className="text-4xl font-semibold text-[#E67E33] tracking-tight font-sans">checkMATE</h1>
          <p className="text-gray-600 dark:text-gray-300 font-black text-[10px] uppercase tracking-[0.2em] mt-2 bg-gray-100 dark:bg-black/40 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800">Collaborative Logic Cloud</p>
        </div>
        {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-google-red text-xs font-black rounded-2xl flex items-center gap-2 border-2 border-red-100 dark:border-red-900/50 shadow-sm"><X className="w-4 h-4" />{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 ml-2 tracking-widest">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" required className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-google-blue focus:border-google-blue outline-none transition-all dark:text-gray-300" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 ml-2 tracking-widest">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" required className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-google-blue focus:border-google-blue outline-none transition-all dark:text-gray-300" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300 ml-2 tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="password" required className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-google-blue focus:border-google-blue outline-none transition-all dark:text-gray-300" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 rounded-2xl shadow-lg shadow-blue-500/20 font-black text-sm uppercase tracking-widest mt-2" disabled={loading}>{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}</Button>
        </form>
        <div className="mt-8 pt-6 border-t-2 border-gray-100 dark:border-gray-800 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-black text-google-blue hover:underline uppercase tracking-tight">{isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

export default App;
