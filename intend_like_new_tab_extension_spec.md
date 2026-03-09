# Local-First New Tab Focus Extension — Product Spec

## 1) Product summary
A stripped-down, Intend-inspired browser extension that replaces the new tab page with a calm, polished, personal focus surface.

The product is **local-first**, **single-user**, and **new-tab-native**. It is designed to answer one question fast: **what should I do now?** At the same time, it includes an expandable editing view so the user can manage goals, current task, today’s list, and lightweight history without leaving the new tab page.

This product explicitly excludes all social, cloud, multiplayer, accountability, coworking, email, sync-server, and payment/stakes features.

---

## 2) Product goals
1. Make the new tab page useful instead of distracting.
2. Reduce cognitive load by defaulting to a minimal focus view.
3. Allow fast editing and planning without opening a separate app.
4. Keep all state shared across all open new-tab pages.
5. Work fully offline with local storage.
6. Feel polished, calm, and personal.

---

## 4) Core product concept
The extension has **two primary modes** within the same new-tab page:

### A. Focus Mode
A minimal, beautiful, low-noise view showing only what matters right now.

Primary content:
- current task
- optional goal label
- optional session timer / focus timer
- one main action button: `Done`
- one secondary action button: `Edit`
- optional tiny progress indicator for today

This mode is optimized for:
- opening a tab and instantly seeing the next action
- staying calm and not getting pulled into planning
- using the extension as a personal “compass”

### B. Edit Mode
An expanded, still-polished planning and editing view.

Primary content:
- goals list
- today list
- current task selection
- add / edit / reorder / complete actions
- basic settings and display controls
- lightweight history / archive access

This mode is optimized for:
- morning planning
- reprioritization
- quick edits during the day
- end-of-day cleanup

### Key principle
The user can toggle between **Focus Mode** and **Edit Mode** instantly, without navigation to another page.

---

## 5) Information architecture

### Top-level entities

#### Goal
Represents an area of focus.

Fields:
- `id`
- `title`
- `color`
- `isArchived`
- `createdAt`
- `updatedAt`
- `sortOrder`

Optional fields:
- `notes`

Rules:
- goals are optional
- a task may belong to zero or one goal in v1
- archived goals remain visible in history but not active lists

#### Task
Represents an actionable item.

Fields:
- `id`
- `title`
- `goalId | null`
- `status` = `active | done | skipped`
- `createdAt`
- `updatedAt`
- `completedAt | null`
- `sortOrder`
- `dateBucket` = local date string for the day it belongs to
- `notes | optional`
- `estimatedEffort | optional enum: small / medium / large`

Rules:
- v1 tasks live in a daily list, not a giant evergreen backlog
- unfinished tasks do **not** auto-roll over to tomorrow
- user may manually carry forward tasks

#### Daily Plan
Represents the current day’s working surface.

Fields:
- `date`
- `taskIds[]`
- `currentTaskId | null`
- `focusModeCollapsedDetails` (user preference can also be global)
- `sessionCount`
- `completedCount`
- `createdAt`
- `updatedAt`

#### Session
Optional focus timer session.

Fields:
- `id`
- `taskId | null`
- `startedAt`
- `endedAt | null`
- `durationSeconds`
- `type` = `focus | break`
- `wasCompleted`

---

## 6) v1 feature set

### 6.1 New tab replacement page
The extension replaces the browser’s new tab page.

Requirements:
- every new tab shows the same underlying state
- if user edits content in one new tab, all other open new tabs should reflect the updated state
- updates should propagate quickly without requiring manual reload

Expected behavior:
- opening multiple new tabs is like opening multiple windows into the same app state
- race conditions should be handled safely

### 6.2 Focus Mode
The default view on opening a new tab.

Displayed elements:
- greeting or neutral header
- current task in large type
- optional goal chip
- optional small subtext for today progress, e.g. `2 of 5 done`
- primary button: `Done`
- secondary controls, minimal and subtle:
  - `Edit`
  - `Skip`
  - `Next`
  - `Start Focus` / `Stop Focus`

Behavior:
- if a current task exists, it is the visual centerpiece
- if no current task exists but tasks remain, show a `Pick Next Task` action
- if there are no tasks for today, show a calm empty state with `Plan Today`
- user can toggle “hide details” so only the current task and one tiny action row remains

