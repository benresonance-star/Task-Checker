import React, { useState, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { clsx } from 'clsx';

export const ScratchpadWidget: React.FC = () => {
  const { 
    currentUser, 
    addScratchpadTask, 
    toggleScratchpadTask, 
    deleteScratchpadTask, 
    clearCompletedScratchpad 
  } = useTasklistStore();

  const [inputText, setInputText] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const scratchpad = currentUser?.scratchpad || [];

  // Derived categories from existing tasks + default "Personal"
  const categories = useMemo(() => {
    const cats = new Set(['Personal']);
    scratchpad.forEach(item => cats.add(item.category));
    return Array.from(cats);
  }, [scratchpad]);

  // Filter tasks based on active category
  const filteredTasks = useMemo(() => {
    if (activeCategory === 'All') return scratchpad.sort((a, b) => b.createdAt - a.createdAt);
    return scratchpad
      .filter(t => t.category === activeCategory)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [scratchpad, activeCategory]);

  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    
    // Auto-categorize: If we are in a specific category (not All), use that. 
    // Otherwise default to Personal.
    const category = activeCategory === 'All' ? 'Personal' : activeCategory;
    addScratchpadTask(inputText.trim(), category);
    setInputText('');
  };

  const completedCount = filteredTasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Personal Scratchpad</h3>
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
        {/* Category Tabs */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200/50 dark:border-gray-800/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory('All')}
            className={clsx(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
              activeCategory === 'All' 
                ? "bg-google-blue text-white shadow-md" 
                : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-google-blue"
            )}
          >
            All
          </button>
          {categories.map(cat => (
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

        {/* Quick Input */}
        <form onSubmit={handleAddTask} className="p-4 flex gap-2">
          <input
            type="text"
            className="flex-1 bg-white/50 dark:bg-black/20 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-google-blue transition-all placeholder-gray-400"
            placeholder={`Add to ${activeCategory === 'All' ? 'Personal' : activeCategory}...`}
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
                  "group flex items-center gap-3 p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-right-2 duration-200",
                  task.completed 
                    ? "bg-gray-50/50 dark:bg-white/5 border-transparent opacity-60" 
                    : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md"
                )}
              >
                <button
                  onClick={() => toggleScratchpadTask(task.id)}
                  className={clsx(
                    "shrink-0 transition-colors",
                    task.completed ? "text-google-blue" : "text-gray-300 hover:text-google-blue"
                  )}
                >
                  {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className={clsx(
                    "text-xs font-bold break-words",
                    task.completed && "line-through"
                  )}>
                    {task.text}
                  </span>
                  {activeCategory === 'All' && (
                    <span className="text-[8px] font-black uppercase text-google-blue/60 tracking-wider">
                      {task.category}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => deleteScratchpadTask(task.id)}
                  className="p-1 text-gray-300 hover:text-google-red opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

