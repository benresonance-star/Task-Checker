import React, { useState, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Plus, Trash2, CheckCircle2, Circle, Clock, X } from 'lucide-react';
import { clsx } from 'clsx';

export const ScratchpadWidget: React.FC = () => {
  const { 
    currentUser, 
    projects,
    addScratchpadTask, 
    toggleScratchpadTask, 
    updateScratchpadTask,
    deleteScratchpadTask, 
    clearCompletedScratchpad 
  } = useTasklistStore();

  const [inputText, setInputText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('Personal');
  
  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingCategory, setEditingCategory] = useState('');

  const scratchpad = currentUser?.scratchpad || [];

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

  // Filter tasks based on active category
  const filteredTasks = useMemo(() => {
    if (activeCategory === 'All') return [...scratchpad].sort((a, b) => b.createdAt - a.createdAt);
    return scratchpad
      .filter(t => t.category === activeCategory)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [scratchpad, activeCategory]);

  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    
    addScratchpadTask(inputText.trim(), selectedCategory);
    setInputText('');
  };

  const startEditing = (task: any) => {
    setEditingId(task.id);
    setEditingText(task.text);
    setEditingCategory(task.category);
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateScratchpadTask(editingId, { 
      text: editingText.trim(), 
      category: editingCategory 
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const completedCount = filteredTasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">My Notes</h3>
        {completedCount > 0 && (
          <button 
            onClick={() => clearCompletedScratchpad(activeCategory)}
            className="text-[9px] font-black uppercase text-google-blue hover:underline tracking-widest"
          >
            Clear Done
          </button>
        )}
      </div>

      <div className="flex-1 bg-white/30 dark:bg-black/10 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden transition-all">
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
          <div className="flex gap-2">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-google-blue transition-all max-w-[120px] truncate"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <form onSubmit={handleAddTask} className="flex-1 flex gap-2">
              <input
                type="text"
                className="flex-1 bg-white/50 dark:bg-black/20 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-google-blue transition-all placeholder-gray-400"
                placeholder={`Add note...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button
                type="submit"
                className="w-10 h-10 bg-google-blue text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
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
            filteredTasks.map(task => (
              <div 
                key={task.id}
                className={clsx(
                  "group flex flex-col gap-2 p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-2 duration-200",
                  task.id === editingId ? "bg-blue-50/50 dark:bg-blue-900/10 border-google-blue ring-2 ring-google-blue/20" :
                  task.completed 
                    ? "bg-gray-50/50 dark:bg-white/5 border-transparent opacity-60" 
                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleScratchpadTask(task.id)}
                    className={clsx(
                      "shrink-0 transition-colors mt-0.5",
                      task.completed ? "text-google-blue" : "text-gray-300 hover:text-google-blue"
                    )}
                  >
                    {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    {task.id === editingId ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          className="w-full bg-white dark:bg-gray-900 border-2 border-google-blue rounded-xl p-2 text-xs font-bold outline-none resize-none min-h-[60px]"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
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
                            <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-google-red transition-colors"><X className="w-4 h-4" /></button>
                            <button onClick={saveEdit} className="p-1 text-google-blue hover:text-google-blue/80 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span 
                          onClick={() => startEditing(task)}
                          className={clsx(
                            "text-xs font-bold break-words cursor-text hover:text-google-blue transition-colors",
                            task.completed && "line-through"
                          )}
                        >
                          {task.text}
                        </span>
                        {(activeCategory === 'All' || task.category !== activeCategory) && (
                          <span className="text-[8px] font-black uppercase text-google-blue/60 tracking-wider mt-1">
                            {task.category}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {task.id !== editingId && (
                    <button
                      onClick={() => deleteScratchpadTask(task.id)}
                      className="p-1 text-gray-300 hover:text-google-red opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

