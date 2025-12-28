# checkMATE - Project Specification

> **MANDATORY AGENT PROTOCOL**: 
> 1. Any AI agent working on this codebase MUST read this entire specification before proposing or implementing changes.
>    - *Comment: Ensure full context before any code modification.*
> 2. **Methodical Planning**: Agents MUST provide a high-level plan and seek USER confirmation BEFORE updating the `todo_write` list or implementing changes.
>    - *Comment: Ensures absolute alignment between agent intent and user requirements before a single task is tracked or executed.*
> 3. **Deployment SOP**: Agents MUST NEVER run a deploy command in isolation. They MUST ALWAYS use the chain: `npm run build && npx firebase deploy`.
>    - *Comment: Ensures the latest code is compiled into the production 'dist' folder before being sent to the server.*
> 4. **Version Parity**: The version number below MUST match the `version` field in `package.json` and the version text at the bottom of the sidebar.
>    - *Comment: Maintain a single source of truth for the application version.*
> 5. **Sync Protocol**: All protocol changes must be reflected in the **Admin > App Protocol** interface.
>    - *Comment: Keep the internal Admin documentation synchronized with reality.*

*Current Version: 1.13.38*

## Overview
checkMATE is a high-precision hierarchical checklist management application designed for professional consistency, real-time collaboration, and deep-focus work tracking. It features a dual-interface architectural model:
1.  **Home: The Planner**: A high-fidelity, single-screen "Command Center" for orientation and planning.
    - **Today's Horizon (Staging Zone)**: A horizontal staging strip where users curate their "Daily Trio" of tasks.
    - **Project Spotlight Switchboard**: A tactile project switcher focusing the interface on a single project. Features an **Elastic Balanced Trio** model where the container height adapts dynamically to content, ensuring zero wasted space while maintaining a professional minimum footprint.
    - **MY NOTES AND TASKS**: A streamlined general area for rapid entry, personal organization, and viewing all active session tasks.
2.  **Work: My Work Session**: A specialized deep-work environment for executing project tasks and recording progress.

The application operates on a "Master-Instance" model, where users can define master templates and instantiate them within specific projects. It is built for high reliability, real-time team synchronization, and cross-platform accessibility.

## UI Architecture & Layering Strategy (Global HUD)
To ensure critical tools (Branding Console, Admin Panel) are always accessible, we use a strict z-index hierarchy:
- `z-[4000]`: Notifications/Toasts (Must be on top of everything)
- `z-[3000]`: Branding Console (StyleConsole) - Stays active during design sessions.
- `z-[2000]`: Major Workspace Modals (TaskInfoModal, Admin Console, Discovery Grid)
- `z-[100]`: **Locked Context Header** (Sticky pinned to viewport top)
- `z-[1000]`: Standard Modals/Overlays
- `z-[50]`: Sidebars / Overlays
- `z-[10]`: Content areas

### Unified Breadcrumb Navigation (v1.11.4)
The application uses a 3-level hierarchical navigation system in the header:
1.  **Level 1 (Mode Switcher)**: Toggles between "Projects" and "Templates". Open "Discovery Grid" for global context switching.
2.  **Level 2 (Active Context)**: Displays the name of the active Project or Template. Clicking opens the Project/Template Discovery Grid.
3.  **Level 3 (Checklist Selection)**: In Project mode, displays the active Checklist title. Clicking opens the Checklist Discovery shelf for switching within the project.
4.  **Greedy Layout**: The breadcrumb container is "greedy" (`flex-1`), consuming all available space. It supports multi-line wrapping (`flex-wrap`) to ensure long titles remain fully visible without distortion or "..." truncation.
5.  **Explicit Editing**: Admins can use the `Pencil` icon next to any title to enter an explicit edit mode.
6.  **Locked Context**: The header is sticky-pinned (`top-0`) using glassmorphism, ensuring global situational awareness during long scrolls. **The header is persistent across both Home Planner and Project/Template views, providing consistent access to the "My Session" action set.**

**Core Views:**
- **Home Planner** (`/home`): The landing screen for orientation. Features the **Project Spotlight Switchboard** model, providing a single-screen overview of active commitments.
- **My Work Session** (`/session`): The execution engine. Displays the **Active Focus Card** (Task or Note) and the **Knowledge Hub**. Optimized for deep focus by removing non-essential widgets like MY NOTES.
6. **Contextual Controls**: 
    - **Browse Layout**: Toggle between Grid and List views within the Discovery shelves to customize how Projects/Templates are searched.
    - **Editor Layout**: Toggle between Stacked and Side-by-Side views within the Template Editor to optimize workspace layout.
    - **Unified Creation**: Primary creation actions are unified within the Discovery Grid.

