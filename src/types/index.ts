/**
 * Represents a file attachment within a task.
 * Supports base64 data for local storage persistence.
 */
export interface TaskFile {
  id: string;      // Unique identifier for the file
  name: string;    // Display name of the file
  type: string;    // MIME type (e.g., 'application/pdf', 'image/png')
  size: number;    // File size in bytes
  data: string;    // Base64 encoded file content
}

/**
 * The core unit of work in the checklist.
 * Contains state for completion, notes, and various metadata.
 */
export type Complexity = 'Easy' | 'Moderate' | 'Complex';

export interface PrepItem {
  id: string;
  label: string;
  url?: string;
  type: 'internal' | 'external' | 'text';
}

export interface TaskGuide {
  description?: string;
  complexity?: Complexity;
  requiredBefore?: string[]; // List of prerequisites
  helpfulPrep?: PrepItem[];  // List of links or text items
  watchOutFor?: string[];    // Pitfalls (Max 3)
  content?: string;          // Main rich text guidance
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  notes: string;            // Template-level notes (from Master)
  guide?: TaskGuide;        // New structured guide
  userNotes?: string;       // Instance-specific notes (Template Refinement Suggestions)
  workbench?: string;       // New: Personal working scratchpad data
  files?: TaskFile[];       // Template-level attachments
  userFiles?: TaskFile[];   // Instance-specific attachments
  lastUpdated: number;      // Timestamp of the last modification
  timerDuration?: number;   // Configured countdown duration in seconds
  timerRemaining?: number;  // Current remaining time in seconds
  timerIsRunning?: boolean; // Active state of the task timer
  timerLastUpdated?: number; // Timestamp of the last timer state update (for sync safety)
  timeTaken?: number | null; // Recorded time (duration - remaining) upon completion
  completedPrereqs?: number[]; // Indices of checked prerequisite items
  reminder?: ReminderInfo;  // Time-critical alert info
}

/**
 * A grouping of tasks within a section.
 */
export interface Subsection {
  id: string;
  title: string;
  tasks: Task[];
  isExpanded: boolean;      // UI state for collapse/expand
}

/**
 * Top-level organizational unit in a tasklist.
 */
export interface Section {
  id: string;
  title: string;
  subsections: Subsection[];
  isExpanded: boolean;      // UI state for collapse/expand
}

/**
 * A master template definition. 
 * Changes here can be propagated to instances.
 */
export interface MasterTasklist {
  id: string;
  title: string;
  sections: Section[];
  version: number;          // Incremented on every template change
  createdAt: number;
  updatedAt: number;
  order?: number;           // Display order
}

/**
 * Presence information for a user within a project instance.
 */
export interface PresenceInfo {
  taskId: string;
  userName: string;
  lastSeen: number;
}

export type FocusStage = 'staged' | 'preparing' | 'executing';

export interface ReminderInfo {
  dateTime: number;      // Target timestamp
  status: 'active' | 'snoozed' | 'triggered';
  snoozeCount: number;
}

/**
 * A project-specific instance of a MasterTasklist.
 * Keeps structural sync with Master while preserving user progress.
 */
export interface TasklistInstance {
  id: string;
  masterId: string;         // Reference to the source MasterTasklist
  projectId: string;        // Reference to the parent Project
  title: string;
  sections: Section[];      // Structural copy that receives updates from Master
  version: number;          // Current sync version
  createdAt: number;
  updatedAt: number;
  activeUsers?: Record<string, PresenceInfo>; // Real-time user presence
}

export interface PlanningOverlay {
  id: string;
  name: string;
  link?: string;
}

export interface KeyPerson {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

export interface Consultant {
  id: string;
  discipline: string;
  companyName: string;
  website?: string;
  phone?: string;
  keyPeople: KeyPerson[];
}

/**
 * A project container that holds multiple tasklist instances.
 */
export interface Project {
  id: string;
  name: string;
  instanceIds: string[];    // IDs of TasklistInstances belonging to this project
  
  // New Metadata Fields
  projectNumber: string;
  address: string;
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  
  // Planning
  council: string;
  planningZone?: {
    name: string;
    link?: string;
  };
  planningOverlays: PlanningOverlay[];
  
  // Building
  buildingClassifications: string[];
  nccClimateZone: string;

  // OneDrive
  oneDriveLink?: string;

  // Consultants
  consultants: Consultant[];
}

/**
 * Represents a document or folder in the project's online document storage.
 */
export interface ProjectDocItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string; // Reference to another ProjectDocItem of type 'folder', or 'root'
  
  // Folder specific
  isDefault?: boolean;

