import React, { useState, useLayoutEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Plus, Trash2, ChevronUp, ChevronDown as ChevronDownIcon, ArrowDownToLine, X } from 'lucide-react';
import { theme } from '../../styles/theme';
import { Section } from '../../types';
import { useTasklistStore } from '../../store/useTasklistStore';
import { SubsectionItem } from './SubsectionItem';
import { Button } from '../ui/Button';

interface SectionItemProps {
  section: Section;
  onOpenNotes: (taskId: string, containerId: string, focusFeedback?: boolean) => void;
}

/**
 * SectionItem is the top-level grouping component for the checklist.
 * It contains multiple subsections and provides a visual container with a vertical connector line.
 */
export const SectionItem = ({ section, onOpenNotes }: SectionItemProps) => {
  const { mode, addSubsection, renameSection, deleteSection, moveSection, activeMaster, activeInstance, demoteSection, isLocalExpanded, toggleLocalExpanded } = useTasklistStore();
  const isMaster = mode === 'master';
  const isExpanded = isLocalExpanded(section.id, section.isExpanded);

  const [isDemoting, setIsDemoting] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [lineStyle, setLineStyle] = useState({ top: 0, height: 0 });

  const [localTitle, setLocalTitle] = useState(section.title);

  // Sync local title with store title when section changes externally
  React.useEffect(() => {
    setLocalTitle(section.title);
  }, [section.title]);

  // Auto-resize textarea on mount for title editing
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [section.title]);

  // Calculate vertical line height based on subsection positions
  useLayoutEffect(() => {
    if (isExpanded && containerRef.current) {
      const updateLine = () => {
        const subsections = containerRef.current?.querySelectorAll('[data-subsection-item]');
        if (subsections && subsections.length > 0) {
          const firstSub = subsections[0] as HTMLElement;
          const lastSub = subsections[subsections.length - 1] as HTMLElement;
          const firstLine = firstSub.querySelector('[data-horizontal-line]') as HTMLElement;
          const lastLine = lastSub.querySelector('[data-horizontal-line]') as HTMLElement;

          if (firstLine && lastLine) {
            // Calculate the Y position relative to the containerRef's offsetParent (the outer div)
            const innerOffset = (containerRef.current as HTMLElement).offsetTop;
            const endY = innerOffset + lastSub.offsetTop + lastLine.offsetTop + lastLine.offsetHeight;
            setLineStyle({
              top: -8, // Offset by the mb-2 gap to touch the header underside
              height: endY + 8.5 // Adding a tiny sub-pixel buffer to ensure it fully covers the bottom of the last horizontal line
            });
          }
        }
      };

      // Run immediately
      updateLine();
      
      // Use ResizeObserver to handle content changes (like adding tasks)
      const observer = new ResizeObserver(() => {
        requestAnimationFrame(updateLine);
      });
      observer.observe(containerRef.current);
      
      // Also listen for subsection count changes (adding/removing subsections)
      const mutationObserver = new MutationObserver(updateLine);
      mutationObserver.observe(containerRef.current, { childList: true });

      return () => {
        observer.disconnect();
        mutationObserver.disconnect();
      };
    }
  }, [isExpanded, section.subsections]);

  const otherSections = activeMaster?.sections.filter(s => s.id !== section.id) || [];

  return (
    <div className="relative">
      {isDemoting && (
        <div className="absolute inset-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-sm rounded-container flex flex-col p-6 border-2 border-google-blue animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-google-blue">Demote to Subsection</h4>
            <Button variant="ghost" size="sm" onClick={() => setIsDemoting(false)} className="h-8 w-8 p-0 rounded-full border border-gray-200 dark:border-gray-800">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-4 tracking-wider">Select new parent section for "{section.title}":</p>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {otherSections.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  demoteSection(section.id, s.id);
                  setIsDemoting(false);
                }}
                className="w-full text-left p-4 rounded-card bg-gray-100 dark:bg-gray-800 hover:bg-google-blue/10 hover:text-google-blue transition-all border-2 border-gray-200 dark:border-gray-700 hover:border-google-blue font-black text-sm flex items-center justify-between group/item shadow-sm"
              >
                {s.title}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity" />
              </button>
            ))}
            {otherSections.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-container">
                <p className="text-xs italic text-gray-500 dark:text-gray-300 font-bold">No other sections available.</p>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-black tracking-widest">Create another section first</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={theme.components.hierarchy.section}>
        <button 
          onClick={() => toggleLocalExpanded(section.id)}
          className="p-1 sm:p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {isMaster && (
          <div className="hidden md:flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => moveSection(activeMaster!.id, section.id, 'up')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={() => moveSection(activeMaster!.id, section.id, 'down')} className="text-gray-500 hover:text-google-blue transition-colors">
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {isMaster ? (
          <textarea
            ref={textareaRef}
            rows={1}
            className={clsx(theme.components.hierarchy.sectionTitle, "bg-transparent border-none focus:ring-0 focus:outline-none pt-2 pb-2 px-1 sm:px-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 flex-1 transition-colors resize-none overflow-visible min-h-[2.5rem] min-w-0 break-words leading-relaxed")}
            value={localTitle}
            onChange={(e) => {
              const newVal = e.target.value;
              setLocalTitle(newVal);
              renameSection(section.id, newVal, activeMaster?.id || activeInstance?.id);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            placeholder="Section Title..."
          />
        ) : (
          <h3 className={clsx(theme.components.hierarchy.sectionTitle, "flex-1 py-1 px-2 break-words whitespace-pre-wrap min-w-0")}>
            {section.title}
          </h3>
        )}

        {isMaster && (
          <div className="flex items-center gap-1 opacity-100 transition-opacity flex-shrink-0">
            {/* Mobile Reorder Buttons */}
            <div className="flex md:hidden items-center gap-0.5 sm:gap-1 mr-1 sm:mr-2">
              <button onClick={() => moveSection(activeMaster!.id, section.id, 'up')} className="p-1 text-gray-500 hover:text-google-blue">
                <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button onClick={() => moveSection(activeMaster!.id, section.id, 'down')} className="p-1 text-gray-500 hover:text-google-blue">
                <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="relative group/tooltip">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-google-blue bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-full"
                onClick={() => setIsDemoting(true)}
              >
                <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-gray-700/50 transform translate-y-1 group-hover/tooltip:translate-y-0">
                Demote to Subsection
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
              </div>
            </div>

            <div className="relative group/tooltip">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-gray-500 hover:text-google-red bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-full"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete the section "${section.title}" and all its contents?`)) {
                    deleteSection(section.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-google-red text-white text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl transform translate-y-1 group-hover/tooltip:translate-y-0">
                Delete Section
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-google-red" />
              </div>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={theme.components.hierarchy.innerContainer}>
          {/* Calculated vertical line - moved outside observed container to prevent potential loop */}
          <div 
            className={theme.components.hierarchy.verticalLine} 
            style={{ 
              left: 0, 
              top: `${lineStyle.top}px`, 
              height: `${lineStyle.height}px`,
              width: '1px',
              zIndex: 0
            }} 
          />
          
          <div className="space-y-4 sm:space-y-8 relative z-10" ref={containerRef}>
            {section.subsections.map((ss) => (
              <SubsectionItem 
                key={ss.id} 
                subsection={ss} 
                sectionId={section.id} 
                onOpenNotes={onOpenNotes}
              />
            ))}
          </div>
          {isMaster && (
            <div className="pt-6 relative">
              <button 
                onClick={() => addSubsection(section.id, 'New Subsection')}
                className={theme.components.hierarchy.addSubsectionButton}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add subsection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

