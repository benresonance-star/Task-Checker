import { create } from 'zustand';
import { MasterTasklist, TasklistInstance, Section, Subsection, Project, User, TaskFile, ProjectOverride, TaskGuide, ActionSetItem, ThemeSettings, ThemePreset, ScratchpadItem, FocusStage } from '../types';
import { generateUUID } from '../utils/uuid';
import { auth, db, storage } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, deleteField, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

interface TasklistState {
  masters: MasterTasklist[];
  instances: TasklistInstance[];
  projects: Project[];
  activeMaster: MasterTasklist | null;
  activeInstance: TasklistInstance | null;
  activeProject: Project | null;
  activeTaskId: string | null;
  mode: 'master' | 'project';
  currentUser: User | null;
  users: User[];
  loading: boolean;
  expandedStates: Record<string, boolean>; // Local UI state for expanded/collapsed sections/subsections
  knowledgeHubStep: number;
  notification: { message: string; type: 'success' | 'error' } | null;
  lastLocalThemeUpdate: number;
  
  // Actions
  isDarkMode: boolean;
  toggleDarkMode: (val?: boolean) => void;
  notify: (message: string, type: 'success' | 'error') => void;
  setMode: (mode: 'master' | 'project') => void;
  initializeAuth: () => void;
  updateUserRole: (userId: string, role: 'admin' | 'viewer') => Promise<void>;
  updatePersonalProjectOverride: (projectId: string, override: Partial<ProjectOverride>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  adminClearUserFocus: (userId: string) => Promise<void>;
  adminClearUserActionSet: (userId: string) => Promise<void>;
  setActiveMaster: (master: MasterTasklist | null) => void;
  setActiveInstance: (instance: TasklistInstance | null) => void;
  setActiveProject: (project: Project | null) => void;
  setActiveTaskId: (taskId: string | null) => void;
  setKnowledgeHubStep: (step: number) => void;
  toggleLocalExpanded: (id: string) => void; // Toggle expanded state locally
  setLocalExpanded: (id: string, expanded: boolean) => void; // Set expanded state locally
  isLocalExpanded: (id: string, defaultValue?: boolean) => boolean; // Check expanded state locally
  
  // Timer Actions
  setTaskTimer: (taskId: string, duration: number) => Promise<void>;
  resetTaskTimer: (taskId: string) => Promise<void>;
  toggleTaskTimer: (taskId: string) => Promise<void>;
  updateTaskTimer: (taskId: string, remaining: number) => Promise<void>;
  pauseOtherTimers: (exceptTaskId: string | null) => Promise<void>;
  tickTimers: (taskIds: Set<string>) => Promise<void>;
  
  // Project Management
  addProject: (name: string) => Promise<void>;
  updateProjectDetails: (id: string, details: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  addInstanceToProject: (projectId: string, masterId: string) => Promise<void>;
  removeInstanceFromProject: (projectId: string, instanceId: string) => Promise<void>;
  
  // Hierarchy Management
  toggleSection: (sectionId: string) => Promise<void>;
  toggleSubsection: (subsectionId: string) => Promise<void>;
  toggleTask: (taskId: string, instanceId?: string) => Promise<void>;
  updateTaskNotes: (taskId: string, notes: string, containerId: string, isUserNotes?: boolean, immediate?: boolean) => Promise<void>;
  updateTaskWorkbench: (taskId: string, workbench: string, containerId: string, immediate?: boolean) => Promise<void>;
  updateTaskGuide: (taskId: string, guide: Partial<TaskGuide>, containerId: string, immediate?: boolean) => Promise<void>;
  addTaskFile: (taskId: string, file: File, isUserFile?: boolean) => Promise<void>;
  removeTaskFile: (taskId: string, fileId: string, isUserFile?: boolean) => Promise<void>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, taskId: string, containerId: string, isUserFile: boolean) => Promise<void>;
  handleFileDownload: (file: any) => void;
  deleteTaskFeedback: (taskId: string, containerId: string) => Promise<void>;
  
  // Master CRUD
  addMaster: (title: string) => Promise<void>;
  deleteMaster: (id: string) => Promise<void>;
  renameMaster: (id: string, title: string) => Promise<void>;
  moveMaster: (id: string, direction: 'up' | 'down') => Promise<void>;
  
  addSection: (masterId: string, title: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  renameSection: (sectionId: string, title: string, containerId?: string) => Promise<void>;
  
  addSubsection: (sectionId: string, title: string) => Promise<void>;
  deleteSubsection: (subsectionId: string) => Promise<void>;
  renameSubsection: (subsectionId: string, title: string, containerId?: string) => Promise<void>;
  
  addTask: (subsectionId: string, title: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  renameTask: (taskId: string, title: string, containerId?: string) => Promise<void>;
  
  // Reorganization
  moveSection: (masterId: string, sectionId: string, direction: 'up' | 'down') => Promise<void>;
  moveSubsection: (sectionId: string, subsectionId: string, direction: 'up' | 'down') => Promise<void>;
  moveTask: (subsectionId: string, taskId: string, direction: 'up' | 'down') => Promise<void>;
  
  // Structural Reallocation
  promoteSubsection: (subsectionId: string) => Promise<void>;
  demoteSection: (sectionId: string, targetSectionId: string) => Promise<void>;
  
  // Presence
  updatePresence: (taskId: string | null) => Promise<void>;
  toggleTaskFocus: (projectId: string, instanceId: string, taskId: string) => Promise<void>;
  setFocusStage: (stage: FocusStage) => Promise<void>;
  toggleTaskPrerequisite: (taskId: string, prereqIndex: number, containerId: string) => Promise<void>;
  toggleTaskInActionSet: (projectId: string, instanceId: string, taskId: string) => Promise<void>;
  moveTaskInActionSet: (projectId: string, instanceId: string, taskId: string, direction: 'up' | 'down') => Promise<void>;
  setActionSet: (newSet: ActionSetItem[]) => Promise<void>;
  clearActionSet: () => Promise<void>;
  
  // Scratchpad
  addScratchpadTask: (text: string, category: string) => Promise<void>;
  updateScratchpadTask: (id: string, updates: { text?: string; category?: string; priority?: boolean }) => Promise<void>;
  toggleScratchpadTask: (id: string) => Promise<void>;
  toggleScratchpadPriority: (id: string) => Promise<void>;
  deleteScratchpadTask: (id: string) => Promise<void>;
  reorderScratchpad: (newScratchpad: ScratchpadItem[]) => Promise<void>;
  clearCompletedScratchpad: (category: string) => Promise<void>;

  // Import
  importMaster: (data: Partial<MasterTasklist>) => Promise<void>;

  // Admin Simulation
  adminSimulationMode: 'admin' | 'viewer';
  toggleSimulationMode: () => void;

  // Theme Settings
  themeSettingsLight: ThemeSettings;
  themeSettingsDark: ThemeSettings;
  themePresets: ThemePreset[];
  activePresetIdLight: string | null;
  activePresetIdDark: string | null;
  updateThemeSettings: (settings: Partial<ThemeSettings>, modeOverride?: 'light' | 'dark') => Promise<void>;
  previewThemeSettings: (settings: Partial<ThemeSettings>, modeOverride?: 'light' | 'dark') => void;
  resetThemeSettings: (modeOverride?: 'light' | 'dark') => Promise<void>;
  saveThemePreset: (name: string, modeOverride?: 'light' | 'dark') => Promise<void>;
  updateThemePreset: (presetId: string) => Promise<void>;
  deleteThemePreset: (presetId: string) => Promise<void>;
  applyThemePreset: (presetId: string) => Promise<void>;

  // Sidebar persistence
  showPlaylistSidebar: boolean;
  setShowPlaylistSidebar: (open: boolean) => void;
  showMainSidebar: boolean;
  setShowMainSidebar: (open: boolean) => void;
}

export const useTasklistStore = create<TasklistState>()((set, get) => {
  // HELPERS
  
  /**
   * Deeply removes undefined values from an object for Firestore compatibility.
   */
  const sanitize = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj, (_, value) => value === undefined ? null : value));
  };

  /**
   * Increments the version of a master template.
   */
  const incrementMasterVersion = (master: MasterTasklist) => {
    return {
      ...master,
      version: (master.version || 0) + 1,
      updatedAt: Date.now()
    };
  };

  // Debounce management for Firestore updates
  const debounceMap = new Map<string, any>();
  const debounceUpdate = (id: string, callback: () => Promise<void>, delay = 1000) => {
    if (debounceMap.has(id)) {
      clearTimeout(debounceMap.get(id));
    }
    const timeout = setTimeout(async () => {
      debounceMap.delete(id);
      await callback();
    }, delay);
    debounceMap.set(id, timeout);
  };

  const cancelDebounce = (id: string) => {
    if (debounceMap.has(id)) {
      clearTimeout(debounceMap.get(id));
      debounceMap.delete(id);
    }
  };

  /**
   * Applies theme settings to CSS Variables on the document root.
   */
  const applyThemeToRoot = (settings: ThemeSettings) => {
    const root = document.documentElement;
    root.style.setProperty('--brand-blue', settings.colorAppIdentity);
    root.style.setProperty('--brand-green', settings.colorCompletedState);
    root.style.setProperty('--brand-green-light', settings.colorActiveTaskDone);
    root.style.setProperty('--brand-red', settings.colorDestructive);
    root.style.setProperty('--brand-yellow', settings.colorPresenceNotice);
    
    // Updated semantic variables
    root.style.setProperty('--project-info-bg', settings.colorProjectInfoBg);
    root.style.setProperty('--project-info-border', settings.colorProjectInfoBorder);
    root.style.setProperty('--notes-bg', settings.colorNotesBg);
    root.style.setProperty('--notes-border', settings.colorNotesBorder);
    root.style.setProperty('--notes-editor-bg', settings.colorNotesEditorBg);
    root.style.setProperty('--notes-editor-border', settings.colorNotesEditorBorder);
    root.style.setProperty('--notes-editor-separator', settings.colorNotesEditorSeparator);
    root.style.setProperty('--note-personal-bg', settings.colorNotePersonalBg);
    root.style.setProperty('--note-project-bg', settings.colorNoteProjectBg);
    root.style.setProperty('--note-priority-bg', settings.colorNotePriorityBg);
    root.style.setProperty('--checklist-bg', settings.colorChecklistBg);
    root.style.setProperty('--checklist-border', settings.colorChecklistBorder);
    root.style.setProperty('--checklist-title', settings.colorChecklistTitle);
    root.style.setProperty('--section-bg', settings.colorSectionBg);
    root.style.setProperty('--section-border', settings.colorSectionBorder);
    root.style.setProperty('--section-title', settings.colorSectionTitle);
    root.style.setProperty('--subsection-bg', settings.colorSubsectionBg);
    root.style.setProperty('--subsection-border', settings.colorSubsectionBorder);
    root.style.setProperty('--subsection-title', settings.colorSubsectionTitle);
    root.style.setProperty('--task-title', settings.colorTaskTitle);
    root.style.setProperty('--metadata-card-bg', settings.colorMetadataCardBg);
    root.style.setProperty('--metadata-card-border', settings.colorMetadataCardBorder);
    root.style.setProperty('--metadata-card-border', settings.colorMetadataCardBorder);
    root.style.setProperty('--section-ident', settings.colorSectionIdent);
    root.style.setProperty('--section-ident-icon', settings.colorSectionIdentIcon);
    root.style.setProperty('--section-plan', settings.colorSectionPlan);
    root.style.setProperty('--section-plan-icon', settings.colorSectionPlanIcon);
    root.style.setProperty('--section-build', settings.colorSectionBuild);
    root.style.setProperty('--section-build-icon', settings.colorSectionBuildIcon);
    root.style.setProperty('--hierarchy-line', settings.colorHierarchyLine);
    root.style.setProperty('--prereq-bg', settings.colorPrereqBg);
    root.style.setProperty('--prereq-border', settings.colorPrereqBorder);
    root.style.setProperty('--prereq-item-bg', settings.colorPrereqItemBg);
    root.style.setProperty('--prereq-text', settings.colorPrereqText);
    root.style.setProperty('--prereq-icon', settings.colorPrereqIcon);
    root.style.setProperty('--hub-inactive-border', settings.colorHubInactiveBorder);
    root.style.setProperty('--hub-step2-inactive-bg', settings.colorHubStep2InactiveBg);
    root.style.setProperty('--focus-water', settings.colorFocusWater);

    // App Atmosphere
    root.style.setProperty('--app-bg', settings.colorAppBg);
    root.style.setProperty('--sidebar-bg', settings.colorSidebarBg);
    root.style.setProperty('--console-bg', settings.colorConsoleBg);

    // Typography
    root.style.setProperty('--text-primary', settings.colorTextPrimary);
    root.style.setProperty('--text-secondary', settings.colorTextSecondary);
    root.style.setProperty('--text-heading', settings.colorTextHeading);
    root.style.setProperty('--font-size-base', `${settings.fontSizeBase}px`);
    root.style.setProperty('--font-weight-heading', settings.fontWeightHeading);
    root.style.setProperty('--letter-spacing-heading', `${settings.letterSpacingHeading}em`);
    root.style.setProperty('--line-height-base', settings.lineHeightBase.toString());

    root.style.setProperty('--radius-card', `${settings.radiusTaskCard}px`);
    root.style.setProperty('--radius-section', `${settings.radiusSection}px`);
    root.style.setProperty('--radius-subsection', `${settings.radiusSubsection}px`);
    root.style.setProperty('--radius-button', `${settings.radiusInteractive}px`);
    root.style.setProperty('--radius-container', `${settings.radiusMajorModal}px`);
    root.style.setProperty('--radius-widget', `${settings.radiusWidget || 24}px`);
    root.style.setProperty('--radius-sidebar', `${settings.radiusSidebar || 0}px`);
    root.style.setProperty('--radius-project-info', `${settings.radiusProjectInfo || 32}px`);
    root.style.setProperty('--radius-metadata-card', `${settings.radiusMetadataCard || 20}px`);
    root.style.setProperty('--radius-focus-card', `${settings.radiusFocusCard || 48}px`);
    root.style.setProperty('--radius-task-button', `${settings.radiusTaskButton || 12}px`);
  };

  /**
   * Syncs the current live theme based on the app's dark/light mode.
   */
  const syncLiveTheme = () => {
    const { isDarkMode, themeSettingsLight, themeSettingsDark } = get();
    applyThemeToRoot(isDarkMode ? themeSettingsDark : themeSettingsLight);
  };

  /**
   * Migrates old theme settings to new semantic names.
   */
  const migrateThemeSettings = (oldSettings: any): ThemeSettings => {
    // If it's already the new nested structure being passed incorrectly, drill down
    if (oldSettings?.light && !oldSettings.colorAppIdentity) return migrateThemeSettings(oldSettings.light);

    return {
      colorAppIdentity: oldSettings.colorAppIdentity || oldSettings.brandBlue || '#4285F4',
      colorActiveTaskDone: oldSettings.colorActiveTaskDone || oldSettings.brandGreenLight || '#5DB975',
      colorCompletedState: oldSettings.colorCompletedState || oldSettings.brandGreen || '#34A853',
      colorDestructive: oldSettings.colorDestructive || oldSettings.brandRed || '#EA4335',
      colorPresenceNotice: oldSettings.colorPresenceNotice || oldSettings.brandYellow || '#FBBC05',
      
      // Defaults for new fields / Renamed fields
      colorProjectInfoBg: oldSettings.colorProjectInfoBg || oldSettings.colorDashboardBg || 'rgba(219, 234, 254, 0.7)',
      colorProjectInfoBorder: oldSettings.colorProjectInfoBorder || oldSettings.colorDashboardBorder || '#BFDBFE',
      colorNotesBg: oldSettings.colorNotesBg || oldSettings.colorProjectInfoBg || 'rgba(219, 234, 254, 0.7)',
      colorNotesBorder: oldSettings.colorNotesBorder || oldSettings.colorProjectInfoBorder || '#BFDBFE',
      colorNotesEditorBg: oldSettings.colorNotesEditorBg || (oldSettings.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)'),
      colorNotesEditorBorder: oldSettings.colorNotesEditorBorder || (oldSettings.mode === 'dark' ? '#334155' : '#E5E7EB'),
      colorNotesEditorSeparator: oldSettings.colorNotesEditorSeparator || (oldSettings.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
      colorNotePersonalBg: oldSettings.colorNotePersonalBg || (oldSettings.mode === 'dark' ? '#423b24' : '#fff9db'),
      colorNoteProjectBg: oldSettings.colorNoteProjectBg || (oldSettings.mode === 'dark' ? '#422f1c' : '#fff4e6'),
      colorNotePriorityBg: oldSettings.colorNotePriorityBg || (oldSettings.mode === 'dark' ? '#421c1c' : '#fff0f0'),
      colorChecklistBg: oldSettings.colorChecklistBg || 'rgba(239, 246, 255, 0.5)',
      colorChecklistBorder: oldSettings.colorChecklistBorder || '#DBEAFE',
      colorChecklistTitle: oldSettings.colorChecklistTitle || (oldSettings.mode === 'dark' ? '#FFFFFF' : '#111827'),
      colorSectionBg: oldSettings.colorSectionBg || (oldSettings.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)'),
      colorSectionBorder: oldSettings.colorSectionBorder || (oldSettings.mode === 'dark' ? '#1e293b' : '#DBEAFE'),
      colorSectionTitle: oldSettings.colorSectionTitle || (oldSettings.mode === 'dark' ? '#FFFFFF' : '#111827'),
      colorSubsectionBg: oldSettings.colorSubsectionBg || (oldSettings.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)'),
      colorSubsectionBorder: oldSettings.colorSubsectionBorder || (oldSettings.mode === 'dark' ? '#1e293b' : '#DBEAFE'),
      colorSubsectionTitle: oldSettings.colorSubsectionTitle || (oldSettings.mode === 'dark' ? '#D1D5DB' : '#4B5563'),
      colorTaskTitle: oldSettings.colorTaskTitle || (oldSettings.mode === 'dark' ? '#D1D5DB' : '#4B5563'),
      colorMetadataCardBg: oldSettings.colorMetadataCardBg || 'rgba(255, 255, 255, 0.8)',
      colorMetadataCardBorder: oldSettings.colorMetadataCardBorder || '#BFDBFE',
      colorSectionIdent: oldSettings.colorSectionIdent || '#4285F4', // google-blue
      colorSectionIdentIcon: oldSettings.colorSectionIdentIcon || '#4285F4', // google-blue
      colorSectionPlan: oldSettings.colorSectionPlan || '#34A853', // google-green
      colorSectionPlanIcon: oldSettings.colorSectionPlanIcon || '#34A853', // google-green
      colorSectionBuild: oldSettings.colorSectionBuild || '#F97316', // orange-500
      colorSectionBuildIcon: oldSettings.colorSectionBuildIcon || '#F97316', // orange-500
      colorHierarchyLine: oldSettings.colorHierarchyLine || '#D1D5DB', // gray-300
      colorPrereqBg: oldSettings.colorPrereqBg || (oldSettings.mode === 'dark' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 247, 237, 0.5)'),
      colorPrereqBorder: oldSettings.colorPrereqBorder || (oldSettings.mode === 'dark' ? 'rgba(249, 115, 22, 0.3)' : '#FFEDD5'),
      colorPrereqItemBg: oldSettings.colorPrereqItemBg || (oldSettings.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.6)'),
      colorPrereqText: oldSettings.colorPrereqText || '#EA580C', // orange-600
      colorPrereqIcon: oldSettings.colorPrereqIcon || '#EA580C', // orange-600
      colorHubInactiveBorder: oldSettings.colorHubInactiveBorder || (oldSettings.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'),
      colorHubStep2InactiveBg: oldSettings.colorHubStep2InactiveBg || (oldSettings.mode === 'dark' ? 'rgba(254, 226, 226, 0.1)' : 'rgba(254, 226, 226, 0.8)'),
      colorFocusWater: oldSettings.colorFocusWater || (oldSettings.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)'),

      // Defaults for new fields
      colorAppBg: oldSettings.colorAppBg || (oldSettings.mode === 'dark' ? '#121212' : '#FFFFFF'),
      colorSidebarBg: oldSettings.colorSidebarBg || (oldSettings.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : '#F9FAFB'),
      colorConsoleBg: oldSettings.colorConsoleBg || (oldSettings.mode === 'dark' ? '#1E1E1E' : '#FFFFFF'),
      colorTextPrimary: oldSettings.colorTextPrimary || (oldSettings.mode === 'dark' ? '#D1D5DB' : '#4B5563'),
      colorTextSecondary: oldSettings.colorTextSecondary || (oldSettings.mode === 'dark' ? '#9CA3AF' : '#6B7280'),
      colorTextHeading: oldSettings.colorTextHeading || (oldSettings.mode === 'dark' ? '#FFFFFF' : '#111827'),
      fontSizeBase: oldSettings.fontSizeBase || 14,
      fontWeightHeading: oldSettings.fontWeightHeading || '900',
      letterSpacingHeading: oldSettings.letterSpacingHeading || 0,
      lineHeightBase: oldSettings.lineHeightBase || 1.5,

      radiusTaskCard: oldSettings.radiusTaskCard || oldSettings.radiusCard || 20,
      radiusSection: oldSettings.radiusSection || 20,
      radiusSubsection: oldSettings.radiusSubsection || 20,
      radiusInteractive: oldSettings.radiusInteractive || oldSettings.radiusButton || 12,
      radiusMajorModal: oldSettings.radiusMajorModal || oldSettings.radiusContainer || 32,
      radiusWidget: oldSettings.radiusWidget || 24,
      radiusSidebar: oldSettings.radiusSidebar !== undefined ? oldSettings.radiusSidebar : 0,
      radiusProjectInfo: oldSettings.radiusProjectInfo || 32,
      radiusMetadataCard: oldSettings.radiusMetadataCard || 20,
      radiusFocusCard: oldSettings.radiusFocusCard || 48,
      radiusTaskButton: oldSettings.radiusTaskButton || 12,
    };
  };

  const getThemeDefaults = (isDark: boolean): ThemeSettings => ({
    colorAppIdentity: '#4285F4',
    colorActiveTaskDone: '#5DB975',
    colorCompletedState: '#34A853',
    colorDestructive: '#EA4335',
    colorPresenceNotice: '#FBBC05',
    colorProjectInfoBg: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(219, 234, 254, 0.7)',
    colorProjectInfoBorder: isDark ? '#334155' : '#BFDBFE',
    colorNotesBg: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(219, 234, 254, 0.7)',
    colorNotesBorder: isDark ? '#334155' : '#BFDBFE',
    colorNotesEditorBg: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
    colorNotesEditorBorder: isDark ? '#334155' : '#E5E7EB',
    colorNotesEditorSeparator: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    colorNotePersonalBg: isDark ? '#423b24' : '#fff9db',
    colorNoteProjectBg: isDark ? '#422f1c' : '#fff4e6',
    colorNotePriorityBg: isDark ? '#421c1c' : '#fff0f0',
    colorChecklistBg: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(239, 246, 255, 0.5)',
    colorChecklistBorder: isDark ? '#1e293b' : '#DBEAFE',
    colorChecklistTitle: isDark ? '#FFFFFF' : '#111827',
    colorSectionBg: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)',
    colorSectionBorder: isDark ? '#1e293b' : '#DBEAFE',
    colorSectionTitle: isDark ? '#FFFFFF' : '#111827',
    colorSubsectionBg: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)',
    colorSubsectionBorder: isDark ? '#1e293b' : '#DBEAFE',
    colorSubsectionTitle: isDark ? '#D1D5DB' : '#4B5563',
    colorTaskTitle: isDark ? '#D1D5DB' : '#4B5563',
    colorMetadataCardBg: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
    colorMetadataCardBorder: isDark ? '#1e293b' : '#BFDBFE',
    colorSectionIdent: '#4285F4',
    colorSectionIdentIcon: '#4285F4',
    colorSectionPlan: '#34A853',
    colorSectionPlanIcon: '#34A853',
    colorSectionBuild: '#F97316',
    colorSectionBuildIcon: '#F97316',
    colorHierarchyLine: isDark ? '#4b5563' : '#D1D5DB',
    colorPrereqBg: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 247, 237, 0.5)',
    colorPrereqBorder: isDark ? 'rgba(249, 115, 22, 0.3)' : '#FFEDD5',
    colorPrereqItemBg: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.6)',
    colorPrereqText: '#EA580C',
    colorPrereqIcon: '#EA580C',
    colorHubInactiveBorder: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
    colorHubStep2InactiveBg: isDark ? 'rgba(254, 226, 226, 0.1)' : 'rgba(254, 226, 226, 0.8)',
    colorFocusWater: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)',
    colorAppBg: isDark ? '#121212' : '#FFFFFF',
    colorSidebarBg: isDark ? 'rgba(0, 0, 0, 0.6)' : '#F9FAFB',
    colorConsoleBg: isDark ? '#1E1E1E' : '#FFFFFF',
    colorTextPrimary: isDark ? '#D1D5DB' : '#4B5563',
    colorTextSecondary: isDark ? '#9CA3AF' : '#6B7280',
    colorTextHeading: isDark ? '#FFFFFF' : '#111827',
    fontSizeBase: 14,
    fontWeightHeading: '900',
    letterSpacingHeading: 0,
    lineHeightBase: 1.5,
    radiusTaskCard: 20,
    radiusSection: 20,
    radiusSubsection: 20,
    radiusInteractive: 12,
    radiusMajorModal: 32,
    radiusWidget: 24,
    radiusSidebar: 0,
    radiusProjectInfo: 32,
    radiusMetadataCard: 20,
    radiusFocusCard: 48,
    radiusTaskButton: 12,
  });

  /**
   * Performs a structural merge between a Master template and a Project instance.
   */
  const performSync = (instance: TasklistInstance, master: MasterTasklist): TasklistInstance => {
    const masterSections: Section[] = JSON.parse(JSON.stringify(master.sections));
    const taskStates = new Map<string, { 
      completed: boolean; 
      timeTaken?: number | null; 
      userNotes?: string; 
      userFiles?: TaskFile[];
      timerDuration?: number;
      timerRemaining?: number;
      timerIsRunning?: boolean;
      timerLastUpdated?: number;
    }>();
    const sectionExpandedStates = new Map<string, boolean>();
    const subsectionExpandedStates = new Map<string, boolean>();

    instance.sections.forEach(s => {
      sectionExpandedStates.set(s.id, s.isExpanded);
      s.subsections.forEach(ss => {
        subsectionExpandedStates.set(ss.id, ss.isExpanded);
        ss.tasks.forEach(t => {
          taskStates.set(t.id, { 
            completed: t.completed, 
            timeTaken: t.timeTaken, 
            userNotes: t.userNotes, 
            userFiles: t.userFiles,
            timerDuration: t.timerDuration,
            timerRemaining: t.timerRemaining,
            timerIsRunning: t.timerIsRunning,
            timerLastUpdated: t.timerLastUpdated
          });
        });
      });
    });

    const syncedSections = masterSections.map(s => ({
      ...s,
      isExpanded: sectionExpandedStates.has(s.id) ? sectionExpandedStates.get(s.id)! : (s.isExpanded ?? true),
      subsections: s.subsections.map(ss => ({
        ...ss,
        isExpanded: subsectionExpandedStates.has(ss.id) ? subsectionExpandedStates.get(ss.id)! : (ss.isExpanded ?? true),
        tasks: ss.tasks.map(t => {
          const existing = taskStates.get(t.id);
          if (existing) {
            return { 
              ...t, 
              completed: existing.completed ?? false, 
              timeTaken: existing.timeTaken ?? null, 
              userNotes: existing.userNotes ?? '', 
              userFiles: existing.userFiles ?? [],
              timerDuration: existing.timerDuration ?? 20 * 60,
              timerRemaining: existing.timerRemaining ?? existing.timerDuration ?? 20 * 60,
              timerIsRunning: existing.timerIsRunning ?? false,
              timerLastUpdated: existing.timerLastUpdated
            };
          }
          return {
            ...t,
            userNotes: '',
            userFiles: [],
            completed: false,
            timerDuration: 20 * 60,
            timerRemaining: 20 * 60,
            timerIsRunning: false
          };
        })
      }))
    }));

    return {
      ...instance,
      title: master.title,
      sections: syncedSections,
      version: master.version,
      updatedAt: Date.now()
    };
  };

  return {
    masters: [],
    instances: [],
    projects: [],
    activeMaster: null,
    activeInstance: null,
    activeProject: null,
    activeTaskId: null,
    mode: 'master',
    currentUser: null,
    users: [],
    loading: true,
    isDarkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
    expandedStates: JSON.parse(localStorage.getItem('expandedStates') || '{}'),
    knowledgeHubStep: 0,
    adminSimulationMode: (sessionStorage.getItem('adminSimulationMode') as 'admin' | 'viewer') || 'admin',
    notification: null,
    lastLocalThemeUpdate: 0,
    themeSettingsLight: migrateThemeSettings(getThemeDefaults(false)),
    themeSettingsDark: migrateThemeSettings(getThemeDefaults(true)),
    themePresets: [],
    activePresetIdLight: null,
    activePresetIdDark: null,
    activePresetId: null, // Legacy
    showPlaylistSidebar: localStorage.getItem('playlist_sidebar_open') === 'true',
    showMainSidebar: localStorage.getItem('main_sidebar_open') !== 'false',

    toggleDarkMode: (val) => {
      const isDark = val !== undefined ? val : !get().isDarkMode;
      set({ isDarkMode: isDark });
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      syncLiveTheme();
    },

    setShowPlaylistSidebar: (open: boolean) => {
      localStorage.setItem('playlist_sidebar_open', open.toString());
      set({ showPlaylistSidebar: open });
    },

    setShowMainSidebar: (open: boolean) => {
      localStorage.setItem('main_sidebar_open', open.toString());
      set({ showMainSidebar: open });
    },

    notify: (message, type) => {
      set({ notification: { message, type } });
      setTimeout(() => {
        if (get().notification?.message === message) {
          set({ notification: null });
        }
      }, 5000);
    },

    setMode: (mode) => set({ mode }),

    toggleSimulationMode: () => {
      const current = get().adminSimulationMode;
      const next = current === 'admin' ? 'viewer' : 'admin';
      sessionStorage.setItem('adminSimulationMode', next);
      set({ adminSimulationMode: next });
    },

    toggleLocalExpanded: (id) => {
      const { expandedStates, currentUser } = get();
      const newState = { ...expandedStates, [id]: !expandedStates[id] };
      set({ expandedStates: newState });
      
      const key = currentUser ? `expandedStates_${currentUser.id}` : 'expandedStates';
      localStorage.setItem(key, JSON.stringify(newState));
    },

    setLocalExpanded: (id, expanded) => {
      const { expandedStates, currentUser } = get();
      if (expandedStates[id] === expanded) return;
      const newState = { ...expandedStates, [id]: expanded };
      set({ expandedStates: newState });
      
      const key = currentUser ? `expandedStates_${currentUser.id}` : 'expandedStates';
      localStorage.setItem(key, JSON.stringify(newState));
    },

    isLocalExpanded: (id, defaultValue = true) => {
      const { expandedStates } = get();
      return expandedStates[id] ?? defaultValue;
    },
    
    initializeAuth: () => {
      // Initial theme application
      const isDark = get().isDarkMode;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      syncLiveTheme();

      // PUBLIC THEME LISTENERS (Load branding before login)
      
      // Theme Settings Listener
      onSnapshot(doc(db, 'settings', 'theme'), (snapshot) => {
        const now = Date.now();
        const { lastLocalThemeUpdate } = get();
        if (now - lastLocalThemeUpdate < 2000) return;

        if (snapshot.exists()) {
          const data = snapshot.data();
          
          // Handle new dual-mode structure
          if (data.light && data.dark) {
            const migratedLight = migrateThemeSettings(data.light);
            const migratedDark = migrateThemeSettings(data.dark);
            
            set({ 
              themeSettingsLight: migratedLight,
              themeSettingsDark: migratedDark,
              activePresetIdLight: data.activePresetIdLight || null,
              activePresetIdDark: data.activePresetIdDark || null
            });
            
            syncLiveTheme();
          } else {
            // Backward compatibility
            const migrated = migrateThemeSettings(data);
            const update = {
              light: migrated,
              dark: getThemeDefaults(true),
              activePresetIdLight: null,
              activePresetIdDark: null
            };
            setDoc(doc(db, 'settings', 'theme'), sanitize(update));
          }
        } else {
          syncLiveTheme();
        }
      });

      // Theme Presets Listener
      onSnapshot(collection(db, 'themePresets'), (snapshot) => {
        const presets = snapshot.docs.map(d => {
          const data = d.data();
          const migratedSettings = migrateThemeSettings(data.settings);
          
          if (JSON.stringify(data.settings) !== JSON.stringify(migratedSettings)) {
            updateDoc(doc(db, 'themePresets', d.id), { 
              settings: sanitize(migratedSettings),
              updatedAt: Date.now()
            }).catch(err => console.error('Preset auto-update failed:', err));
          }

          return { 
            ...data, 
            id: d.id, 
            mode: data.mode || 'light',
            settings: migratedSettings 
          } as ThemePreset;
        });
        set({ themePresets: presets.sort((a, b) => b.createdAt - a.createdAt) });
      });

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          let userData: User;

          if (userDoc.exists()) {
            userData = userDoc.data() as User;
          } else {
            userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
              role: 'viewer'
            };
            await setDoc(userDocRef, userData);
          }
          set({ currentUser: userData });

          // Load user-specific expansion states
          const userExpandedStates = JSON.parse(localStorage.getItem(`expandedStates_${userData.id}`) || '{}');
          set({ expandedStates: userExpandedStates });

          // Load user-specific Knowledge Hub step
          const userKnowledgeHubStep = parseInt(localStorage.getItem(`knowledgeHubStep_${userData.id}`) || '0');
          set({ knowledgeHubStep: userKnowledgeHubStep });

          // Users Listener (for everyone, but UI will restrict visibility)
          onSnapshot(collection(db, 'users'), (snapshot) => {
            const users = snapshot.docs.map(d => d.data() as User);
            set({ users });
            
            // Also update currentUser if their role changed in the DB
            const updatedSelf = users.find(u => u.id === firebaseUser.uid);
            if (updatedSelf) set({ currentUser: updatedSelf });
          });
          // Masters Listener
          onSnapshot(collection(db, 'masters'), (snapshot) => {
            const mastersFromFirestore = snapshot.docs
              .map(d => ({ ...d.data(), id: d.id } as MasterTasklist))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            
            // PROTECT LOCAL STATE: Use a grace period after local updates to prevent stale Firestore overwrites.
            const localTaskState = new Map<string, { 
              notes: string;
              guide: TaskGuide;
              lastLocalContent: number;
            }>();
            get().masters.forEach(master => {
              master.sections.forEach(s => {
                s.subsections.forEach(ss => {
                  ss.tasks.forEach(t => {
                    const lastLocalContent = (globalThis as any)[`lastUpdate_${master.id}-${t.id}`] || 0;
                    localTaskState.set(`${master.id}-${t.id}`, { 
                      notes: t.notes || '',
                      guide: t.guide || {},
                      lastLocalContent
                    });
                  });
                });
              });
            });

            const mergedMasters = mastersFromFirestore.map(master => {
              return {
                ...master,
                sections: master.sections.map(s => ({
                  ...s,
                  subsections: s.subsections.map(ss => ({
                    ...ss,
                    tasks: ss.tasks.map(t => {
                      const local = localTaskState.get(`${master.id}-${t.id}`);
                      if (local) {
                        const isRecentContent = Date.now() - local.lastLocalContent < 15000;
                        return { 
                          ...t, 
                          notes: isRecentContent ? local.notes : t.notes,
                          guide: isRecentContent ? local.guide : t.guide
                        };
                      }
                      return t;
                    })
                  }))
                }))
              };
            });

            const currentActiveM = get().activeMaster;
            const updatedActive = currentActiveM ? mergedMasters.find(m => m.id === currentActiveM.id) : null;

            set({ 
              masters: mergedMasters,
              activeMaster: updatedActive || currentActiveM
            });

            // --- AUTO-SYNC LOGIC ---
            // If any master version has increased, find its instances and sync them locally
            // The instances listener will then handle pushing those changes to Firestore
            const currentInstances = get().instances;
            mergedMasters.forEach(master => {
              currentInstances.forEach(instance => {
                if (instance.masterId === master.id && instance.version < master.version) {
                  const synced = performSync(instance, master);
                  // Update Firestore to propagate changes to everyone
                  updateDoc(doc(db, 'instances', instance.id), sanitize({
                    sections: synced.sections,
                    version: synced.version,
                    updatedAt: synced.updatedAt,
                    title: synced.title
                  })).catch(err => console.error('Sync failed:', err));
                }
              });
            });
          });

          // Projects Listener
          onSnapshot(collection(db, 'projects'), (snapshot) => {
            const projects = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Project));
            set({ projects });
            const active = get().activeProject;
            if (active) {
              const updatedActive = projects.find(p => p.id === active.id);
              if (updatedActive) set({ activeProject: updatedActive });
            }
          });

          // Instances Listener
          onSnapshot(collection(db, 'instances'), (snapshot) => {
            const instancesFromFirestore = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TasklistInstance));

            // PROTECT LOCAL STATE: Use a grace period after local updates to prevent stale Firestore overwrites.
            // This is CRITICAL for the timer to prevent it "reverting" to old values on pause/toggle.
            const localTaskState = new Map<string, { 
              remaining: number; 
              running: boolean; 
              notes: string;
              userNotes: string;
              guide: TaskGuide;
              lastLocalTimer: number;
              lastLocalContent: number;
              timerLastUpdated: number;
            }>();
            get().instances.forEach(inst => {
              inst.sections.forEach(s => {
                s.subsections.forEach(ss => {
                  ss.tasks.forEach(t => {
                    const lastLocalTimer = (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] || 0;
                    const lastLocalContent = (globalThis as any)[`lastUpdate_${inst.id}-${t.id}`] || 0;
                    localTaskState.set(`${inst.id}-${t.id}`, { 
                      remaining: t.timerRemaining ?? 20 * 60, 
                      running: t.timerIsRunning ?? false,
                      notes: t.notes || '',
                      userNotes: t.userNotes || '',
                      guide: t.guide || {},
                      lastLocalTimer,
                      lastLocalContent,
                      timerLastUpdated: t.timerLastUpdated || 0
                    });
                  });
                });
              });
            });

            const mergedInstances = instancesFromFirestore.map(inst => {
              return {
                ...inst,
                sections: inst.sections.map(s => ({
                  ...s,
                  subsections: s.subsections.map(ss => ({
                    ...ss,
                    tasks: ss.tasks.map(t => {
                      const local = localTaskState.get(`${inst.id}-${t.id}`);
                      
                      const tWithDefaults = {
                        ...t,
                        timerRemaining: t.timerRemaining ?? t.timerDuration ?? 20 * 60,
                        timerDuration: t.timerDuration ?? 20 * 60,
                        timerIsRunning: t.timerIsRunning ?? false
                      };

                      if (local) {
                        const isRecentTimer = Date.now() - local.lastLocalTimer < 10000;
                        const isLocalTimerNewer = (local.timerLastUpdated || 0) > (t.timerLastUpdated || 0);
                        const isRecentContent = Date.now() - local.lastLocalContent < 20000;

                        const useLocalTimer = isRecentTimer || isLocalTimerNewer;

                        return { 
                          ...tWithDefaults, 
                          timerRemaining: useLocalTimer ? local.remaining : tWithDefaults.timerRemaining,
                          timerIsRunning: useLocalTimer ? local.running : tWithDefaults.timerIsRunning,
                          timerLastUpdated: useLocalTimer ? local.timerLastUpdated : t.timerLastUpdated,
                          notes: isRecentContent ? local.notes : t.notes,
                          userNotes: isRecentContent ? local.userNotes : t.userNotes,
                          guide: isRecentContent ? local.guide : t.guide
                        };
                      }
                      return tWithDefaults;
                    })
                  }))
                }))
              };
            });

            const currentActiveInstance = get().activeInstance;
            const updatedActive = currentActiveInstance ? mergedInstances.find(i => i.id === currentActiveInstance.id) : null;

            set({ 
              instances: mergedInstances,
              activeInstance: updatedActive || currentActiveInstance
            });

            // --- REVERSE CHECK ---
            // If instances updated but we haven't synced with master yet (e.g. just loaded)
            const currentMasters = get().masters;
            mergedInstances.forEach(instance => {
              const master = currentMasters.find(m => m.id === instance.masterId);
              if (master && instance.version < master.version) {
                const synced = performSync(instance, master);
                updateDoc(doc(db, 'instances', instance.id), sanitize({
                  sections: synced.sections,
                  version: synced.version,
                  updatedAt: synced.updatedAt,
                  title: synced.title
                })).catch(err => console.error('Sync failed:', err));
              }
            });
          });

          set({ loading: false });
        } else {
          // Reset to generic expansion states on logout
          const genericStates = JSON.parse(localStorage.getItem('expandedStates') || '{}');
          set({ currentUser: null, expandedStates: genericStates, loading: false });
        }
      });
    },
    
    setActiveMaster: (master) => set({ activeMaster: master }),
    setActiveInstance: (instance) => set({ activeInstance: instance }),
    setActiveProject: (project) => set({ activeProject: project, activeInstance: null, activeTaskId: null }),
    setActiveTaskId: (taskId) => {
      set({ activeTaskId: taskId });
      get().updatePresence(taskId);
      // Automatically pause any running timers when switching focus
      get().pauseOtherTimers(taskId);
    },

    setKnowledgeHubStep: (step) => {
      const { currentUser } = get();
      set({ knowledgeHubStep: step });
      if (currentUser) {
        localStorage.setItem(`knowledgeHubStep_${currentUser.id}`, step.toString());
      } else {
        localStorage.setItem('knowledgeHubStep', step.toString());
      }
    },

    updatePresence: async (taskId) => {
      const { currentUser, activeInstance, mode } = get();
      if (!currentUser || !activeInstance || mode !== 'project') return;

      const instanceRef = doc(db, 'instances', activeInstance.id);
      
      if (taskId) {
        // Use dot notation to update ONLY this user's entry, preventing overwrites of other users
        await updateDoc(instanceRef, {
          [`activeUsers.${currentUser.id}`]: {
            taskId,
            userName: currentUser.name,
            lastSeen: Date.now()
          }
        });
      } else {
        // Remove this user's entry from the map
        const activeUsers = { ...(activeInstance.activeUsers || {}) };
        delete activeUsers[currentUser.id];
        await updateDoc(instanceRef, { activeUsers });
      }
    },

    toggleTaskFocus: async (projectId, instanceId, taskId) => {
      const { currentUser } = get();
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.id);
      const currentFocus = currentUser.activeFocus;

      if (currentFocus?.projectId === projectId && currentFocus?.instanceId === instanceId && currentFocus?.taskId === taskId) {
        // Toggle off
        await updateDoc(userRef, { activeFocus: null });
        get().pauseOtherTimers(null);
      } else {
        // Toggle on or switch
        const newFocus = {
          projectId,
          instanceId,
          taskId,
          timestamp: Date.now(),
          stage: 'staged' as FocusStage
        };
        await updateDoc(userRef, { activeFocus: newFocus });
        get().pauseOtherTimers(taskId);
      }
    },

    setFocusStage: async (stage) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.activeFocus) return;

      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        'activeFocus.stage': stage
      });
    },

    toggleTaskPrerequisite: async (taskId, prereqIndex, containerId) => {
      const { instances } = get();
      const instance = instances.find(i => i.id === containerId);
      if (!instance) return;

      const newInstances = instances.map(inst => {
        if (inst.id !== containerId) return inst;
        return {
          ...inst,
          sections: inst.sections.map(sec => ({
            ...sec,
            subsections: sec.subsections.map(sub => ({
              ...sub,
              tasks: sub.tasks.map(task => {
                if (task.id !== taskId) return task;
                const completedPrereqs = task.completedPrereqs || [];
                const newCompletedPrereqs = completedPrereqs.includes(prereqIndex)
                  ? completedPrereqs.filter(i => i !== prereqIndex)
                  : [...completedPrereqs, prereqIndex];
                return { ...task, completedPrereqs: newCompletedPrereqs, lastUpdated: Date.now() };
              })
            }))
          }))
        };
      });

      set({ instances: newInstances });
      
      const taskRef = doc(db, 'instances', containerId);
      const updatedInstance = newInstances.find(i => i.id === containerId);
      if (updatedInstance) {
        await updateDoc(taskRef, {
          sections: updatedInstance.sections
        });
      }
    },

    toggleTaskInActionSet: async (projectId, instanceId, taskId) => {
      const { currentUser } = get();
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.id);
      const currentSet = currentUser.actionSet || [];
      const exists = currentSet.find(i => i.projectId === projectId && i.instanceId === instanceId && i.taskId === taskId);

      if (exists) {
        // Remove from playlist
        const newSet = currentSet.filter(i => !(i.projectId === projectId && i.instanceId === instanceId && i.taskId === taskId));
        await updateDoc(userRef, { actionSet: newSet });
      } else {
        // Add to playlist
        const newItem = {
          projectId,
          instanceId,
          taskId,
          addedAt: Date.now()
        };
        await updateDoc(userRef, { actionSet: [...currentSet, newItem] });
      }
    },

    moveTaskInActionSet: async (projectId, instanceId, taskId, direction) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.actionSet) return;

      const userRef = doc(db, 'users', currentUser.id);
      const set = [...currentUser.actionSet];
      const idx = set.findIndex(i => i.projectId === projectId && i.instanceId === instanceId && i.taskId === taskId);
      
      if (idx === -1) return;
      if (direction === 'up' && idx === 0) return;
      if (direction === 'down' && idx === set.length - 1) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      [set[idx], set[targetIdx]] = [set[targetIdx], set[idx]];

      await updateDoc(userRef, { actionSet: set });
    },

    setActionSet: async (newSet) => {
      const { currentUser } = get();
      if (!currentUser) return;
      await updateDoc(doc(db, 'users', currentUser.id), { actionSet: newSet });
    },

    clearActionSet: async () => {
      const { currentUser } = get();
      if (!currentUser) return;
      await updateDoc(doc(db, 'users', currentUser.id), { actionSet: [] });
    },

    addScratchpadTask: async (text, category) => {
      const { currentUser } = get();
      if (!currentUser) return;
      
      const newItem: ScratchpadItem = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        category,
        completed: false,
        priority: false,
        createdAt: Date.now()
      };

      const scratchpad = [...(currentUser.scratchpad || []), newItem];
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    updateScratchpadTask: async (id, updates) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.scratchpad) return;

      const scratchpad = currentUser.scratchpad.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      
      // Optimistic Update
      set({ currentUser: { ...currentUser, scratchpad } });
      
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    toggleScratchpadTask: async (id) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.scratchpad) return;

      const scratchpad = currentUser.scratchpad.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      
      // Optimistic Update
      set({ currentUser: { ...currentUser, scratchpad } });
      
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    toggleScratchpadPriority: async (id) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.scratchpad) return;

      const scratchpad = currentUser.scratchpad.map(item => 
        item.id === id ? { ...item, priority: !item.priority } : item
      );
      
      // Optimistic Update
      set({ currentUser: { ...currentUser, scratchpad } });
      
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    deleteScratchpadTask: async (id) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.scratchpad) return;

      const scratchpad = currentUser.scratchpad.filter(item => item.id !== id);
      
      // Optimistic Update
      set({ currentUser: { ...currentUser, scratchpad } });
      
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    reorderScratchpad: async (newScratchpad) => {
      const { currentUser } = get();
      if (!currentUser) return;
      
      // Optimistic Update
      set({ currentUser: { ...currentUser, scratchpad: newScratchpad } });
      
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad: newScratchpad });
    },

    clearCompletedScratchpad: async (category) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.scratchpad) return;

      const scratchpad = currentUser.scratchpad.filter(item => 
        !(item.category === category && item.completed)
      );
      await updateDoc(doc(db, 'users', currentUser.id), { scratchpad });
    },

    updateUserRole: async (userId, role) => {
      await updateDoc(doc(db, 'users', userId), { role });
    },

    updatePersonalProjectOverride: async (projectId, override) => {
      const { currentUser } = get();
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.id);
      
      // If we are removing the link, delete the specific project override key entirely
      if (override.oneDriveLink === undefined || override.oneDriveLink === null) {
        await updateDoc(userRef, {
          [`projectOverrides.${projectId}`]: deleteField()
        });
      } else {
        await updateDoc(userRef, {
          [`projectOverrides.${projectId}`]: override
        });
      }
    },

    deleteUser: async (userId) => {
      // Note: This only deletes the Firestore profile, not the Firebase Auth account.
      // Firebase Auth accounts must be deleted via Admin SDK or Firebase Console.
      await deleteDoc(doc(db, 'users', userId));
    },

    adminClearUserFocus: async (userId) => {
      await updateDoc(doc(db, 'users', userId), { activeFocus: null });
    },

    adminClearUserActionSet: async (userId) => {
      await updateDoc(doc(db, 'users', userId), { actionSet: [] });
    },

    setTaskTimer: async (taskId, duration) => {
      const { instances, activeInstance } = get();
      let targetInstanceId: string | null = null;

      const updatedInstances = instances.map(inst => {
        let changed = false;
        const updatedSections = inst.sections.map(s => ({
          ...s,
          subsections: s.subsections.map(ss => ({
            ...ss,
            tasks: ss.tasks.map(t => {
              if (t.id === taskId) {
                changed = true;
                targetInstanceId = inst.id;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                // Setting timer always resets remaining to duration and pauses
                return { 
                  ...t, 
                  timerDuration: duration, 
                  timerRemaining: duration, 
                  timerIsRunning: false,
                  timerLastUpdated: Date.now() 
                };
              }
              return t;
            })
          }))
        }));
        return changed ? { ...inst, sections: updatedSections } : inst;
      });

      if (!targetInstanceId) return;

      set({ instances: updatedInstances });
      if (activeInstance?.id === targetInstanceId) {
        set({ activeInstance: updatedInstances.find(i => i.id === targetInstanceId) || null });
      }

      const targetInst = updatedInstances.find(i => i.id === targetInstanceId);
      if (targetInst) {
        try {
          await updateDoc(doc(db, 'instances', targetInst.id), sanitize({ sections: targetInst.sections }));
        } catch (error) {
          console.error('Timer sync failed:', error);
          get().notify('Failed to sync timer with cloud. Changes saved locally.', 'error');
        }
      }
    },

    resetTaskTimer: async (taskId) => {
      const { instances, activeInstance } = get();
      let targetInstanceId: string | null = null;

      const updatedInstances = instances.map(inst => {
        let changed = false;
        const updatedSections = inst.sections.map(s => ({
          ...s,
          subsections: s.subsections.map(ss => ({
            ...ss,
            tasks: ss.tasks.map(t => {
              if (t.id === taskId) {
                changed = true;
                targetInstanceId = inst.id;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                // Resetting timer sets remaining back to duration and pauses
                return { 
                  ...t, 
                  timerRemaining: t.timerDuration || 20 * 60, 
                  timerIsRunning: false,
                  timerLastUpdated: Date.now()
                };
              }
              return t;
            })
          }))
        }));
        return changed ? { ...inst, sections: updatedSections } : inst;
      });

      if (!targetInstanceId) return;

      set({ instances: updatedInstances });
      if (activeInstance?.id === targetInstanceId) {
        set({ activeInstance: updatedInstances.find(i => i.id === targetInstanceId) || null });
      }

      const targetInst = updatedInstances.find(i => i.id === targetInstanceId);
      if (targetInst) {
        try {
          await updateDoc(doc(db, 'instances', targetInst.id), sanitize({ sections: targetInst.sections }));
        } catch (error) {
          console.error('Reset timer failed:', error);
          get().notify('Failed to reset timer in cloud.', 'error');
        }
      }
    },

    toggleTaskTimer: async (taskId) => {
      const { instances, activeInstance } = get();
      let targetInstanceId: string | null = null;
      let isStarting = false;

      // First pass: find if we are starting the timer
      instances.forEach(inst => {
        inst.sections.forEach(s => {
          s.subsections.forEach(ss => {
            ss.tasks.forEach(t => {
              if (t.id === taskId && !t.timerIsRunning) {
                isStarting = true;
              }
            });
          });
        });
      });

      const updatedInstances = instances.map(inst => {
        let instanceChanged = false;
        const updatedSections = inst.sections.map(s => {
          let sectionChanged = false;
          const updatedSubsections = s.subsections.map(ss => {
            let subsectionChanged = false;
            const updatedTasks = ss.tasks.map(t => {
              // If we are starting a timer, pause ALL other running timers
              if (isStarting && t.id !== taskId && t.timerIsRunning) {
                instanceChanged = true;
                sectionChanged = true;
                subsectionChanged = true;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                return { ...t, timerIsRunning: false, timerLastUpdated: Date.now() };
              }
              if (t.id === taskId) {
                instanceChanged = true;
                sectionChanged = true;
                subsectionChanged = true;
                targetInstanceId = inst.id;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                
                // Toggle running state. If it was finished (0), don't auto-reset here.
                // The user must explicitly reset or set a new time.
                return { 
                  ...t, 
                  timerIsRunning: !t.timerIsRunning,
                  timerLastUpdated: Date.now()
                };
              }
              return t;
            });
            return subsectionChanged ? { ...ss, tasks: updatedTasks } : ss;
          });
          return sectionChanged ? { ...s, subsections: updatedSubsections } : s;
        });
        return instanceChanged ? { ...inst, sections: updatedSections } : inst;
      });

      if (!targetInstanceId) return;

      set({ instances: updatedInstances });
      if (activeInstance?.id === targetInstanceId) {
        set({ activeInstance: updatedInstances.find(i => i.id === targetInstanceId) || null });
      }

      // Sync all changed instances to Firestore
      const updatePromises = updatedInstances
        .filter(inst => {
          // Check if this instance was changed during the toggle/pause process
          const original = instances.find(o => o.id === inst.id);
          return JSON.stringify(original?.sections) !== JSON.stringify(inst.sections);
        })
        .map(inst => updateDoc(doc(db, 'instances', inst.id), sanitize({ sections: inst.sections })));
      
      try {
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Toggle timer sync failed:', error);
        get().notify('Timer toggle failed to sync with cloud.', 'error');
      }
    },

    updateTaskTimer: async (taskId, remaining) => {
      const { instances, activeInstance } = get();
      let targetInstanceId: string | null = null;
      
      const updatedInstances = instances.map(inst => {
        let changed = false;
        const updatedSections = inst.sections.map(s => ({
          ...s,
          subsections: s.subsections.map(ss => ({
            ...ss,
            tasks: ss.tasks.map(t => {
              if (t.id === taskId) {
                changed = true;
                targetInstanceId = inst.id;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                return { 
                  ...t, 
                  timerRemaining: remaining, 
                  timerIsRunning: remaining > 0 ? (t.timerIsRunning ?? false) : false,
                  timerLastUpdated: Date.now()
                };
              }
              return t;
            })
          }))
        }));
        return changed ? { ...inst, sections: updatedSections } : inst;
      });

      if (!targetInstanceId) return;

      set({ instances: updatedInstances });
      if (activeInstance?.id === targetInstanceId) {
        set({ activeInstance: updatedInstances.find(i => i.id === targetInstanceId) || null });
      }
      
      const targetInst = updatedInstances.find(i => i.id === targetInstanceId);
      if (targetInst) {
        // Sync to Firestore immediately for deliberate timer updates (Pause, Add 5m, manual set)
        try {
          await updateDoc(doc(db, 'instances', targetInst.id), sanitize({ sections: targetInst.sections }));
        } catch (error) {
          console.error('Task timer update failed:', error);
          get().notify('Failed to sync timer update to cloud.', 'error');
        }
      }
    },

    pauseOtherTimers: async (exceptTaskId) => {
      const { instances } = get();
      let instancesToUpdate: TasklistInstance[] = [];

      const updatedInstances = instances.map(inst => {
        let instanceChanged = false;
        const sections = inst.sections.map(s => {
          let sChanged = false;
          const subsections = s.subsections.map(ss => {
            let ssChanged = false;
            const tasks = ss.tasks.map(t => {
              if (t.timerIsRunning && t.id !== exceptTaskId) {
                instanceChanged = true;
                sChanged = true;
                ssChanged = true;
                (globalThis as any)[`lastToggle_${inst.id}-${t.id}`] = Date.now();
                return { ...t, timerIsRunning: false, timerLastUpdated: Date.now() };
              }
              return t;
            });
            return ssChanged ? { ...ss, tasks } : ss;
          });
          return sChanged ? { ...s, subsections } : s;
        });
        
        if (instanceChanged) {
          const newInst = { ...inst, sections };
          instancesToUpdate.push(newInst);
          return newInst;
        }
        return inst;
      });

      if (instancesToUpdate.length > 0) {
        set({ instances: updatedInstances });
        const updatePromises = instancesToUpdate.map(inst => 
          updateDoc(doc(db, 'instances', inst.id), sanitize({ sections: inst.sections }))
        );
        await Promise.all(updatePromises);
      }
    },

    tickTimers: async (taskIds) => {
      const { instances, activeInstance, currentUser } = get();
      if (instances.length === 0 || !currentUser) return;

      let anyChanged = false;
      const updatedInstances = instances.map(inst => {
        let instanceChanged = false;
        const updatedSections = inst.sections.map(s => ({
          ...s,
          subsections: s.subsections.map(ss => ({
            ...ss,
            tasks: ss.tasks.map(t => {
              if (taskIds.has(t.id) && t.timerIsRunning) {
                const currentRemaining = t.timerRemaining ?? t.timerDuration ?? 20 * 60;
                if (currentRemaining > 0) {
                  instanceChanged = true;
                  anyChanged = true;
                  const remaining = currentRemaining - 1;
                  return { ...t, timerRemaining: remaining, timerIsRunning: remaining > 0 };
                }
              }
              return t;
            })
          }))
        }));

        if (instanceChanged) {
          return { ...inst, sections: updatedSections };
        }
        return inst;
      });

      if (!anyChanged) return;

      // Update the global instances array so the sidebar and other views refresh
      set({ instances: updatedInstances });

      // If the active instance was one of the ones that changed, update it too
      if (activeInstance) {
        const updatedActive = updatedInstances.find(i => i.id === activeInstance.id);
        if (updatedActive) {
          set({ activeInstance: updatedActive });
        }
      }

      // NO FIRESTORE UPDATES HERE - Countdown is purely local to prevent multi-user sync loops
    },

    addProject: async (name) => {
      const newProject = { 
        name, 
        instanceIds: [],
        projectNumber: '',
        address: '',
        client: '',
        clientPhone: '',
        clientEmail: '',
        council: '',
        planningZone: { name: '', link: '' },
        planningOverlays: [],
        buildingClassifications: [],
        nccClimateZone: '',
        oneDriveLink: '',
        consultants: []
      };
      try {
        const docRef = await addDoc(collection(db, 'projects'), newProject);
        set({ activeProject: { ...newProject, id: docRef.id } as Project });
        get().notify('Project created successfully', 'success');
      } catch (error) {
        console.error('Add project failed:', error);
        get().notify('Failed to create project in cloud.', 'error');
      }
    },

    updateProjectDetails: async (id, details) => {
      const { projects, activeProject } = get();
      const updatedProjects = projects.map(p => p.id === id ? { ...p, ...details } : p);
      
      // Optimistic Update
      set({ 
        projects: updatedProjects,
        activeProject: activeProject?.id === id ? { ...activeProject, ...details } : activeProject
      });

      try {
        await updateDoc(doc(db, 'projects', id), sanitize(details));
      } catch (err) {
        console.error('Failed to update project details:', err);
      }
    },

    deleteProject: async (id) => {
      const { instances } = get();
      
      // 1. Delete associated instances
      for (const inst of instances.filter(i => i.projectId === id)) {
        await deleteDoc(doc(db, 'instances', inst.id));
      }

      // 2. Cleanup Documents and Storage (Root folder cleanup)
      try {
        const projectDocsFolderRef = ref(storage, `projects/${id}/documents`);
        const listResult = await listAll(projectDocsFolderRef);
        
        // Delete all files in the documents folder
        const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);

        // Recursively handle subfolders if any (Online Documents supports nested folders)
        const deleteFolderRecursive = async (folderRef: any) => {
          const res = await listAll(folderRef);
          for (const item of res.items) {
            await deleteObject(item);
          }
          for (const folder of res.prefixes) {
            await deleteFolderRecursive(folder);
          }
        };
        await deleteFolderRecursive(projectDocsFolderRef);
      } catch (e) {
        console.warn('Storage cleanup failed or folder did not exist:', e);
      }

      // 3. Cleanup Firestore document records
      const docsRef = collection(db, 'projects', id, 'documents');
      const docsSnap = await getDocs(docsRef);
      for (const d of docsSnap.docs) {
        await deleteDoc(doc(db, 'projects', id, 'documents', d.id));
      }

      // 4. Delete Project itself
      await deleteDoc(doc(db, 'projects', id));
      if (get().activeProject?.id === id) set({ activeProject: null, activeInstance: null });
    },

    renameProject: async (id, name) => {
      const { projects, activeProject } = get();
      const updatedProjects = projects.map(p => p.id === id ? { ...p, name } : p);
      
      // Optimistic Update
      set({ 
        projects: updatedProjects,
        activeProject: activeProject?.id === id ? { ...activeProject, name } : activeProject
      });

      try {
        await updateDoc(doc(db, 'projects', id), { name });
      } catch (err) {
        console.error('Failed to rename project:', err);
      }
    },

    addInstanceToProject: async (projectId, masterId) => {
      const { masters, projects, instances } = get();
      const project = projects.find(p => p.id === projectId);
      const master = masters.find(m => m.id === masterId);
      if (!project || !master) return;

      if (instances.some(i => i.projectId === projectId && i.masterId === masterId)) return;

      const newInstance = {
        masterId,
        projectId,
        title: master.title,
        sections: JSON.parse(JSON.stringify(master.sections || [])),
        version: master.version || 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'instances'), newInstance);
      await updateDoc(doc(db, 'projects', projectId), {
        instanceIds: [...project.instanceIds, docRef.id]
      });
    },

    removeInstanceFromProject: async (projectId, instanceId) => {
      const project = get().projects.find(p => p.id === projectId);
      if (!project) return;
      await deleteDoc(doc(db, 'instances', instanceId));
      await updateDoc(doc(db, 'projects', projectId), {
        instanceIds: project.instanceIds.filter((id: string) => id !== instanceId)
      });
      if (get().activeInstance?.id === instanceId) set({ activeInstance: null });
    },

    toggleSection: async (sectionId) => {
      const { mode, activeMaster, activeInstance } = get();
      if (mode === 'master' && activeMaster) {
        const updated = activeMaster.sections.map(s => s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s);
        await updateDoc(doc(db, 'masters', activeMaster.id), { sections: updated });
      } else if (mode === 'project' && activeInstance) {
        const updated = activeInstance.sections.map(s => s.id === sectionId ? { ...s, isExpanded: !s.isExpanded } : s);
        await updateDoc(doc(db, 'instances', activeInstance.id), { sections: updated });
      }
    },

    toggleSubsection: async (subsectionId) => {
      const { mode, activeMaster, activeInstance } = get();
      const toggle = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ss.id === subsectionId ? { ...ss, isExpanded: !ss.isExpanded } : ss)
      }));
      if (mode === 'master' && activeMaster) {
        await updateDoc(doc(db, 'masters', activeMaster.id), { sections: toggle(activeMaster.sections) });
      } else if (mode === 'project' && activeInstance) {
        await updateDoc(doc(db, 'instances', activeInstance.id), { sections: toggle(activeInstance.sections) });
      }
    },

    toggleTask: async (taskId, instanceId) => {
      const { activeInstance, instances } = get();
      const targetInstance = instanceId 
        ? instances.find(i => i.id === instanceId)
        : activeInstance;

      if (!targetInstance) return;
      
      const updated = targetInstance.sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => {
            if (t.id !== taskId) return t;
            const completed = !t.completed;
            const timeTaken = completed && t.timerDuration && t.timerRemaining ? t.timerDuration - t.timerRemaining : (completed ? (t.timeTaken ?? null) : null);
            return { ...t, completed, timeTaken, timerIsRunning: completed ? false : (t.timerIsRunning ?? false), lastUpdated: Date.now() };
          })
        }))
      }));
      await updateDoc(doc(db, 'instances', targetInstance.id), sanitize({ sections: updated }));
    },

    updateTaskNotes: async (taskId, notes, containerId, isUserNotes = false, immediate = false) => {
      const { mode, masters, instances } = get();
      const field = isUserNotes ? 'userNotes' : 'notes';
      const timestamp = Date.now();
      
      // Track local update for protection against snapshot reverts
      (globalThis as any)[`lastUpdate_${containerId}-${taskId}`] = timestamp;

      const updateSections = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, [field]: notes, lastUpdated: timestamp } : t)
        }))
      }));

      if (mode === 'master') {
        const targetMaster = masters.find(m => m.id === containerId);
        if (!targetMaster) return;

        const updatedMaster = { ...targetMaster, sections: updateSections(targetMaster.sections), updatedAt: timestamp };
        
        // Optimistic Update
        set(state => ({ 
          masters: state.masters.map(m => m.id === targetMaster.id ? updatedMaster : m),
          activeMaster: state.activeMaster?.id === targetMaster.id ? updatedMaster : state.activeMaster
        }));

        const performDbUpdate = async () => {
          // Read LATEST from store to avoid Lost Updates if multiple tasks were edited in same container
          const latestMaster = get().masters.find(m => m.id === targetMaster.id);
          if (!latestMaster) return;
          
          const finalMaster = incrementMasterVersion(latestMaster);
          try {
            await updateDoc(doc(db, 'masters', targetMaster.id), sanitize({ 
              sections: finalMaster.sections, 
              version: finalMaster.version, 
              updatedAt: finalMaster.updatedAt 
            }));
          } catch (err) {
            console.error('Failed to update master notes:', err);
          }
        };

        if (immediate) {
          cancelDebounce(`master-notes-${targetMaster.id}`);
          await performDbUpdate();
        } else {
          debounceUpdate(`master-notes-${targetMaster.id}`, performDbUpdate);
        }

      } else if (mode === 'project') {
        const targetInstance = instances.find(i => i.id === containerId);
        if (!targetInstance) return;

        const updatedSections = updateSections(targetInstance.sections);
        const updatedInstance = { ...targetInstance, sections: updatedSections, updatedAt: timestamp };
        
        // Optimistic Update
        set(state => ({
          instances: state.instances.map(i => i.id === targetInstance.id ? updatedInstance : i),
          activeInstance: state.activeInstance?.id === targetInstance.id ? updatedInstance : state.activeInstance
        }));

        const performDbUpdate = async () => {
          // Read LATEST from store to avoid Lost Updates
          const latestInstance = get().instances.find(i => i.id === targetInstance.id);
          if (!latestInstance) return;

          try {
            await updateDoc(doc(db, 'instances', targetInstance.id), sanitize({ 
              sections: latestInstance.sections,
              updatedAt: Date.now()
            }));
          } catch (err) {
            console.error('Failed to update instance notes:', err);
          }
        };

        if (immediate) {
          cancelDebounce(`instance-notes-${targetInstance.id}`);
          await performDbUpdate();
        } else {
          debounceUpdate(`instance-notes-${targetInstance.id}`, performDbUpdate);
        }
      }
    },

    updateTaskWorkbench: async (taskId, workbench, containerId, immediate = false) => {
      const { instances } = get();
      const timestamp = Date.now();
      
      // Track local update for protection against snapshot reverts
      (globalThis as any)[`lastUpdate_${containerId}-${taskId}`] = timestamp;

      const updateSections = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, workbench, lastUpdated: timestamp } : t)
        }))
      }));

      const targetInstance = instances.find(i => i.id === containerId);
      if (!targetInstance) return;

      const updatedSections = updateSections(targetInstance.sections);
      const updatedInstance = { ...targetInstance, sections: updatedSections, updatedAt: timestamp };
      
      // Optimistic Update
      set(state => ({
        instances: state.instances.map(i => i.id === targetInstance.id ? updatedInstance : i),
        activeInstance: state.activeInstance?.id === targetInstance.id ? updatedInstance : state.activeInstance
      }));

      const performDbUpdate = async () => {
        const latestInstance = get().instances.find(i => i.id === targetInstance.id);
        if (!latestInstance) return;

        try {
          await updateDoc(doc(db, 'instances', targetInstance.id), sanitize({ 
            sections: latestInstance.sections,
            updatedAt: Date.now()
          }));
        } catch (err) {
          console.error('Failed to update workbench:', err);
        }
      };

      if (immediate) {
        cancelDebounce(`instance-workbench-${targetInstance.id}`);
        await performDbUpdate();
      } else {
        debounceUpdate(`instance-workbench-${targetInstance.id}`, performDbUpdate);
      }
    },

    updateTaskGuide: async (taskId, guideUpdate, containerId, immediate = false) => {
      const { mode, masters } = get();
      if (mode !== 'master') return;

      const timestamp = Date.now();
      // Track local update for protection against snapshot reverts
      (globalThis as any)[`lastUpdate_${containerId}-${taskId}`] = timestamp;

      const updateSections = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { 
            ...t, 
            guide: { ...(t.guide || {}), ...guideUpdate },
            lastUpdated: timestamp
          } : t)
        }))
      }));

      const targetMaster = masters.find(m => m.id === containerId);
      if (!targetMaster) return;

      const updatedMasterLocal = { ...targetMaster, sections: updateSections(targetMaster.sections), updatedAt: timestamp };
      
      // Optimistic Update
      set(state => ({
        masters: state.masters.map(m => m.id === targetMaster.id ? updatedMasterLocal : m),
        activeMaster: state.activeMaster?.id === targetMaster.id ? updatedMasterLocal : state.activeMaster
      }));

      const performDbUpdate = async () => {
        // Read LATEST from store to avoid Lost Updates
        const latestMaster = get().masters.find(m => m.id === targetMaster.id);
        if (!latestMaster) return;

        const finalMaster = incrementMasterVersion(latestMaster);
        try {
          await updateDoc(doc(db, 'masters', targetMaster.id), sanitize({ 
            sections: finalMaster.sections, 
            version: finalMaster.version, 
            updatedAt: finalMaster.updatedAt 
          }));
        } catch (err) {
          console.error('Failed to update task guide:', err);
        }
      };

      if (immediate) {
        cancelDebounce(`master-guide-${targetMaster.id}`);
        await performDbUpdate();
      } else {
        debounceUpdate(`master-guide-${targetMaster.id}`, performDbUpdate);
      }
    },

    addTaskFile: async (taskId, file, isUserFile) => {
      const { mode, activeMaster, activeInstance } = get();
      const field = isUserFile ? 'userFiles' : 'files';
      
      // 1. Upload to Firebase Storage
      const fileId = generateUUID();
      const storageRef = ref(storage, `tasks/${taskId}/${fileId}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const taskFile: TaskFile = {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: downloadURL // Use URL instead of base64
      };

      const update = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, [field]: [...(t[field] || []), taskFile], lastUpdated: Date.now() } : t)
        }))
      }));

      if (mode === 'master' && activeMaster) {
        const updatedMaster = incrementMasterVersion({ ...activeMaster, sections: update(activeMaster.sections) });
        await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updatedMaster.sections, version: updatedMaster.version, updatedAt: updatedMaster.updatedAt }));
      } else if (mode === 'project' && activeInstance) {
        await updateDoc(doc(db, 'instances', activeInstance.id), sanitize({ sections: update(activeInstance.sections) }));
      }
    },

    removeTaskFile: async (taskId, fileId, isUserFile) => {
      const { mode, activeMaster, activeInstance } = get();
      const field = isUserFile ? 'userFiles' : 'files';
      
      // Find the file to get its name for deletion from storage
      const findFile = (sections: Section[]) => {
        for (const s of sections) {
          for (const ss of s.subsections) {
            for (const t of ss.tasks) {
              if (t.id === taskId) {
                return (t[field] || []).find(f => f.id === fileId);
              }
            }
          }
        }
      };

      const fileToDelete = mode === 'master' && activeMaster ? findFile(activeMaster.sections) : (activeInstance ? findFile(activeInstance.sections) : null);
      
      if (fileToDelete) {
        try {
          // Attempt to delete from Storage (might fail if it was an old base64 file)
          const storageRef = ref(storage, `tasks/${taskId}/${fileId}_${fileToDelete.name}`);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn('Storage deletion failed (probably a legacy base64 file):', e);
        }
      }

      const update = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, [field]: (t[field] || []).filter(f => f.id !== fileId), lastUpdated: Date.now() } : t)
        }))
      }));

      if (mode === 'master' && activeMaster) {
        const updatedMaster = incrementMasterVersion({ ...activeMaster, sections: update(activeMaster.sections) });
        await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updatedMaster.sections, version: updatedMaster.version, updatedAt: updatedMaster.updatedAt }));
      } else if (mode === 'project' && activeInstance) {
        await updateDoc(doc(db, 'instances', activeInstance.id), sanitize({ sections: update(activeInstance.sections) }));
      }
    },

    handleFileUpload: async (e, taskId, _containerId, isUserFile) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await get().addTaskFile(taskId, file, isUserFile);
      } catch (err) {
        console.error('Upload failed:', err);
        alert('Upload failed. Please try again.');
      }
      e.target.value = '';
    },

    handleFileDownload: (file) => {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    addMaster: async (title) => {
      const { masters } = get();
      const maxOrder = masters.reduce((max, m) => Math.max(max, m.order ?? 0), 0);
      const newMaster = { 
        title, 
        sections: [], 
        version: 1, 
        createdAt: Date.now(), 
        updatedAt: Date.now(),
        order: maxOrder + 1 
      };
      const docRef = await addDoc(collection(db, 'masters'), newMaster);
      set({ activeMaster: { ...newMaster, id: docRef.id } as MasterTasklist });
    },

    deleteMaster: async (id) => {
      await deleteDoc(doc(db, 'masters', id));
      if (get().activeMaster?.id === id) set({ activeMaster: null });
    },

    renameMaster: async (id, title) => {
      const { masters, activeMaster } = get();
      const targetMaster = masters.find(m => m.id === id);
      if (!targetMaster) return;
      
      const updated = incrementMasterVersion({ ...targetMaster, title });
      
      // Optimistic Update
      set({ 
        masters: masters.map(m => m.id === id ? updated : m),
        activeMaster: activeMaster?.id === id ? updated : activeMaster
      });

      try {
        await updateDoc(doc(db, 'masters', id), sanitize({ title: updated.title, version: updated.version, updatedAt: updated.updatedAt }));
      } catch (err) {
        console.error('Failed to rename master:', err);
      }
    },

    moveMaster: async (id, direction) => {
      const { masters } = get();
      const idx = masters.findIndex(m => m.id === id);
      if (idx === -1 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === masters.length - 1)) return;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      
      // 1. Create a copy of the current masters array
      const reorderedMasters = [...masters];
      
      // 2. Perform the move in the local array
      const [movingMaster] = reorderedMasters.splice(idx, 1);
      reorderedMasters.splice(targetIdx, 0, movingMaster);

      // 3. Batch update ALL masters with their new absolute index as the order.
      // This "heals" the database if any orders were missing or identical.
      const updates = reorderedMasters.map((m, index) => 
        updateDoc(doc(db, 'masters', m.id), { order: index })
      );

      await Promise.all(updates);
    },

    addSection: async (masterId, title) => {
      const master = get().masters.find(m => m.id === masterId);
      if (!master) return;
      const updated = incrementMasterVersion({ ...master, sections: [...master.sections, { id: generateUUID(), title, subsections: [], isExpanded: true }] });
      await updateDoc(doc(db, 'masters', masterId), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    deleteSection: async (sectionId) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.filter(s => s.id !== sectionId) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    renameSection: async (sectionId, title, containerId) => {
      const { mode, masters } = get();
      const timestamp = Date.now();

      const updateSections = (sections: Section[]) => sections.map(s => s.id === sectionId ? { ...s, title } : s);

      if (mode === 'master' || containerId) {
        const id = containerId || masters.find(m => m.sections.some(s => s.id === sectionId))?.id;
        if (!id) return;

        const targetMaster = get().masters.find(m => m.id === id);
        if (!targetMaster) return;

        const updated = incrementMasterVersion({ 
          ...targetMaster, 
          sections: updateSections(targetMaster.sections),
          updatedAt: timestamp
        });

        set(state => ({ 
          masters: state.masters.map(m => m.id === id ? updated : m),
          activeMaster: state.activeMaster?.id === id ? updated : state.activeMaster
        }));

        try {
          await updateDoc(doc(db, 'masters', id), sanitize({ 
            sections: updated.sections, 
            version: updated.version, 
            updatedAt: updated.updatedAt 
          }));
        } catch (err) {
          console.error('Failed to rename section:', err);
        }
      }
    },

    addSubsection: async (sectionId, title) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => s.id === sectionId ? { ...s, subsections: [...s.subsections, { id: generateUUID(), title, tasks: [], isExpanded: true }] } : s) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    deleteSubsection: async (subsectionId) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => ({ ...s, subsections: s.subsections.filter(ss => ss.id !== subsectionId) })) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    renameSubsection: async (subsectionId, title, containerId) => {
      const { mode, masters } = get();
      const timestamp = Date.now();

      const updateSections = (sections: Section[]) => sections.map(s => ({ 
        ...s, 
        subsections: s.subsections.map(ss => ss.id === subsectionId ? { ...ss, title } : ss) 
      }));

      if (mode === 'master' || containerId) {
        const id = containerId || masters.find(m => m.sections.some(s => s.subsections.some(ss => ss.id === subsectionId)))?.id;
        if (!id) return;

        const targetMaster = get().masters.find(m => m.id === id);
        if (!targetMaster) return;

        const updated = incrementMasterVersion({ 
          ...targetMaster, 
          sections: updateSections(targetMaster.sections),
          updatedAt: timestamp
        });

        set(state => ({ 
          masters: state.masters.map(m => m.id === id ? updated : m),
          activeMaster: state.activeMaster?.id === id ? updated : state.activeMaster
        }));

        try {
          await updateDoc(doc(db, 'masters', id), sanitize({ 
            sections: updated.sections, 
            version: updated.version, 
            updatedAt: updated.updatedAt 
          }));
        } catch (err) {
          console.error('Failed to rename subsection:', err);
        }
      }
    },

    addTask: async (subsectionId, title) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const newTask = { 
        id: generateUUID(), 
        title, 
        completed: false, 
        notes: '', 
        lastUpdated: Date.now(),
        timerDuration: 20 * 60,
        timerRemaining: 20 * 60,
        timerIsRunning: false
      };
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => ({ ...s, subsections: s.subsections.map(ss => ss.id === subsectionId ? { ...ss, tasks: [...ss.tasks, newTask] } : ss) })) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    deleteTask: async (taskId) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => ({ ...s, subsections: s.subsections.map(ss => ({ ...ss, tasks: ss.tasks.filter(t => t.id !== taskId) })) })) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    renameTask: async (taskId, title, containerId) => {
      const { mode, masters, instances } = get();
      const timestamp = Date.now();

      const updateSections = (sections: Section[]) => sections.map(s => ({ 
        ...s, 
        subsections: s.subsections.map(ss => ({ 
          ...ss, 
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, title, lastUpdated: timestamp } : t) 
        })) 
      }));

      if (mode === 'master') {
        const id = containerId || masters.find(m => m.sections.some(s => s.subsections.some(ss => ss.tasks.some(t => t.id === taskId))))?.id;
        if (!id) return;

        const targetMaster = get().masters.find(m => m.id === id);
        if (!targetMaster) return;

        const updated = incrementMasterVersion({ 
          ...targetMaster, 
          sections: updateSections(targetMaster.sections),
          updatedAt: timestamp
        });

        set(state => ({ 
          masters: state.masters.map(m => m.id === id ? updated : m),
          activeMaster: state.activeMaster?.id === id ? updated : state.activeMaster
        }));

        try {
          await updateDoc(doc(db, 'masters', id), sanitize({ 
            sections: updated.sections, 
            version: updated.version, 
            updatedAt: updated.updatedAt 
          }));
        } catch (err) {
          console.error('Failed to rename master task:', err);
        }
      } else if (mode === 'project') {
        const id = containerId || instances.find(inst => inst.sections.some(s => s.subsections.some(ss => ss.tasks.some(t => t.id === taskId))))?.id;
        if (!id) return;

        const targetInstance = get().instances.find(inst => inst.id === id);
        if (!targetInstance) return;

        const updatedSections = updateSections(targetInstance.sections);
        const updatedInstance = { ...targetInstance, sections: updatedSections, updatedAt: timestamp };

        set(state => ({
          instances: state.instances.map(inst => inst.id === id ? updatedInstance : inst),
          activeInstance: state.activeInstance?.id === id ? updatedInstance : state.activeInstance
        }));

        try {
          await updateDoc(doc(db, 'instances', id), sanitize({ 
            sections: updatedSections,
            updatedAt: timestamp
          }));
        } catch (err) {
          console.error('Failed to rename instance task:', err);
        }
      }
    },

    moveSection: async (masterId, sectionId, direction) => {
      const master = get().masters.find(m => m.id === masterId);
      if (!master) return;
      const idx = master.sections.findIndex(s => s.id === sectionId);
      if (idx === -1 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === master.sections.length - 1)) return;
      const sections = [...master.sections];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      [sections[idx], sections[target]] = [sections[target], sections[idx]];
      const updated = incrementMasterVersion({ ...master, sections });
      await updateDoc(doc(db, 'masters', masterId), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    moveSubsection: async (sectionId, subsectionId, direction) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const sections = activeMaster.sections.map(s => {
        if (s.id !== sectionId) return s;
        const idx = s.subsections.findIndex(ss => ss.id === subsectionId);
        if (idx === -1 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === s.subsections.length - 1)) return s;
        const sub = [...s.subsections];
        const target = direction === 'up' ? idx - 1 : idx + 1;
        [sub[idx], sub[target]] = [sub[target], sub[idx]];
        return { ...s, subsections: sub };
      });
      const updated = incrementMasterVersion({ ...activeMaster, sections });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    moveTask: async (subsectionId, taskId, direction) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const sections = activeMaster.sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => {
          if (ss.id !== subsectionId) return ss;
          const idx = ss.tasks.findIndex(t => t.id === taskId);
          if (idx === -1 || (direction === 'up' && idx === 0) || (direction === 'down' && idx === ss.tasks.length - 1)) return ss;
          const tasks = [...ss.tasks];
          const target = direction === 'up' ? idx - 1 : idx + 1;
          [tasks[idx], tasks[target]] = [tasks[target], tasks[idx]];
          return { ...ss, tasks };
        })
      }));
      const updated = incrementMasterVersion({ ...activeMaster, sections });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
    },

    promoteSubsection: async (subsectionId) => {
      const { activeMaster } = get();
      if (!activeMaster) return;

      let sourceSection: Section | null = null;
      let targetSubsection: Subsection | null = null;

      for (const section of activeMaster.sections) {
        const found = section.subsections.find(ss => ss.id === subsectionId);
        if (found) {
          sourceSection = section;
          targetSubsection = found;
          break;
        }
      }

      if (!sourceSection || !targetSubsection) return;

      // Create new Section
      const newSection: Section = {
        id: generateUUID(),
        title: targetSubsection.title,
        isExpanded: true,
        subsections: [
          {
            id: generateUUID(),
            title: 'General',
            isExpanded: true,
            tasks: targetSubsection.tasks
          }
        ]
      };

      // Remove subsection and insert new section
      const sectionIdx = activeMaster.sections.findIndex(s => s.id === sourceSection!.id);
      const updatedSections = [...activeMaster.sections];
      
      // Update the source section to remove the subsection
      updatedSections[sectionIdx] = {
        ...sourceSection,
        subsections: sourceSection.subsections.filter(ss => ss.id !== subsectionId)
      };

      // Insert the new section after the source section
      updatedSections.splice(sectionIdx + 1, 0, newSection);

      const updated = incrementMasterVersion({ ...activeMaster, sections: updatedSections });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ 
        sections: updated.sections, 
        version: updated.version, 
        updatedAt: updated.updatedAt 
      }));
    },

    demoteSection: async (sectionId, targetSectionId) => {
      const { activeMaster } = get();
      if (!activeMaster) return;

      const sourceSection = activeMaster.sections.find(s => s.id === sectionId);
      const targetSection = activeMaster.sections.find(s => s.id === targetSectionId);

      if (!sourceSection || !targetSection || sectionId === targetSectionId) return;

      // Flatten tasks from all subsections of the source section
      const allTasks = sourceSection.subsections.flatMap(ss => ss.tasks);

      const newSubsection: Subsection = {
        id: generateUUID(),
        title: sourceSection.title,
        isExpanded: true,
        tasks: allTasks
      };

      // Update sections
      const updatedSections = activeMaster.sections
        .filter(s => s.id !== sectionId)
        .map(s => s.id === targetSectionId ? {
          ...s,
          subsections: [...s.subsections, newSubsection]
        } : s);

      const updated = incrementMasterVersion({ ...activeMaster, sections: updatedSections });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ 
        sections: updated.sections, 
        version: updated.version, 
        updatedAt: updated.updatedAt 
      }));
    },

    importMaster: async (data) => {
      const newMaster = {
        title: data.title || 'Imported Template',
        sections: data.sections || [],
        version: data.version || 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await addDoc(collection(db, 'masters'), newMaster);
    },

    updateThemeSettings: async (settings, modeOverride) => {
      const isDark = modeOverride ? (modeOverride === 'dark') : document.documentElement.classList.contains('dark');
      
      const currentSettings = isDark ? get().themeSettingsDark : get().themeSettingsLight;
      const newSettings = { ...currentSettings, ...settings };
      
      const update = isDark 
        ? { themeSettingsDark: newSettings, lastLocalThemeUpdate: Date.now() }
        : { themeSettingsLight: newSettings, lastLocalThemeUpdate: Date.now() };

      set(update);
      applyThemeToRoot(newSettings);
      
      try {
        const { themeSettingsLight, themeSettingsDark, activePresetIdLight, activePresetIdDark } = get();
        await setDoc(doc(db, 'settings', 'theme'), sanitize({
          light: themeSettingsLight,
          dark: themeSettingsDark,
          activePresetIdLight,
          activePresetIdDark
        }));
      } catch (error) {
        console.error('Update theme settings failed:', error);
        get().notify('Failed to save theme settings to cloud.', 'error');
      }
    },

    previewThemeSettings: (settings, modeOverride) => {
      const isDark = modeOverride ? (modeOverride === 'dark') : document.documentElement.classList.contains('dark');
      const currentSettings = isDark ? get().themeSettingsDark : get().themeSettingsLight;
      const newSettings = { ...currentSettings, ...settings };
      
      // Update local store only, NOT Firestore
      if (isDark) {
        set({ themeSettingsDark: newSettings });
      } else {
        set({ themeSettingsLight: newSettings });
      }
      
      applyThemeToRoot(newSettings);
    },

    resetThemeSettings: async (modeOverride) => {
      const isDark = modeOverride ? (modeOverride === 'dark') : get().isDarkMode;
      const defaults = getThemeDefaults(isDark);
      await get().updateThemeSettings(defaults, isDark ? 'dark' : 'light');
    },

    saveThemePreset: async (name, modeOverride) => {
      const isDark = modeOverride ? (modeOverride === 'dark') : document.documentElement.classList.contains('dark');
      const settings = isDark ? get().themeSettingsDark : get().themeSettingsLight;
      const { currentUser } = get();
      if (!currentUser) return;

      const preset: Omit<ThemePreset, 'id'> = {
        name,
        mode: isDark ? 'dark' : 'light',
        settings,
        createdAt: Date.now(),
        createdBy: currentUser.name
      };

      try {
        const docRef = await addDoc(collection(db, 'themePresets'), sanitize(preset));
        
        // Mark as active preset for this mode
        if (isDark) {
          set({ activePresetIdDark: docRef.id });
        } else {
          set({ activePresetIdLight: docRef.id });
        }
        
        // Sync settings doc with active preset ID
        const { themeSettingsLight, themeSettingsDark, activePresetIdLight, activePresetIdDark } = get();
        await setDoc(doc(db, 'settings', 'theme'), sanitize({
          light: themeSettingsLight,
          dark: themeSettingsDark,
          activePresetIdLight,
          activePresetIdDark
        }));
        
        get().notify(`Saved "${name}"!`, 'success');
      } catch (error) {
        console.error('Save preset failed:', error);
        get().notify('Failed to save theme preset.', 'error');
      }
    },

    updateThemePreset: async (presetId) => {
      const preset = get().themePresets.find(p => p.id === presetId);
      if (!preset) return;
      
      const currentSettings = preset.mode === 'dark' ? get().themeSettingsDark : get().themeSettingsLight;
      
      try {
        await updateDoc(doc(db, 'themePresets', presetId), { 
          settings: sanitize(currentSettings),
          updatedAt: Date.now() 
        });

        // Also update global settings if this is the active preset
        const { activePresetIdLight, activePresetIdDark, themeSettingsLight, themeSettingsDark } = get();
        if (activePresetIdLight === presetId || activePresetIdDark === presetId) {
          await setDoc(doc(db, 'settings', 'theme'), sanitize({
            light: themeSettingsLight,
            dark: themeSettingsDark,
            activePresetIdLight,
            activePresetIdDark
          }));
        }

        get().notify(`Updated "${preset.name}"!`, 'success');
      } catch (error) {
        console.error('Update preset failed:', error);
        get().notify('Failed to update theme preset.', 'error');
      }
    },

    deleteThemePreset: async (presetId) => {
      try {
        const { activePresetIdLight, activePresetIdDark } = get();
        await deleteDoc(doc(db, 'themePresets', presetId));
        
        if (activePresetIdLight === presetId) set({ activePresetIdLight: null });
        if (activePresetIdDark === presetId) set({ activePresetIdDark: null });
        
        get().notify('Snapshot deleted.', 'success');
      } catch (error) {
        console.error('Delete preset failed:', error);
        get().notify('Failed to delete theme preset.', 'error');
      }
    },

    applyThemePreset: async (presetId) => {
      const preset = get().themePresets.find(p => p.id === presetId);
      if (preset) {
        if (preset.mode === 'dark') {
          set({ activePresetIdDark: presetId });
        } else {
          set({ activePresetIdLight: presetId });
        }
        await get().updateThemeSettings(preset.settings, preset.mode);
        get().notify(`Applied "${preset.name}"!`, 'success');
      }
    },
    deleteTaskFeedback: async (taskId, containerId) => {
      const { instances } = get();
      const targetInstance = instances.find(i => i.id === containerId);
      if (!targetInstance) return;

      const updateSections = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { 
            ...t, 
            userNotes: '',
            lastUpdated: Date.now()
          } : t)
        }))
      }));

      const updatedInstance = { ...targetInstance, sections: updateSections(targetInstance.sections) };
      
      // Optimistic Update
      set(state => ({
        instances: state.instances.map(i => i.id === targetInstance.id ? updatedInstance : i),
        activeInstance: state.activeInstance?.id === targetInstance.id ? updatedInstance : state.activeInstance
      }));

      try {
        await updateDoc(doc(db, 'instances', containerId), sanitize({ 
          sections: updatedInstance.sections 
        }));
      } catch (err) {
        console.error('Failed to delete task feedback:', err);
      }
    },
  };
});