### 6.3 Personal visibility toggle
A key requirement.

There should be a display toggle with at least these levels:

#### Level 1: Zen
Show only:
- current task
- optional Done button
- maybe a tiny clock or progress dot

Hide:
- goals panel
n- task list
- notes
- progress stats
- history
- settings chrome

#### Level 2: Focus
Show:
- current task
- goal chip
- progress summary
- minimal controls

Hide most editing surfaces.

#### Level 3: Edit
Show full editable layout.

This toggle should be fast and persistent.

### 6.4 Edit Mode layout
A polished single-page layout with 2-column desktop-first design.

Suggested layout:
- left column: today list and quick-add
- right column: goals, current-task controls, optional timer, compact settings

Alternative on smaller widths:
- stacked cards

Edit Mode functions:
- add task
- edit task title inline
- delete task
- mark task done
- skip task
- move task up/down
- set task as current
- assign/change goal
- create/edit/archive goals
- manually carry task to tomorrow
- clear completed items from active view

### 6.5 Current task model
There is always zero or one `current task` for today.

Rules:
- user can explicitly set any active task as current
- when current task is marked done, extension should auto-select next task based on topmost remaining active task
- if there is no next task, current task becomes null
- user can also manually cycle to the next task

### 6.6 Done flow
When user clicks `Done` in Focus Mode:
- current task becomes `done`
- completion timestamp is saved
- progress updates immediately
- next active task is selected automatically if available
- all open tabs update to match
- UI briefly shows a tasteful completion transition

Optional microinteraction:
- subtle check animation or card fade
- never loud or gamified

### 6.7 Task entry
Quick-add should be frictionless.

Requirements:
- add task from a single input
- enter submits immediately
- optional shorthand parsing in v1.1 only, not required for v1
- quick goal assignment from dropdown or chip picker

Examples:
- `Draft onboarding doc`
- `Fix login bug`
- `Read paper` + goal assignment later

### 6.8 Goals
Keep goals lightweight.

Requirements:
- create goal
- rename goal
- choose accent color
- archive goal
- assign goal to task
- filter today list by goal in Edit Mode

Not required:
- goal notes editor beyond plain text
- milestones
- reviews
- analytics per goal beyond simple counts

### 6.9 Daily reset behavior
Important behavior modeled after a fresh-day workflow.

Rules:
- each local date has its own daily plan
- at the first open of a new day, extension creates a new empty daily plan
- unfinished tasks from yesterday do not automatically appear today
- user may import/carry forward selected tasks from yesterday in Edit Mode

Suggested UI:
- on a new day, show a subtle card: `Carry forward anything from yesterday?`
- actions:
  - `Review yesterday`
  - `Carry selected`
  - `Start fresh`

### 6.10 Lightweight history
Keep it simple.

Minimum history support:
- view previous days
- see done/skipped tasks by day
- optionally restore/carry a past task into today

Not required in v1:
- full search engine
- advanced stats dashboard
- journal entries
- custom review prompts

### 6.11 Optional focus timer
Keep timer optional and compact.

Requirements:
- start/stop a focus session
- default duration 25 minutes
- optional settings for 15 / 25 / 50 minutes
- associate session with current task if one exists
- visible in Focus Mode only when active or enabled

Not required in v1:
- complex pomodoro sequences
- long breaks
- sound packs
- notification orchestration beyond minimal browser notification if permitted

### 6.12 Settings
Minimal settings surface inside Edit Mode or a small modal.

Settings list:
- default opening view: Zen / Focus / Edit
- theme: system / light / dark
- show greeting: on/off
- show goal chip in Focus Mode: on/off
- show progress text: on/off
- enable timer: on/off
- timer length
- completion animation: on/off
- confirm delete: on/off

---

## 7) UX principles

### 7.1 Tone
- calm
- premium
- personal
- quiet confidence
- no noisy productivity-gamification energy

### 7.2 Visual character
- generous whitespace
- strong typography hierarchy
- soft surfaces
- subtle depth
- restrained color
- smooth transitions
- low visual clutter

### 7.3 Interaction style
- keyboard-friendly
- inline editing where sensible
- minimal modals
- avoid dense menus
- prioritize obvious primary actions

