# checkMATE - Project Specification

## Overview
checkMATE is a high-precision hierarchical checklist management application designed for professional consistency, real-time collaboration, and deep-focus work tracking. It operates on a "Master-Instance" model, where users can define master templates and instantiate them within specific projects. The application is built for high reliability, real-time team synchronization, and cross-platform accessibility.

## Core Concepts

### 1. Hierarchical Structure
The data is organized into four distinct levels:
- **Master Tasklist / Instance**: The top-level container (e.g., "Standard Project Setup"). Supports multi-line wrapping for long titles.
- **Section**: Broad categories (e.g., "Plans", "Site Documentation"). Supports expand/collapse.
- **Subsection**: Specific groups of tasks. Supports expand/collapse and visual hierarchy. **Titles automatically strike through when 100% of tasks are completed and support multi-line wrapping.**
- **Task**: Individual actionable items. Features small, medium-weight typography for distinct reading.

### 2. Dual Operation Modes
- **Master Mode (Template Management)**: 
  - Admins can create and edit master templates.
  - Structural changes (adding/removing/reordering sections, subsections, and tasks) are performed here.
  - **Structural Reallocation**: Feature to promote a Subsection to a Section or demote a Section to a Subsection (merging nested tasks).
  - **Versioned History**: Every structural change increments a global version, triggering background syncs for all project instances.
- **Project Mode (Execution & Tracking)**:
  - Users select a project and manage multiple assigned tasklist instances simultaneously.
  - **Persistent Dashboard**: A "Project Checklists" navigation shelf at the bottom allows instant switching between all checklists assigned to the project. Supports multi-line title wrapping for long template names.
  - **Collapsible Workspace**: Each active checklist is contained within a high-level collapsible block, styled consistently with the Project Dashboard.
  - **Streamlined Assignment**: New checklists are added via an "+ Add Checklist" modal that lists available master templates, keeping the main view focused.
  - Progress tracking via checkboxes with real-time Firestore persistence.
  - **Automatic Structural Sync**: Instances detect if their parent template has a newer version and merge new sections or tasks without losing user completion data.

### 3. Automatic Synchronization
The system features a robust sync engine:
- When a Master template is updated, all active instances are updated to reflect the new structure.
- **Preservation of Progress**: Ensures completion status, time taken, user notes, and user-uploaded files are preserved during template updates.

### 4. Task-Level Features
- **Structured Task Guide**: Redesigned Task Notes into a comprehensive "Task Guide" for professional oversight:
  - **Unified Header System**: Consistent `text-sm`, `font-black`, `uppercase` headers for instruction blocks with standardized left-aligned collapse toggles.
  - **What this Task Achieves**: High-level context of the task intent (formerly Task Description). **Admin Mode shows a pulsing orange alert icon on tasks with empty descriptions.**
  - **Task Complexity**: Color-coded rating (**Easy**, **Moderate**, **Complex**) to assist in resource allocation. Located **directly under the task title** in the guide. Visible as a badge in Project Mode and an inline editable dropdown for Admins.
  - **Can I Proceed?**: A "Go/No-Go" list of items required to initiate work (formerly Required Before Starting). Featured in a high-visibility **orange theme** (`orange-600`) for visual priority. **Hidden from users if empty.**
  - **Helpful (Optional)**: A "Preparation Shelf" containing links (Internal/External) or text-based notes (formerly Helpful to Prepare). **Hidden from users if empty.**
  - **Watch For**: A focused list of pitfalls (max 3) to prevent common errors (formerly Keep an Eye On). **Hidden from users if empty.**
  - **Additional Guidance**: Progressive disclosure rich-text area for deep technical instructions. **Hidden from users if empty** to maintain a clean interface.
- **TEAM TASK FEEDBACK NOTES**: A dedicated, visually distinct section for users to record instance-specific feedback or project logs. 
  - **Collapsible Workspace**: Users can collapse the entire Task Guide via a toggle to focus purely on TEAM TASK FEEDBACK NOTES. This state is persisted per task in `localStorage`. **The Task Notes modal header is responsive: on mobile, the 'Close' button and Pomodoro controls are reduced in size and sit together in a single top row for better accessibility; on desktop, all controls are aligned horizontally in the main header row for efficient space usage.**
