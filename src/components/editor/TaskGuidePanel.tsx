import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskGuide, PrepItem, Complexity } from '../../types';
import { NoteEditor } from './NoteEditor';
import { Button } from '../ui/Button';
import { 
  ExternalLink, 
  Plus, 
  Trash2, 
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  FileText
} from 'lucide-react';
import { clsx } from 'clsx';
import { theme } from '../../styles/theme';
import { useTasklistStore } from '../../store/useTasklistStore';
import { generateUUID } from '../../utils/uuid';

interface TaskGuidePanelProps {
  task: Task;
  mode: 'master' | 'project';
  showComplexityHeader?: boolean;
}

interface InlineInputProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}

const InlineInput: React.FC<InlineInputProps> = ({ value, onSave, className, placeholder, multiline = false, type = "text" }) => {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue, multiline]);

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        className={clsx("bg-transparent border-none focus:ring-0 outline-none p-0 resize-none overflow-hidden", className)}
        value={localValue}
        placeholder={placeholder}
        rows={1}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
      />
    );
  }

  return (
    <input
      type={type}
      className={clsx("bg-transparent border-none focus:ring-0 outline-none p-0", className)}
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

export const TaskGuidePanel: React.FC<TaskGuidePanelProps> = ({ task, mode, showComplexityHeader = true }) => {
  const { updateTaskGuide } = useTasklistStore();
  const [showFullInstructions, setShowFullInstructions] = useState(false);
  const [isGuideCollapsed, setIsGuideCollapsed] = useState(() => {
    return localStorage.getItem(`guide_collapsed_${task.id}`) === 'true';
  });

  const isMaster = mode === 'master';
  const guide = task.guide || {};

  // Local state for description and complexity to prevent lag/reverts
  const [localDesc, setLocalDesc] = useState(guide.description || '');
  const [localComplexity, setLocalComplexity] = useState<Complexity | ''>(guide.complexity || '');
  
  // New item inputs for "auto-add" functionality
  const [newPrereq, setNewPrereq] = useState('');
  const [newPitfall, setNewPitfall] = useState('');

  const descRef = React.useRef<HTMLTextAreaElement>(null);

  // Sync local state when task changes
  React.useEffect(() => {
    setLocalDesc(guide.description || '');
    setLocalComplexity(guide.complexity || '');
    
    // Restore description height from localStorage
    if (descRef.current) {
      const savedHeight = localStorage.getItem(`desc_height_${task.id}`);
      if (savedHeight) {
        descRef.current.style.height = savedHeight;
      }
    }
  }, [task.id, guide.description, guide.complexity]);

  const toggleGuideCollapse = () => {
    const newState = !isGuideCollapsed;
    setIsGuideCollapsed(newState);
    localStorage.setItem(`guide_collapsed_${task.id}`, String(newState));
  };

  const handleDescResize = () => {
    if (descRef.current) {
      localStorage.setItem(`desc_height_${task.id}`, descRef.current.style.height);
    }
  };

  const handleUpdate = (updates: Partial<TaskGuide>) => {
    updateTaskGuide(task.id, updates);
  };

  const handleDescBlur = () => {
    if (localDesc !== (guide.description || '')) {
      handleUpdate({ description: localDesc });
    }
  };

  const addPrerequisite = (text: string) => {
    if (!text.trim()) return;
    handleUpdate({ requiredBefore: [...(guide.requiredBefore || []), text.trim()] });
    setNewPrereq('');
  };

  const removePrerequisite = (index: number) => {
    const newList = [...(guide.requiredBefore || [])];
    newList.splice(index, 1);
    handleUpdate({ requiredBefore: newList });
  };

  const updatePrerequisite = (index: number, text: string) => {
    const newList = [...(guide.requiredBefore || [])];
    newList[index] = text;
    handleUpdate({ requiredBefore: newList });
  };

  const addPrepItem = (type: 'internal' | 'external' | 'text') => {
    const newItem: PrepItem = {
      id: generateUUID(),
      label: type === 'text' ? '' : '',
      url: type === 'text' ? undefined : '',
      type
    };
    
    handleUpdate({ helpfulPrep: [...(guide.helpfulPrep || []), newItem] });
  };

  const removePrepLink = (id: string) => {
    handleUpdate({ helpfulPrep: (guide.helpfulPrep || []).filter(l => l.id !== id) });
  };

  const updatePrepItem = (id: string, updates: Partial<PrepItem>) => {
    handleUpdate({
      helpfulPrep: (guide.helpfulPrep || []).map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const addPitfall = (text: string) => {
    if (!text.trim()) return;
    if ((guide.watchOutFor || []).length >= 3) {
      alert('Maximum 3 items allowed for focus.');
      return;
    }
    handleUpdate({ watchOutFor: [...(guide.watchOutFor || []), text.trim()] });
    setNewPitfall('');
  };

  const removePitfall = (index: number) => {
    const newList = [...(guide.watchOutFor || [])];
    newList.splice(index, 1);
    handleUpdate({ watchOutFor: newList });
  };

  const updatePitfall = (index: number, text: string) => {
    const newList = [...(guide.watchOutFor || [])];
    newList[index] = text;
    handleUpdate({ watchOutFor: newList });
  };

  const complexityColors = {
    Easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Complex: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={toggleGuideCollapse}
          className="flex items-center gap-2 text-sm font-black uppercase text-gray-600 dark:text-gray-400 hover:text-google-blue dark:hover:text-white transition-colors tracking-widest"
        >
          {isGuideCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          <Info className="w-5 h-5" />
          Task Guide & Information
        </button>
      </div>

      {!isGuideCollapsed && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 1. Task Description */}
          <div className={theme.components.taskGuide.block}>
            <label className={theme.components.taskGuide.header}>What this Task Achieves</label>
            {isMaster ? (
              <textarea
                ref={descRef}
                className={theme.components.taskGuide.inputMaster}
                placeholder="What is this task about?"
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={handleDescBlur}
                onMouseUp={handleDescResize}
              />
            ) : (
              <div className="px-2">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-wrap">
                  {guide.description || 'No description provided.'}
                </p>
              </div>
            )}
          </div>

          {/* 2. Task Complexity (Conditional) */}
          {showComplexityHeader && (
            <div className={theme.components.taskGuide.block}>
              <label className={theme.components.taskGuide.header}>Task Complexity</label>
              <div className="px-2">
                {isMaster ? (
                  <select
                    className={clsx(
                      "w-full max-w-xs bg-blue-50/30 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-button p-3 text-sm font-black outline-none transition-all text-gray-800 dark:text-gray-300",
                      localComplexity && complexityColors[localComplexity as Complexity],
                      !localComplexity && "text-gray-400 dark:text-gray-300/60"
                    )}
                    value={localComplexity}
                    onChange={(e) => {
                      const val = e.target.value as Complexity | '';
                      setLocalComplexity(val);
                      handleUpdate({ complexity: val || undefined });
                    }}
                  >
                    <option value="" className="bg-white dark:bg-gray-900 text-gray-500">Select Complexity...</option>
                    <option value="Easy" className="bg-white dark:bg-gray-900 text-green-600">Easy</option>
                    <option value="Moderate" className="bg-white dark:bg-gray-900 text-amber-600">Moderate</option>
                    <option value="Complex" className="bg-white dark:bg-gray-900 text-red-600">Complex</option>
                  </select>
                ) : (
                  <div className={clsx(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest",
                    guide.complexity ? complexityColors[guide.complexity] : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300/60"
                  )}>
                    <Zap className="w-3.5 h-3.5" />
                    {guide.complexity || 'Unrated'}
                  </div>
                )}
              </div>
            </div>
          )}

      {/* 3. Prerequisites */}
      {(isMaster || (guide.requiredBefore?.length || 0) > 0) && (
        <div className={clsx(
          theme.components.taskGuide.blockPrereq,
          (guide.requiredBefore?.length || 0) > 0 && theme.components.taskGuide.blockPrereqActive
        )}>
          <div className={theme.components.taskGuide.headerPrereq}>
            <CheckCircle className="w-4 h-4" />
            <label className="text-[10px] font-black uppercase tracking-[0.2em]">Can I Proceed?</label>
          </div>
          <div className="space-y-2 px-2">
            {(guide.requiredBefore || []).map((req, i) => (
              <div key={i} className={theme.components.taskGuide.itemPrereq}>
                {isMaster ? (
                  <InlineInput
                    value={req}
                    onSave={(val) => updatePrerequisite(i, val)}
                    className="flex-1 text-xs font-bold text-gray-700 dark:text-gray-300"
                    placeholder="Requirement..."
                  />
                ) : (
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{req}</span>
                )}
                {isMaster && (
                  <button onClick={() => removePrerequisite(i)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {isMaster && (
              <div className="flex gap-2 mt-4">
                <input 
                  type="text" 
                  placeholder="Add requirement..." 
                  className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-card px-4 py-2 text-xs font-medium outline-none focus:border-orange-400 text-gray-800 dark:text-gray-300 placeholder-gray-400"
                  value={newPrereq}
                  onChange={(e) => setNewPrereq(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPrerequisite(newPrereq)}
                />
                <Button variant="ghost" size="sm" onClick={() => addPrerequisite(newPrereq)} className="h-10 w-10 p-0 rounded-button bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 hover:bg-orange-200">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Helpful to Prepare */}
      {(isMaster || (guide.helpfulPrep?.length || 0) > 0) && (
        <div className={theme.components.taskGuide.block}>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300/70 mb-4 px-2">
            <Lightbulb className="w-4 h-4" />
            <label className="text-[10px] font-black uppercase tracking-[0.2em]">Helpful (Optional)</label>
          </div>
          <div className="grid grid-cols-1 gap-3 px-2">
            {(guide.helpfulPrep || []).map((item) => (
              <div key={item.id} className={theme.components.taskGuide.itemPrep}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {item.type === 'text' ? (
                      <div className="flex items-start gap-3 text-xs font-bold text-gray-700 dark:text-gray-300 py-1 flex-1">
                        <FileText className="w-4 h-4 text-gray-400 dark:text-gray-300/40 mt-0.5 flex-shrink-0" />
                        {isMaster ? (
                          <InlineInput
                            value={item.label}
                            onSave={(val) => updatePrepItem(item.id, { label: val })}
                            className="flex-1 text-xs font-bold text-gray-700 dark:text-gray-300"
                            placeholder="Note..."
                            multiline
                          />
                        ) : (
                          <span className="break-words whitespace-pre-wrap flex-1 min-h-[1.25rem]">{item.label}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-start gap-3 py-1">
                          {item.type === 'internal' ? <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-google-blue dark:text-gray-300" /> : <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0 text-google-blue dark:text-gray-300" />}
                          {isMaster ? (
                            <InlineInput
                              value={item.label}
                              onSave={(val) => updatePrepItem(item.id, { label: val })}
                              className="flex-1 text-xs font-bold text-google-blue dark:text-gray-300"
                              placeholder="Link label..."
                              multiline
                            />
                          ) : (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs font-bold text-google-blue dark:text-gray-300 hover:underline break-words whitespace-pre-wrap flex-1 min-h-[1.25rem]"
                            >
                              {item.label}
                            </a>
                          )}
                        </div>
                        {isMaster && (
                          <div className="flex items-center gap-2 mt-2 ml-7">
                            <InlineInput
                              value={item.url || ''}
                              onSave={(val) => updatePrepItem(item.id, { url: val })}
                              className="text-[10px] text-gray-400 dark:text-gray-300/50 flex-1"
                              placeholder="URL..."
                            />
                            <div className="flex gap-1">
                              <button 
                                onClick={() => updatePrepItem(item.id, { type: 'internal' })}
                                className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors", item.type === 'internal' ? "bg-google-blue text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300/60")}
                              >INT</button>
                              <button 
                                onClick={() => updatePrepItem(item.id, { type: 'external' })}
                                className={clsx("px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors", item.type === 'external' ? "bg-google-blue text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300/60")}
                              >EXT</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isMaster && (
                    <button onClick={() => removePrepLink(item.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0 mt-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isMaster && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50">
                <button 
                  onClick={() => addPrepItem('external')}
                  className="px-4 py-2 rounded-button text-[10px] font-black uppercase tracking-[0.15em] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Link
                </button>
                <button 
                  onClick={() => addPrepItem('text')}
                  className="px-4 py-2 rounded-button text-[10px] font-black uppercase tracking-[0.15em] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Text
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Keep an Eye On */}
      {(isMaster || (guide.watchOutFor?.length || 0) > 0) && (
        <div className={clsx(theme.components.taskGuide.block, "mb-6")}>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300/70 mb-4 px-2">
            <AlertTriangle className="w-4 h-4" />
            <label className="text-[10px] font-black uppercase tracking-[0.2em]">Watch For (Max 3)</label>
          </div>
          <div className="space-y-3 px-2">
            {(guide.watchOutFor || []).map((pitfall, i) => (
              <div key={i} className="flex items-center justify-between bg-white dark:bg-black/40 px-4 py-3 rounded-card border border-gray-100 dark:border-gray-800 shadow-sm group">
                <div className="flex gap-3 flex-1 items-center">
                  <span className="text-xs font-black text-gray-400 dark:text-gray-300/40">{i + 1}.</span>
                  {isMaster ? (
                    <InlineInput
                      value={pitfall}
                      onSave={(val) => updatePitfall(i, val)}
                      className="flex-1 text-xs font-bold text-gray-700 dark:text-gray-300"
                      placeholder="Pitfall..."
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{pitfall}</span>
                  )}
                </div>
                {isMaster && (
                  <button onClick={() => removePitfall(i)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {isMaster && (guide.watchOutFor || []).length < 3 && (
              <div className="flex gap-2 mt-4">
                <input 
                  type="text" 
                  placeholder="Add focus point..." 
                  className="flex-1 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-card px-4 py-2 text-xs font-medium outline-none focus:border-gray-400 text-gray-800 dark:text-gray-300 placeholder-gray-400"
                  value={newPitfall}
                  onChange={(e) => setNewPitfall(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPitfall(newPitfall)}
                />
                <Button variant="ghost" size="sm" onClick={() => addPitfall(newPitfall)} className="h-10 w-10 p-0 rounded-button bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidance and Notes (Progressive Disclosure) */}
      {(isMaster || guide.content) && (
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setShowFullInstructions(!showFullInstructions)}
              className="flex items-center gap-2 text-sm font-black uppercase text-gray-600 dark:text-gray-300/70 hover:text-google-blue dark:hover:text-white transition-colors tracking-widest"
            >
              {showFullInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Info className="w-5 h-5" />
              Additional Guidance
            </button>
          </div>

          {showFullInstructions && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <NoteEditor 
                content={guide.content || ''} 
                onChange={(content) => handleUpdate({ content })} 
                readOnly={!isMaster}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>
);
};