### 7.4 Emotional design
The new tab should feel like:
- a reset
- a private workspace
- a gentle redirect to what matters now

Not like:
- a dashboard explosion
- a task manager for teams
- a gamified habit toy

---

## 8) UI spec

### 8.1 Focus Mode — default composition
Centered card or centered vertical stack.

Suggested hierarchy:
1. small top line: date or greeting
2. main task title, very large
3. optional goal chip below
4. main CTA row
5. subtle footer controls

Primary buttons:
- `Done`

Secondary controls:
- `Edit`
- `Next`
- `Start Focus`

Optional bottom text:
- `3 left today`

### 8.2 Edit Mode — layout blocks

#### Block A: Today
- quick-add input
- active tasks list
- completed tasks collapsible section

#### Block B: Current
- current task preview
- set/clear current controls
- optional timer card

#### Block C: Goals
- goal list with colors
- create/edit/archive

#### Block D: History
- previous days list
- click to inspect a day

#### Block E: Preferences
- compact display/settings controls

### 8.3 Empty states

No tasks today:
- headline: `What matters today?`
- actions:
  - `Add first task`
  - `Open Edit Mode`

No current task but tasks exist:
- headline: `Pick your next task`
- actions:
  - `Use top task`
  - `Choose manually`

No goals:
- do not force goal creation
- allow task-only workflow

### 8.4 Responsive behavior
Primary target is desktop browser new tab.

Requirements:
- must work from about 900px width upward gracefully
- should remain usable down to smaller browser windows
- avoid horizontal overflow
- use card stacking below medium widths

---

## 9) Keyboard shortcuts
Must be supported in v1 where browser-extension context allows.

Recommended shortcuts:
- `e` = toggle Edit Mode
- `f` = toggle Zen/Focus view
- `n` = focus quick-add input
- `Enter` = submit add/edit
- `j / k` = move selection down/up in task list
- `x` = mark current or selected task done
- `c` = set selected task as current
- `Backspace` or `Delete` = delete selected task with confirmation behavior
- `Space` = start/stop focus timer when appropriate
- `Esc` = exit editing / close popovers

All shortcuts should be discoverable in a small help sheet.

---

## 10) State and data behavior

### 10.1 Local-first persistence
Persist all app data locally in the extension.

Recommended storage:
- browser extension storage (`chrome.storage.local` / equivalent)

Reason:
- shared extension state across new-tab pages
- persistence across browser restarts
- no server needed

### 10.2 Cross-tab synchronization
Critical requirement.

Behavior:
- all new-tab pages read from the same storage-backed state
- when one tab edits state, all other tabs receive the update and re-render
- no tab should behave like an isolated document

Implementation expectation:
- subscribe to storage change events
- use a small state store abstraction
- write updates atomically
- preserve order consistency

### 10.3 Date model
Use local browser time.

Rules:
- daily plans keyed by local calendar date
- date boundary at local midnight
- if tab remains open across midnight, app should detect day rollover and offer day transition handling

### 10.4 Data migration
Include a versioned schema.

Fields:
- `schemaVersion`

Need:
- future safe migration if task model or settings evolve

---

## 11) Suggested data schema

```ts
interface AppState {
  schemaVersion: number;
  preferences: Preferences;
  goals: Goal[];
  dailyPlans: Record<string, DailyPlan>;
  tasks: Record<string, Task>;
  sessions: Record<string, Session>;
}

interface Preferences {
  theme: 'system' | 'light' | 'dark';
  defaultView: 'zen' | 'focus' | 'edit';
  showGreeting: boolean;
  showGoalChip: boolean;
  showProgressText: boolean;
  timerEnabled: boolean;
  timerMinutes: 15 | 25 | 50;
  completionAnimation: boolean;
  confirmDelete: boolean;
}

interface Goal {
  id: string;
  title: string;
  color: string;
  notes?: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  goalId: string | null;
  notes?: string;
  estimatedEffort?: 'small' | 'medium' | 'large';
  status: 'active' | 'done' | 'skipped';
  sortOrder: number;
  dateBucket: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface DailyPlan {
  date: string;
  taskIds: string[];
  currentTaskId: string | null;
  sessionCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  taskId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  type: 'focus' | 'break';
  wasCompleted: boolean;
}
```

