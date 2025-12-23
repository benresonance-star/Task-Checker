import React, { useState, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Plus, Trash2, CheckCircle2, Circle, Clock, X, Bold, List, ListOrdered, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
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

export const ScratchpadWidget: React.FC = () => {
  const { 
    currentUser, 
    projects,
    addScratchpadTask, 
    toggleScratchpadTask, 
    updateScratchpadTask,
    deleteScratchpadTask, 
    reorderScratchpad,
  } = useTasklistStore();

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  const [showDone, setShowDone] = useState(false);
  
  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState('');

  const scratchpad = currentUser?.scratchpad || [];
  const totalInView = useMemo(() => {
    return activeCategory === 'All' ? scratchpad : scratchpad.filter(t => t.category === activeCategory);
  }, [scratchpad, activeCategory]);

  const hasDoneTasks = totalInView.some(t => t.completed);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[40px] text-sm font-bold placeholder:text-gray-400',
      },
    },
  });

  // Tiptap Editor for Editing Existing Note
  const inlineEditor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[60px] text-xs font-bold',
      },
    },
  });

  // Derived categories from projects + default "Personal"
  const availableCategories = useMemo(() => {
    const projectNames = projects.map(p => p.name);
    return ['Personal', ...projectNames];
  }, [projects]);

  // Combined categories for filtering (only categories that actually have tasks)
  const filterCategories = useMemo(() => {
    const cats = new Set(['All']);
    scratchpad.forEach(item => cats.add(item.category));
    return Array.from(cats);
  }, [scratchpad]);

  // Filter tasks based on active category and visibility of done tasks
  const filteredTasks = useMemo(() => {
    let tasks = activeCategory === 'All' ? scratchpad : scratchpad.filter(t => t.category === activeCategory);
    if (!showDone) {
      tasks = tasks.filter(t => !t.completed);
    }
    return tasks;
  }, [scratchpad, activeCategory, showDone]);

  const handleAddTask = () => {
    if (!addEditor) return;
    const content = addEditor.getHTML();
    // Check if empty (tiptap returns <p></p> for empty)
    if (content === '<p></p>' || !addEditor.getText().trim()) return;
    
    addScratchpadTask(content, selectedCategory);
    addEditor.commands.setContent('');
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
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">My Notes</h3>
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
      </div>

      <div className="flex-1 bg-[var(--notes-bg)] rounded-[2rem] border-2 border-[var(--notes-border)] flex flex-col overflow-hidden transition-all">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200/50 dark:border-gray-800/50 overflow-x-auto no-scrollbar">
          {filterCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                activeCategory === cat 
                  ? "bg-google-blue text-white shadow-md" 
                  : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-google-blue"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Input & Category Picker */}
        <div className="p-4 space-y-3">
          <div className="flex flex-col gap-2 bg-white/50 dark:bg-black/20 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-2 transition-all focus-within:border-google-blue">
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200/50 dark:border-gray-800/50">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-google-blue max-w-[150px] truncate"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => addEditor?.chain().focus().toggleBold().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('bold') && "bg-gray-200 dark:bg-white/10")}><Bold className="w-3 h-3" /></button>
                <button onClick={() => addEditor?.chain().focus().toggleBulletList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('bulletList') && "bg-gray-200 dark:bg-white/10")}><List className="w-3 h-3" /></button>
                <button onClick={() => addEditor?.chain().focus().toggleOrderedList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", addEditor?.isActive('orderedList') && "bg-gray-200 dark:bg-white/10")}><ListOrdered className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="flex gap-2 p-2 pt-1 items-end">
              <div className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
                <EditorContent editor={addEditor} className="w-full" />
              </div>
              <button
                onClick={handleAddTask}
                className="w-10 h-10 bg-google-blue text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0 mb-1"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
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
                    onDelete={deleteScratchpadTask}
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
  onDelete: (id: string) => void;
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
  onDelete,
  onSave,
  onCancel,
  editingCategory,
  setEditingCategory,
  inlineEditor
}) => {
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
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  const isEditing = task.id === editingId;

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: isEditing ? undefined : (task.completed ? undefined : (task.category === 'Personal' ? 'var(--note-personal-bg)' : 'var(--note-project-bg)'))
      }}
      className={clsx(
        "group flex flex-col gap-2 p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-2 duration-200",
        isEditing ? "bg-blue-50/50 dark:bg-blue-900/10 border-google-blue ring-2 ring-google-blue/20" :
        task.completed 
          ? "bg-gray-50/50 dark:bg-white/5 border-transparent opacity-60" 
          : "border-transparent shadow-sm hover:shadow-md"
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
              <div className="flex items-center gap-1 pb-1 border-b border-gray-200 dark:border-gray-700 mb-1">
                <button onClick={() => inlineEditor?.chain().focus().toggleBold().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('bold') && "bg-gray-200 dark:bg-white/10")}><Bold className="w-3 h-3" /></button>
                <button onClick={() => inlineEditor?.chain().focus().toggleBulletList().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('bulletList') && "bg-gray-200 dark:bg-white/10")}><List className="w-3 h-3" /></button>
                <button onClick={() => inlineEditor?.chain().focus().toggleOrderedList().run()} className={clsx("p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", inlineEditor?.isActive('orderedList') && "bg-gray-200 dark:bg-white/10")}><ListOrdered className="w-3 h-3" /></button>
              </div>
              <div className="w-full bg-white dark:bg-gray-900 border-2 border-google-blue rounded-xl p-2 overflow-y-auto max-h-[200px] custom-scrollbar">
                <EditorContent editor={inlineEditor} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <select 
                  value={editingCategory}
                  onChange={(e) => setEditingCategory(e.target.value)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest outline-none focus:border-google-blue"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
              {(activeCategory === 'All' || task.category !== activeCategory) && (
                <span className="text-[8px] font-black uppercase text-google-blue/60 tracking-wider mt-1">
                  {task.category}
                </span>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-300 hover:text-google-red opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

