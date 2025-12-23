import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Plus, Trash2, ChevronUp, ChevronDown as ChevronDownIcon, ArrowUpToLine } from 'lucide-react';
import { theme } from '../../styles/theme';
import { Subsection, Task } from '../../types';
import { useTasklistStore } from '../../store/useTasklistStore';
import { TaskItem } from './TaskItem';
import { Button } from '../ui/Button';
import { useNavigate, useLocation } from 'react-router-dom';

interface SubsectionItemProps {
  subsection: Subsection;
  sectionId: string;
  onOpenNotes: (task: Task) => void;
}

/**
 * SubsectionItem groups a set of tasks together.
 * In Master mode, it allows editing the title and reordering.
 * In Project mode, it shows a progress bar and allows collapsing/expanding.
 */
export const SubsectionItem = ({ subsection, sectionId, onOpenNotes }: SubsectionItemProps) => {
  const { mode, addTask, renameSubsection, deleteSubsection, moveSubsection, promoteSubsection, isLocalExpanded, toggleLocalExpanded, activeTaskId } = useTasklistStore();
  const isMaster = mode === 'master';
  const isInstance = mode === 'project';
  const isExpanded = isLocalExpanded(subsection.id, subsection.isExpanded);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackgroundClick = () => {
    if (!isInstance || !activeTaskId) return;
    // Clear the active task if clicking the subsection background
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('task');
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const [localTitle, setLocalTitle] = useState(subsection.title);

  // Sync local title with store title when subsection changes externally
  React.useEffect(() => {
    setLocalTitle(subsection.title);
  }, [subsection.title]);

  // Auto-resize textarea on mount for title editing
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [subsection.title]);

  // Calculate progress within this subsection
  const totalTasks = subsection.tasks.length;
  const completedTasks = subsection.tasks.filter(t => t.completed).length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div 
      onClick={handleBackgroundClick}
      className={clsx(
        theme.components.hierarchy.subsection,
        isInstance && activeTaskId && "cursor-pointer"
      )} 
      data-subsection-item
    >
      {/* Horizontal Connector Line */}
      <div className={theme.components.hierarchy.horizontalLine} data-horizontal-line />
      
      <div className="flex items-center gap-1 sm:gap-2 group mb-1 sm:mb-2">
        <button 
          onClick={() => toggleLocalExpanded(subsection.id)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {isMaster && (
          <div className="hidden md:flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => moveSubsection(sectionId, subsection.id, 'up')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => moveSubsection(sectionId, subsection.id, 'down')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {isMaster ? (
          <textarea
            ref={textareaRef}
            rows={1}
            className={clsx(theme.components.hierarchy.subsectionTitle, "bg-transparent border-none focus:ring-0 focus:outline-none pt-2 pb-2 px-1 sm:px-2 rounded hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 flex-1 transition-colors resize-none overflow-visible min-h-[2.2rem] sm:min-h-[2.5rem] min-w-0 break-words leading-relaxed")}
            value={localTitle}
            onChange={(e) => {
              const newVal = e.target.value;
              setLocalTitle(newVal);
              renameSubsection(subsection.id, newVal);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="Subsection Title..."
          />
        ) : (
          <div className="flex-1 flex items-center justify-between py-1 px-2 min-w-0">
            <h4 className={clsx(
              theme.components.hierarchy.subsectionTitle,
              totalTasks > 0 && progress === 100 && "line-through opacity-60 decoration-2 decoration-google-green"
            )}>
              {subsection.title}
            </h4>
            {totalTasks > 0 && progress > 0 && (
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="w-12 sm:w-24 h-1.5 bg-gray-200/50 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-500",
                      progress === 100 ? "bg-google-green" : "bg-google-blue"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className={clsx(
                  "text-[9px] sm:text-[10px] font-black tabular-nums min-w-[3ch] text-right",
                  progress === 100 ? "text-google-green" : "text-gray-600 dark:text-gray-300"
                )}>
                  {progress}%
                </span>
              </div>
            )}
          </div>
        )}

        {isMaster && (
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 transition-opacity flex-shrink-0">
            {/* Mobile Reorder Buttons */}
            <div className="flex md:hidden items-center gap-0 sm:gap-1 mr-0.5 sm:mr-2">
              <button onClick={() => moveSubsection(sectionId, subsection.id, 'up')} className="p-0.5 sm:p-1 text-gray-500 hover:text-google-blue">
                <ChevronUp className="w-3.5 h-3.5 sm:w-4 h-4" />
              </button>
              <button onClick={() => moveSubsection(sectionId, subsection.id, 'down')} className="p-0.5 sm:p-1 text-gray-500 hover:text-google-blue">
                <ChevronDownIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
              </button>
            </div>
            
            <div className="relative group/tooltip">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-google-blue bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-full"
                onClick={() => {
                  if (confirm(`Promote "${subsection.title}" to a Section? Tasks will be moved to a "General" subsection.`)) {
                    promoteSubsection(subsection.id);
                  }
                }}
              >
                <ArrowUpToLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-800 text-white text-[9px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700/50 transform translate-y-1 group-hover/tooltip:translate-y-0">
                Promote to Section
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
              </div>
            </div>

            <div className="relative group/tooltip">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-gray-500 hover:text-google-red bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete the subsection "${subsection.title}" and all its tasks?`)) {
                    deleteSubsection(subsection.id);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-google-red text-white text-[9px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl transform translate-y-1 group-hover/tooltip:translate-y-0">
                Delete Subsection
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-google-red" />
              </div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-1 sm:space-y-2 ml-1 sm:ml-2 mt-4 sm:mt-6 relative">
          {subsection.tasks.map(task => (
            <TaskItem key={task.id} task={task} subsectionId={subsection.id} onOpenNotes={onOpenNotes} />
          ))}
          {isMaster && (
            <button 
              onClick={() => addTask(subsection.id, '')}
              className={theme.components.hierarchy.addTaskButton}
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-gray-200 dark:bg-gray-700 group-hover/add-task:bg-blue-100 dark:group-hover/add-task:bg-blue-900/40 flex items-center justify-center transition-colors">
                <Plus className="w-3 h-3" />
              </div>
              Add Task
            </button>
          )}
        </div>
      )}
    </div>
  );
};