---

## 12) User flows

### Flow 1: open new tab and work
1. User opens a new tab.
2. Focus Mode appears.
3. Current task is shown immediately.
4. User clicks `Done`.
5. Next task appears.
6. User closes tab or opens another new tab.
7. New tab reflects the same updated state.

### Flow 2: morning planning
1. User opens a new tab.
2. User enters Edit Mode.
3. User creates 3–5 tasks for today.
4. User optionally creates or assigns goals.
5. User sets one current task.
6. User returns to Focus Mode.

### Flow 3: day rollover
1. User opens a new tab on a new day.
2. App detects there is no daily plan for today.
3. App creates today’s empty plan.
4. App offers carry-forward from yesterday.
5. User chooses selected tasks or starts fresh.

### Flow 4: privacy / simplicity toggle
1. User is in a distracting environment.
2. User toggles to Zen mode.
3. Only current task remains visible.
4. Later user toggles to Edit Mode and manages everything.

---

## 13) Recommended technical approach
This section is intended for the coding assistant.

### Frontend
- React
- TypeScript
- lightweight state management: Zustand or Redux Toolkit or equivalent
- Tailwind CSS for polished, fast styling
- Framer Motion for subtle transitions

### Extension platform
For Chrome-first:
- Manifest V3
- `chrome_url_overrides` for new tab replacement
- `chrome.storage.local` for persistence
- storage change listeners for cross-tab synchronization

Potential browser compatibility:
- structure code so `browser.*` API wrapper can be added later for Firefox

### Architectural guidance
- keep all app logic client-side
- isolate storage adapter from UI
- isolate date/day rollover logic
- use optimistic UI for edits, then persist
- use debounced persistence for text edits if needed
- ensure rehydration is fast on new-tab open

### State store requirements
- single source of truth
- support initialize / hydrate / persist / subscribe-to-storage-events
- avoid duplicate current-task selection logic across components

---

## 14) Design system guidance

### Typography
- strong oversized title for current task
- clean sans-serif system or high-quality web-safe stack
- clear visual distinction between task title, metadata, and controls

### Spacing
- lots of breathing room
- comfortable click targets
- avoid dense rows and tiny checkboxes

### Color
- neutral base palette
- one accent color derived from current goal or theme
- goal colors should be soft, not neon

### Motion
- subtle fade / slide transitions
- gentle completion animation
- no bouncy productivity gimmicks

### Components to build
- TaskCard
- CurrentTaskHero
- GoalChip
- QuickAddInput
- ViewToggle
- TimerPill
- SectionCard
- EmptyState
- HistoryDayCard
- InlineEditableText

---

## 15) Acceptance criteria

### Functional
- opening multiple new tabs shows the same state
- editing in one new tab updates the others
- user can toggle between Zen, Focus, and Edit views
- user can add, edit, delete, reorder, complete, and skip tasks
- user can set and auto-advance the current task
- unfinished tasks do not auto-roll to the next day
- user can manually carry forward selected tasks
- all state persists locally across browser restarts
- extension works offline after install

### UX
- Focus Mode feels calm and uncluttered
- current task is visible within one second of opening a new tab under normal conditions
- keyboard shortcuts work for core flows
- no required setup before first use
- empty states are useful, not dead ends

### Quality
- no obvious flicker on open
- no duplicate tasks from double-submit
- no broken synchronization across simultaneously open tabs
- no data loss on routine edits

---

## 16) Nice-to-have v1.1 / v2 features
Not required for initial build, but safe to add later:
- searchable history
- notes per task
- richer timer modes
- daily templates
- recurring habits
- drag-and-drop reorder
- command palette
- import/export JSON
- pin favorite goals
- focus soundtrack toggle
- motivational or reflective prompts

---

## 17) Explicit exclusions
The coding assistant should not implement:
- authentication
- server APIs
- cloud storage
- social/accountability features
- multiplayer rooms
- collaboration
- chat
- email notifications
- monetary stakes
- Beeminder or external integrations
- mobile app support

---

## 18) One-sentence implementation brief
Build a polished, local-first browser extension that replaces the new tab page with a minimal focus-first task surface, supports instant toggling between Zen/Focus/Edit views, and keeps all open new tabs synchronized through shared extension storage.

