import { useState, useEffect, useMemo } from 'react';
import { 
  X, Folder, FileText, ChevronRight, Upload, 
  MoreVertical, Trash2, Edit2, Move, Download,
  Search, Grid, List as ListIcon, FolderPlus,
  FolderOpen, Layers
} from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useTasklistStore } from '../../store/useTasklistStore';
import { ProjectDocItem } from '../../types';
import { Button } from '../ui/Button';
import { clsx } from 'clsx';
import { theme } from '../../styles/theme';

interface DocumentExplorerProps {
  project: { id: string; name: string };
  onClose: () => void;
}

export const DocumentExplorer = ({ project, onClose }: DocumentExplorerProps) => {
  const { 
    documents, loading, currentFolderId, setFolder, 
    initializeProjectDocs, createFolder, uploadFile, 
    deleteItem, renameItem, moveItem 
  } = useDocumentStore();
  
  const { currentUser, adminSimulationMode } = useTasklistStore();
  const isAdmin = currentUser?.role === 'admin' && adminSimulationMode === 'admin';
  const newDefaultNames = ['Our Documents', 'Authorities', 'Consultants', 'Others'];

  const projectId = project.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'all'>('grid');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItem, setSelectedItem] = useState<ProjectDocItem | null>(null);
  const [movingItem, setMovingItem] = useState<ProjectDocItem | null>(null);
  const [renamingItem, setRenamingItem] = useState<ProjectDocItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const unsubscribe = initializeProjectDocs(projectId);
    return () => unsubscribe();
  }, [projectId]);

  const allDescendants = useMemo(() => {
    const items: (ProjectDocItem & { path: string })[] = [];
    
    const getChildren = (parentId: string, currentPath: string) => {
      const children = documents.filter(d => d.parentId === parentId)
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });
        
      children.forEach(child => {
        const itemPath = currentPath ? `${currentPath} / ${child.name}` : child.name;
        items.push({ ...child, path: currentPath });
        if (child.type === 'folder') {
          getChildren(child.id, itemPath);
        }
      });
    };
    
    const startId = searchQuery.trim() ? 'root' : currentFolderId;
    getChildren(startId, '');
    
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(doc => 
      doc.name.toLowerCase().includes(query) || 
      (doc.path && doc.path.toLowerCase().includes(query)) ||
      (doc.type === 'file' && doc.mimeType?.toLowerCase().includes(query))
    );
  }, [documents, currentFolderId, searchQuery]);

  const currentDocs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // If searching, show all matching descendants globally within this project scope
    if (query) {
      return allDescendants;
    }

    return documents.filter(doc => doc.parentId === currentFolderId)
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
  }, [documents, currentFolderId, searchQuery, allDescendants]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId !== 'root') {
      const folder = documents.find(d => d.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  }, [documents, currentFolderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    await uploadFile(projectId, file, currentFolderId);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(projectId, newFolderName, currentFolderId);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleRename = async () => {
    if (!renamingItem || !renameValue.trim()) return;
    await renameItem(projectId, renamingItem.id, renameValue);
    setRenamingItem(null);
    setRenameValue('');
  };

  const handleOpenFile = (item: ProjectDocItem) => {
    if (item.type !== 'file' || !item.downloadURL) return;
    window.open(item.downloadURL, '_blank');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={theme.components.docExplorer.overlay}>
      <div className={theme.components.docExplorer.shell}>
        
        {/* Header */}
        <div className={theme.components.docExplorer.header}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-google-blue/10 rounded-2xl text-google-blue">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">Online Documents</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage project files and structured data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className={theme.components.docExplorer.toolbar}>
          {/* Top row: Breadcrumbs/Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {searchQuery.trim() ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-google-blue/10 text-google-blue rounded-lg text-[10px] font-black uppercase tracking-tight border border-google-blue/20">
                <Search className="w-3 h-3" />
                Global Search Results
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setFolder('root')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-colors flex-shrink-0",
                    currentFolderId === 'root' ? "bg-google-blue text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {project.name}
                </button>
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.id} className="flex items-center gap-2 flex-shrink-0">
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <button 
                      onClick={() => setFolder(crumb.id)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-colors",
                        idx === breadcrumbs.length - 1 ? "bg-google-blue text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Bottom row: Search and Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            {/* Search - Full width on mobile */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search documents..."
                className="pl-10 pr-4 py-2.5 sm:py-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold w-full sm:w-48 sm:focus:w-64 focus:ring-2 focus:ring-google-blue outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* View types and Action buttons - Shown below search on mobile */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-black shadow-sm text-google-blue" : "text-gray-400 hover:text-gray-600")}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-black shadow-sm text-google-blue" : "text-gray-400 hover:text-gray-600")}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('all')}
                  className={clsx("p-1.5 rounded-lg transition-all", viewMode === 'all' ? "bg-white dark:bg-black shadow-sm text-google-blue" : "text-gray-400 hover:text-gray-600")}
                  title="View All Sub-documents"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>
              
              <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-800" />
              
              <div className="flex-1 sm:flex-none flex gap-2">
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex-1 sm:flex-none p-2 rounded-xl bg-google-green/10 text-google-green hover:bg-google-green hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-tight"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="whitespace-nowrap">New Folder</span>
                </button>
                <label className="flex-1 sm:flex-none p-2 rounded-xl bg-google-blue/10 text-google-blue hover:bg-google-blue hover:text-white transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-tight cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span className="whitespace-nowrap">Upload File</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-transparent">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-google-blue border-t-transparent" />
            </div>
          ) : currentDocs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="p-6 rounded-full bg-gray-100 dark:bg-gray-800">
                <Folder className="w-12 h-12 opacity-20" />
              </div>
              <div className="text-center">
                <p className="font-black uppercase tracking-widest text-xs">This folder is empty</p>
                <p className="text-[10px] font-bold mt-1">Upload files or create subfolders to get started</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className={theme.components.docExplorer.grid}>
              {currentDocs.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    if (window.innerWidth < 768 && item.type === 'file') {
                      handleOpenFile(item);
                    }
                  }}
                  onDoubleClick={() => {
                    if (item.type === 'folder') {
                      setFolder(item.id);
                      setSearchQuery(''); // Clear search when navigating into a folder from results
                    } else {
                      handleOpenFile(item);
                    }
                  }}
                  className={theme.components.docExplorer.card}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-google-blue"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={clsx(
                      item.type === 'folder' ? "text-amber-500" : "text-blue-500"
                    )}>
                      {item.type === 'folder' ? <Folder className="w-12 h-12" /> : <FileText className="w-12 h-12" />}
                    </div>
                    <div className="space-y-1 w-full overflow-hidden">
                      {searchQuery.trim() && (item as any).path && (
                        <p className="text-[8px] font-black text-gray-400 uppercase truncate px-2">
                          {(item as any).path}
                        </p>
                      )}
                      <p className="text-xs font-black text-gray-700 dark:text-gray-200 truncate px-2">{item.name}</p>
                      {item.type === 'file' && (
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                          {formatFileSize(item.fileSize)} • {item.mimeType?.split('/')[1] || 'File'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className={theme.components.docExplorer.table}>
                <thead className={theme.components.docExplorer.tableHeader}>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Size</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentDocs.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'folder') {
                          setFolder(item.id);
                          setSearchQuery(''); // Clear search when navigating into a folder from results
                        } else if (window.innerWidth < 768) {
                          handleOpenFile(item);
                        }
                      }}
                      onDoubleClick={() => item.type === 'file' && handleOpenFile(item)}
                      className={theme.components.docExplorer.tableRow}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.type === 'folder' ? <Folder className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-tight">
                          {item.type === 'folder' ? 'Folder' : (item.mimeType?.split('/')[1] || 'File')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">
                        {item.type === 'file' ? formatFileSize(item.fileSize) : '--'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-google-blue transition-all"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-black/40 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className={theme.components.docExplorer.table}>
                <thead className={theme.components.docExplorer.tableHeader}>
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Hierarchy / Name</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Size</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {allDescendants.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'folder') {
                          setFolder(item.id);
                          setSearchQuery(''); // Clear search when navigating into a folder from results
                        } else if (window.innerWidth < 768) {
                          handleOpenFile(item);
                        }
                      }}
                      onDoubleClick={() => item.type === 'file' && handleOpenFile(item)}
                      className={clsx(
                        theme.components.docExplorer.tableRow,
                        item.type === 'folder' ? "bg-amber-50/30 dark:bg-amber-900/10" : "bg-transparent"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {item.path && (
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                              {item.path}
                            </span>
                          )}
                          <div className="flex items-center gap-3">
                            {item.type === 'folder' ? <Folder className="w-4 h-4 text-amber-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                            <span className={clsx("text-xs font-bold", item.type === 'folder' ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-200")}>
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-tight">
                          {item.type === 'folder' ? 'Folder' : (item.mimeType?.split('/')[1] || 'File')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">
                        {item.type === 'file' ? formatFileSize(item.fileSize) : '--'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-google-blue transition-all"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer / Info */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 flex items-center justify-between">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {currentDocs.length} items in this folder
          </p>
        </div>
      </div>

      {/* New Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl p-8 border border-gray-300 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Create New Folder</h3>
            <input 
              autoFocus
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-google-green transition-all mb-6"
              placeholder="Folder Name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 font-bold" onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}>Cancel</Button>
              <Button className="flex-1 font-black bg-google-green" onClick={handleCreateFolder}>Create Folder</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingItem && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl p-8 border border-gray-300 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Rename Item</h3>
            <input 
              autoFocus
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-google-blue transition-all mb-6"
              placeholder="New Name..."
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 font-bold" onClick={() => { setRenamingItem(null); setRenameValue(''); }}>Cancel</Button>
              <Button className="flex-1 font-black" onClick={handleRename}>Rename</Button>
            </div>
          </div>
        </div>
      )}

      {/* Item Actions Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white dark:bg-[#121212] w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{selectedItem.type}</p>
              <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{selectedItem.name}</h3>
            </div>
            <div className="p-2 space-y-1">
              {selectedItem.type === 'file' && selectedItem.downloadURL && (
                <a 
                  href={selectedItem.downloadURL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-google-blue transition-colors text-xs font-bold uppercase tracking-tight"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              <button 
                onClick={() => { setRenamingItem(selectedItem); setRenameValue(selectedItem.name); setSelectedItem(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors text-xs font-bold uppercase tracking-tight"
              >
                <Edit2 className="w-4 h-4" /> Rename
              </button>
              <button 
                onClick={() => { setMovingItem(selectedItem); setSelectedItem(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors text-xs font-bold uppercase tracking-tight"
              >
                <Move className="w-4 h-4" /> Move to...
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />
              <button 
                disabled={selectedItem.isDefault && newDefaultNames.includes(selectedItem.name) && !isAdmin}
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete this ${selectedItem.type}?`)) {
                    await deleteItem(projectId, selectedItem);
                    setSelectedItem(null);
                  }
                }}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-xs font-bold uppercase tracking-tight",
                  (selectedItem.isDefault && newDefaultNames.includes(selectedItem.name) && !isAdmin)
                    ? "opacity-30 cursor-not-allowed text-gray-400" 
                    : "hover:bg-red-50 dark:hover:bg-red-900/20 text-google-red"
                )}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-black/40">
              <Button variant="ghost" className="w-full font-bold" onClick={() => setSelectedItem(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Move Item Tree Modal */}
      {movingItem && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] w-full max-w-md rounded-3xl p-8 border border-gray-300 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[70vh]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-2">Move to Folder</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Moving: {movingItem.name}</p>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2">
              <button 
                onClick={async () => {
                  await moveItem(projectId, movingItem.id, 'root');
                  setMovingItem(null);
                }}
                className={clsx(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tight",
                  movingItem.parentId === 'root' ? "bg-google-blue border-google-blue text-white" : "bg-white dark:bg-black/40 border-gray-100 dark:border-gray-800 hover:border-google-blue text-gray-600 dark:text-gray-300"
                )}
              >
                <Folder className="w-4 h-4" /> Root Project Directory
              </button>
              {documents.filter(d => d.type === 'folder' && d.id !== movingItem.id).map(folder => (
                <button 
                  key={folder.id}
                  onClick={async () => {
                    await moveItem(projectId, movingItem.id, folder.id);
                    setMovingItem(null);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-tight",
                    movingItem.parentId === folder.id ? "bg-google-blue border-google-blue text-white" : "bg-white dark:bg-black/40 border-gray-100 dark:border-gray-800 hover:border-google-blue text-gray-600 dark:text-gray-300"
                  )}
                >
                  <Folder className="w-4 h-4" /> {folder.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 font-bold" onClick={() => setMovingItem(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

