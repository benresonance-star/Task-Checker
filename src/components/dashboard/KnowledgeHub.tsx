import React, { useEffect, useMemo } from 'react';
import { useTasklistStore } from '../../store/useTasklistStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { FileText, FolderOpen, ExternalLink, Clock, Zap, Target } from 'lucide-react';

export const KnowledgeHub: React.FC = () => {
  const { currentUser, instances, projects } = useTasklistStore();
  const { documents, initializeProjectDocs } = useDocumentStore();

  const activeFocus = currentUser?.activeFocus;
  const projectId = activeFocus?.projectId;
  const activeProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  useEffect(() => {
    if (projectId) {
      const unsubscribe = initializeProjectDocs(projectId);
      return () => unsubscribe();
    }
  }, [projectId]);

  const recentFiles = useMemo(() => {
    return documents
      .filter(d => d.type === 'file')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 3);
  }, [documents]);

  const projectStats = useMemo(() => {
    if (!projectId) return null;
    const projectInstances = instances.filter(i => i.projectId === projectId);
    if (projectInstances.length === 0) return null;

    let totalTasks = 0;
    let completedTasks = 0;

    projectInstances.forEach(instance => {
      instance.sections.forEach(section => {
        section.subsections.forEach(sub => {
          totalTasks += sub.tasks.length;
          completedTasks += sub.tasks.filter(t => t.completed).length;
        });
      });
    });

    return {
      totalTasks,
      completedTasks,
      percent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      checklistCount: projectInstances.length
    };
  }, [instances, projectId]);

  if (!projectId || !activeProject) {
    return (
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-2">Knowledge Hub</h3>
        <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-3 bg-white/30 dark:bg-black/10 min-h-[200px]">
          <Target className="w-10 h-10 text-gray-300 dark:text-gray-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Select a project to see smart widgets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Knowledge Hub</h3>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-google-blue/10 text-google-blue rounded-md border border-google-blue/20">
            Phase 3: Smart Widgets
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Widget 1: Recent Project Documents */}
        <div className="bg-[var(--metadata-card-bg)] border border-[var(--metadata-card-border)] dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-google-blue" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Recent Documents</h4>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {recentFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-4 opacity-40">
                <FileText className="w-6 h-6 mb-1" />
                <p className="text-[8px] font-black uppercase">No files yet</p>
              </div>
            ) : (
              recentFiles.map(file => (
                <a 
                  key={file.id}
                  href={file.downloadURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-transparent hover:border-google-blue hover:bg-blue-50/30 transition-all group"
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-google-blue group-hover:bg-google-blue group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black truncate">{file.name}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-google-blue" />
                </a>
              ))
            )}
          </div>
        </div>

        {/* Widget 2: Project Health / Progress */}
        <div className="bg-[var(--metadata-card-bg)] border border-[var(--metadata-card-border)] dark:border-gray-800 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-google-green" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Project Progress</h4>
          </div>

          {projectStats ? (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-[8px] font-black inline-block py-1 px-2 uppercase rounded-full text-google-green bg-google-green/10">
                      Overall Completion
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black inline-block text-google-green">
                      {projectStats.percent}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-google-green/10">
                  <div style={{ width: `${projectStats.percent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-google-green transition-all duration-1000"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-[10px] font-black text-google-blue">{projectStats.checklistCount}</p>
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Checklists</p>
                </div>
                <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                  <p className="text-[10px] font-black text-google-green">{projectStats.completedTasks}/{projectStats.totalTasks}</p>
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Tasks Done</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-4 opacity-40">
              <Clock className="w-6 h-6 mb-1" />
              <p className="text-[8px] font-black uppercase">Calculating...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

