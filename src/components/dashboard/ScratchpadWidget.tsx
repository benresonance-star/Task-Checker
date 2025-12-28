import React, { useState, useMemo, useEffect } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  X, 
  Bold, 
  List, 
  ListOrdered, 
  GripVertical, 
  Flag, 
  ChevronDown, 
  ListPlus, 
  Bell,
  Search
} from 'lucide-react';
import { clsx } from 'clsx';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  MouseSensor,
  TouchSensor,
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Project } from '../../types';

const Dropdown: React.FC<{
  value: string;
  options: string[];
  onChange: (val: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  label?: string;
  className?: string;
  width?: string;
  align?: 'left' | 'right';
  showSearch?: boolean;
}> = ({ value, options, onChange, isOpen, setIsOpen, label, className, width = '200px', align = 'left', showSearch = false }) => {
  const [search, setSearch] = useState('');
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, direction: 'down' as 'up' | 'down', maxHeight: 300 });
  
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const preferredHeight = 350; // Total height including search
      
      let direction: 'up' | 'down' = 'down';
      let maxHeight = 300;

      if (spaceBelow < preferredHeight && spaceAbove > spaceBelow) {
        direction = 'up';
        maxHeight = Math.min(300, spaceAbove - 40);
      } else {
        direction = 'down';
        maxHeight = Math.min(300, spaceBelow - 40);
      }

      setCoords({ 
        top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY,
        left: align === 'left' ? rect.left : rect.right - parseInt(width),
        direction,
        maxHeight
      });
    }
  }, [isOpen, align, width]);

  return (
    <div className={clsx("relative", className)}>
      <button
        ref={buttonRef}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(''); }}
        className={clsx(
          "flex items-center gap-2 bg-white/50 dark:bg-black/20 border-2 rounded-xl px-2.5 py-1.5 transition-all group shadow-sm",
          isOpen ? "border-google-blue ring-4 ring-google-blue/10" : "border-gray-200 dark:border-gray-700 hover:border-google-blue"
        )}
      >
        {label && <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter shrink-0 group-hover:text-google-blue transition-colors">{label}</span>}
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 truncate max-w-[120px] text-left">
          {value === 'All' ? 'ALL NOTES' : value}
        </span>
        <ChevronDown className={clsx("w-3 h-3 text-gray-400 group-hover:text-google-blue transition-all", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[8000] bg-black/5" 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
          />
          <div 
            className={clsx(
              "fixed bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-2 border-blue-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[8001] overflow-hidden animate-in fade-in duration-200 flex flex-col",
              coords.direction === 'down' ? "slide-in-from-top-2" : "slide-in-from-bottom-2"
            )}
            style={{ 
              width,
              top: coords.direction === 'down' ? coords.top + 8 : undefined,
              bottom: coords.direction === 'up' ? (window.innerHeight - (coords.top - 8)) : undefined,
              left: Math.max(10, Math.min(window.innerWidth - parseInt(width) - 10, coords.left))
            }}
          >
            {showSearch && options.length > 5 && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-inherit">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input 
                    autoFocus
                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-700 rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-bold outline-none focus:border-google-blue text-gray-900 dark:text-gray-100"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div 
              className="overflow-y-auto custom-scrollbar p-1 flex-1"
              style={{ maxHeight: `${coords.maxHeight}px` }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-[9px] font-bold text-gray-400 italic uppercase tracking-widest">
                  No matches found
                </div>
              ) : (
                filteredOptions.map((opt: string, idx: number) => (
                  <button
                    key={`${opt}-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-left",
                      value === opt 
                        ? "bg-google-blue text-white shadow-md" 
                        : "text-gray-600 dark:text-gray-300 hover:bg-google-blue/10 hover:text-google-blue"
                    )}
                  >
                    <span className="truncate mr-2">{opt === 'All' ? 'ALL NOTES' : opt}</span>
                    {value === opt && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const ScratchpadWidget: React.FC<{ projects?: Project[] }> = ({ projects: propProjects }) => {
  const { 
    currentUser, 
    projects: storeProjects,
    addScratchpadTask, 
    toggleScratchpadTask, 
    toggleScratchpadPriority,
    updateScratchpadTask,
    deleteScratchpadTask, 
    reorderScratchpad,
    toggleNoteInActionSet,
  } = useTasklistStore();

  const projects = propProjects || storeProjects;

  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('notes_active_category') || 'All');
  const [selectedCategory, setSelectedCategory] = useState(() => localStorage.getItem('notes_selected_category') || 'Personal');
  const [showDone, setShowDone] = useState(() => localStorage.getItem('notes_show_done') === 'true');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isAddCategoryMenuOpen, setIsAddCategoryMenuOpen] = useState(false);

  // New Note State
  const [newNotePriority, setNewNotePriority] = useState(false);
  const [newNoteInSession, setNewNoteInSession] = useState(false);
  const [showNewNoteReminderPicker, setShowNewNoteReminderPicker] = useState(false);
  const [newNoteReminderTime, setNewNoteReminderTime] = useState('');
  const [newNoteReminder, setNewNoteReminder] = useState<any>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('notes_active_category', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    localStorage.setItem('notes_selected_category', selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    localStorage.setItem('notes_show_done', showDone.toString());
  }, [showDone]);
  
  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState('');

  const scratchpad = currentUser?.scratchpad || [];
  const totalInView = useMemo(() => {
    return activeCategory === 'All' ? scratchpad : scratchpad.filter((t: any) => t.category === activeCategory);
  }, [scratchpad, activeCategory]);

  const hasDoneTasks = totalInView.some((t: any) => t.completed);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = scratchpad.findIndex((item) => item.id === active.id);
      const newIndex = scratchpad.findIndex((item) => item.id === over.id);
      const newScratchpad = arrayMove(scratchpad, oldIndex, newIndex);
      reorderScratchpad(newScratchpad);
    }
  };

  // Tiptap Editor for New Note
  const addEditor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[80px] h-full text-sm font-bold placeholder:text-gray-400',
      },
    },
  });

  // Tiptap Editor for Editing Existing Note
  const inlineEditor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[60px] h-full text-xs font-bold',
      },
    },
  });

  // Derived categories from projects + default "Personal"
  const availableCategories = useMemo(() => {
    const projectNames = projects.map((p: any) => p.name);
    return ['Personal', ...projectNames];
  }, [projects]);

  // Combined categories for filtering (only categories that actually have tasks)
  const filterCategories = useMemo(() => {
    const cats = new Set(['All']);
    scratchpad.forEach((item: any) => cats.add(item.category));
    return Array.from(cats);
  }, [scratchpad]);

  // Filter tasks based on active category and visibility of done tasks
  const filteredTasks = useMemo(() => {
    let tasks = activeCategory === 'All' ? scratchpad : scratchpad.filter((t: any) => t.category === activeCategory);
    if (!showDone) {
      tasks = tasks.filter((t: any) => !t.completed);
    }
    return tasks;
  }, [scratchpad, activeCategory, showDone]);

  const handleAddTask = () => {
    if (!addEditor) return;
    const content = addEditor.getHTML();
    // Check if empty (tiptap returns <p></p> for empty)
    if (content === '<p></p>' || !addEditor.getText().trim()) return;
    
    addScratchpadTask(content, selectedCategory, newNotePriority, newNoteReminder, newNoteInSession);
    addEditor.commands.setContent('');
    setIsEditorOpen(false);
    
    // Reset states
    setNewNotePriority(false);
    setNewNoteInSession(false);
    setNewNoteReminder(null);
    setNewNoteReminderTime('');
  };

  const startEditing = (task: any) => {
    setEditingId(task.id);
    setEditingCategory(task.category);
    if (inlineEditor) {
      inlineEditor.commands.setContent(task.text);
      // Wait for next tick to focus
      setTimeout(() => inlineEditor.commands.focus(), 10);
    }
  };

  const saveEdit = () => {
    if (!editingId || !inlineEditor) return;
    const content = inlineEditor.getHTML();
    updateScratchpadTask(editingId, { 
      text: content, 
      category: editingCategory 
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex-1 flex flex-col overflow-visible transition-all relative">
        {/* Quick Input & Category Picker */}
        <div className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isEditorOpen ? "max-h-[300px] opacity-100 p-4 pb-0" : "max-h-0 opacity-0 p-0"
        )}>
          <div className="flex flex-col gap-2 bg-[var(--notes-editor-bg)] border-2 border-[var(--notes-editor-border)] rounded-2xl p-2 transition-all focus-within:border-google-blue shadow-inner">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--notes-editor-separator)]">
              <Dropdown 
                value={selectedCategory}
                options={availableCategories}
                onChange={setSelectedCategory}
                isOpen={isAddCategoryMenuOpen}
                setIsOpen={setIsAddCategoryMenuOpen}
                width="220px"
                showSearch
              />
              <div className="flex items-center gap-1">
                <button onClick={() => addEditor?.chain().focus().toggleBold().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('bold') && "bg-gray-200 dark:bg-white/10")}><Bold className="w-3 h-3" /></button>
                <button onClick={() => addEditor?.chain().focus().toggleBulletList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('bulletList') && "bg-gray-200 dark:bg-white/10")}><List className="w-3 h-3" /></button>
                <button onClick={() => addEditor?.chain().focus().toggleOrderedList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('orderedList') && "bg-gray-200 dark:bg-white/10")}><ListOrdered className="w-3 h-3" /></button>
                
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1" />

                <button 
                  onClick={() => setNewNoteInSession(!newNoteInSession)} 
                  className={clsx("p-1.5 rounded transition-all", newNoteInSession ? "bg-google-blue text-white shadow-sm" : "text-gray-400 hover:text-google-blue hover:bg-google-blue/10")}
                  title="Add to My Session"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                </button>

                <button 
                  onClick={() => setNewNotePriority(!newNotePriority)} 
                  className={clsx("p-1.5 rounded transition-all", newNotePriority ? "bg-google-red text-white shadow-sm" : "text-gray-400 hover:text-google-red hover:bg-google-red/10")}
                  title="Flag as Priority"
                >
                  <Flag className={clsx("w-3.5 h-3.5", newNotePriority && "fill-current")} />
                </button>

                <div className="relative">
                  <button 
                    onClick={() => setShowNewNoteReminderPicker(!showNewNoteReminderPicker)} 
                    className={clsx("p-1.5 rounded transition-all", newNoteReminder ? "bg-orange-500 text-white shadow-sm" : "text-gray-400 hover:text-orange-500 hover:bg-orange-500/10")}
                    title="Set Alert"
                  >
                    <Bell className={clsx("w-3.5 h-3.5", newNoteReminder && "fill-current")} />
                  </button>

                  {showNewNoteReminderPicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-[7000] bg-black/10 backdrop-blur-[2px]" 
                        onClick={(e) => { e.stopPropagation(); setShowNewNoteReminderPicker(false); }} 
                      />
                      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 border-2 border-orange-200 dark:border-gray-700 rounded-2xl p-4 shadow-2xl z-[7001] min-w-[280px] animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-orange-500" />
                            <span>Set Reminder</span>
                          </div>
                        </div>
                        <input 
                          type="datetime-local" 
                          className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500 transition-all mb-4 text-[var(--text-primary)]"
                          value={newNoteReminderTime}
                          onChange={(e) => setNewNoteReminderTime(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const date = new Date(newNoteReminderTime);
                              if (!isNaN(date.getTime())) {
                                setNewNoteReminder({ dateTime: date.getTime(), status: 'active', snoozeCount: 0 });
                                setShowNewNoteReminderPicker(false);
                              }
                            }
                            if (e.key === 'Escape') setShowNewNoteReminderPicker(false);
                          }}
                          autoFocus
                        />
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              const date = new Date(newNoteReminderTime);
                              if (!isNaN(date.getTime())) {
                                setNewNoteReminder({ dateTime: date.getTime(), status: 'active', snoozeCount: 0 });
                                setShowNewNoteReminderPicker(false);
                              }
                            }}
                            disabled={!newNoteReminderTime}
                            className="w-full py-3 bg-google-blue text-white hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            Set Alert
                          </button>
                          {newNoteReminder && (
                            <button 
                              onClick={() => { setNewNoteReminder(null); setNewNoteReminderTime(''); setShowNewNoteReminderPicker(false); }}
                              className="w-full py-3 bg-google-red/10 text-google-red hover:bg-google-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Remove Alert
                            </button>
                          )}
                          <button 
                            onClick={() => setShowNewNoteReminderPicker(false)}
                            className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-2 pt-1 items-stretch">
              <div className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
                <EditorContent editor={addEditor} className="w-full h-full" />
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="w-10 h-10 bg-google-red text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
                  title="Close Editor"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={handleAddTask}
                  className="w-10 h-10 bg-google-blue text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
                  title="Add Note"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Custom Dropdown */}
        <div className={clsx(
          "flex items-center justify-between gap-2 px-4 border-b border-gray-200/30 dark:border-gray-800/30 transition-all relative z-[20]",
          isEditorOpen ? "py-3" : "pt-5 pb-4"
        )}>
          <Dropdown 
            label="Filter by:"
            value={activeCategory}
            options={filterCategories}
            onChange={setActiveCategory}
            isOpen={isFilterMenuOpen}
            setIsOpen={setIsFilterMenuOpen}
            width="220px"
            showSearch
          />

          <div className="flex items-center gap-4">
            {hasDoneTasks && (
              <button 
                onClick={() => setShowDone(!showDone)}
                className={clsx(
                  "text-[9px] font-black uppercase tracking-widest transition-all",
                  showDone ? "text-google-green" : "text-google-blue hover:underline"
                )}
              >
                {showDone ? "Hide Done" : "Show Done"}
              </button>
            )}

            {!isEditorOpen && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="w-10 h-10 bg-google-blue text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all group"
                title="Add New Note"
              >
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              </button>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
          {filteredTasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-8">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No tasks yet</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext
                items={filteredTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredTasks.map(task => (
                  <SortableScratchpadItem 
                    key={task.id}
                    task={task}
                    editingId={editingId}
                    activeCategory={activeCategory}
                    availableCategories={availableCategories}
                    onStartEditing={startEditing}
                    onToggle={toggleScratchpadTask}
                    onTogglePriority={toggleScratchpadPriority}
                    onDelete={deleteScratchpadTask}
                    onToggleActionSet={toggleNoteInActionSet}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    editingCategory={editingCategory}
                    setEditingCategory={setEditingCategory}
                    inlineEditor={inlineEditor}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
};

interface SortableItemProps {
  task: any;
  editingId: string | null;
  activeCategory: string;
  availableCategories: string[];
  onStartEditing: (task: any) => void;
  onToggle: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActionSet: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  editingCategory: string;
  setEditingCategory: (cat: string) => void;
  inlineEditor: any;
}

const SortableScratchpadItem: React.FC<SortableItemProps> = ({
  task,
  editingId,
  activeCategory,
  availableCategories,
  onStartEditing,
  onToggle,
  onTogglePriority,
  onDelete,
  onToggleActionSet,
  onSave,
  onCancel,
  editingCategory,
  setEditingCategory,
  inlineEditor
}) => {
  const [isEditCategoryMenuOpen, setIsEditCategoryMenuOpen] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState<string>('');
  const { currentUser, updateScratchpadTask } = useTasklistStore();
  
  const handleSaveReminder = () => {
    const date = new Date(tempReminderTime);
    if (!isNaN(date.getTime())) {
      updateScratchpadTask(task.id, { 
        reminder: { 
          dateTime: date.getTime(), 
          status: 'active', 
          snoozeCount: 0 
        } 
      });
      setShowReminderPicker(false);
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  const isEditing = task.id === editingId;
  const isInActionSet = currentUser?.actionSet?.some((i: any) => i.type === 'note' && i.taskId === task.id);

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isEditing ? undefined : (task.completed ? undefined : (task.priority ? 'var(--note-priority-bg)' : (task.category === 'Personal' ? 'var(--note-personal-bg)' : 'var(--note-project-bg)')))
      }}
      className={clsx(
        "group flex flex-col gap-2 p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-2 duration-200",
        isEditing ? "bg-blue-50/50 dark:bg-blue-900/10 border-google-blue ring-2 ring-google-blue/20" :
        task.completed 
          ? "bg-gray-50/50 dark:bg-white/5 border-transparent opacity-60" 
          : (task.priority ? "border-red-200 dark:border-red-900/30 shadow-md" : "border-transparent shadow-sm hover:shadow-md")
      )}
    >
      <div className="flex items-start gap-3">
        <div 
          {...attributes} 
          {...listeners}
          className="mt-1 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        <button
          onClick={() => onToggle(task.id)}
          className={clsx(
            "shrink-0 transition-colors mt-0.5",
            task.completed ? "text-google-blue" : "text-gray-300 hover:text-google-blue"
          )}
        >
          {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>
        
        <div className="flex-1 min-w-0 flex flex-col">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1 pb-1 border-b border-[var(--notes-editor-separator)] mb-1">
            <button onClick={() => inlineEditor?.chain().focus().toggleBold().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('bold') && "bg-gray-200 dark:bg-white/10")}><Bold className="w-3 h-3" /></button>
            <button onClick={() => inlineEditor?.chain().focus().toggleBulletList().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('bulletList') && "bg-gray-200 dark:bg-white/10")}><List className="w-3 h-3" /></button>
            <button onClick={() => inlineEditor?.chain().focus().toggleOrderedList().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('orderedList') && "bg-gray-200 dark:bg-white/10")}><ListOrdered className="w-3 h-3" /></button>
          </div>
          <div className="w-full bg-[var(--notes-editor-bg)] border-2 border-google-blue rounded-xl p-2 overflow-y-auto max-h-[200px] custom-scrollbar">
            <EditorContent editor={inlineEditor} className="w-full h-full" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
                <Dropdown 
                  value={editingCategory}
                  options={availableCategories}
                  onChange={setEditingCategory}
                  isOpen={isEditCategoryMenuOpen}
                  setIsOpen={setIsEditCategoryMenuOpen}
                  width="180px"
                />
                <div className="flex items-center gap-1">
                  <button onClick={onCancel} className="p-1 text-gray-400 hover:text-google-red transition-colors"><X className="w-4 h-4" /></button>
                  <button onClick={onSave} className="p-1 text-google-blue hover:text-google-blue/80 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div 
                onClick={() => onStartEditing(task)}
                className={clsx(
                  "text-xs font-bold break-words cursor-text hover:text-google-blue transition-colors prose prose-sm dark:prose-invert max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0",
                  task.completed && "line-through opacity-50"
                )}
                dangerouslySetInnerHTML={{ __html: task.text }}
              />
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {(activeCategory === 'All' || task.category !== activeCategory) && (
                  <span className="text-[8px] font-black uppercase text-google-blue/60 tracking-wider">
                    {task.category}
                  </span>
                )}
                {task.reminder && (
                  <span className={clsx(
                    "inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-all",
                    task.completed ? "opacity-30" : "text-orange-600 dark:text-orange-400 animate-pulse"
                  )}>
                    <Bell className="w-2.5 h-2.5 fill-current" />
                    {new Date(task.reminder.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex flex-col gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onToggleActionSet(task.id)}
              className={clsx(
                "p-1 rounded-lg transition-all",
                isInActionSet 
                  ? "bg-google-blue text-white shadow-sm" 
                  : "text-gray-300 hover:text-google-blue hover:bg-google-blue/10"
              )}
              title={isInActionSet ? "Remove from Session" : "Add to Session"}
            >
              <ListPlus className={clsx("w-3.5 h-3.5", isInActionSet && "animate-pulse")} />
            </button>
            <button
              onClick={() => onTogglePriority(task.id)}
              className={clsx(
                "p-1 transition-colors",
                task.priority ? "text-google-red" : "text-gray-300 hover:text-google-red"
              )}
              title="Toggle Priority"
            >
              <Flag className={clsx("w-3.5 h-3.5", task.priority && "fill-current")} />
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  setShowReminderPicker(!showReminderPicker);
                  if (!showReminderPicker) {
                    setTempReminderTime(task.reminder?.dateTime ? new Date(task.reminder.dateTime).toISOString().slice(0, 16) : '');
                  }
                }}
                className={clsx(
                  "p-1 transition-all",
                  task.reminder ? "text-orange-500" : "text-gray-300 hover:text-orange-500"
                )}
                title="Set Alert"
              >
                <Bell className={clsx("w-3.5 h-3.5", task.reminder && "fill-current")} />
              </button>
              {showReminderPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-[7000] bg-black/10 backdrop-blur-[2px]" 
                    onClick={(e) => { e.stopPropagation(); setShowReminderPicker(false); }} 
                  />
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 border-2 border-orange-200 dark:border-gray-700 rounded-2xl p-4 shadow-2xl z-[7001] min-w-[280px] animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-500" />
                        <span>Set Reminder</span>
                      </div>
                    </div>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500 transition-all mb-4 text-[var(--text-primary)]"
                      value={tempReminderTime}
                      onChange={(e) => setTempReminderTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveReminder();
                        if (e.key === 'Escape') setShowReminderPicker(false);
                      }}
                      autoFocus
                    />
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={handleSaveReminder}
                        disabled={!tempReminderTime}
                        className="w-full py-3 bg-google-blue text-white hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Set Alert
                      </button>
                      {task.reminder && (
                        <button 
                          onClick={() => { updateScratchpadTask(task.id, { reminder: null }); setShowReminderPicker(false); }}
                          className="w-full py-3 bg-google-red/10 text-google-red hover:bg-google-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Remove Alert
                        </button>
                      )}
                      <button 
                        onClick={() => setShowReminderPicker(false)}
                        className="w-full py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-300 hover:text-google-red"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