### Time-Critical Alerts (v1.11.8)
The application includes a high-priority "Intervention HUD" system for managing time-sensitive tasks:
1.  **Reminder Engine**: A background process monitors the system clock every 30 seconds, checking for active reminders in both project tasks and personal notes.
2.  **Intervention HUD**: When a reminder triggers, a full-screen pulsing alert (`z-[5000]`) interrupts the user. This modal provides high-velocity actions:
    - **Jump to Session**: Injects the task into the user's "Next Up" slot (Index 1) or makes it the active focus if none exists.
    - **Snooze**: Quickly push the alert forward (15m, 1h, 3h, 1 day).
    - **Change Time**: Direct access to the scheduling interface.
    - **Dismiss**: Clears the reminder trigger.
3.  **Explicit Confirmation**: Setting a reminder requires an explicit "OK" or "Set Alert" confirmation. The picker popover remains active, isolating temporary state until the user saves or cancels, preventing accidental UI closure during fine-tuning.
4.  **Visual Consistency**: All time-critical indicators use the **Bell icon** (`lucide-react/Bell`) to distinguish them from the Pomodoro clock.
5.  **Situational Awareness**: Pulsing Bell badges appear on project cards in the Planner Home and session items in the sidebar whenever an active reminder is pending.
6.  **Auto-Cleanup**: If a task or note is marked as "Done" prior to its reminder triggering, the system automatically deletes the reminder to prevent background alerts for completed work.
- **Project/Template Discovery**: A visual grid of all available projects or templates with search, creation, and management controls (Delete/Settings).
- **Checklist Discovery**: A slide-down shelf within the header showing all checklists in the current project, including completion progress bars.

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
    - **Can I Proceed?**: A "Go/No-Go" list of items required to initiate work (formerly Required Before Starting). Featuring a **fully dynamic styling engine** allowing for custom background, border, item background, font, and icon colors. This styling is synchronized between the Task Info modal and the Dashboard Knowledge Hub for absolute visual consistency. **Checkboxes are interactive and circular for high readability.** **Hidden from users if empty.**
  - **Helpful (Optional)**: A "Preparation Shelf" containing links (Internal/External) or text-based notes (formerly Helpful to Prepare). **Hidden from users if empty.**
  - **Watch For**: A focused list of pitfalls (max 3) to prevent common errors (formerly Keep an Eye On). **Hidden from users if empty.**
  - **Additional Guidance**: Progressive disclosure rich-text area for deep technical instructions. **Hidden from users if empty** to maintain a clean interface.
    - **MY TASK FEEDBACK**: A dedicated section for users to suggest template refinements or record admin-facing logs.
      - **Post-Action Debrief**: Upon clicking "TASK DONE?" in Zen Mode, users are prompted: *"Would you like to suggest a refinement for this checklist template before finishing?"*. 
      - **Auto-Focus Refinement**: Selecting "Yes" opens the Task Info modal and automatically scrolls to the feedback section for immediate entry.
      - **Collapsible Workspace**: Users can collapse the entire Task Guide via a toggle to focus purely on MY TASK FEEDBACK. This state is persisted per task in `localStorage`.
- **Persistent Active Focus**: Whichever task a user last made active remains focused and highlighted across sessions. 
  - **Auto-Navigation**: Upon refresh or application launch, the user is automatically navigated back to their last active Project, Checklist, and Task. **URL context is the source of truth, but the system "heals" incomplete URLs by restoring the last viewed project and instance from localStorage.**
  - **Auto-Expansion**: The system automatically expands the Section and Subsection hierarchy containing the focused task.
  - **State Persistence**: Focus state is stored in the User Profile in Firestore, ensuring it survives refreshes and multi-device logins.
  - **Explicit Control**: Users can disable the focus state by clicking again on the active task card.
- **File Attachments**: Support for cloud-hosted file uploads (PDFs, Images, etc.) via Firebase Storage. Distinguishes between Template-level files and Project-level files.
- **Pomodoro Timer**: Dedicated countdown timer per task, represented by a **red tomato with a clock face icon**. 
  - **Context-Aware Visibility**: In the task notes modal, Pomodoro controls are only visible if the selected task is the user's **currently active focus**, preventing timing errors on background tasks.
  - **Default Duration**: Initialized to **20 minutes** for all new tasks.
  - **Comprehensive Controls**: Includes Toggle (Play/Pause), Set (custom duration in minutes), and Reset (reverts to the set duration).
  - **Quick Extension**: An **Add 5mins** button is available in the "My Session" sidebar and mobile view for rapid session adjustments.
- **One Active Timer Rule**: The system enforces focus by automatically pausing any running timers across all checklists when a user switches their active task focus.
- **Stable Interaction Engine**: The Task Info modal utilizes component-level isolation for high-frequency updates. The Pomodoro timer is decoupled from the main modal structure, ensuring that 1-second ticks do not trigger expensive re-renders of rich-text editors or instruction panels, maintaining a fluid 60fps UI. **The modal also employs custom equality selectors to ignore non-essential state changes (like timer countdowns) and features an Auto-Close Safety mechanism to prevent interface crashes if a task is inaccessible.**
- **Precision Recording**: Upon task completion, the application calculates and records the exact time spent (Original Duration minus Remaining Time) into a persistent `timeTaken` field.
  - **State Protection**: Optimized for multi-user sync with a **3-second local grace period** that prevents incoming cloud data from reverting local timer states immediately after a user interaction.
  - **Cloud Heartbeat**: Running timers perform a **10-second heartbeat sync** to Firestore, ensuring progress is preserved across page refreshes and multi-device sessions.
