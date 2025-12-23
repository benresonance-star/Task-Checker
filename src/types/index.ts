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
  userNotes?: string;       // Instance-specific notes (from Project)
  files?: TaskFile[];       // Template-level attachments
  userFiles?: TaskFile[];   // Instance-specific attachments
  lastUpdated: number;      // Timestamp of the last modification
  timerDuration?: number;   // Configured countdown duration in seconds
  timerRemaining?: number;  // Current remaining time in seconds
  timerIsRunning?: boolean; // Active state of the task timer
  timeTaken?: number | null; // Recorded time (duration - remaining) upon completion
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
  brandBlue: string;
  brandGreen: string;
  brandGreenLight: string;
  brandRed: string;
  brandYellow: string;
  radiusCard: number;
  radiusButton: number;
  radiusContainer: number;
}

export interface ThemePreset {
  id: string;
  name: string;
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
  projectId: string;
  instanceId: string;
  taskId: string;
  addedAt: number;
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
  } | null;
  actionSet?: ActionSetItem[]; // The user's "Work Playlist"
}

