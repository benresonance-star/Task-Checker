import { create } from 'zustand';
import { MasterTasklist, TasklistInstance, Section, Subsection, Project, User, TaskFile, ProjectOverride, TaskGuide, ActionSetItem, ThemeSettings, ThemePreset } from '../types';
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
  notification: { message: string; type: 'success' | 'error' } | null;
  
  // Actions
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
  toggleTask: (taskId: string) => Promise<void>;
  updateTaskNotes: (taskId: string, notes: string, isUserNotes?: boolean) => Promise<void>;
  updateTaskGuide: (taskId: string, guide: Partial<TaskGuide>) => Promise<void>;
  addTaskFile: (taskId: string, file: File, isUserFile?: boolean) => Promise<void>;
  removeTaskFile: (taskId: string, fileId: string, isUserFile?: boolean) => Promise<void>;
  
  // Master CRUD
  addMaster: (title: string) => Promise<void>;
  deleteMaster: (id: string) => Promise<void>;
  renameMaster: (id: string, title: string) => Promise<void>;
  moveMaster: (id: string, direction: 'up' | 'down') => Promise<void>;
  
  addSection: (masterId: string, title: string) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  renameSection: (sectionId: string, title: string) => Promise<void>;
  
  addSubsection: (sectionId: string, title: string) => Promise<void>;
  deleteSubsection: (subsectionId: string) => Promise<void>;
  renameSubsection: (subsectionId: string, title: string) => Promise<void>;
  
  addTask: (subsectionId: string, title: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  renameTask: (taskId: string, title: string) => Promise<void>;
  
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
  toggleTaskInActionSet: (projectId: string, instanceId: string, taskId: string) => Promise<void>;
  moveTaskInActionSet: (taskId: string, direction: 'up' | 'down') => Promise<void>;
  setActionSet: (newSet: ActionSetItem[]) => Promise<void>;
  clearActionSet: () => Promise<void>;
  
  // Import
  importMaster: (data: Partial<MasterTasklist>) => Promise<void>;

  // Admin Simulation
  adminSimulationMode: 'admin' | 'viewer';
  toggleSimulationMode: () => void;

  // Theme Settings
  themeSettings: ThemeSettings;
  themePresets: ThemePreset[];
  activePresetId: string | null;
  updateThemeSettings: (settings: Partial<ThemeSettings>) => Promise<void>;
  resetThemeSettings: () => Promise<void>;
  saveThemePreset: (name: string) => Promise<void>;
  updateThemePreset: (presetId: string) => Promise<void>;
  deleteThemePreset: (presetId: string) => Promise<void>;
  applyThemePreset: (presetId: string) => Promise<void>;
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
    
    // New variables
    root.style.setProperty('--dashboard-bg', settings.colorDashboardBg);
    root.style.setProperty('--dashboard-border', settings.colorDashboardBorder);
    root.style.setProperty('--metadata-card-bg', settings.colorMetadataCardBg);
    root.style.setProperty('--metadata-card-border', settings.colorMetadataCardBorder);
    root.style.setProperty('--section-ident', settings.colorSectionIdent);
    root.style.setProperty('--section-plan', settings.colorSectionPlan);
    root.style.setProperty('--section-build', settings.colorSectionBuild);
    root.style.setProperty('--hierarchy-line', settings.colorHierarchyLine);

    root.style.setProperty('--radius-card', `${settings.radiusTaskCard}px`);
    root.style.setProperty('--radius-button', `${settings.radiusInteractive}px`);
    root.style.setProperty('--radius-container', `${settings.radiusMajorModal}px`);
  };

  /**
   * Migrates old theme settings to new semantic names.
   */
  const migrateThemeSettings = (oldSettings: any): ThemeSettings => {
    return {
      colorAppIdentity: oldSettings.colorAppIdentity || oldSettings.brandBlue || '#4285F4',
      colorActiveTaskDone: oldSettings.colorActiveTaskDone || oldSettings.brandGreenLight || '#5DB975',
      colorCompletedState: oldSettings.colorCompletedState || oldSettings.brandGreen || '#34A853',
      colorDestructive: oldSettings.colorDestructive || oldSettings.brandRed || '#EA4335',
      colorPresenceNotice: oldSettings.colorPresenceNotice || oldSettings.brandYellow || '#FBBC05',
      
      // Defaults for new fields
      colorDashboardBg: oldSettings.colorDashboardBg || 'rgba(219, 234, 254, 0.7)', // blue-100/70
      colorDashboardBorder: oldSettings.colorDashboardBorder || '#BFDBFE', // blue-200
      colorMetadataCardBg: oldSettings.colorMetadataCardBg || 'rgba(255, 255, 255, 0.8)', // white/80
      colorMetadataCardBorder: oldSettings.colorMetadataCardBorder || '#BFDBFE', // blue-200
      colorSectionIdent: oldSettings.colorSectionIdent || '#4285F4', // google-blue
      colorSectionPlan: oldSettings.colorSectionPlan || '#34A853', // google-green
      colorSectionBuild: oldSettings.colorSectionBuild || '#F97316', // orange-500
      colorHierarchyLine: oldSettings.colorHierarchyLine || '#D1D5DB', // gray-300

      radiusTaskCard: oldSettings.radiusTaskCard || oldSettings.radiusCard || 20,
      radiusInteractive: oldSettings.radiusInteractive || oldSettings.radiusButton || 12,
      radiusMajorModal: oldSettings.radiusMajorModal || oldSettings.radiusContainer || 32,
    };
  };

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
            timerIsRunning: t.timerIsRunning
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
              timerIsRunning: existing.timerIsRunning ?? false
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
    expandedStates: JSON.parse(localStorage.getItem('expandedStates') || '{}'),
    adminSimulationMode: (sessionStorage.getItem('adminSimulationMode') as 'admin' | 'viewer') || 'admin',
    notification: null,
    themeSettings: {
      colorAppIdentity: '#4285F4',
      colorActiveTaskDone: '#5DB975',
      colorCompletedState: '#34A853',
      colorDestructive: '#EA4335',
      colorPresenceNotice: '#FBBC05',
      colorDashboardBg: 'rgba(219, 234, 254, 0.7)',
      colorDashboardBorder: '#BFDBFE',
      colorMetadataCardBg: 'rgba(255, 255, 255, 0.8)',
      colorMetadataCardBorder: '#BFDBFE',
      colorSectionIdent: '#4285F4',
      colorSectionPlan: '#34A853',
      colorSectionBuild: '#F97316',
      colorHierarchyLine: '#D1D5DB',
      radiusTaskCard: 20,
      radiusInteractive: 12,
      radiusMajorModal: 32,
    },
    themePresets: [],
    activePresetId: null,

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
      const { expandedStates } = get();
      const newState = { ...expandedStates, [id]: !expandedStates[id] };
      set({ expandedStates: newState });
      localStorage.setItem('expandedStates', JSON.stringify(newState));
    },

    setLocalExpanded: (id, expanded) => {
      const { expandedStates } = get();
      if (expandedStates[id] === expanded) return;
      const newState = { ...expandedStates, [id]: expanded };
      set({ expandedStates: newState });
      localStorage.setItem('expandedStates', JSON.stringify(newState));
    },

    isLocalExpanded: (id, defaultValue = true) => {
      const { expandedStates } = get();
      return expandedStates[id] ?? defaultValue;
    },
    
    initializeAuth: () => {
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
            const masters = snapshot.docs
              .map(d => ({ ...d.data(), id: d.id } as MasterTasklist))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            set({ masters });
            
            const activeM = get().activeMaster;
            if (activeM) {
              const updatedActive = masters.find(m => m.id === activeM.id);
              if (updatedActive) set({ activeMaster: updatedActive });
            }

            // --- AUTO-SYNC LOGIC ---
            // If any master version has increased, find its instances and sync them locally
            // The instances listener will then handle pushing those changes to Firestore
            const currentInstances = get().instances;
            masters.forEach(master => {
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

          // Theme Settings Listener
          onSnapshot(doc(db, 'settings', 'theme'), (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const migrated = migrateThemeSettings(data);
              
              // If we actually migrated something, save it back to clean up DB
              if (JSON.stringify(data) !== JSON.stringify(migrated)) {
                setDoc(doc(db, 'settings', 'theme'), sanitize(migrated));
              }

              set({ themeSettings: migrated });
              applyThemeToRoot(migrated);
            } else {
              // If no theme settings in DB, apply defaults
              applyThemeToRoot(get().themeSettings);
            }
          });

          // Theme Presets Listener
          onSnapshot(collection(db, 'themePresets'), (snapshot) => {
            const presets = snapshot.docs.map(d => {
              const data = d.data();
              const migratedSettings = migrateThemeSettings(data.settings);
              
              // If settings were migrated, update the document in DB
              if (JSON.stringify(data.settings) !== JSON.stringify(migratedSettings)) {
                updateDoc(doc(db, 'themePresets', d.id), { settings: sanitize(migratedSettings) });
              }

              return { ...data, id: d.id, settings: migratedSettings } as ThemePreset;
            });
            set({ themePresets: presets.sort((a, b) => b.createdAt - a.createdAt) });
          });

          // Instances Listener
          onSnapshot(collection(db, 'instances'), (snapshot) => {
            const instancesFromFirestore = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as TasklistInstance));
            const currentActiveInstance = get().activeInstance;

            // PROTECT LOCAL STATE: Use a grace period after local updates to prevent stale Firestore overwrites.
            // This is CRITICAL for the timer to prevent it "reverting" to old values on pause/toggle.
            const localTaskState = new Map<string, { remaining: number; running: boolean; lastLocal: number }>();
            get().instances.forEach(inst => {
              inst.sections.forEach(s => {
                s.subsections.forEach(ss => {
                  ss.tasks.forEach(t => {
                    const lastLocal = (globalThis as any)[`lastToggle_${t.id}`] || 0;
                    localTaskState.set(t.id, { 
                      remaining: t.timerRemaining ?? 20 * 60, 
                      running: t.timerIsRunning ?? false,
                      lastLocal
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
              const local = localTaskState.get(t.id);
              
              // Ensure t always has basic timer fields to prevent UI fallback to default 20:00 incorrectly
              const tWithDefaults = {
                ...t,
                timerRemaining: t.timerRemaining ?? t.timerDuration ?? 20 * 60,
                timerDuration: t.timerDuration ?? 20 * 60,
                timerIsRunning: t.timerIsRunning ?? false
              };

              if (local) {
                const isRecent = Date.now() - local.lastLocal < 3000; // 3 second grace period
                // CRITICAL: Only use local state if there was a RECENT local interaction.
                // Using "local.running" here was causing auto-start bugs because the local store
                // might still think it's running when the snapshot arrives.
                if (isRecent) {
                  return { 
                    ...tWithDefaults, 
                    timerRemaining: local.remaining,
                    timerIsRunning: local.running 
                  };
                }
              }
              return tWithDefaults;
            })
          }))
        }))
      };
    });

            set({ instances: mergedInstances });
            
            if (currentActiveInstance) {
              const updatedActive = mergedInstances.find(i => i.id === currentActiveInstance.id);
              if (updatedActive) {
                set({ activeInstance: updatedActive });
              }
            }

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
          set({ currentUser: null, loading: false });
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

      if (currentFocus?.taskId === taskId) {
        // Toggle off
        await updateDoc(userRef, { activeFocus: null });
        get().pauseOtherTimers(null);
      } else {
        // Toggle on or switch
        const newFocus = {
          projectId,
          instanceId,
          taskId,
          timestamp: Date.now()
        };
        await updateDoc(userRef, { activeFocus: newFocus });
        get().pauseOtherTimers(taskId);
      }
    },

    toggleTaskInActionSet: async (projectId, instanceId, taskId) => {
      const { currentUser } = get();
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.id);
      const currentSet = currentUser.actionSet || [];
      const exists = currentSet.find(i => i.taskId === taskId);

      if (exists) {
        // Remove from playlist
        const newSet = currentSet.filter(i => i.taskId !== taskId);
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

    moveTaskInActionSet: async (taskId, direction) => {
      const { currentUser } = get();
      if (!currentUser || !currentUser.actionSet) return;

      const userRef = doc(db, 'users', currentUser.id);
      const set = [...currentUser.actionSet];
      const idx = set.findIndex(i => i.taskId === taskId);
      
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
                // Setting timer always resets remaining to duration and pauses
                return { ...t, timerDuration: duration, timerRemaining: duration, timerIsRunning: false };
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
          await updateDoc(doc(db, 'instances', targetInst.id), { sections: targetInst.sections });
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
                // Resetting timer sets remaining back to duration and pauses
                return { ...t, timerRemaining: t.timerDuration || 20 * 60, timerIsRunning: false };
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
          await updateDoc(doc(db, 'instances', targetInst.id), { sections: targetInst.sections });
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

      (globalThis as any)[`lastToggle_${taskId}`] = Date.now();

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
                (globalThis as any)[`lastToggle_${t.id}`] = Date.now();
                return { ...t, timerIsRunning: false };
              }
              if (t.id === taskId) {
                instanceChanged = true;
                sectionChanged = true;
                subsectionChanged = true;
                targetInstanceId = inst.id;
                
                // Toggle running state. If it was finished (0), don't auto-reset here.
                // The user must explicitly reset or set a new time.
                return { 
                  ...t, 
                  timerIsRunning: !t.timerIsRunning 
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
        .map(inst => updateDoc(doc(db, 'instances', inst.id), { sections: inst.sections }));
      
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

      (globalThis as any)[`lastToggle_${taskId}`] = Date.now();
      
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
                return { ...t, timerRemaining: remaining, timerIsRunning: remaining > 0 ? (t.timerIsRunning ?? false) : false };
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
          await updateDoc(doc(db, 'instances', targetInst.id), { sections: targetInst.sections });
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
                (globalThis as any)[`lastToggle_${t.id}`] = Date.now();
                return { ...t, timerIsRunning: false };
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
          updateDoc(doc(db, 'instances', inst.id), { sections: inst.sections })
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
      await updateDoc(doc(db, 'projects', id), sanitize(details));
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
      await updateDoc(doc(db, 'projects', id), { name });
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

    toggleTask: async (taskId) => {
      const { activeInstance } = get();
      if (!activeInstance) return;
      const updated = activeInstance.sections.map(s => ({
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
      await updateDoc(doc(db, 'instances', activeInstance.id), sanitize({ sections: updated }));
    },

    updateTaskNotes: async (taskId, notes, isUserNotes) => {
      const { mode, activeMaster, activeInstance } = get();
      const field = isUserNotes ? 'userNotes' : 'notes';
      const update = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { ...t, [field]: notes, lastUpdated: Date.now() } : t)
        }))
      }));

      if (mode === 'master' && activeMaster) {
        const updatedMaster = incrementMasterVersion({ ...activeMaster, sections: update(activeMaster.sections) });
        await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updatedMaster.sections, version: updatedMaster.version, updatedAt: updatedMaster.updatedAt }));
      } else if (mode === 'project' && activeInstance) {
        await updateDoc(doc(db, 'instances', activeInstance.id), sanitize({ sections: update(activeInstance.sections) }));
      }
    },

    updateTaskGuide: async (taskId, guideUpdate) => {
      const { mode, activeMaster } = get();
      if (mode !== 'master' || !activeMaster) return;

      const update = (sections: Section[]) => sections.map(s => ({
        ...s,
        subsections: s.subsections.map(ss => ({
          ...ss,
          tasks: ss.tasks.map(t => t.id === taskId ? { 
            ...t, 
            guide: { ...(t.guide || {}), ...guideUpdate },
            lastUpdated: Date.now() 
          } : t)
        }))
      }));

      const updatedMaster = incrementMasterVersion({ ...activeMaster, sections: update(activeMaster.sections) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ 
        sections: updatedMaster.sections, 
        version: updatedMaster.version, 
        updatedAt: updatedMaster.updatedAt 
      }));
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
      const master = get().masters.find(m => m.id === id);
      if (!master) return;
      const updated = incrementMasterVersion({ ...master, title });
      await updateDoc(doc(db, 'masters', id), sanitize({ title: updated.title, version: updated.version, updatedAt: updated.updatedAt }));
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

    renameSection: async (sectionId, title) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => s.id === sectionId ? { ...s, title } : s) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
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

    renameSubsection: async (subsectionId, title) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => ({ ...s, subsections: s.subsections.map(ss => ss.id === subsectionId ? { ...ss, title } : ss) })) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
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

    renameTask: async (taskId, title) => {
      const { activeMaster } = get();
      if (!activeMaster) return;
      const updated = incrementMasterVersion({ ...activeMaster, sections: activeMaster.sections.map(s => ({ ...s, subsections: s.subsections.map(ss => ({ ...ss, tasks: ss.tasks.map(t => t.id === taskId ? { ...t, title } : t) })) })) });
      await updateDoc(doc(db, 'masters', activeMaster.id), sanitize({ sections: updated.sections, version: updated.version, updatedAt: updated.updatedAt }));
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

    updateThemeSettings: async (settings) => {
      const newSettings = { ...get().themeSettings, ...settings };
      // Optimistic update
      set({ themeSettings: newSettings });
      applyThemeToRoot(newSettings);
      
      try {
        await setDoc(doc(db, 'settings', 'theme'), sanitize(newSettings));
      } catch (error) {
        console.error('Update theme settings failed:', error);
        get().notify('Failed to save theme settings to cloud.', 'error');
      }
    },

    resetThemeSettings: async () => {
      const defaults: ThemeSettings = {
        colorAppIdentity: '#4285F4',
        colorActiveTaskDone: '#5DB975',
        colorCompletedState: '#34A853',
        colorDestructive: '#EA4335',
        colorPresenceNotice: '#FBBC05',
        colorDashboardBg: 'rgba(219, 234, 254, 0.7)',
        colorDashboardBorder: '#BFDBFE',
        colorMetadataCardBg: 'rgba(255, 255, 255, 0.8)',
        colorMetadataCardBorder: '#BFDBFE',
        colorSectionIdent: '#4285F4',
        colorSectionPlan: '#34A853',
        colorSectionBuild: '#F97316',
        colorHierarchyLine: '#D1D5DB',
        radiusTaskCard: 20,
        radiusInteractive: 12,
        radiusMajorModal: 32,
      };
      await get().updateThemeSettings(defaults);
    },

    saveThemePreset: async (name) => {
      const { themeSettings, currentUser } = get();
      if (!currentUser) return;

      const preset: Omit<ThemePreset, 'id'> = {
        name,
        settings: themeSettings,
        createdAt: Date.now(),
        createdBy: currentUser.name
      };

      try {
        const docRef = await addDoc(collection(db, 'themePresets'), sanitize(preset));
        set({ activePresetId: docRef.id });
        get().notify(`Preset "${name}" saved!`, 'success');
      } catch (error) {
        console.error('Save preset failed:', error);
        get().notify('Failed to save theme preset.', 'error');
      }
    },

    updateThemePreset: async (presetId) => {
      const { themeSettings, themePresets } = get();
      const preset = themePresets.find(p => p.id === presetId);
      if (!preset) return;

      try {
        await updateDoc(doc(db, 'themePresets', presetId), { 
          settings: sanitize(themeSettings),
          updatedAt: Date.now() 
        });
        get().notify(`Preset "${preset.name}" updated!`, 'success');
      } catch (error) {
        console.error('Update preset failed:', error);
        get().notify('Failed to update theme preset.', 'error');
      }
    },

    deleteThemePreset: async (presetId) => {
      try {
        await deleteDoc(doc(db, 'themePresets', presetId));
        if (get().activePresetId === presetId) set({ activePresetId: null });
        get().notify('Preset deleted.', 'success');
      } catch (error) {
        console.error('Delete preset failed:', error);
        get().notify('Failed to delete preset.', 'error');
      }
    },

    applyThemePreset: async (presetId) => {
      const preset = get().themePresets.find(p => p.id === presetId);
      if (preset) {
        set({ activePresetId: presetId });
        await get().updateThemeSettings(preset.settings);
        get().notify(`Applied "${preset.name}"!`, 'success');
      }
    }
  };
});