- **Session Integration**: An "Add to Session" icon is positioned to the left of the task checkbox for rapid session building. In mobile view, secondary action icons (Add to Session, Notes) are reinstated for all inactive tasks to ensure full functionality. **The "My Session" counter features Automated Filtering logic (`getValidActionSet`) to ensure the displayed count only reflects tasks that still exist in the current project workspace.**
- **Time Recording**: Automatically records exact time taken if a timer was used.
- **Active Focus Tracking**: Selected tasks feature a **high-saturation focus ring (4px)** and a pulsing outline when multiple users are present.

### Progressive Focus Queue (v1.12.10)
To reduce visual cognitive load, the "My Session" sidebar uses a tiered visibility strategy:
1.  **IN FOCUS**: Exactly one active task or note being executed.
2.  **NEXT UP**: The next items in the queue. 
    - **Standard Mode**: Displays the top 2 items when a task is in focus.
    - **Planning Mirror Mode**: Automatically expands to show the top **3 items** if NO task is currently active. This mirrors the **Session Sprint Staging** area in the Home Planner for a consistent 1:1 planning experience.
3.  **LATER QUEUE**: All remaining items in the session, hidden behind a "Reveal More" button to maintain a clean workspace.

### 7. Branding & Live Style System
- **Branding Console**: A floating, draggable, and resizable HUD available to admins. It features a **"Draft Mode" workflow** where stylistic changes (colors, radii) are applied locally for real-time exploration but are only persisted to Firestore when explicitly saved via "Save as Workspace Default" or by overwriting an existing snapshot.
- **Interface-First Organization**: The console provides direct access to all **84 theme properties**, organized into collapsible sections:
  - **Style Snapshots**: High-level theme management and capturing current states.
  - **Atmosphere & Identity**: Core brand colors (including Danger/Warning alerts), app backgrounds, and a comprehensive typography engine.
  - **My Dashboard (Focus)**: Specific styling for the Active Focus card, **Knowledge Hub** (including inactive step borders and backgrounds), and **Notes/Workbench backgrounds** (Personal, Project, and Priority specific).
  - **Project Interface**: Dashboard metadata sections, card styling, and multi-color Section Header icons.
  - **Checklist & Templates**: Task list hierarchy, connector lines, and highly granular controls for **Section/Subsection backgrounds, borders, radii, and font colors**, as well as **Task and Checklist title colors**, **Task backgrounds (Idle/Active)**, and a specific **Inactive Text** color for receded tasks.
  - **Task Info Window**: Overlay, window backgrounds, section styling (including specialized **"Can I Proceed?" background/outline**), input/button themes, and custom radii.
  - **System Corner Radii**: Global management of all corner radii from checklist components to major modals, sidebars, and metadata cards.
- **Style Snapshots (Theme Library)**: Admins can capture the current brand styling and save it as a named snapshot (e.g., "Happy Mode"). Presets support **Active Style Tracking**, highlighting the currently applied theme and allowing for **Incremental Updates** (overwriting an existing snapshot with new tweaks) via a dedicated save icon.
- **Smooth Interaction Engine**: Utilizes hardware-accelerated `translate3d` and `requestAnimationFrame` for buttery-smooth window movement and resizing. Transitions are dynamically disabled during active interactions to eliminate "input lag."
- **Semantic Theme Engine**: Uses CSS Variables linked to descriptive, role-based technical keys (e.g., `colorAppIdentity` instead of `brandBlue`). This ensures the codebase remains logical even when colors are dramatically altered.
- **Global Style Persistence**: Theme settings are stored in Firestore (`settings/theme`) and synchronized in real-time across all team members' sessions. Every teammate sees the new brand colors the moment the admin saves a change.
- **Admin Management**: Dedicated "Branding Console" entry in the sidebar and mobile menu for authorized administrators.

## Technical Architecture

