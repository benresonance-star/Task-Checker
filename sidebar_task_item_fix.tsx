const SidebarTaskItem = ({ 
  item, 
  task, 
  instance, 
  isActiveFocus, 
  isTopTask,
  onOpenNotes
}: { 
  item: any, 
  task: Task, 
  instance: any, 
  isActiveFocus: boolean, 
  isTopTask: boolean,
  onOpenNotes: (taskId: string, containerId: string, focusFeedback?: boolean) => void
}) => {
  const { projects, toggleTask, toggleTaskInActionSet, setTaskTimer, resetTaskTimer, toggleTaskTimer, updateTaskTimer, currentUser, users } = useTasklistStore();
  const [showTimerWidget, setShowTimerWidget] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('20');
  const navigate = useNavigate();
  const location = useLocation();

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
  } = useSortable({ id: item.type === 'note' ? `note-${item.taskId}` : `${item.projectId}-${item.instanceId}-${item.taskId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  } as React.CSSProperties;

  const handleSetTimer = () => {
    const mins = parseInt(customMinutes);
    if (!isNaN(mins)) {
      setTaskTimer(task.id, mins * 60);
      setShowTimerWidget(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasNotes = (task.notes && task.notes !== '<p></p>') || (task.userNotes && task.userNotes !== '<p></p>');
  const hasFiles = (task.files && task.files.length > 0) || (task.userFiles && task.userFiles.length > 0);
  const shouldHighlightNotes = hasNotes || hasFiles;

  const otherActiveUsers = Object.entries(instance?.activeUsers || {})
    .filter(([uid, info]: [string, any]) => info.taskId === task.id && uid !== currentUser?.id && Date.now() - info.lastSeen < 45000)
    .map(([_, info]: [string, any]) => info);

  const otherClaimants = users
    .filter(u => u.id !== currentUser?.id && u.actionSet?.some(i => i.projectId === item.projectId && i.instanceId === item.instanceId && i.taskId === task.id))
    .map(u => ({ id: u.id, name: u.name }));

  const concurrentFocusCount = users.filter(u => 
    u.activeFocus?.projectId === item.projectId &&
    u.activeFocus?.instanceId === item.instanceId &&
    u.activeFocus?.taskId === task.id
  ).length;

  const isMultiUserActive = concurrentFocusCount >= 2;

  const project = projects.find(p => p.id === item.projectId);
  const isYellowState = isActiveFocus && otherClaimants.length > 0;
  const isActuallyCompleted = task.completed;
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
        isActuallyCompleted
          ? theme.components.sidebar.ledgerItem
          : isMultiUserActive 
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
        if (instance && project) {
          const isPlanner = location.pathname === '/' || location.pathname === '/home';
          const isSession = location.pathname === '/session';
          const isProjectView = location.pathname.startsWith('/project/');
          
          if (isPlanner || isSession) {
            if (!isSession) navigate(`/project/${project.id}/instance/${instance.id}`);
          } else if (isProjectView) {
            const pathParts = location.pathname.split('/');
            const currentProjectId = pathParts[2];
            const currentInstanceId = pathParts[4];
            
            if (currentProjectId !== project.id || currentInstanceId !== instance.id) {
              navigate(`/project/${project.id}/instance/${instance.id}`, { replace: true });
            }
          } else {
            navigate(`/project/${project.id}/instance/${instance.id}`, { replace: true });
          }
        }
      }}
    >
      {/* Top Zone: Identification & Drag Handle */}
      <div className={clsx("flex items-start gap-3 p-4", !isActiveFocus && !isMultiUserActive && !isActuallyCompleted && "pb-3")}>
        <div 
          {...attributes} 
          {...listeners}
          className={clsx(
            "flex flex-col items-center pt-1 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none",
            isActuallyCompleted ? "text-gray-400" : (isActiveFocus || isMultiUserActive || (task.completed && !isDeactivatedCompleted)) ? "text-white/40" : (isDeactivatedCompleted ? "text-google-green/40" : "text-gray-400 dark:text-gray-600 opacity-40 group-hover:opacity-100")
          )}
          style={{ touchAction: 'none' }}
        >
          {isActuallyCompleted ? <Trophy className="w-4 h-4 text-google-blue" /> : <GripVertical className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={clsx(
              "text-[9px] font-black uppercase tracking-wider truncate",
              isActuallyCompleted ? "text-gray-400" : (isActiveFocus || isMultiUserActive ? "text-white/60" : "text-google-blue/60")
            )}>{project?.name || 'Project'}</p>
            
            {isActuallyCompleted && (
              <div className="flex items-center gap-1 pointer-events-auto">
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    toggleTask(task.id, instance.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-google-blue"
                  title="Revert Task"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskInActionSet(item.projectId, item.instanceId, item.taskId);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-google-red"
                  title="Clear from Session"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <h4 className={clsx(
            "text-xs font-bold leading-snug break-words",
            isActuallyCompleted ? "text-gray-400 line-through" : (isActiveFocus || isMultiUserActive ? "text-white" : "text-gray-900 dark:text-gray-100")
          )}>
            {task.title}
          </h4>
          {!isActuallyCompleted && (
            <p className={clsx(
              "text-[9px] font-black uppercase mt-1 tracking-wider",
              isActiveFocus || isMultiUserActive ? "text-white/50" : "text-gray-400"
            )}>{instance.title}</p>
          )}
          
          {isActuallyCompleted && item.completedAt && (
            <p className="text-[8px] font-black uppercase text-google-blue/60 mt-1">
              Victory at {new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Expanded Controls for Active Task */}
      {isActiveFocus && !isActuallyCompleted && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotes(task.id, instance.id, true);
              }}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                isActiveFocus || isMultiUserActive ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-100 dark:bg-white/5 text-gray-600 hover:bg-gray-200"
              )}
            >
              <FileText className={clsx("w-3.5 h-3.5", shouldHighlightNotes && "text-google-yellow fill-current")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Notes</span>
            </button>

            {!isTopTask && (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleTaskInActionSet(item.projectId, item.instanceId, item.taskId); }}
                className={clsx(
                  "w-10 h-10 rounded-xl ml-auto flex items-center justify-center transition-all",
                  isActiveFocus || isMultiUserActive ? "bg-white/10 text-white hover:bg-white/20 hover:text-google-red" : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-google-red"
                )}
                title="Remove from Session"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {isTopTask && (
            <>
              {/* Pomodoro Timer Slot */}
              <div className={clsx(
                "flex items-center gap-2 p-1 rounded-2xl border-2",
                isYellowState ? "bg-black/10 border-black/10" : "bg-white/10 border-white/10"
              )}>
                <div className={clsx(
                  theme.components.pomodoro.container,
                  isYellowState && "bg-black/5"
                )}>
                  <Clock className={clsx("w-3.5 h-3.5 mr-2", isYellowState ? "text-gray-900" : "text-white/60")} />
                  <span className={clsx(
                    "text-sm font-black tabular-nums tracking-tight",
                    isYellowState ? "text-gray-900" : "text-white"
                  )}>
                    {formatTime(task.timerRemaining || 0)}
                  </span>
                </div>
                
                <button 
                  onClick={handlePlayPause}
                  className={clsx(
                    theme.components.pomodoro.button,
                    isYellowState && theme.components.pomodoro.buttonYellow
                  )}
                >
                  {task.timerIsRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                <button 
                  onClick={handleAdd5Min}
                  className={clsx(
                    theme.components.pomodoro.button,
                    isYellowState && theme.components.pomodoro.buttonYellow
                  )}
                  title="Add 5 Minutes"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button 
                  onClick={handleResetTimer}
                  className={clsx(
                    theme.components.pomodoro.button,
                    isYellowState && theme.components.pomodoro.buttonYellow
                  )}
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Multi-User Presence Alert */}
              {isMultiUserActive && (
                <div className="bg-white/10 rounded-2xl p-3 border border-white/20 animate-pulse">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <AlertTriangle className="w-4 h-4 text-google-yellow fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Concurrent Focus</span>
                  </div>
                  <p className="text-[9px] text-white/80 font-bold leading-tight">
                    {otherClaimants.map(u => u.name).join(', ')} also working here.
                  </p>
                </div>
              )}

              {/* Task Done Button */}
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task.id, instance.id);
                  }}
                  className={clsx(
                    theme.components.taskDoneButton.base,
                    isMultiUserActive 
                      ? (task.completed ? theme.components.taskDoneButton.multiUserCompleted : theme.components.taskDoneButton.multiUser)
                      : isYellowState
                        ? (task.completed ? theme.components.taskDoneButton.yellowStateCompleted : theme.components.taskDoneButton.yellowState)
                        : (task.completed ? theme.components.taskDoneButton.completed : theme.components.taskDoneButton.active)
                  )}
                >
                  {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <ThumbsUp className="w-5 h-5" />}
                  {task.completed ? "COMPLETED!" : "TASK DONE?"}
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskInActionSet(item.projectId, item.instanceId, item.taskId);
                  }}
                  className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 hover:text-google-red transition-all border-2 border-white/10"
                  title="Remove from Session"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

