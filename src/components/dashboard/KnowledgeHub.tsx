import React from 'react';
import { Task } from '../../types';
import { FileText, ClipboardList, Info, Target, Zap, CheckCircle2 } from 'lucide-react';

interface KnowledgeHubProps {
  task: Task | null;
}

export const KnowledgeHub: React.FC<KnowledgeHubProps> = ({ task }) => {
  if (!task) {
    return (
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Knowledge Hub</h3>
        <div className="p-8 rounded-widget border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 bg-white/30 dark:bg-black/10 min-h-[200px]">
          <Target className="w-10 h-10 text-gray-300 dark:text-gray-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select a task to see guidance and notes</p>
        </div>
      </div>
    );
  }

  const hasGuidance = (task.guide?.description && task.guide.description.trim() !== '') || (task.guide?.content && task.guide.content !== '<p></p>');
  const userNotes = String(task.userNotes || '');
  const hasFeedback = userNotes.trim() !== '' && userNotes.trim() !== '<p></p>' && userNotes.trim() !== '<p><br></p>' && userNotes.length > 7;
  const hasPrereqs = (task.guide?.requiredBefore?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Knowledge Hub</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Task Guidance */}
        <div className="bg-[var(--metadata-card-bg)] border border-[var(--metadata-card-border)] dark:border-gray-800 rounded-widget p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-google-blue" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Guidance</h4>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
            {!hasGuidance ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 opacity-40">
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No guidance provided</p>
              </div>
            ) : (
              <div className="space-y-3">
                {task.guide?.description && (
                  <p className="text-xs font-bold leading-relaxed text-gray-700 dark:text-gray-300">
                    {task.guide.description}
                  </p>
                )}
                {task.guide?.content && task.guide.content !== '<p></p>' && (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-xs font-medium leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: String(task.guide.content) }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Widget 2: Can I Proceed? (Prerequisites) */}
        <div className="bg-[var(--prereq-bg)] border border-[var(--prereq-border)] rounded-widget p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--prereq-icon)]" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--prereq-text)]">Can I Proceed?</h4>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar pr-2">
            {!hasPrereqs ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-4 opacity-40">
                <CheckCircle2 className="w-6 h-6 mb-1 text-gray-400" />
                <p className="text-[8px] font-black uppercase text-gray-400">No requirements</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {task.guide?.requiredBefore?.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 bg-[var(--prereq-item-bg)] p-2.5 rounded-xl border border-[var(--prereq-border)] shadow-sm">
                    <div 
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" 
                      style={{ backgroundColor: 'var(--prereq-icon)' }}
                    />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-tight">{req}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Widget 3: My Task Feedback */}
        <div className="bg-[var(--metadata-card-bg)] border border-[var(--metadata-card-border)] dark:border-gray-800 rounded-widget p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-google-green" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">My Task Feedback</h4>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
            {!hasFeedback ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 opacity-40">
                <Zap className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No feedback yet</p>
              </div>
            ) : (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-xs font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: userNotes }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