### State Management & Persistence
- **Repository**: [GitHub - benresonance-star/Task-Checker](https://github.com/benresonance-star/Task-Checker)
- **Security & Environment**: Sensitive configuration (Firebase keys, API endpoints) are stored in a `.env` file (excluded from Git via `.gitignore`). The application uses `import.meta.env` to access these variables securely.
- **Library**: [Zustand](https://github.com/pmndrs/zustand)
- **Navigation Persistence**: **URL Routing** via `react-router-dom`. The application tracks user position (Mode, Project, Instance, Task) in the browser address bar, enabling deep linking and functional browser "Back/Forward" buttons. **The system includes a smart "Project Persistence" layer that redirects generic routes back to the user's last active project dashboard.**
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
    - **Navigation Logic**: Sidebar task selection is used for focus switching and Drag & Drop reordering. To maintain workflow continuity, selecting a task from the sidebar while on the Dashboard updates the focus without navigating away. In Project Mode, the app only navigates if the selected task belongs to a different project context. The "Open in full checklist" button on the **Dashboard** explicitly triggers navigation and auto-scroll to center the task in the checklist view.
    - **Visual States**: Inactive tasks in the list use a **light blue background** and **blue outline** to match the application's action-state language. Open/closed state is persisted in `localStorage`.
  - **Sidebar Prioritization**: Navigation elements (Projects, Templates) are positioned at the top of the sidebar for primary access, with Tools (Imports, Settings) below. **Admins benefit from Context-Aware Navigation, where the app remembers the last active project and template when switching between management modes. Sidebar task selection is context-aware: if the user is on the Dashboard, selection only updates focus without navigating; if in Project view, it only navigates if the task belongs to a different project.**
  - **UI Consistency**: The "Edit Details" interface background matches the general project information background for a seamless transition. **Mobile optimization includes a bordered Edit button and compressed, stacked Save/Cancel controls.**
  - **Online Documents Management**: Integrated file explorer for project documentation.
    - **Mobile UX**: Adaptive toolbar with full-width search positioned above action buttons for easy reach.
    - **Visual Hierarchy**: Clean grid view displaying icon shapes only (amber folders, blue files) for a modern, airy feel.
    - **Advanced Discovery**: Global search indexing and a recursive "Deep List" view mode. Grid view features "shapes only" icons (amber folders, blue files) for a modern feel.
  - **OneDrive Synergy**: Positioned alongside "Online Documents", providing quick-links to cloud storage with support for global admin links and personal user overrides.

### Real-Time Collaboration
- **Presence Tracking**: Integrated "Collaborative Presence" system. Users can see in real-time which tasks their teammates are focused on via avatar badges. **In the checklist, presence avatars are positioned to the left of the 'Add to Sidebar' icon and utilize the Google Yellow theme for consistent identification.**
- **Conflict Prevention**: Visual **pulsing red background** ("Danger Alert") triggers when two or more users have the exact same task active in their profiles. Unlike heartbeat-based presence, this alert is **persistent regardless of online status**, clearing only when a user officially changes their task focus.
    - **Work Session Reordering**: The "My Session" sidebar supports fluid **Drag & Drop reordering** (powered by `dnd-kit`) for custom session planning.
    - **High-Impact Dashboard Typography**: The Active Focus card on the dashboard features **extra-bold (font-black)** and **large-scale (up to 8xl)** task titles. **If assigned, the task complexity badge (Easy, Moderate, Complex) is displayed directly under the title with high-contrast white text on deep-toned backgrounds.** Project and Checklist context is provided via clean, text-based labels: `PROJECT: <NAME>` and `CHECKLIST: <NAME>`, stripping away icons and button-like graphics for a more professional, information-first layout. The interactive controls—including the Play/Pause button, Pomodoro box, and Task Info icon (`StickyNote`, white outline)—are scaled to match the primary action button height for a balanced, high-precision row. **The Workflow Tracker at the top features white text for general steps and deep orange (`text-orange-950`) for the active stage to maximize legibility.**
    - **Flow-State Workstation (Zen Mode)**: A three-stage task lifecycle designed to move the user from planning to execution.
      1. **Established**: Task selected, standard dashboard view. In this initial stage, Knowledge Hub steps remain inactive (no highlighting) to provide a clean overview.
      2. **Preparing**: Focused on requirements and guidance. Initiated via the "BEGIN PREPARATION" button, which automatically highlights Step 1 of the Knowledge Hub. The "Confirm Doable" widget features a soft red background when inactive to signal its critical status.
      3. **Executing (Zen Mode)**: Full-screen isolation. All widgets (Notes, Hub, Sidebar, Header) are hidden. The background dims (Dark Mode: `#050505`) or blurs (Light Mode: `#F9FAFB`). The Task Card expands slightly, and the timer starts automatically. To reduce distraction, the background pulsing is replaced with a **slow text pulse** on the task title, which is **left-justified** for optimal reading flow. The **Complexity Badge is hidden** in this mode to maintain absolute focus. A "Workflow Tracker" at the top of the card features **numerical badges (1, 2, 3)** and stacks vertically on mobile for optimal fit. **Selecting the "IN FOCUS" step manually from the tracker triggers an immediate jump to this mode and commences the timer.** The **Pomodoro controls (Play button and Timer display)** are scaled up to match the height of the primary "TASK DONE?" action button, creating a unified, high-precision control row. **A custom-colored solid "Zen Flow Level" background fill—which rises from the bottom of the card as the timer elapses—provides a non-intrusive sense of time. Its height is proportional to the original set time (e.g., 50% full when halfway through), and the color can be adjusted via the Branding Console (`--focus-water`).** To further enhance concentration, the card features a **calm "In Focus" breathing effect** with a customizable pulse color and frequency (0.1s to 10s), capped at 85% opacity to maintain the visibility of the rising water level.
    - **Knowledge Hub (Smart Widgets)**: Integrated task intelligence center positioned directly below the Current Focus. It uses a guided 3-step workflow (1. Understand Intent, 2. Confirm Doable, 3. Technical Briefing) with numerical badges and flow arrows. 
      - **Spotlight System**: Highlights the active step and dims inactive ones to guide the user's attention. Auto-advances from Step 2 to Step 3 only if prerequisites exist and are completed; if no prerequisites are defined, the user must manually select Step 3. **The currently active step is persisted per user in `localStorage`, ensuring the workflow state remains consistent across refreshes and interface switches.**
      - **Interactive Prerequisites**: Step 2 features high-contrast, round checkboxes that persist their completion state in Firestore.
      - **Workbench (Gather & Log)**: A dedicated, full-width personal scratchpad positioned below the 3-step briefing grid. Unlike task feedback, the workbench is intended for the user's private project notes and persistent working data.
- **Personal Scratchpad (My Notes)**: A modular widget on the dashboard for personal and project-linked tasks. Supports rich text editing, category assignments, and **Priority flagging**. Features a **"Clean Entry" workflow** with an absolute-positioned floating plus button and a taller header for better balance. When editing, the interface features a high-visibility **white X on a red background** for closing, matching the action button's geometry. **Category filtering is handled via a streamlined dropdown interface.**
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
- **Admin Console**: A centralized administrative "Command Center" featuring a tabbed interface:
  - **Team Members Tab**: Manage user roles, online status, and session clearing. Includes the **Admin Feedback Ledger** for workspace-wide task refinement logs. **Administrative icons (Shield/Eraser) are styled in high-contrast white for clarity in dark mode.**
  - **Project Registry Tab**: A master list of all active projects.
  - **Centralized Project Deletion**: Destructive project removal is exclusively managed here via a robust **two-stage protocol** (Warning -> Final Confirmation) to prevent accidental data loss in the main project interface.
- **Role-Based Access Control (RBAC)**: 
  - **Administrator**: Full system control (Master mode, Admin console, role promotion). **User cards feature role-aware background colors (e.g., light blue for admins, soft orange for viewers) for rapid identification.**
  - **Project Team (Viewer)**: Focused on progress tracking in Project Mode. Restricted administrative views and sub-headers are hidden.
- **Self-Service**: Automatic profile creation for new signups as `viewers`.
- **Atomic Cleanup**: Project deletion automatically wipes all associated instances, Firestore records, and the entire Online Documents root folder from cloud storage.

### UI & UX Design Language
- **Brand Identity**: Logo is a simple white tick inside an orange circle (`#E67E33`). Brand name is stylized as `checkMATE`.
- **Standardized Radii Scales**: Consistent border-radius tiers defined in `tailwind.config.js`, linked to dynamic CSS variables for real-time branding control:
  - **`rounded-button`**: Interactive elements (inputs, badges, navigation items).
  - **`rounded-card`**: Standard content cards (task items, user management cards).
  - **`rounded-container`**: Major structural blocks (Checklist panels, Sections, Modals).
  - **`rounded-widget`**: Dashboard intelligence blocks (Knowledge Hub, My Notes, Document Explorer).
  - **`rounded-sidebar`**: Primary navigation and session sidebars.
  - **`rounded-project-info`**: The main project metadata container and checklist shelf.
  - **`rounded-metadata`**: Nested information cards within the dashboard (Identification, Planning, Consultants).
  - **`rounded-focus-card`**: The high-impact Active Focus container on the dashboard.
  - **`rounded-task-button`**: Specialized primary action buttons (e.g., "TASK DONE?").
- **Asset & Icon Governance**:
  - **Icon Size Standard**: Primary action icons (Delete, Export, Reallocate) are standardized to **h-9** (container height) or **w-5 h-5** (standard icon). Mobile focus icons are **w-6 h-6**.
  - **Color Semantic Logic**: 
    - `gray-400`: Inactive/Secondary actions.
    - `google-blue`: Primary interactive actions (Checklists, "My Session", Admin Console).
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
- **Input Stability**: Hierarchical titles (Templates, Sections, Subsections, and Tasks) utilize **local state synchronization** to prevent cursor jumping during collaborative editing, ensuring a fluid typing experience while maintaining real-time cloud persistence. **The rich-text editor (NoteEditor) features advanced content normalization to ignore minor structural variations and uses stable callback references to prevent infinite render loops during store synchronization.**
- **Robust Task Resolution**: The Task Info window employs a multi-tier search strategy, prioritizing the currently viewed Master or Instance before falling back to a global workspace scan. This ensures high reliability across complex navigation paths and mode switches.
- **Performance "Red Lines"**:
  - **60fps Scrolling**: To maintain fluid performance with 100+ tasks, all complex derived data must be wrapped in `useMemo`. 
  - **Re-render Optimization**: Components like `TaskItem` and `TaskInfoModal` must minimize internal state changes. High-frequency updates (like the 1s timer tick) are isolated into specialized leaf components to prevent global re-render cycles of heavy parent containers.
- **Stable Interaction Policy**: All modal interactions are subject to a 20ms mount-stabilization delay before complex child components (like Tiptap) are permitted to mount, preventing thread-locking on low-powered mobile processors.
- **Mobile Optimization**: Portrait-first responsive layout with compressed headers, reduced padding, and intelligently repositioned primary action buttons. **The "+ New Project/Template" button is positioned to the right of the section title on mobile for immediate access.** Export Checklist features are hidden on mobile to optimize screen real estate.
  - **GPU Safety**: Resource-intensive CSS filters like `backdrop-blur` are automatically disabled on mobile modal surfaces to prevent GPU-induced browser tab crashes.
  - **Auto-Zoom Prevention**: Forces a `16px` font-size on all active inputs, textareas, and rich-text editors for mobile devices (`max-width: 768px`). This prevents iOS Safari from automatically zooming in during text entry, maintaining the application's intended framing.
  - **Hydration Orchestration**: Heavy rich-text editors utilize a platform-aware 400ms-500ms staggered hydration delay on mobile, ensuring animations remain smooth before the editor engine initializes.
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
    - `Task` level: `completed`, `completedPrereqs` (indices), `userNotes` (feedback), `workbench` (personal notes), `timeTaken`
  - `activeUsers`: `Record<userId, { userName, taskId, timestamp }>` (Real-time presence)
- **`masters` Collection**: 
  - `title`, `version`, `sections` (Template structure)
- **`settings` Collection**:
  - `theme`: `{ ..., colorChecklistBg, colorChecklistBorder, colorChecklistTitle, colorSectionBg, colorSectionBorder, colorSectionTitle, colorSubsectionBg, colorSubsectionBorder, colorSubsectionTitle, colorTaskTitle, radiusSection, radiusSubsection, ... }`
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
- **`App.tsx`**: Application shell, Sidebar management, Navigation logic, and the centralized **Admin Console** modals.
- **`TaskItem.tsx`**: Complex task state manager. Handles multi-tier responsive layouts, Pomodoro widget, and collaborative pulsing logic.
- **`ProjectDashboard.tsx`**: Project metadata management and the "Checklist Navigation Shelf".
- **`NoteEditor.tsx`**: Tiptap-based rich text editor for "MY TASK FEEDBACK".
- **`src/styles/theme.ts`**: Centralized style registry for colors, radii, and component-specific Tailwind class strings. Now linked to dynamic CSS variables for real-time branding updates.
- **`FeedbackLedger.tsx`**: Administrative audit tool for managing cross-project user feedback notes.
- **`StyleConsole.tsx`**: Floating, resizable admin tool for live UI tweaking and global branding synchronization.
- **`ErrorBoundary.tsx`**: Global catch-all for unexpected application errors with a user-friendly fallback UI.

### 5. Interaction Patterns (Standard Operating Procedures)
- **No System Dialogs**: All confirmations (Delete, Clear, Deactivate) MUST use the standard high-visibility in-app modals.
- **Input Stability**: All title/text edits MUST use a `localState` + `useEffect` pattern to prevent cursor jumping during remote Firestore syncs.
- **Radius & Color Tiers**: Strictly adhere to `rounded-button/card/container` and Google branding colors (`google-blue`, `google-red`, etc.).
- **Mobile Verification**: UI changes must be vetted for iOS Safari quirks (like the 16px auto-zoom prevention) and touch-target accessibility.

### 6. AI Development Rules & SOP
To maintain the integrity and high-speed deployment cycle of checkMATE, all AI agents must adhere to the following operational rules:

1. **Deployment Protocol**: 
   - **Agents MUST NEVER run a deploy command in isolation.**
   - They MUST ALWAYS use the chain: `npm run build && npx firebase deploy`.
   - *Comment: Physically prevents deploying stale code by forcing a compilation immediately prior to upload.*

2. **Proactive Documentation & Version Control**:
   - **Specification Sync**: After any significant codebase changes (new features, structural shifts, schema updates), the agent must update the `specification.md` to reflect these changes.
   - **GitHub Persistence**: After completing a major task or milestone, the agent must push these changes to GitHub.
   - *Comment: Preserve institutional knowledge and maintain a clean git history.*

3. **Data & State Safety**:
   - **Firestore Sanitization**: Every `updateDoc` call MUST use the `sanitize()` helper to strip `undefined` values, preventing synchronization failures.
   - **Theme Synchronization**: When adding new UI elements with customizable styles, ensure the new properties are integrated into the `ThemeSettings` interface and all relevant functions in `useTasklistStore.ts` (`getThemeDefaults`, `migrateThemeSettings`, `applyThemeToRoot`).
   - **Performance Hygiene**: Any heavy derived data or complex list rendering must be wrapped in `useMemo` to prevent UI stutter.
   - *Comment: Prevent synchronization errors and maintain 60fps UI performance.*

4. **Prompt Maintenance**:
   - Update the **"One-Shot Agentic Rebuild Prompt"** at the bottom of this file whenever a new significant architectural feature is added.
   - *Comment: Keep the architectural 'blueprints' accurate for future system rebuilds.*

---

## One-Shot Agentic Rebuild Prompt

If this system needs to be rebuilt in totality using a one-shot agentic method (e.g., in Cursor Composer or a similar agent), use the following prompt:

> "Rebuild the 'checkMATE' application as a high-performance React + Vite + Tailwind CSS checklist system.
> 
> **Core Architecture**:
> - Use Zustand for state management with real-time Firebase Firestore integration.
> - Implement **React Router** for navigation persistence (Deep linking to /master/:id or /project/:id/instance/:id?task=:id).
> - **Smart Persistence**: Implement logic to automatically restore the user's last viewed project and instance if navigating to generic routes or refreshing.
> - Implement a Master-Instance model where a Master Template (versioned) syncs its structure to multiple Project Instances while preserving user progress.
> - Use Firebase Auth for RBAC (Admin vs Project Team).
> - Use Firebase Storage for task-level file attachments and project documents.
> 
> **Collaboration & Presence**:
> - Implement a **Collaborative Presence** system using Firestore to show real-time user activity (Avatars on active tasks).
> - **Unique Task Identification**: Ensure all tasks are managed using a composite key of `projectId + instanceId + taskId` to prevent conflicts when the same task ID exists across multiple projects.
> - Add a visual **high-saturation focus ring (4px)** and pulsing effect for tasks with multiple active users.
> - Implement a **Drag & Drop** reorganization system for the "My Session" sidebar using `dnd-kit`.
> - **Session Reliability**: Use a filtered `getValidActionSet` helper to ensure the "My Session" counter and sidebar only display existing tasks.
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
> - **Branding & Style System**: Implement a dynamic theme engine using CSS Variables linked to **semantic technical keys** (e.g. `colorAppIdentity`, `radiusTaskCard`). Add a floating, draggable, and resizable **Branding Console** for admins to live-adjust colors and corner radii across **88 properties**. Support **Style Snapshots** (Theme Library) with the ability to **highlight the active theme** and **overwrite/sync existing snapshots** with new iterative tweaks. Include consolidated styling sections for **My Notes** (widget containers, rich-text surfaces, note types) and **"Can I Proceed?"** (background, border, item background, font, and icon colors), and **Task Info Window** (overlay, window backgrounds, section styling, input/button themes, and custom radii). Ensure real-time global sync via Firestore `settings/theme` and `themePresets`. Use `translate3d` and `requestAnimationFrame` for smooth HUD movement.
> - **Standardized Radii Scales**: Define and use dynamic classes (`rounded-button`, `rounded-card`, `rounded-container`, `rounded-widget`, `rounded-sidebar`, `rounded-project-info`, `rounded-metadata`, `rounded-focus-card`, `rounded-task-button`) linked to a central semantic theme engine.
> - **Project Context (Light Mode)**: Use `bg-blue-100/70` for main sections and `bg-white/80` for inner metadata cards (Identification, Planning, Building) with outlines matching text color.
> - **Brand Identity**: Logo is a simple white tick inside an orange circle (`#E67E33`). Brand name stylized as `checkMATE`.
> - Use a modern System Font stack.
> - Navigation: Sidebar-first layout on desktop with a **collapsible left control panel**; dedicated hamburger menu on mobile. The desktop sidebar features a high-contrast close button, while a floating **ChevronRight tab (z-index 100)** appears at the screen edge when collapsed for instant access. **Implement Context-Aware Navigation for admins to remember last active template/project.** Sidebar task selection should switch project views without auto-scrolling; Dashboard selection should explicitly trigger auto-scroll.
> - Structural Graphics: Implement precise **1px** vertical and horizontal link lines. All action icons aligned on a single vertical axis.
> - **Active Project Navigation**: Style active project buttons in **Google Green** for context synchronization.
> 
> **Features**:
> - **Admin Simulation Mode**: Persistent toggle for admins to simulate the "Viewer" role with pulsing orange indicators and mobile header alerts.
> - **Admin Console**: Centralized tabbed interface for managing Team Members (user roles, session clearing) and Project Registry. Support an **Admin Feedback Ledger** with contextual breadcrumbs (`PROJECT / Checklist / Task`), relative timestamps, and the ability to directly delete entries to clear user task notes.
> - **Two-Stage Project Deletion**: Secure deletion workflow managed within the Admin Registry with a secondary 'Last Chance' warning and complete cloud storage cleanup.
> - **Checklist Removal Safety**: In-app confirmation modal for removing checklists from projects, warning about potential work loss.
> - Multi-format Import/Export (JSON, ZIP, CSV). **Hide Export on mobile.**
> - Intelligent Plain Text parser for hierarchical lists.
> - **Branding Console**: Floating, resizable HUD for live-adjusting brand colors and corner radii with real-time sync and iterative snapshot updates.
> - **Main Sidebar Toggle**: A smooth, animated toggle to collapse the primary navigation sidebar in Desktop Mode, enabling an immersive, wide-screen view. State is persisted in `localStorage`.
> - **Dynamic Versioning**: Link the UI version display directly to the `version` field in `package.json`.
> - Personalized UI Folding: Store section expand/collapse states in localStore for individual workspace control.
> - **Persistent Dashboard**: Implement a project-view layout with a collapsible metadata dashboard organized into Identification, Planning, and Building sections. **Optimize mobile layout with bordered Edit buttons and stacked controls.** The Active Focus card must use **font-black** and **large-scale typography (up to 6xl)** for the primary task title.
> - **Add Logic Workflow**: Provide an "+ Add Checklist" modal to select and assign master templates to projects.
> - **Online Documents**: Implement a project-specific file explorer with Firebase Storage integration, global search, and a recursive "Deep List" view mode. Grid view features "shapes only" icons (amber folders, blue files) for a modern feel.
> - **Structured Task Guide**: Implement a collapsible guidance panel with 'What this Task Achieves', orange-themed 'Can I Proceed?' requirements, 'Helpful (Optional)' links/notes, and color-coded Complexity (located under title). **Ensure a responsive modal header with stacked controls for mobile and horizontal alignment for desktop.**
> - **Progress Focus**: Dedicated 'MY TASK FEEDBACK' area for instance-specific logs, visually separated and prioritizable via guide-collapse.
> - **Conditional Visibility**: Hide guide sections from users if they are empty.
> - **Knowledge Hub & Widgets**: Implement a modular dashboard intelligence center positioned directly below the focus card. Include **Task Guidance** widget (displaying structured description and additional content), **Can I Proceed?** widget (fully dynamic styling for requirements including item backgrounds), and **My Task Feedback** widget (showing real-time instance-specific logs).
> - **My Notes Widget**: Modular dashboard widget with category filtering, priority flagging, and a **"Clean Entry" collapsible rich-text editor** with fade-in animations and automatic collapse upon entry.
> - **Input Stability**: Implement local state synchronization for all hierarchical titles to prevent collaborative cursor jumping.
> - 
> **Deployment**: Configure for Firebase Hosting with a single-page application rewrite rule."

---
*Updated: December 28, 2025 (v1.9.10 - Dynamic Header Alignment & UI Polish)*

## UI Architecture & Layering Strategy
To ensure a consistent and predictable user interface, the application follows a standardized vertical stacking order (z-index hierarchy). This "Global HUD" strategy ensures that critical tools like the Branding Console remain accessible regardless of the current workspace state.

- **z-[0-99]**: Base Content, Sidebars, Dashboard elements.
- **z-[100]**: Persistent Navigation Aids (Sidebar Tab, Mobile Menu).
- **z-[1000]**: Standard Modals (Confirmations, Small Popups, Import/Export dialogs).
- **z-[2000]**: Major Workspace Modals (Task Info Window, Document Explorer, Admin Console).
- **z-[3000]**: Branding HUD (Live Styling Console).
- **z-[4000]**: Global Toasts & Critical System Alerts.

### Branding Console Interaction
- The Branding Console is designed to "pierce through" all modal layers.
- It prevents event propagation to underlying layers, allowing live styling of active modals (like the Task Info Window) without closing them.
- Position and minimized state are persisted across sessions.

## Future Optimization Roadmap (Conceptual)

The following architectural enhancements are identified for long-term scalability and codebase robustness. **CRITICAL: None of these optimizations are to be implemented without explicit approval from the lead developer.**

### 1. Domain-Specific Store Decoupling
As the application scales, the centralized state store should be split into domain-specific modules to prevent performance bottlenecks and improve maintainability:
- **`useAuthStore`**: Dedicated to user identity, roles, and RBAC permissions.
- **`useHierarchyStore`**: Focused on Master templates, Sections, Subsections, and Tasks.
- **`useProjectStore`**: Managing project metadata and document explorer state.
- **`useBrandingStore`**: Isolating the 68+ theme properties and CSS variable injection logic.

### 2. Service Layer Extraction
Move complex business logic out of the state containers and into a dedicated `src/services/` layer. This includes:
- **Structural Sync Engine**: The `performSync` deep-merge algorithm.
- **Hierarchical Parser**: The logic for transforming plain text into structured checklists.
- **File Processing**: Centralized logic for Firebase Storage interactions.

### 3. Atomic Selector Pattern
Refine component subscriptions to use atomic selectors (e.g., `useStore(state => state.activeMaster)`) rather than broad destructuring. This ensures components only re-render when their specific dependencies update, maintaining a consistent 60fps experience as the UI complexity grows.

### 4. Standardized Sync Hook
Implement a unified `useCollaborativeSync` hook to encapsulate the "3-second grace period" and "sanitization" logic, providing a robust, reusable pattern for any new real-time features.

---
*Would you like to re-look at implementing one or more of these steps?*