  // File specific
  storagePath?: string;
  downloadURL?: string;
  fileSize?: number;
  mimeType?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface ThemeSettings {
  colorAppIdentity: string;
  colorActiveTaskDone: string;
  colorActiveTaskPulse: string;
  colorFocusPulse: string;
  pulseFrequencyDone: number;
  pulseFrequencyFocus: number;
  colorCompletedState: string;
  colorDestructive: string;
  colorPresenceNotice: string;
  colorProjectInfoBg: string;
  colorProjectInfoBorder: string;
  colorNotesBg: string;
  colorNotesBorder: string;
  colorNotesEditorBg: string;
  colorNotesEditorBorder: string;
  colorNotesEditorSeparator: string;
  colorNotePersonalBg: string;
  colorNoteProjectBg: string;
  colorNotePriorityBg: string;
  colorChecklistBg: string;
  colorChecklistBorder: string;
  colorChecklistTitle: string;
  colorSectionBg: string;
  colorSectionBorder: string;
  colorSectionTitle: string;
  colorSubsectionBg: string;
  colorSubsectionBorder: string;
  colorSubsectionTitle: string;
  colorTaskBg: string;
  colorTaskActiveBg: string;
  colorTaskTitle: string;
  colorTaskInactiveText: string;
  colorMetadataCardBg: string;
  colorMetadataCardBorder: string;
  colorSectionIdent: string;
  colorSectionIdentIcon: string;
  colorSectionPlan: string;
  colorSectionPlanIcon: string;
  colorSectionBuild: string;
  colorSectionBuildIcon: string;
  colorHierarchyLine: string;
  colorPrereqBg: string;
  colorPrereqBorder: string;
  colorPrereqItemBg: string;
  colorPrereqText: string;
  colorPrereqIcon: string;
  colorHubInactiveBorder: string;
  colorHubStep2InactiveBg: string;
  colorFocusWater: string;
  colorAppBg: string;
  colorSidebarBg: string;
  colorConsoleBg: string;
  colorTextPrimary: string;
  colorTextSecondary: string;
  colorTextHeading: string;
  fontSizeBase: number;
  fontWeightHeading: string;
  letterSpacingHeading: number;
  lineHeightBase: number;
  radiusTaskCard: number;
  radiusSection: number;
  radiusSubsection: number;
  radiusInteractive: number;
  radiusMajorModal: number;
  radiusWidget: number;
  radiusSidebar: number;
  radiusProjectInfo: number;
  radiusMetadataCard: number;
  radiusFocusCard: number;
  radiusTaskButton: number;
  colorModalOverlay: string;
  colorModalBg: string;
  colorModalBorder: string;
  colorModalSectionBg: string;
  colorModalSectionBorder: string;
  colorModalSectionTitle: string;
  colorModalIcon: string;
  colorModalPrereqBg: string;
  colorModalPrereqBorder: string;
  colorModalInputBg: string;
  colorModalInputBorder: string;
  colorModalButtonPrimaryBg: string;
  colorModalButtonPrimaryText: string;
  colorModalButtonSecondaryBg: string;
  colorModalButtonSecondaryText: string;
  colorModalCloseButton: string;
  radiusModalSection: number;
  radiusModalInput: number;

  // Home Planner Settings
  colorPlannerPulseBg: string;
  colorPlannerPulseBorder: string;
  colorPlannerPulseText: string;
  colorPlannerPulseAlertIcon: string;
  colorPlannerSectionTitle: string;
  colorPlannerTokenActiveBg: string;
  colorPlannerTokenActiveText: string;
  colorPlannerTokenInactiveBg: string;
  colorPlannerTokenInactiveBorder: string;
  colorPlannerTokenInactiveText: string;
  colorPlannerTokenIcon: string;
  colorPlannerSpotlightBg: string;
  colorPlannerSpotlightBorder: string;
  colorPlannerSpotlightIdentityBg: string;
  colorPlannerSpotlightSeparator: string;
  colorPlannerCardBg: string;
  colorPlannerCardBorder: string;
  colorPlannerCardText: string;
  colorPlannerNextTaskText: string;
  colorPlannerProgressRingBase: string;
  colorPlannerProgressRingFill: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  settings: ThemeSettings;
  createdAt: number;
  createdBy: string;
}

/**
 * User definition for role-based access control.
 */
export interface ProjectOverride {
  oneDriveLink?: string;
}

export interface ActionSetItem {
  type?: 'task' | 'note';
  projectId?: string;
  instanceId?: string;
  taskId: string;
  addedAt: number;
  completedAt?: number; // Timestamp when task was marked done in this session
}

export interface ScratchpadItem {
  id: string;
  text: string;
  completed: boolean;
  priority: boolean;
  category: string;
  createdAt: number;
  reminder?: ReminderInfo;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'viewer'; // 'admin' can edit templates, 'viewer' can only track progress
  projectOverrides?: Record<string, ProjectOverride>; // Map of projectId -> Override data
  activeFocus?: {
    projectId: string;
    instanceId: string;
    taskId: string;
    timestamp: number;
    stage?: FocusStage;
  } | null;
  actionSet?: ActionSetItem[]; // The user's "Work Playlist"
  scratchpad?: ScratchpadItem[]; // Private quick tasks
  showCompletedInSession?: boolean; // UI Preference for the winning ledger
}

