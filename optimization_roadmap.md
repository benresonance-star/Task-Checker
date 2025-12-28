# checkMATE Optimization Roadmap

This document outlines the technical strategy for transforming checkMATE from its current monolithic architecture into a high-performance, modular, and professional-grade application.

## **Vision & Goal**
**Current State**: Moderately heavy (v1.13.44). `App.tsx` and `useTasklistStore.ts` are monolithic "God Objects" exceeding 3,000 lines each. Build chunks often exceed 500kB.
**Goal**: Sub-100ms UI responsiveness, 100% data integrity via schema validation, and a modular codebase where features are isolated and independently testable.

---

## **The Safety Protocol (Zero-Breakage Strategy)**
Before any structural refactoring begins, the following safety steps MUST be followed to minimize the risk of application failure:

1. **Baseline Testing (The Safety Net)**: 
   * *Action*: Setup Vitest and React Testing Library. Create tests for: Login, Project Creation, and Task Completion.
   * *Purpose*: Ensure core functionality remains intact during code moves.
2. **Shadow Implementation (Incremental Rollout)**: 
   * *Action*: When extracting components from `App.tsx`, build the new component (e.g., `DesktopSidebar.tsx`) and run it alongside the old code in the local environment first.
   * *Purpose*: Allows side-by-side verification before deletion.
3. **State Snapshots (Data Verification)**: 
   * *Action*: Before refactoring Firestore logic, record JSON snapshots of complex project states.
   * *Purpose*: Verify that new logic results in the exact same database structure.
4. **Type Hardening**: 
   * *Action*: Define narrow, specific interfaces for each store slice (e.g., `AuthActions`, `ProjectState`) rather than a single global interface.
   * *Purpose*: Use the TypeScript compiler to catch logic leaks early.

---

## **Technical Milestones**

### **Milestone A: Component Atomization**
*   **Goal**: Reduce `App.tsx` to <500 lines.
*   **Steps**:
    1. Extract `DesktopSidebar` into its own module.
    2. Extract `MobileHeader` and `MobileMenu`.
    3. Extract `GlobalBreadcrumbs` and `ContextNavigator`.
    4. Implement `React.memo()` on all extracted components to prevent unnecessary re-renders.

### **Milestone B: Store Modularization (Slice Pattern)**
*   **Goal**: Split `useTasklistStore.ts` into manageable, logic-based files.
*   **Steps**:
    1. Create `authSlice.ts`, `projectSlice.ts`, `templateSlice.ts`, and `themeSlice.ts`.
    2. Migrate logic incrementally using the Zustand "Slice" pattern.
    3. Update components to use specific selectors (e.g., `state => state.activeProject`) to minimize render cycles.

### **Milestone C: Network & Persistence Layer**
*   **Goal**: Eliminate "Wait States" and reduce Firestore overhead.
*   **Steps**:
    1. Implement `writeBatch` for bulk operations (reordering, clearing completed).
    2. Expand "Optimistic Updates" to all user actions (all data persists in background).
    3. Implement a "Sync Manager" to handle conflict resolution.

### **Milestone D: Payload & Asset Reduction**
*   **Goal**: Reduce main bundle size by 40%.
*   **Steps**:
    1. Use `React.lazy()` to dynamically load "Heavy Modules" like the Branding Console and Admin Panel.
    2. Audit `lucide-react` imports to ensure tree-shaking is 100% effective.
    3. Implement CSS `content-visibility` for collapsed or off-screen elements.

### **Milestone E: Data Integrity (The Steel Layer)**
*   **Goal**: Prevent "Undefined" or corrupted data from ever reaching Firestore.
*   **Steps**:
    1. Integrate **Zod** schema validation for User Profiles and Project Documents.
    2. Validate all incoming Firestore data before merging into local state.
    3. Validate all outgoing data before calling `sanitize()` and `updateDoc`.

---

## **Implementation Status (Last Updated: Dec 29, 2025)**
| Milestone | Status | Notes |
| :--- | :--- | :--- |
| **Milestone A** | Pending | `App.tsx` remains monolithic. |
| **Milestone B** | Pending | `useTasklistStore.ts` remains monolithic. |
| **Milestone C** | Partial | `sanitize()` helper and optimistic scratchpad updates active. |
| **Milestone D** | Pending | Code splitting not yet implemented. |
| **Milestone E** | Partial | `sanitize()` protocol enforced; Zod validation pending. |