- **Persistent Active Focus**: Whichever task a user last made active remains focused and highlighted across sessions. 
  - **Auto-Navigation**: Upon refresh or application launch, the user is automatically navigated back to their last active Project, Checklist, and Task.
  - **Auto-Expansion**: The system automatically expands the Section and Subsection hierarchy containing the focused task.
  - **State Persistence**: Focus state is stored in the User Profile in Firestore, ensuring it survives refreshes and multi-device logins.
  - **Explicit Control**: Users can disable the focus state by clicking again on the active task card.
- **File Attachments**: Support for cloud-hosted file uploads (PDFs, Images, etc.) via Firebase Storage. Distinguishes between Template-level files and Project-level files.
- **Pomodoro Timer**: Dedicated countdown timer per task, represented by a **red tomato with a clock face icon**. 
  - **Default Duration**: Initialized to **20 minutes** for all new tasks.
  - **Comprehensive Controls**: Includes Toggle (Play/Pause), Set (custom duration in minutes), and Reset (reverts to the set duration).
  - **Quick Extension**: An **Add 5mins** button is available in the "My Session" sidebar and mobile view for rapid session adjustments.
  - **One Active Timer Rule**: The system enforces focus by automatically pausing any running timers across all checklists when a user switches their active task focus.
  - **Precision Recording**: Upon task completion, the application calculates and records the exact time spent (Original Duration minus Remaining Time) into a persistent `timeTaken` field.
  - **State Protection**: Optimized for multi-user sync with a **3-second local grace period** that prevents incoming cloud data from reverting local timer states immediately after a user interaction.
  - **Cloud Heartbeat**: Running timers perform a **10-second heartbeat sync** to Firestore, ensuring progress is preserved across page refreshes and multi-device sessions.
- **Session Integration**: An "Add to Session" icon is positioned to the left of the task checkbox for rapid session building. In mobile view, secondary action icons (Add to Session, Notes) are reinstated for all inactive tasks to ensure full functionality.
- **Time Recording**: Automatically records exact time taken if a timer was used.
- **Active Focus Tracking**: Selected tasks feature a **high-saturation focus ring (4px)** and a pulsing outline when multiple users are present.

### 6. Checklist Deletion Safety
- **In-App Confirmation**: Removing a checklist instance from a project utilizes a custom, high-visibility red modal instead of a system `confirm()` dialog.
- **Data Loss Warning**: The modal explicitly warns: *"If you delete this checklist any work done on it will also be lost,"* preventing accidental removal of progress.

### 7. Branding & Live Style System
- **Branding Console**: A floating, draggable, and resizable HUD available to admins. It allows real-time adjustment of domain-specific brand elements (Primary Identity, Task Done Highlights, Completed States, etc.), UI geometry (Radii), **Dashboard Layouts**, and a consolidated **My Notes Widget** styling suite (controlling widget shells, rich-text editor backgrounds/separators, and individual note type colors).
- **Style Snapshots (Theme Library)**: Admins can capture the current brand styling and save it as a named snapshot (e.g., "Happy Mode"). Presets support **Active Style Tracking**, highlighting the currently applied theme and allowing for **Incremental Updates** (overwriting an existing snapshot with new tweaks) via a dedicated sync icon.
- **Smooth Interaction Engine**: Utilizes hardware-accelerated `translate3d` and `requestAnimationFrame` for buttery-smooth window movement and resizing. Transitions are dynamically disabled during active interactions to eliminate "input lag."
- **Semantic Theme Engine**: Uses CSS Variables linked to descriptive, role-based technical keys (e.g., `colorAppIdentity` instead of `brandBlue`). This ensures the codebase remains logical even when colors are dramatically altered.
- **Global Style Persistence**: Theme settings are stored in Firestore (`settings/theme`) and synchronized in real-time across all team members' sessions. Every teammate sees the new brand colors the moment the admin saves a change.
- **Admin Management**: Dedicated "Branding Console" entry in the sidebar and mobile menu for authorized administrators.

