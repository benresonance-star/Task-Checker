import { useState, useEffect } from 'react';
import { Project, PlanningOverlay, ProjectOverride, User as AppUser, Consultant, KeyPerson } from '../../types';
import { Button } from '../ui/Button';
import { 
  MapPin, User, Building2, ExternalLink, 
  PlusCircle, Trash2, Save, Info, X, 
  Hash, Globe, Layers, Cloud, FolderSymlink, Settings,
  Phone, Mail, Users, HardHat, Plus, ChevronDown, ChevronUp, Smartphone,
  FolderOpen
} from 'lucide-react';
import { clsx } from 'clsx';
import { theme } from '../../styles/theme';
import { generateUUID } from '../../utils/uuid';
import { DocumentExplorer } from './DocumentExplorer';

interface ProjectDashboardProps {
  project: Project;
  currentUser: AppUser | null;
  isAdmin: boolean;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onUpdate: (id: string, details: Partial<Project>) => Promise<void>;
  onUpdateOverride: (projectId: string, override: Partial<ProjectOverride>) => Promise<void>;
  projects: Project[]; // To check for unique project number
}

export const ProjectDashboard = ({ project, currentUser, isAdmin, isEditing, setIsEditing, onUpdate, onUpdateOverride, projects }: ProjectDashboardProps) => {
  const [localData, setLocalData] = useState<Project>(project);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [localOverride, setLocalOverride] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(`project_info_expanded_${project.id}`);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    setLocalData(project);
  }, [project]);

  useEffect(() => {
    localStorage.setItem(`project_info_expanded_${project.id}`, isExpanded.toString());
  }, [isExpanded, project.id]);

  const userOverride = currentUser?.projectOverrides?.[project.id]?.oneDriveLink;
  const activeOneDriveLink = userOverride || project.oneDriveLink;

  const isMobileNumber = (phone?: string) => {
    if (!phone) return false;
    const clean = phone.replace(/\s+/g, '');
    // Australian mobile patterns: 04..., +614..., 614...
    return /^(\+?61|0)4\d{8}$/.test(clean);
  };

  const handleSave = async () => {
    // Validate Unique Project Number
    if (localData.projectNumber && localData.projectNumber !== project.projectNumber) {
      const exists = projects.some(p => p.id !== project.id && p.projectNumber === localData.projectNumber);
      if (exists) {
        setError('Project Number must be unique.');
        return;
      }
    }
    setError(null);
    await onUpdate(project.id, localData);
    setIsEditing(false);
  };

  const addOverlay = () => {
    const newOverlays = [...(localData.planningOverlays || []), { id: generateUUID(), name: '', link: '' }];
    setLocalData({ ...localData, planningOverlays: newOverlays });
  };

  const removeOverlay = (id: string) => {
    const newOverlays = localData.planningOverlays.filter(o => o.id !== id);
    setLocalData({ ...localData, planningOverlays: newOverlays });
  };

  const updateOverlay = (id: string, updates: Partial<PlanningOverlay>) => {
    const newOverlays = localData.planningOverlays.map(o => o.id === id ? { ...o, ...updates } : o);
    setLocalData({ ...localData, planningOverlays: newOverlays });
  };

  const toggleClassification = (cls: string) => {
    const current = localData.buildingClassifications || [];
    const updated = current.includes(cls) 
      ? current.filter(c => c !== cls)
      : [...current, cls];
    setLocalData({ ...localData, buildingClassifications: updated });
  };

  const addConsultant = () => {
    const newConsultant: Consultant = {
      id: generateUUID(),
      discipline: '',
      companyName: '',
      keyPeople: []
    };
    setLocalData({ ...localData, consultants: [...(localData.consultants || []), newConsultant] });
  };

  const removeConsultant = (id: string) => {
    setLocalData({ ...localData, consultants: localData.consultants.filter(c => c.id !== id) });
  };

  const updateConsultant = (id: string, updates: Partial<Consultant>) => {
    setLocalData({
      ...localData,
      consultants: localData.consultants.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const addKeyPerson = (consultantId: string) => {
    const newPerson: KeyPerson = {
      id: generateUUID(),
      role: '',
      name: '',
      phone: '',
      email: ''
    };
    setLocalData({
      ...localData,
      consultants: localData.consultants.map(c => 
        c.id === consultantId ? { ...c, keyPeople: [...c.keyPeople, newPerson] } : c
      )
    });
  };

  const updateKeyPerson = (consultantId: string, personId: string, updates: Partial<KeyPerson>) => {
    setLocalData({
      ...localData,
      consultants: localData.consultants.map(c => 
        c.id === consultantId ? {
          ...c,
          keyPeople: c.keyPeople.map(p => p.id === personId ? { ...p, ...updates } : p)
        } : c
      )
    });
  };

  const removeKeyPerson = (consultantId: string, personId: string) => {
    setLocalData({
      ...localData,
      consultants: localData.consultants.map(c => 
        c.id === consultantId ? {
          ...c,
          keyPeople: c.keyPeople.filter(p => p.id !== personId)
        } : c
      )
    });
  };

  const classes = ['Class 1a', 'Class 1b', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10a', 'Class 10b', 'Class 10c'];

  if (!isEditing) {
    return (
      <div className={theme.components.dashboard.container}>
        <div 
          className={theme.components.dashboard.header}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-google-blue" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Project Information</h3>
              <div className="ml-2 p-1 rounded-full bg-gray-100 dark:bg-gray-800">
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="flex items-center gap-2 max-w-md mt-2 ml-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowDocs(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl border-2 transition-all font-black text-[9px] sm:text-[10px] uppercase tracking-tight relative bg-white dark:bg-black/40 border-google-blue text-google-blue hover:bg-google-blue hover:text-white whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                  ONLINE DOCUMENTS
                </button>
                <a 
                  href={activeOneDriveLink || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); if (!activeOneDriveLink) { e.preventDefault(); alert('No OneDrive link set.'); } }}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl border-2 transition-all font-black text-[9px] sm:text-[10px] uppercase tracking-tight relative whitespace-nowrap",
                    activeOneDriveLink 
                      ? "bg-white dark:bg-black/40 border-google-blue text-google-blue hover:bg-google-blue hover:text-white" 
                      : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <FolderSymlink className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                  ONEDRIVE DOCUMENTS
                  {userOverride && (
                    <span className="absolute -top-2 -right-2 text-[8px] font-black uppercase px-1.5 py-0.5 bg-google-blue text-white rounded shadow-sm border border-white dark:border-[#121212]">Custom</span>
                  )}
                </a>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLocalOverride(userOverride || ''); setShowOverrideModal(true); }}
                  className="p-1.5 sm:p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-google-blue transition-colors text-gray-400 hover:text-google-blue"
                  title="Configure Personal OneDrive Link"
                >
                  <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
          {isAdmin && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
              className="text-google-blue border-google-blue hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold self-start sm:self-center px-4 h-9"
            >
              Edit Details
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="p-6 pt-0 animate-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Primary Info */}
              <div className={theme.components.dashboard.sectionCard}>
                <h4 className={theme.components.dashboard.headerIdentification}>Identification</h4>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Project Number</span>
                  <div className="flex items-center gap-2 font-black text-gray-600 dark:text-gray-300">
                    <Hash className="w-4 h-4 text-google-blue" />
                    {project.projectNumber || 'Not Specified'}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Client</span>
                  <div className="flex items-center justify-between font-bold text-gray-600 dark:text-gray-300 group/client">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-google-blue" />
                      {project.client || 'Not Specified'}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover/client:opacity-100 transition-opacity">
                      {project.clientEmail && (
                        <a href={`mailto:${project.clientEmail}`} className="text-gray-500 hover:text-google-blue">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      {project.clientPhone && (
                        <a href={`tel:${project.clientPhone}`} className="text-gray-500 hover:text-google-blue">
                          {isMobileNumber(project.clientPhone) ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Site Address</span>
                  <div className="flex items-start gap-2 text-sm font-bold text-gray-600 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-google-blue mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-2">
                      <span>{project.address || 'Not Specified'}</span>
                      {project.address && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] flex items-center gap-1 text-google-blue hover:underline font-black uppercase"
                        >
                          <ExternalLink className="w-3 h-3" /> View on Maps
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Planning Section */}
              <div className={theme.components.dashboard.sectionCard}>
                <h4 className={theme.components.dashboard.headerPlanning}>Planning & Controls</h4>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Council / Municipality</span>
                  <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300">
                    <Building2 className="w-4 h-4 text-google-green" />
                    {project.council || 'Not Specified'}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Planning Zone</span>
                  <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300 text-sm">
                    <Globe className="w-4 h-4 text-google-green" />
                    {project.planningZone?.name ? (
                      <div className="flex items-center gap-2">
                        {project.planningZone.name}
                        {project.planningZone.link && (
                          <a href={project.planningZone.link} target="_blank" rel="noopener noreferrer" className="text-google-blue hover:bg-blue-50 p-1 rounded transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : 'Not Specified'}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Planning Overlays</span>
                  <div className="flex flex-col gap-1.5">
                    {project.planningOverlays && project.planningOverlays.length > 0 ? (
                      project.planningOverlays.map(o => (
                        <div key={o.id} className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                          <Layers className="w-3.5 h-3.5 text-google-green" />
                          {o.name}
                          {o.link && (
                            <a href={o.link} target="_blank" rel="noopener noreferrer" className="text-google-blue">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : <span className="text-xs text-gray-500 italic">No Overlays</span>}
                  </div>
                </div>
              </div>

              {/* Building Section */}
              <div className={theme.components.dashboard.sectionCard}>
                <h4 className={theme.components.dashboard.headerBuilding}>Building Standards</h4>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>Building Classifications</span>
                  <div className="flex flex-wrap gap-1.5">
                    {project.buildingClassifications && project.buildingClassifications.length > 0 ? (
                      project.buildingClassifications.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase shadow-sm border border-gray-300 dark:border-gray-700">
                          {c}
                        </span>
                      ))
                    ) : <span className="text-xs text-gray-500 italic">Not Specified</span>}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={theme.components.dashboard.label}>NCC Climate Zone</span>
                  <div className="flex items-center gap-2 font-bold text-gray-600 dark:text-gray-300">
                    <Cloud className="w-4 h-4 text-orange-500" />
                    {project.nccClimateZone ? `Zone ${project.nccClimateZone}` : 'Not Specified'}
                  </div>
                </div>
              </div>
            </div>

            {/* Consultants Section */}
            <div className="mt-12 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-google-blue" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Project Consultants</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(project.consultants || []).length > 0 ? (
                  project.consultants.map(c => (
                    <div key={c.id} className={theme.components.dashboard.consultantCard}>
                      <div className="flex flex-col gap-1 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-google-blue tracking-widest flex items-center gap-1.5">
                            <HardHat className="w-3.5 h-3.5" />
                            {c.discipline || 'No Discipline'}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            {c.website && (
                              <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-google-blue">
                                <Globe className="w-4 h-4" />
                              </a>
                            )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="text-gray-400 hover:text-google-blue">
                            {isMobileNumber(c.phone) ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Phone className="w-4 h-4" />
                            )}
                          </a>
                        )}
                          </div>
                        </div>
                        <h4 className="font-black text-lg text-gray-600 dark:text-gray-300">{c.companyName || 'No Company'}</h4>
                      </div>

                      {c.keyPeople && c.keyPeople.length > 0 && (
                        <div className="space-y-3">
                          <div className="h-px bg-gray-100 dark:bg-gray-800" />
                          {c.keyPeople.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-2">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-gray-600 dark:text-gray-300 truncate">{p.name || 'Unnamed'}</span>
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{p.role || 'No Role'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {p.email && (
                                  <a href={`mailto:${p.email}`} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-google-blue hover:text-white transition-colors text-gray-400">
                                    <Mail className="w-3 h-3" />
                                  </a>
                                )}
                            {p.phone && (
                              <a href={`tel:${p.phone}`} className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-google-blue hover:text-white transition-colors text-gray-400">
                                {isMobileNumber(p.phone) ? (
                                  <Smartphone className="w-3 h-3" />
                                ) : (
                                  <Phone className="w-3 h-3" />
                                )}
                              </a>
                            )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-container text-gray-400 font-bold uppercase text-xs tracking-widest">
                    No consultants assigned to this project
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Personal Override Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white dark:bg-[#121212] w-full max-w-md rounded-3xl p-8 border border-gray-300 dark:border-gray-700 animate-in zoom-in-95 duration-200 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Personal OneDrive Link</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Only you can see this override</p>
                </div>
                <button onClick={() => setShowOverrideModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Your Unique Link</label>
                  <input 
                    className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
                    value={localOverride}
                    onChange={(e) => setLocalOverride(e.target.value)}
                    placeholder="Paste your unique OneDrive/SharePoint URL..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1 font-bold" onClick={() => setShowOverrideModal(false)}>Cancel</Button>
                  {userOverride && (
                    <Button 
                      variant="ghost" 
                      className="flex-1 font-bold text-google-red hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100" 
                      onClick={async () => {
                        await onUpdateOverride(project.id, { oneDriveLink: undefined });
                        setShowOverrideModal(false);
                      }}
                    >
                      Remove custom link
                    </Button>
                  )}
                  <Button className="flex-1 font-black" onClick={async () => {
                    await onUpdateOverride(project.id, { oneDriveLink: localOverride });
                    setShowOverrideModal(false);
                  }}>Save for Me</Button>
                </div>
                {project.oneDriveLink && (
                  <p className="text-[9px] text-gray-500 italic text-center">Default Global Link: {project.oneDriveLink.substring(0, 40)}...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Online Documents Explorer */}
        {showDocs && (
          <DocumentExplorer 
            project={{ id: project.id, name: project.name }} 
            onClose={() => setShowDocs(false)} 
          />
        )}
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className={clsx(theme.components.dashboard.container, "border-2 border-google-blue/30 p-8 shadow-xl animate-in fade-in duration-300")}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-google-blue/10 rounded-xl">
            <Save className="w-6 h-6 text-google-blue" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-300">Edit Project Metadata</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Update project requirements and site data</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="font-bold border border-gray-200 dark:border-gray-800 px-4 h-9">Cancel</Button>
          <Button size="sm" onClick={handleSave} className="font-black px-6 h-9 shadow-lg shadow-blue-500/20">Save Changes</Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-google-red text-xs font-black rounded-2xl border-2 border-red-100 dark:border-red-900/50 flex items-center gap-2">
          <X className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {/* Primary Info Edit */}
        <div className="space-y-5">
          <h4 className="text-[10px] font-black uppercase text-google-blue tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Identification</h4>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Project Number</label>
            <input 
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
              value={localData.projectNumber || ''}
              onChange={(e) => setLocalData({ ...localData, projectNumber: e.target.value })}
              placeholder="e.g. 24001"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Client Name</label>
            <input 
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
              value={localData.client || ''}
              onChange={(e) => setLocalData({ ...localData, client: e.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Client Email</label>
              <input 
                className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
                value={localData.clientEmail || ''}
                onChange={(e) => setLocalData({ ...localData, clientEmail: e.target.value })}
                placeholder="client@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Client Phone</label>
              <input 
                className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
                value={localData.clientPhone || ''}
                onChange={(e) => setLocalData({ ...localData, clientPhone: e.target.value })}
                placeholder="+61..."
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Site Address</label>
            <textarea 
              rows={2}
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all resize-none"
              value={localData.address || ''}
              onChange={(e) => setLocalData({ ...localData, address: e.target.value })}
              placeholder="Full street address..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1 flex items-center gap-1">
              <FolderSymlink className="w-3 h-3" /> Global OneDrive Link
            </label>
            <input 
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-blue outline-none transition-all"
              value={localData.oneDriveLink || ''}
              onChange={(e) => setLocalData({ ...localData, oneDriveLink: e.target.value })}
              placeholder="Paste global OneDrive/SharePoint URL..."
            />
          </div>
        </div>

        {/* Planning Section Edit */}
        <div className="space-y-5">
          <h4 className="text-[10px] font-black uppercase text-google-green tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Planning & Controls</h4>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Council / Municipality</label>
            <input 
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-google-green outline-none transition-all"
              value={localData.council || ''}
              onChange={(e) => setLocalData({ ...localData, council: e.target.value })}
              placeholder="e.g. City of Melbourne"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Planning Zone</label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                className="bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-google-green outline-none"
                value={localData.planningZone?.name || ''}
                onChange={(e) => setLocalData({ ...localData, planningZone: { ...localData.planningZone, name: e.target.value } })}
                placeholder="Zone Name (e.g. NRZ1)"
              />
              <input 
                className="bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-google-green outline-none"
                value={localData.planningZone?.link || ''}
                onChange={(e) => setLocalData({ ...localData, planningZone: { ...localData.planningZone, name: localData.planningZone?.name || '', link: e.target.value } })}
                placeholder="Link to Zone"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Planning Overlays</label>
              <button onClick={addOverlay} className="text-[10px] font-black uppercase text-google-green flex items-center gap-1 hover:underline">
                <PlusCircle className="w-3 h-3" /> Add Overlay
              </button>
            </div>
            <div className="space-y-2">
              {(localData.planningOverlays || []).map(o => (
                <div key={o.id} className="flex items-center gap-2 group">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input 
                      className="bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-google-green"
                      value={o.name}
                      onChange={(e) => updateOverlay(o.id, { name: e.target.value })}
                      placeholder="Overlay Name"
                    />
                    <input 
                      className="bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-google-green"
                      value={o.link || ''}
                      onChange={(e) => updateOverlay(o.id, { link: e.target.value })}
                      placeholder="Link"
                    />
                  </div>
                  <button onClick={() => removeOverlay(o.id)} className="text-gray-400 hover:text-google-red p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Building Section Edit */}
        <div className="space-y-5">
          <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">Building Standards</h4>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">Classifications</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {classes.map(c => (
                <button 
                  key={c}
                  onClick={() => toggleClassification(c)}
                  className={clsx(
                    "px-2 py-1.5 rounded-lg text-[9px] font-black transition-all border-2",
                    localData.buildingClassifications?.includes(c)
                      ? "bg-google-blue border-google-blue text-white shadow-sm"
                      : "bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-gray-800 text-gray-400 hover:border-google-blue"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-400 ml-1">NCC Climate Zone</label>
            <select 
              className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
              value={localData.nccClimateZone || ''}
              onChange={(e) => setLocalData({ ...localData, nccClimateZone: e.target.value })}
            >
              <option value="">Select Zone</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(z => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Consultants Edit Section */}
        <div className="col-span-full mt-10 pt-10 border-t-2 border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-google-blue/10 rounded-xl">
                <Users className="w-6 h-6 text-google-blue" />
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-gray-300 uppercase tracking-tight">Project Consultants</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage external team members and contact directory</p>
              </div>
            </div>
            <Button size="sm" onClick={addConsultant} className="flex items-center gap-2 bg-google-blue text-white font-black px-4 h-9 self-start sm:self-center">
              <Plus className="w-4 h-4" /> Add Consultant
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(localData.consultants || []).map(c => (
              <div key={c.id} className="bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-gray-800 rounded-container p-6 shadow-sm relative group/card">
                <button 
                  onClick={() => removeConsultant(c.id)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-google-red opacity-0 group-hover/card:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-1">Discipline</label>
                    <input 
                      className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-google-blue"
                      value={c.discipline}
                      onChange={(e) => updateConsultant(c.id, { discipline: e.target.value })}
                      placeholder="e.g. Structural Engineer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-1">Company Name</label>
                    <input 
                      className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-google-blue"
                      value={c.companyName}
                      onChange={(e) => updateConsultant(c.id, { companyName: e.target.value })}
                      placeholder="e.g. Steel Solutions"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-1">Website URL</label>
                    <input 
                      className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-google-blue"
                      value={c.website || ''}
                      onChange={(e) => updateConsultant(c.id, { website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 ml-1">Office Phone</label>
                    <input 
                      className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-google-blue"
                      value={c.phone || ''}
                      onChange={(e) => updateConsultant(c.id, { phone: e.target.value })}
                      placeholder="+61 ..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Key People</span>
                    <button 
                      onClick={() => addKeyPerson(c.id)}
                      className="text-[9px] font-black uppercase text-google-blue flex items-center gap-1 hover:underline"
                    >
                      <PlusCircle className="w-3 h-3" /> Add Contact
                    </button>
                  </div>

                  <div className="space-y-3">
                    {c.keyPeople.map(p => (
                      <div key={p.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs group/person relative">
                        <button 
                          onClick={() => removeKeyPerson(c.id, p.id)}
                          className="absolute top-2 right-2 p-1 text-gray-300 hover:text-google-red"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                            <input 
                              className="bg-gray-50 dark:bg-black/40 border border-transparent focus:border-google-blue rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                              value={p.name}
                              onChange={(e) => updateKeyPerson(c.id, p.id, { name: e.target.value })}
                              placeholder="Name"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Role</label>
                            <input 
                              className="bg-gray-50 dark:bg-black/40 border border-transparent focus:border-google-blue rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                              value={p.role}
                              onChange={(e) => updateKeyPerson(c.id, p.id, { role: e.target.value })}
                              placeholder="e.g. Lead Engineer"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Email</label>
                            <input 
                              className="bg-gray-50 dark:bg-black/40 border border-transparent focus:border-google-blue rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                              value={p.email}
                              onChange={(e) => updateKeyPerson(c.id, p.id, { email: e.target.value })}
                              placeholder="email@company.com"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black uppercase text-gray-400 ml-1">Mobile / Direct</label>
                            <input 
                              className="bg-gray-50 dark:bg-black/40 border border-transparent focus:border-google-blue rounded-lg px-2 py-1 text-[10px] font-bold outline-none"
                              value={p.phone}
                              onChange={(e) => updateKeyPerson(c.id, p.id, { phone: e.target.value })}
                              placeholder="Phone"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};