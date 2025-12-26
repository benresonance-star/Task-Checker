import React, { useState, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { clsx } from 'clsx';
import { 
  Search, 
  Trash2, 
  ChevronRight, 
  Clock, 
  ArrowUpDown,
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface FeedbackEntry {
  userId: string;
  userName: string;
  projectId: string;
  projectName: string;
  instanceId: string;
  instanceTitle: string;
  taskId: string;
  taskTitle: string;
  feedback: string;
  lastUpdated: number;
}

export const FeedbackLedger: React.FC = () => {
  const navigate = useNavigate();
  const { instances, projects, deleteTaskFeedback } = useTasklistStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [highlightedId, setEditingId] = useState<string | null>(null);

  // Flatten instances into feedback entries
  const entries = useMemo(() => {
    const feedbackEntries: FeedbackEntry[] = [];
    
    instances.forEach(inst => {
      const project = projects.find(p => p.id === inst.projectId);
      if (!project) return;

      inst.sections.forEach(s => {
        s.subsections.forEach(ss => {
          ss.tasks.forEach(t => {
            const notes = String(t.userNotes || '').trim();
            // Filter: Only show if there is actually content
            if (notes && notes !== '<p></p>' && notes !== '<p><br></p>' && notes.length > 7) {
              // Try to find who last updated it (not explicitly tracked per task, so we use project context or generic)
              // In a real multi-user scenario, we might need a `lastUpdatedBy` field on the task.
              // For now, we'll attribute it to the current view of users.
              feedbackEntries.push({
                userId: '', // Placeholder
                userName: 'Project Team', // Generic for now
                projectId: project.id,
                projectName: project.name,
                instanceId: inst.id,
                instanceTitle: inst.title,
                taskId: t.id,
                taskTitle: t.title,
                feedback: notes,
                lastUpdated: t.lastUpdated || 0
              });
            }
          });
        });
      });
    });

    return feedbackEntries;
  }, [instances, projects]);

  const filteredEntries = useMemo(() => {
    let result = entries.filter(e => {
      const search = searchQuery.toLowerCase();
      return (
        e.projectName.toLowerCase().includes(search) ||
        e.instanceTitle.toLowerCase().includes(search) ||
        e.taskTitle.toLowerCase().includes(search) ||
        e.feedback.toLowerCase().includes(search)
      );
    });

    result.sort((a, b) => {
      return sortOrder === 'newest' ? b.lastUpdated - a.lastUpdated : a.lastUpdated - b.lastUpdated;
    });

    return result;
  }, [entries, searchQuery, sortOrder]);

  const handleDelete = async (e: React.MouseEvent, entry: FeedbackEntry) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently delete this feedback?')) {
      await deleteTaskFeedback(entry.taskId, entry.instanceId);
    }
  };

  const handleNavigate = (entry: FeedbackEntry) => {
    navigate(`/project/${entry.projectId}/instance/${entry.instanceId}?task=${entry.taskId}&scroll=true`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black/20 rounded-container border border-gray-300 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-google-blue/10 rounded-xl">
            <Clock className="w-5 h-5 text-google-blue" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-gray-300">Feedback Ledger</h4>
            <p className="text-[10px] font-bold text-gray-500 uppercase">{filteredEntries.length} Total Entries</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-google-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:border-google-blue transition-all w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-google-blue transition-all"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder}
          </button>
        </div>
      </div>

      {/* Ledger Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
            <Clock className="w-12 h-12 mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">No feedback entries found</p>
          </div>
        ) : (
          filteredEntries.map((entry, idx) => (
            <div 
              key={`${entry.instanceId}-${entry.taskId}-${idx}`}
              onClick={() => setEditingId(highlightedId === `${entry.instanceId}-${entry.taskId}` ? null : `${entry.instanceId}-${entry.taskId}`)}
              className={clsx(
                "group relative flex flex-col gap-3 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                highlightedId === `${entry.instanceId}-${entry.taskId}` 
                  ? "bg-blue-50/60 dark:bg-blue-900/30 border-google-blue shadow-lg scale-[1.01]" 
                  : "bg-blue-50/20 dark:bg-white/5 border-blue-100/50 dark:border-gray-800 hover:border-google-blue/30 hover:shadow-md"
              )}
            >
              {/* Context Breadcrumb Row */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black tracking-widest uppercase mb-1">
                <span className="text-google-blue dark:text-blue-400">{entry.projectName}</span>
                <ChevronRight className="w-3 h-3 text-blue-300 dark:text-blue-800" />
                <span className="text-blue-600/70 dark:text-gray-400">{entry.instanceTitle}</span>
                <ChevronRight className="w-3 h-3 text-blue-300 dark:text-blue-800" />
                <span className="text-gray-700 dark:text-gray-200">{entry.taskTitle}</span>
              </div>

              {/* User & Time Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase">{entry.userName}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300 mx-1" />
                  <span className="text-[9px] font-bold text-gray-400 italic">
                    {entry.lastUpdated ? formatDistanceToNow(entry.lastUpdated, { addSuffix: true }) : 'Recently'}
                  </span>
                </div>

                <div className={clsx(
                  "flex items-center gap-2 transition-all",
                  highlightedId === `${entry.instanceId}-${entry.taskId}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <button 
                    onClick={() => handleNavigate(entry)}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-google-blue hover:border-google-blue transition-all"
                    title="View in Project"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, entry)}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-google-red hover:border-google-red transition-all"
                    title="Delete Feedback"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Feedback Content */}
              <div 
                className="prose prose-sm dark:prose-invert max-w-none bg-white/50 dark:bg-black/20 rounded-xl p-4 border border-blue-100/50 dark:border-gray-800/50 text-xs font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: entry.feedback }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