## Technical Architecture

### State Management & Persistence
- **Repository**: [GitHub - benresonance-star/Task-Checker](https://github.com/benresonance-star/Task-Checker)
- **Security & Environment**: Sensitive configuration (Firebase keys, API endpoints) are stored in a `.env` file (excluded from Git via `.gitignore`). The application uses `import.meta.env` to access these variables securely.
- **Library**: [Zustand](https://github.com/pmndrs/zustand)
- **Navigation Persistence**: **URL Routing** via `react-router-dom`. The application tracks user position (Mode, Project, Instance, Task) in the browser address bar, enabling deep linking and functional browser "Back/Forward" buttons.
- **Cloud Backend**: **Google Firebase** (Authentication, Firestore, Storage, Hosting).
- **Data Integrity**: Real-time listeners and a `sanitize` helper ensure zero `undefined` values in Firestore and instant multi-device sync.
- **Local UI State**: Expand/collapse (folding) preferences are stored in `localStorage` per browser, providing individual control over the workspace hierarchy without affecting other users.
- **Theme Persistence**: Browser `localStorage` stores light/dark mode preferences, with an intelligent system-default fallback.
- **Project Context**: A unified dashboard managing persistent site metadata and assigned logic:
  - **Structured Metadata**: Information is organized into three color-coded sub-sections:
    - **Identification (Blue)**: Project Number (unique), Site Address (Google Maps integration), and Client details.
    - **Planning & Controls (Green)**: Council, Planning Zone/Overlays.
    - **Building Standards (Orange)**: Building Classifications and NCC Climate Zone.
  - **Intelligent Contacts**: Client and Consultant contact icons automatically switch between `Phone` and `Smartphone` based on number detection.
  - **OneDrive Integration**: Quick-links to project folders with support for personal user overrides. Relocated under the project name for immediate access.
  - **Logic Navigation**: Persistent "Project Checklists" shelf at the bottom for multi-checklist management. Active checklists feature individual collapse states persisted in `localStorage`. **Active checklist headers display the template title directly (removing "Active Checklist:" prefix) with font sizing matching checklist sections and support for multi-line wrapping.**
    - **My Session Style**: The "My Session" sidebar features a **blue header** (`bg-google-blue`) with white text. 
    - **Contextual Hierarchy**: Each task in the sidebar displays the **Project Name** in bold uppercase letters directly above the task title, providing immediate context for users managing tasks across multiple projects.
    - **Intuitive Dismissal**: The entire sidebar header is clickable to collapse the panel, featuring a **right-pointing chevron** next to the title as a visual affordance for movement.
    - **Dynamic Entry Points**: To maintain focus, the "My Session" launch button **fades out and shifts** when the sidebar is active (horizontally on desktop, vertically on mobile) and returns when the sidebar is dismissed.
    - **Navigation Logic**: Sidebar task selection is used primarily for **Drag & Drop reordering** and does not trigger project navigation, ensuring smooth session planning without accidental view switches. The "Open in full checklist" button on the **Dashboard** explicitly triggers navigation and auto-scroll to center the task in the checklist view.
    - **Visual States**: Inactive tasks in the list use a **light blue background** and **blue outline** to match the application's action-state language. Open/closed state is persisted in `localStorage`.
  - **Sidebar Prioritization**: Navigation elements (Projects, Templates) are positioned at the top of the sidebar for primary access, with Tools (Imports, Settings) below. **Admins benefit from Context-Aware Navigation, where the app remembers the last active project and template when switching between management modes.**
  - **UI Consistency**: The "Edit Details" interface background matches the general project information background for a seamless transition. **Mobile optimization includes a bordered Edit button and compressed, stacked Save/Cancel controls.**
  - **Online Documents Management**: Integrated file explorer for project documentation.
    - **Mobile UX**: Adaptive toolbar with full-width search positioned above action buttons for easy reach.
    - **Visual Hierarchy**: Clean grid view displaying icon shapes only (amber folders, blue files) for a modern, airy feel.
    - **Advanced Discovery**: Global search indexing and a recursive "Deep List" view mode. Grid view features "shapes only" icons (amber folders, blue files) for a modern feel.
  - **OneDrive Synergy**: Positioned alongside "Online Documents", providing quick-links to cloud storage with support for global admin links and personal user overrides.

### Real-Time Collaboration
- **Presence Tracking**: Integrated "Collaborative Presence" system. Users can see in real-time which tasks their teammates are focused on via avatar badges. **In the checklist, presence avatars are positioned to the left of the 'Add to Sidebar' icon and utilize the Google Yellow theme for consistent identification.**
- **Conflict Prevention**: Visual **pulsing effect** on task outlines if two or more users have the same task active simultaneously.
    - **Work Session Reordering**: The "My Session" sidebar supports fluid **Drag & Drop reordering** (powered by `dnd-kit`) for custom session planning.
    - **High-Impact Dashboard Typography**: The Active Focus card on the dashboard features **extra-bold (font-black)** and **large-scale (up to 6xl)** task titles to ensure clear visibility and mental focus during work sessions.
- **Knowledge Hub (Smart Widgets)**: Integrated project intelligence center. Includes dynamic widgets like **Recent Project Documents** (direct-access file links) and **Project Progress** (real-time task completion analytics), positioned under the Personal Scratchpad.
- **Personal Scratchpad (My Notes)**: A modular widget on the dashboard for personal and project-linked tasks. Supports rich text editing, category assignments, and **Priority flagging**. Features a **"Clean Entry" workflow** where the rich-text editor is hidden by default and collapses automatically after adding a note, triggered via a smooth fade-in/slide-down plus button.
- **Completed Task Feedback**: 
  - **Active State**: Pulsing green card (`animate-pulse`) with a **thumbs up** icon on the completion button.
  - **Deactivated State**: Retains a **softer, lighter green background** to distinguish from pending tasks while maintaining visual hierarchy.
- **Collaborative Presence UI**: 
  - **User (You)**: Styled in green (`bg-google-green`) for immediate self-identification.
  - **Viewer Role**: Identified by orange text and an orange outline.
  - **Online Status**: Real-time pulsing green indicators show active team members.
    - **Atomic Sync**: Uses dot-notation Firestore updates to prevent user data "race conditions".
    - **Timer Sync Engine**:
      - **Local Authority**: Implements a **3-second grace period** after any manual timer action (Play, Pause, Set, Reset) where local state overrides incoming cloud data to eliminate "reversion flickers".
      - **Heartbeat Synchronization**: Running timers push their state to Firestore every **10 seconds**, balancing real-time persistence with database efficiency.
      - **Local-Only Ticking**: The 1-second countdown occurs purely in local memory to prevent multi-user synchronization loops.
      - **Auto-Pause Logic**: The global state store (`useTasklistStore`) monitors focus changes, instantly pausing and syncing any other running timers when `activeTaskId` or `activeFocus` is updated.

### Admin & Security Features
- **Admin Simulation Mode**: Admins can simulate the "Viewer" experience to verify user workflows.
  - **UI Toggle**: Persistent toggle in the sidebar and mobile menu with **pulsing orange styling** when active.
  - **Visual Safety**: Compact "VIEWER" label in the mobile header prevents role confusion without compressing the primary "My Session" navigation.
  - **Persistence**: Simulation state is stored in `sessionStorage` (resets on tab close) for security.
- **Role-Based Access Control (RBAC)**: 
  - **Administrator**: Full system control (Master mode, User Management, role promotion).
    - **Administrative Session Controls**: Within the User Management console, admins can forcefully deactivate any user's active task focus (ShieldOff icon) or empty their entire session list (Eraser icon). This includes self-clearing and clearing other admins for maximum coordination. All administrative actions use high-visibility in-app confirmation modals.
  - **Project Team (Viewer)**: Focused on progress tracking in Project Mode. Restricted administrative views and sub-headers are hidden.
- **Self-Service**: Automatic profile creation for new signups as `viewers`.
- **Project Deletion Safety**: A robust **two-stage confirmation** process for deleting projects.
  - **Stage 1**: Warning modal detailing permanent data loss (metadata, checklists, and documents).
  - **Stage 2 (Last Chance)**: High-alert modal ("Are you really sure?") with high-contrast Red (Confirm) and Green (Safety) buttons.
  - **Automatic Cleanup**: Deletion automatically wipes all associated instances, Firestore records, and the entire Online Documents root folder from cloud storage.

### UI & UX Design Language
- **Brand Identity**: Logo is a simple white tick inside an orange circle (`#E67E33`). Brand name is stylized as `checkMATE`.
- **Standardized Radii Scales**: Consistent border-radius tiers defined in `tailwind.config.js`, linked to dynamic CSS variables for real-time branding control:
  - **`rounded-button`**: Interactive elements (buttons, inputs, badges).
  - **`rounded-card`**: Content cards (task items, user cards, consultant cards).
  - **`rounded-container`**: Major structural blocks (Sections, Task Guide panels, Modals).
- **Asset & Icon Governance**:
  - **Icon Size Standard**: Primary action icons (Delete, Export, Reallocate) are standardized to **h-9** (container height) or **w-5 h-5** (standard icon). Mobile focus icons are **w-6 h-6**.
  - **Color Semantic Logic**: 
    - `gray-400`: Inactive/Secondary actions.
    - `google-blue`: Primary interactive actions (Checklists, "My Session").
    - `google-red`: Destructive/High-alert actions (Delete, Errors).
    - `google-green`: Success/Active work states (Active Project, Completed Task).
    - `google-yellow`: Collaborative presence and shared data.
- **Visual Hierarchy (Light Mode)**: 
  - Base background: `#f8f9fa` (High readability).
  - Container backgrounds: **`bg-blue-100/70`** for a deep, professional feel.
  - Inner card backgrounds (Identification, Planning, Building, Consultants): **`bg-white/80`** for maximum screen contrast.
  - Outlines: Sub-section outlines match their content text (e.g., `border-blue-200`) for visual alignment.
- **Visual Hierarchy (Dark Mode)**: 
  - Base background: `#121212`.
  - Text: Softer light grey (`#d1d5db` / Gray 300) for primary content to reduce eye strain.
  - Secondary Text: Muted grey (`#9ca3af` / Gray 400).
  - Outlines: Standardized to a consistent dark grey (`dark:border-gray-800`) across project info, checklists, and consultant cards.
- **Typography**: Uses a modern **System Font Stack** (-apple-system, Segoe UI, Roboto) for a native app feel on all platforms.
- **Visual Connectors**: Precision-engineered **1px** vertical and horizontal link lines ensuring zero visual gaps and a refined hierarchy. **All primary action icons are aligned along a single vertical axis from the top-level title down to the smallest subsection, maintained via precision-calibrated horizontal padding.**
- **Input Stability**: Hierarchical titles (Templates, Sections, Subsections, and Tasks) utilize **local state synchronization** to prevent cursor jumping during collaborative editing, ensuring a fluid typing experience while maintaining real-time cloud persistence.
- **Performance "Red Lines"**:
  - **60fps Scrolling**: To maintain fluid performance with 100+ tasks, all complex derived data must be wrapped in `useMemo`. 
  - **Re-render Optimization**: Components like `TaskItem` must minimize internal state changes. High-frequency updates (like the 1s timer tick) are handled purely in local memory, syncing only on significant state changes (Pause, Complete, 10s Heartbeat).
- **Mobile Optimization**: Portrait-first responsive layout with compressed headers, reduced padding, and intelligently repositioned primary action buttons. **The "+ New Project/Template" button is positioned to the right of the section title on mobile for immediate access.** Export Checklist features are hidden on mobile to optimize screen real estate.
- **Navigation Styling**: Active project buttons are styled in **Google Green** to visually synchronize the project context with active work items.

### Error Boundary & Fallback Policy
- **Global Notification System**: All cloud operations (Firestore/Storage) are wrapped in `try/catch` blocks. Failures trigger a **Global Notification Toast** (`NotificationToast`) at the bottom of the screen.
- **Optimistic UI with Fallback**: The UI updates instantly for a fluid experience. If a cloud write fails, the user is notified, and the application maintains the last known valid local state to prevent data loss or "ghosting".

### Import/Export Capabilities
- **Supported Formats**: JSON (Native), CSV (Spreadsheet), ZIP (Full package with files).
- **Plain Text Import**: Parses hierarchical text (e.g., Markdown `#` / `##`) into full checklists.

## Developer & AI Logic Map

### 1. Data Schema Definitions (Firestore Mapping)
- **`users` Collection**: 
  - `id`, `name`, `email`, `role` ('admin' | 'viewer')
  - `activeFocus`: `{ projectId, instanceId, taskId, timestamp }` | `null`
  - `actionSet`: `Array<{ projectId, instanceId, taskId, addedAt }>` (The "My Session" list). **Tasks are uniquely identified by their composite key of Project+Instance+Task ID to ensure no conflicts across different projects.**
- **`projects` Collection**: 
  - `name`, `number`, `address`, `client`, `council`, `zone`, `buildingClass`, `climateZone`
  - `instanceIds`: `string[]` (References to `instances` collection)
  - `documentRoot`: `string` (Firebase Storage path)
- **`instances` Collection**: 
  - `masterId` (Source Template), `projectId`, `title`, `version`
  - `sections`: `Array<Section>` (Recursive tree: Section -> Subsection -> Task)
  - `activeUsers`: `Record<userId, { userName, taskId, timestamp }>` (Real-time presence)
- **`masters` Collection**: 
  - `title`, `version`, `sections` (Template structure)
- **`settings` Collection**:
  - `theme`: `{ colorAppIdentity, colorActiveTaskDone, colorCompletedState, colorDestructive, colorPresenceNotice, colorProjectInfoBg, colorProjectInfoBorder, colorChecklistBg, colorChecklistBorder, colorMetadataCardBg, colorMetadataCardBorder, colorSectionIdent, colorSectionIdentIcon, colorSectionPlan, colorSectionPlanIcon, colorSectionBuild, colorSectionBuildIcon, colorHierarchyLine, colorNotesBg, colorNotesBorder, colorNotesEditorBg, colorNotesEditorBorder, colorNotesEditorSeparator, colorNotePersonalBg, colorNoteProjectBg, colorNotePriorityBg, radiusTaskCard, radiusInteractive, radiusMajorModal }`
- **`themePresets` Collection**:
  - `id`, `name`, `settings` (ThemeSettings), `createdAt`, `createdBy`

### 2. State & Persistence Dependency Graph
- **Global Store (Zustand)**: Collaborative data (Instances, Masters, Projects, Users), Auth state, Shared timer triggers.
- **URL Context (React Router)**: Current view state (`/:mode/:projectId/:instanceId`). Primary source for AI to determine "Where am I?".
- **`localStorage`**: Personal UI preferences (Dark mode, Sidebar toggle, Section expand/collapse maps, `lastActiveProjectId`, `lastActiveMasterId`).
- **`sessionStorage`**: Volatile state (`adminSimulationMode`) that must reset on tab close for security.

### 3. Critical Algorithm Summaries
- **Structural Sync (`performSync`)**: Performs a deep-merge of Master structure into Instance structure. **Key Rule**: Never overwrite `completed`, `timeTaken`, `userNotes`, or `userFiles` if they exist in the instance.
- **Timer Protection**: 
  - **Grace Period**: 3-second local timestamp check in `onSnapshot` to ignore incoming cloud data immediately after a local toggle.
  - **Heartbeat**: 10-second background push to Firestore for any task where `timerIsRunning === true`.
- **Atomic Presence**: Always use Firestore dot-notation (`updateDoc(docRef, { [`activeUsers.${userId}`]: data })`) to update presence without risk of overwriting other users.

### 4. Component Responsibility Map
- **`App.tsx`**: Application shell, Sidebar management, Navigation logic, and global Administrative modals.
- **`TaskItem.tsx`**: Complex task state manager. Handles multi-tier responsive layouts, Pomodoro widget, and collaborative pulsing logic.
- **`ProjectDashboard.tsx`**: Project metadata management and the "Checklist Navigation Shelf".
- **`NoteEditor.tsx`**: Tiptap-based rich text editor for "TEAM TASK FEEDBACK NOTES".
- **`src/styles/theme.ts`**: Centralized style registry for colors, radii, and component-specific Tailwind class strings. Now linked to dynamic CSS variables for real-time branding updates.
- **`StyleConsole.tsx`**: Floating, resizable admin tool for live UI tweaking and global branding synchronization.
- **`ErrorBoundary.tsx`**: Global catch-all for unexpected application errors with a user-friendly fallback UI.

### 5. Interaction Patterns (Standard Operating Procedures)
- **No System Dialogs**: All confirmations (Delete, Clear, Deactivate) MUST use the standard high-visibility in-app modals.
- **Input Stability**: All title/text edits MUST use a `localState` + `useEffect` pattern to prevent cursor jumping during remote Firestore syncs.
- **Radius & Color Tiers**: Strictly adhere to `rounded-button/card/container` and Google branding colors (`google-blue`, `google-red`, etc.).

---

## One-Shot Agentic Rebuild Prompt

If this system needs to be rebuilt in totality using a one-shot agentic method (e.g., in Cursor Composer or a similar agent), use the following prompt:

> "Rebuild the 'checkMATE' application as a high-performance React + Vite + Tailwind CSS checklist system.
> 
> **Core Architecture**:
> - Use Zustand for state management with real-time Firebase Firestore integration.
> - Implement **React Router** for navigation persistence (Deep linking to /master/:id or /project/:id/instance/:id?task=:id).
> - Implement a Master-Instance model where a Master Template (versioned) syncs its structure to multiple Project Instances while preserving user progress.
> - Use Firebase Auth for RBAC (Admin vs Project Team).
> - Use Firebase Storage for task-level file attachments and project documents.
> 
> **Collaboration & Presence**:
> - Implement a **Collaborative Presence** system using Firestore to show real-time user activity (Avatars on active tasks).
> - **Unique Task Identification**: Ensure all tasks are managed using a composite key of `projectId + instanceId + taskId` to prevent conflicts when the same task ID exists across multiple projects.
> - Add a visual **high-saturation focus ring (4px)** and pulsing effect for tasks with multiple active users.
> - Implement a **Drag & Drop** reorganization system for the "My Session" sidebar using `dnd-kit`.
> - Use atomic dot-notation updates for presence state to prevent race conditions.
> - **Completed Task Feedback**: Style active completed tasks with a green pulse and **thumbs up** icon; style deactivated completed tasks with a soft, translucent green.
> 
> **Data Hierarchy**:
> - Template -> Section -> Subsection -> Task. 
> - Support promotion/demotion logic between Section and Subsection levels.
> - **Subsection titles automatically strike through when 100% of tasks are completed and support multi-line title wrapping.**
> - Tasks must have an integrated Pomodoro timer (Tomato icon) with 'Set', 'Reset', and 'Add 5mins' buttons. Default timer is 20 mins.
> - Implement a **Timer Sync Engine** with a 10s cloud heartbeat and a 3s local grace period for state protection.
> - Automatically pause all other timers when a user changes their active task focus.
> - Record total `timeTaken` (Duration - Remaining) when a task is marked as completed.
> - Position the 'Add to Session' icon to the left of the task checkbox.
> 
> **Visual Identity**:
> - Implement a high-contrast UI (Light and Dark) with theme persistence.
> - **Branding & Style System**: Implement a dynamic theme engine using CSS Variables linked to **semantic technical keys** (e.g. `colorAppIdentity`, `radiusTaskCard`). Add a floating, draggable, and resizable **Branding Console** for admins to live-adjust colors and corner radii. Support **Style Snapshots** (Theme Library) with the ability to **highlight the active theme** and **overwrite/sync existing snapshots** with new iterative tweaks. Include a consolidated **My Notes styling section** with controls for widget containers, rich-text editor surfaces (background/outline/separators), and specific note types (Personal, Project, Priority). Ensure real-time global sync via Firestore `settings/theme` and `themePresets`. Use `translate3d` and `requestAnimationFrame` for smooth HUD movement.
> - **Standardized Radii Scales**: Define and use `rounded-button`, `rounded-card`, and `rounded-container` linked to dynamic CSS variables.
> - **Project Context (Light Mode)**: Use `bg-blue-100/70` for main sections and `bg-white/80` for inner metadata cards (Identification, Planning, Building) with outlines matching text color.
> - **Brand Identity**: Logo is a simple white tick inside an orange circle (`#E67E33`). Brand name stylized as `checkMATE`.
> - Use a modern System Font stack.
> - Navigation: Sidebar-first layout on desktop with a **collapsible left control panel**; dedicated hamburger menu on mobile. **Implement Context-Aware Navigation for admins to remember last active template/project.** Sidebar task selection should switch project views without auto-scrolling; Dashboard selection should explicitly trigger auto-scroll.
> - Structural Graphics: Implement precise **1px** vertical and horizontal link lines. All action icons aligned on a single vertical axis.
> - **Active Project Navigation**: Style active project buttons in **Google Green** for context synchronization.
> 
> **Features**:
> - **Admin Simulation Mode**: Persistent toggle for admins to simulate the "Viewer" role with pulsing orange indicators and mobile header alerts.
> - **Administrative Session Controls**: User management interface with 'Deactivate Current Task' (ShieldOff) and 'Clear Users Session List' (Eraser) buttons using custom in-app modals for all users.
> - **Two-Stage Project Deletion**: Secure deletion workflow with a secondary 'Last Chance' warning and complete cloud storage cleanup.
> - **Checklist Removal Safety**: In-app confirmation modal for removing checklists from projects, warning about potential work loss.
> - Multi-format Import/Export (JSON, ZIP, CSV). **Hide Export on mobile.**
> - Intelligent Plain Text parser for hierarchical lists.
|> - **Branding Console**: Floating, resizable HUD for live-adjusting brand colors and corner radii with real-time sync and iterative snapshot updates.
|> - **Main Sidebar Toggle**: A smooth, animated toggle to collapse the primary navigation sidebar in Desktop Mode, enabling an immersive, wide-screen view. State is persisted in `localStorage`.
|> - **Dynamic Versioning**: Link the UI version display directly to the `version` field in `package.json`.
|> - Personalized UI Folding: Store section expand/collapse states in localStore for individual workspace control.
> - **Persistent Dashboard**: Implement a project-view layout with a collapsible metadata dashboard organized into Identification, Planning, and Building sections. **Optimize mobile layout with bordered Edit buttons and stacked controls.** The Active Focus card must use **font-black** and **large-scale typography (up to 6xl)** for the primary task title.
> - **Add Logic Workflow**: Provide an "+ Add Checklist" modal to select and assign master templates to projects.
> - **Online Documents**: Implement a project-specific file explorer with Firebase Storage integration, global search, and a recursive "Deep List" view mode. Grid view features "shapes only" icons (amber folders, blue files) for a modern feel.
> - **Structured Task Guide**: Implement a collapsible guidance panel with 'What this Task Achieves', orange-themed 'Can I Proceed?' requirements, 'Helpful (Optional)' links/notes, and color-coded Complexity (located under title). **Ensure a responsive modal header with stacked controls for mobile and horizontal alignment for desktop.**
> - **Progress Focus**: Dedicated 'TEAM TASK FEEDBACK NOTES' area for instance-specific logs, visually separated and prioritizable via guide-collapse.
> - **Conditional Visibility**: Hide guide sections from users if they are empty.
> - **Knowledge Hub & Widgets**: Implement a modular dashboard intelligence center. Include **Recent Project Documents** widget (latest 3 files with direct download links) and **Project Progress** widget (visual progress bars and task count analytics across all project checklists).
- **My Notes Widget**: Modular dashboard widget with category filtering, priority flagging, and a **"Clean Entry" collapsible rich-text editor** with fade-in animations and automatic collapse upon entry.
> - **Input Stability**: Implement local state synchronization for all hierarchical titles to prevent collaborative cursor jumping.
> 
> **Deployment**: Configure for Firebase Hosting with a single-page application rewrite rule."

---
*Updated: December 24, 2025 (v1.3.8 - Knowledge Hub Smart Widgets & Vertical Dashboard Stack)*
