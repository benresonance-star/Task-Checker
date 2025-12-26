import React, { useEffect } from 'react';
import { Task, FocusStage } from '../../types';
import { FileText, ClipboardList, Info, Target, CheckCircle2, ArrowRight, ArrowDown, Bold, List, ListOrdered } from 'lucide-react';
import { clsx } from 'clsx';
import { useTasklistStore } from '../../store/useTasklistStore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface KnowledgeHubProps {
  task: Task | null;
  stage?: FocusStage;
}

const TaskScratchpadEditor: React.FC<{ 
  task: Task;
  field: 'userNotes' | 'workbench';
  onUpdate: (content: string, immediate?: boolean) => void;
  minHeight?: string;
}> = ({ task, field, onUpdate, minHeight = '150px' }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: task[field] || '',
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert focus:outline-none h-full text-xs font-bold placeholder:text-gray-400`,
        style: `min-height: ${minHeight}`
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML(), false);
    },
    onBlur: ({ editor }) => {
      onUpdate(editor.getHTML(), true);
    }
  });

  // Sync editor content when task changes
  React.useEffect(() => {
    if (editor && task[field] !== editor.getHTML()) {
      editor.commands.setContent(task[field] || '');
    }
  }, [task.id, editor, field]);

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2 bg-[var(--notes-editor-bg)] border-2 border-[var(--notes-editor-border)] rounded-2xl p-2 transition-all focus-within:border-google-blue shadow-inner h-full">
      <div className="flex items-center justify-end gap-1 px-2 py-1 border-b border-[var(--notes-editor-separator)]">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", editor.isActive('bold') && "bg-gray-200 dark:bg-white/10")}><Bold className="w-3 h-3" /></button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", editor.isActive('bulletList') && "bg-gray-200 dark:bg-white/10")}><List className="w-3 h-3" /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={clsx("p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors", editor.isActive('orderedList') && "bg-gray-200 dark:bg-white/10")}><ListOrdered className="w-3 h-3" /></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <EditorContent editor={editor} className="w-full h-full" />
      </div>
    </div>
  );
};

export const KnowledgeHub: React.FC<KnowledgeHubProps> = ({ task, stage }) => {
  const { currentUser, toggleTaskPrerequisite, updateTaskWorkbench } = useTasklistStore();
  const containerId = currentUser?.activeFocus?.instanceId || '';

  const [activeStep, setActiveStep] = React.useState<number>(0);

  // Sync activeStep with stage
  useEffect(() => {
    if (stage === 'staged') {
      setActiveStep(0); // None highlighted in Established mode
    } else if (stage === 'preparing' && activeStep === 0) {
      setActiveStep(1); // Default to Step 1 when entering preparation
    }
  }, [stage]);

  // Auto-advance spotlight when all prereqs are checked
  const allPrereqsDone = React.useMemo(() => {
    if (!task?.guide?.requiredBefore?.length) return true;
    return (task.completedPrereqs?.length || 0) === task.guide.requiredBefore.length;
  }, [task]);

  useEffect(() => {
    if (allPrereqsDone && activeStep === 2) {
      setActiveStep(3);
    }
  }, [allPrereqsDone, activeStep]);

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
  const hasPrereqs = (task.guide?.requiredBefore?.length || 0) > 0;

  const stepClasses = (step: number) => clsx(
    "flex-1 border-4 rounded-widget p-6 shadow-xl flex flex-col gap-4 transition-all duration-500 cursor-pointer relative",
    activeStep === step 
      ? "opacity-100 scale-100 border-google-blue ring-8 ring-google-blue/10" 
      : "opacity-40 scale-95 border-[var(--hub-inactive-border)]"
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Knowledge Hub</h3>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-2">
        {/* Widget 1: Intent (Understand) */}
        <div 
          onClick={() => setActiveStep(1)}
          className={stepClasses(1)}
        >
          <div className="flex items-center gap-2">
            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all", activeStep === 1 ? "bg-google-blue text-white scale-110" : "bg-gray-200 text-gray-500")}>1</div>
            <Info className="w-4 h-4 text-google-blue" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Understand Intent</h4>
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

        <div className="flex items-center justify-center lg:px-2 opacity-20">
          <ArrowRight className="hidden lg:block w-6 h-6" />
          <ArrowDown className="lg:hidden w-6 h-6" />
        </div>

        {/* Widget 2: Readiness (Confirm Doable) */}
        <div 
          onClick={() => setActiveStep(2)}
          className={clsx(stepClasses(2), activeStep === 2 ? "bg-[var(--prereq-bg)]" : "bg-[var(--hub-step2-inactive-bg)]")}
        >
          <div className="flex items-center gap-2">
            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all", activeStep === 2 ? "bg-orange-500 text-white scale-110" : "bg-gray-200 text-gray-500")}>2</div>
            <CheckCircle2 className="w-4 h-4 text-[var(--prereq-icon)]" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--prereq-text)]">Confirm Doable</h4>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[200px] custom-scrollbar pr-2">
            {!hasPrereqs ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-4 opacity-40">
                <CheckCircle2 className="w-6 h-6 mb-1 text-gray-400" />
                <p className="text-[8px] font-black uppercase text-gray-400">No requirements</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {task.guide?.requiredBefore?.map((req, i) => {
                  const isChecked = task.completedPrereqs?.includes(i);
                  return (
                    <li 
                      key={i} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskPrerequisite(task.id, i, containerId);
                      }}
                      className={clsx(
                        "flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer group",
                        isChecked 
                          ? "bg-google-green/10 border-google-green/30" 
                          : "bg-white dark:bg-black/20 border-gray-700 hover:border-google-blue shadow-sm"
                      )}
                    >
                      <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                        isChecked ? "bg-google-green border-google-green text-white" : "border-gray-700 dark:border-gray-500 group-hover:border-google-blue bg-transparent"
                      )}>
                        {isChecked && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span className={clsx(
                        "text-xs font-black leading-tight transition-all",
                        isChecked ? "text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"
                      )}>
                        {req}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center lg:px-2 opacity-20">
          <ArrowRight className="hidden lg:block w-6 h-6" />
          <ArrowDown className="lg:hidden w-6 h-6" />
        </div>

        {/* Widget 3: Technical Briefing (Task Notes) */}
        <div 
          onClick={() => setActiveStep(3)}
          className={stepClasses(3)}
        >
          <div className="flex items-center gap-2">
            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all", activeStep === 3 ? "bg-google-blue text-white scale-110" : "bg-gray-200 text-gray-500")}>3</div>
            <ClipboardList className="w-4 h-4 text-google-blue" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Technical Briefing</h4>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] custom-scrollbar pr-2">
            {!task.notes ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6 opacity-40">
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">No technical notes</p>
              </div>
            ) : (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-xs font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: String(task.notes) }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Full Width Workbench (Gather & Log) */}
      <div 
        onClick={() => setActiveStep(4)}
        className={clsx(
          "bg-[var(--metadata-card-bg)] border-4 rounded-widget p-8 shadow-2xl transition-all duration-700",
          activeStep === 4 ? "border-google-blue ring-12 ring-google-blue/5 scale-[1.01]" : "opacity-30 scale-95 grayscale border-transparent"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all", activeStep === 4 ? "bg-google-green text-white scale-110" : "bg-gray-200 text-gray-500")}>4</div>
            <div className="flex flex-col">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-heading)]">Gather & Log (Workbench)</h4>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Your personal scratchpad for this specific task</p>
            </div>
          </div>
        </div>

        <div className="min-h-[300px]">
          <TaskScratchpadEditor 
            task={task} 
            field="workbench"
            minHeight="250px"
            onUpdate={(content, immediate) => updateTaskWorkbench(task.id, content, containerId, immediate)} 
          />
        </div>
      </div>
    </div>
  );
};

