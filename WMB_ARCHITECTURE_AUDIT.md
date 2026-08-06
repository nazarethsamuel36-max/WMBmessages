# WMB Message Application - Complete UI/UX Architecture Audit

## Executive Summary

This document provides a comprehensive audit of the WMB Message application's current architecture, UI/UX patterns, state management, and workflows. This audit serves as a baseline for future redesigns and ensures clear separation between UI components, user interactions, state management, presentation workflow, and business logic.

---

## 1. User Flow Analysis

### 1.1 Application Launch Flow

```
Application Opens
↓
WelcomePage (/)
↓
User selects "Open Dock" → Navigate to DockPage (/dock)
↓
AppShell initializes with AppContextProvider
↓
Messages loaded from Supabase (async)
↓
Default workspace: 'search'
↓
User sees full message list in SearchWorkspace
```

### 1.2 Message Selection Flow

```
SearchWorkspace (default state)
↓
User clicks message card
↓
openMessage(index) called
↓
Fetch paragraphs from Supabase
↓
Parse sermon to slides (sermonParser)
↓
SET_MESSAGE action dispatched
↓
Switch to 'reader' workspace
↓
ReaderWorkspace displays paragraphs
↓
Scroll to paragraph 0
```

### 1.3 Reader Navigation Flow

```
ReaderWorkspace active
↓
User clicks paragraph card
↓
toggleLive(paragraphIndex, slideIndex) called
↓
SET_READING action dispatched
↓
If isLive: SET_LIVE action + sendToPresentation('showSlide')
↓
Card scrolls into view
↓
Visual feedback: is-reading class applied
```

### 1.4 Search Flow (Global)

```
User types in global search bar (AppShell)
↓
searchQuery state updated
↓
SearchWorkspace detects query change
↓
Debounce (180ms)
↓
searchRouter.search() called
↓
Handlers execute in order:
  1. ParagraphNavigationHandler (if open sermon + number)
  2. CombinedDateParagraphHandler (date + paragraph)
  3. DateSearchHandler (date only)
  4. TitleSearchHandler (title text)
  5. QuoteSearchHandler (quote text)
↓
Results displayed
↓
User clicks result
↓
handleSearchResult(messageIndex, paragraphNo?)
↓
openMessage() + switch to 'reader' workspace
↓
Jump to paragraph if specified
```

### 1.5 Search Flow (Reader)

```
ReaderWithSidebarWorkspace active
↓
User types in reader search bar
↓
readerQuery state updated
↓
Reader search results computed (client-side)
↓
Dropdown shows matching paragraphs
↓
User clicks result
↓
setReaderQuery(`¶${paragraph}`)
↓
CustomEvent 'readerJumpTo' dispatched
↓
ReaderWorkspace scrolls to paragraph
```

### 1.6 Presentation Flow

```
ReaderWorkspace active
↓
User clicks paragraph card (or presses Enter)
↓
toggleLive() called
↓
If not already live:
  - SET_LIVE action dispatched
  - sendToPresentation('showSlide', slideData)
  - Header shows "LIVE ¶{number}"
↓
PresentationPage receives via BroadcastChannel
↓
activeSlide state updated
↓
Lower third overlay appears
↓
If user clicks same paragraph again:
  - CLEAR_LIVE action dispatched
  - sendToPresentation('clearDisplay')
  - Header shows "READY"
```

### 1.7 Setlist Flow

```
ReaderWorkspace active
↓
User clicks "+" button on paragraph
↓
addToSetlist(paragraphIndex) called
↓
ADD_TO_SETLIST action dispatched
↓
Entry added to setlist array
↓
User navigates to Setlist workspace
↓
User clicks setlist entry
↓
handleSelectEntry() called
↓
openMessage(messageIndex)
↓
selectReading(paragraphIndex, 0)
↓
Switch to 'reader' workspace
```

### 1.8 Settings Flow

```
User navigates to Settings workspace
↓
Adjusts font size slider
↓
handleFontSizeChange() called
↓
Save to localStorage
↓
Update PresentationTheme
↓
Update CSS variables
↓
BroadcastChannel('themeChange')
↓
regenerateSlides() called
↓
Re-parse sermon with new theme
↓
PresentationPage receives theme change
↓
CSS variables updated on presentation page
```

---

## 2. UI States Inventory

### 2.1 Application-Level States

| State | Description | Trigger |
|-------|-------------|---------|
| `initial` | App loading, messages fetching | App mount |
| `ready` | Messages loaded, default workspace active | Messages fetch complete |
| `message-loading` | Paragraphs fetching for selected message | openMessage() called |
| `error` | API or parsing error | Catch blocks in services/parser |

### 2.2 Workspace States

| Workspace | States | Transitions |
|----------|--------|-------------|
| `search` | `idle`, `searching`, `results`, `no-results`, `loading` | Query changes, fetch complete |
| `reader` | `empty`, `loaded`, `reading`, `live` | Message load, paragraph selection, toggleLive |
| `reader-with-sidebar` | `normal`, `fullscreen` | F key, Escape key, fullscreen button |
| `setlist` | `empty`, `populated` | Add/remove entries |
| `settings` | `idle`, `applying` | Font size change |

### 2.3 Reader States

| State | Visual Indicators | Behavior |
|-------|------------------|----------|
| `no-message` | Empty state icon + text | Cannot search, buttons disabled |
| `message-loaded` | Paragraph cards displayed | Can navigate, search, go live |
| `paragraph-selected` | Card has `is-reading` class | Reading pointer updated |
| `live-active` | Card has `is-live` class + green dot | Slide sent to presentation |
| `searching` | Search dropdown visible | Results filtered by query |

### 2.4 Sidebar States

| State | Visual Indicators | Behavior |
|-------|------------------|----------|
| `expanded` | Split pane visible | Can resize, collapse |
| `collapsed` | Reader full width | Click divider to expand |
| `resizing` | Divider blue, cursor col-resize | Drag to adjust split ratio |

### 2.5 Search States

| Search Type | States | Behavior |
|-------------|--------|----------|
| Global search | `idle`, `typing`, `searching`, `results`, `empty` | Debounced API calls |
| Reader search | `idle`, `typing`, `results`, `empty` | Client-side filtering |
| Paragraph jump | `idle`, `jumping` | Direct paragraph navigation |

### 2.6 Presentation States

| State | Visual Indicators | Behavior |
|-------|------------------|----------|
| `ready` | Header shows "READY" | No slide displayed |
| `live` | Header shows "LIVE ¶{n}" + green dot | Slide displayed on presentation page |
| `clear` | No overlay visible | clearDisplay command sent |

### 2.7 Layout States

| State | Description | Trigger |
|-------|-------------|---------|
| `default` | Reader 70%, Sidebar 30% | Initial load |
| `custom-split` | User-adjusted ratio | Drag divider |
| `fullscreen-reader` | Reader 100%, sidebar hidden | F key or button |
| `banner-mode` | 30% height banner at bottom | URL parameter ?banner=true |

---

## 3. Reader Behavior Audit

### 3.1 Message Loading

**Process:**
1. User selects message from SearchWorkspace
2. `openMessage(index)` called in AppContext
3. Check if message already loaded (index comparison)
4. If new message: fetch paragraphs from Supabase
5. Parse sermon to slides using `sermonParser`
6. Dispatch `SET_MESSAGE` action
7. Send `loadPresentation` command to presentation page
8. Switch to reader workspace

**State Changes:**
- `currentMessageIndex` → selected index
- `paragraphs` → parsed paragraph array
- `presentationData` → full sermon data
- `reading` → `{ paragraphIndex: 0, slideIndex: 0 }`

**Edge Cases:**
- Same message selected: reuses cached data
- Network error: caught in try/catch, logs error
- Empty sermon: handles gracefully

### 3.2 Current Paragraph Tracking

**State:**
```typescript
reading: {
  paragraphIndex: number;  // Index in paragraphs array
  slideIndex: number;      // Index in paragraph.slides array
}
```

**Updates:**
- `selectReading(pi, si)` - manual selection
- `toggleLive(pi, si)` - also updates reading
- Keyboard navigation (arrow keys)
- Search result selection

**Visual Feedback:**
- `is-reading` class on active card
- Smooth scroll to active card
- Card highlighted in reader

### 3.3 Scrolling Behavior

**Implementation:**
- `useEffect` monitors `reading.paragraphIndex` and `reading.slideIndex`
- Maps to display item index (paragraphs → flattened slides)
- `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
- Only scrolls when reading position changes

**Characteristics:**
- Smooth animation
- Minimal scroll (nearest block)
- Automatic on position change
- Manual scroll still possible

### 3.4 Paragraph Selection

**Triggers:**
- Click on paragraph card
- Keyboard navigation (arrows)
- Search result selection
- Setlist entry selection

**Process:**
1. User interaction
2. `toggleLive(pi, si)` or `selectReading(pi, si)` called
3. State updated via reducer
4. If live: send slide to presentation
5. Card scrolls into view
6. Visual feedback applied

### 3.5 Reader Search

**Implementation:**
- Client-side filtering of current message paragraphs
- Searches `normalized_text` or falls back to `text`
- Shows dropdown with highlighted matches
- Supports paragraph jump (e.g., "¶ 15")

**States:**
- `readerQuery` - search input value
- `readerSearchActive` - dropdown visibility
- Results computed via `useMemo`

**Interaction:**
- Focus → show results if query exists
- Blur → hide results after 150ms delay
- Escape → clear query and hide results
- Click result → jump to paragraph

### 3.6 Navigation

**Keyboard Shortcuts (AppShell):**
- Arrow Down: Next slide/paragraph
- Arrow Up: Previous slide/paragraph
- Arrow Right: Next paragraph
- Arrow Left: Previous paragraph
- Enter: Toggle live on current paragraph
- Escape: Clear reader search

**Navigation Logic:**
- Slide-level navigation within paragraph
- Paragraph-level navigation across message
- Boundary checking (first/last items)
- Live mode sync (if isLive, send to presentation)

### 3.7 Highlighting

**Visual States:**
- `is-reading`: Currently selected paragraph
- `is-live`: Currently displayed on presentation
- Both can be active simultaneously

**Styling:**
- `is-reading`: Border/background highlight
- `is-live`: Green color scheme, glowing dot
- Priority: `is-live` overrides `is-reading` visually

### 3.8 State Persistence

**Persisted:**
- Split pane ratio (localStorage)
- Sidebar collapsed state (localStorage)
- Theme settings (localStorage)
- Presentation command (localStorage - fallback)

**Not Persisted:**
- Current message
- Reading position
- Search queries
- Setlist

**Rationale:**
- Layout preferences persist across sessions
- Content state resets on refresh (clean slate)

---

## 4. Sidebar Behavior Audit

### 4.1 Search Workflow

**Global Search (AppShell):**
- Input in header area
- Only visible when 'search' workspace active
- Updates `searchQuery` state
- Triggers SearchWorkspace search

**Sidebar Search (ReaderWithSidebarWorkspace):**
- SearchWorkspace embedded in sidebar
- Same search behavior as global search
- Results shown in sidebar panel

### 4.2 Message List

**Display Modes:**
- No query: Full message list
- With query: Search results

**Message Card:**
- Date (green, small)
- Title (primary text)
- Click to open message
- Active state styling if currently open

### 4.3 Selection

**Process:**
1. User clicks message card
2. `openMessage(index)` called
3. Message loads
4. Workspace switches to 'reader'
5. Reading position set to paragraph 0

**Visual Feedback:**
- Active class on current message card
- Header updates with current message info

### 4.4 Resizing

**Implementation:**
- SplitPane component handles resizing
- Draggable divider between panes
- Mouse events: mousedown, mousemove, mouseup
- Clamping: minLeft (30%), maxLeft (90%)

**State:**
- `split` - percentage (0-100)
- `isDragging` - resize in progress
- Saved to localStorage

### 4.5 Collapse/Expand Behavior

**Toggle:**
- Click divider to collapse/expand
- Visual indicator: circle with ‹/›
- Tooltip shows current action

**States:**
- `isCollapsed` - boolean
- Saved to localStorage

**Behavior:**
- Collapsed: Reader 100%, sidebar hidden
- Expanded: Restore previous split ratio
- Divider still visible when collapsed

### 4.6 Reader Interaction

**Message Selection:**
- Click message in sidebar
- Loads in reader (left pane)
- No workspace switch needed

**Search Results:**
- Click result in sidebar
- Opens message + jumps to paragraph
- Reader updates immediately

**Sync:**
- Sidebar shows current message (active state)
- Reader shows message content
- Both panes independent but coordinated

---

## 5. Search UX Analysis

### 5.1 Global Message Search

**Location:** AppShell header (when 'search' workspace active)

**Input Handling:**
- Auto-hyphenation: "650402" → "65-0402"
- Updates `searchQuery` state
- Escape clears query and blurs input

**Search Intent Router:**

| Handler | Pattern | Priority | Result |
|---------|---------|----------|--------|
| ParagraphNavigationHandler | Pure number (if sermon open) | 1 | Jump to paragraph |
| CombinedDateParagraphHandler | Date + paragraph (e.g., "65-0402 15") | 2 | Open message, jump to paragraph |
| DateSearchHandler | Date pattern (e.g., "65-0402") | 3 | Message matches |
| TitleSearchHandler | Text ≥2 chars (not number/date) | 4 | Title matches |
| QuoteSearchHandler | Text ≥3 chars (not number/date) | 5 | Quote matches across all messages |

**Debouncing:**
- 180ms delay
- Clears previous timeout on new input
- Prevents excessive API calls

**Results Display:**
- Badge type indicator (📖 Message, 📍 Paragraph, 💬 Quote)
- Title and subtitle
- Snippet for quotes (highlighted match)
- Click to navigate

### 5.2 Reader Search

**Location:** ReaderWithSidebarWorkspace toolbar

**Scope:**
- Current message only
- Client-side filtering
- Searches paragraph text

**Input Handling:**
- Placeholder changes based on state
- Escape clears query
- Disabled if no message loaded

**Results:**
- Dropdown with paragraph numbers
- Text snippet with highlighted match
- Max 10 results shown
- Click to jump to paragraph

**Special Feature:**
- Paragraph jump: type "¶ 15" or just "15"
- Direct navigation without dropdown

### 5.3 Search State Transitions

```
Idle
↓ [User types]
Typing (debounce active)
↓ [Debounce fires]
Searching
↓ [Results return]
Results / No Results
↓ [User clears]
Idle
```

### 5.4 Keyboard Behavior

**Global Search Input:**
- Enter: Trigger search (if needed)
- Escape: Clear and blur

**Reader Search Input:**
- Enter: No special action
- Escape: Clear and hide dropdown
- Focus: Show results if query exists
- Blur: Hide results (delayed)

**Reader Navigation (when not typing):**
- Arrow keys: Navigate paragraphs
- Enter: Toggle live

### 5.5 Focus Behavior

**Global Search:**
- Auto-focused when switching to search workspace?
- Not explicitly auto-focused
- Manual focus required

**Reader Search:**
- Not auto-focused
- Manual focus required
- Blurs on result selection

### 5.6 Result Selection

**Global Search:**
- Click result → `handleSearchResult()`
- Opens message → switches to reader
- Jumps to paragraph if specified

**Reader Search:**
- Click result → `handleReaderSearchSelect()`
- Sets reader query to `¶{number}`
- Dispatches custom event
- Reader scrolls to paragraph

---

## 6. Presentation Workflow Pipeline

### 6.1 Complete Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    READER (Controller)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              User clicks paragraph card                       │
│              toggleLive(paragraphIndex, slideIndex)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AppContext                                  │
│  - SET_READING action (update local state)                    │
│  - SET_LIVE action (update live state)                       │
│  - Extract slide data from paragraphs[pi].slides[si]          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              sendToPresentation()                            │
│  - BroadcastChannel.postMessage('showSlide', slideData)      │
│  - localStorage.setItem('presentationCommand', cmd)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Communication Channel                            │
│  - BroadcastChannel: 'presentation_channel'                   │
│  - Fallback: localStorage 'presentationCommand'             │
│  - Real-time sync across tabs/windows                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PRESENTATION PAGE (Display)                      │
│  - useEffect listens to BroadcastChannel                    │
│  - useEffect listens to localStorage storage events          │
│  - Receives { action: 'showSlide', data: slideData }          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              State Update                                    │
│  - setActiveSlide(slideData)                                │
│  - setIsActive(true)                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Render                                          │
│  - Lower third overlay becomes visible                       │
│  - Metadata bar: date, title, paragraph number               │
│  - Quote container: slide text lines                        │
│  - CSS variables applied from theme                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              OBS BROWSER SOURCE                               │
│  - Presentation page loaded as Browser Source               │
│  - Transparent background (unless ?preview=true)             │
│  - Scales to 16:9 or banner mode                            │
│  - Real-time updates via communication channel               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              LIVE DISPLAY (Output)                            │
│  - Overlay appears on stream                                 │
│  - Updates in real-time as user navigates                     │
│  - Clear on toggle off or clearDisplay command               │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 State Transitions

**Live Mode ON:**
```
Reader: isLive = false
↓
User clicks paragraph
↓
AppContext: SET_LIVE, isLive = true
↓
sendToPresentation('showSlide')
↓
Presentation: activeSlide = data, isActive = true
↓
OBS: Overlay visible
```

**Live Mode OFF:**
```
Reader: isLive = true
↓
User clicks same paragraph
↓
AppContext: CLEAR_LIVE, isLive = false
↓
sendToPresentation('clearDisplay')
↓
Presentation: isActive = false
↓
OBS: Overlay hidden
```

**Slide Change (while live):**
```
Reader: isLive = true, live = { messageIndex, paragraphIndex, slideIndex }
↓
User clicks different paragraph
↓
AppContext: SET_LIVE (new position)
↓
sendToPresentation('showSlide', newSlideData)
↓
Presentation: activeSlide = newSlideData
↓
OBS: Overlay updates
```

### 6.3 Communication Mechanisms

**Primary: BroadcastChannel**
```typescript
const presentationChannel = new BroadcastChannel('presentation_channel');
presentationChannel.postMessage({ action: 'showSlide', data: slideData });
```

**Fallback: localStorage**
```typescript
localStorage.setItem('presentationCommand', JSON.stringify(cmd));
// Listener: window.addEventListener('storage', handleStorageChange)
```

**Commands:**
- `loadPresentation` - Full sermon data
- `showSlide` - Single slide data
- `clearDisplay` - Hide overlay
- `themeChange` - Update CSS variables

### 6.4 Presentation Page Modes

**Standard Mode:**
- 16:9 aspect ratio
- Scaled to fit window with 5% margins
- Transparent background (for OBS keying)
- Full overlay

**Preview Mode (?preview=true):**
- Same as standard
- Background image visible
- Gradient overlay
- For testing/preview

**Banner Mode (?banner=true):**
- 30% height banner
- Full width
-_Positioned at bottom of screen
- For lower-third style display

### 6.5 Theme Synchronization

**Settings Change:**
```
User adjusts font size
↓
Settings: save to localStorage
↓
Settings: update PresentationTheme object
↓
Settings: update CSS variables
↓
Settings: BroadcastChannel('themeChange')
↓
Settings: regenerateSlides()
↓
Presentation: receive 'themeChange'
↓
Presentation: update CSS variables
↓
Presentation: re-render with new theme
```

---

## 7. State Management Analysis

### 7.1 Core Application State

```typescript
interface AppState {
  // Workspace
  activeWorkspace: Workspace;
  
  // Data
  messages: Message[];
  currentMessageIndex: number;
  paragraphs: Paragraph[];
  presentationData: SermonData | null;
  
  // Reading Position
  reading: { paragraphIndex: number; slideIndex: number };
  
  // Live Presentation
  live: { messageIndex: number; paragraphIndex: number; slideIndex: number };
  isLive: boolean;
  
  // Setlist
  setlist: SetlistEntry[];
  
  // Search
  readerQuery: string;
  searchQuery: string;
}
```

### 7.2 State Ownership

| State | Owner | Scope | Persistence |
|-------|-------|-------|-------------|
| `activeWorkspace` | AppContext | Global | No |
| `messages` | AppContext | Global | No (loaded from API) |
| `currentMessageIndex` | AppContext | Global | No |
| `paragraphs` | AppContext | Global | No |
| `presentationData` | AppContext | Global | No |
| `reading` | AppContext | Global | No |
| `live` | AppContext | Global | No |
| `isLive` | AppContext | Global | No |
| `setlist` | AppContext | Global | No |
| `readerQuery` | AppContext | Global | No |
| `searchQuery` | AppContext | Global | No |
| `split` (SplitPane) | SplitPane component | Local | Yes (localStorage) |
| `isCollapsed` (SplitPane) | SplitPane component | Local | Yes (localStorage) |
| `readerSearchActive` | ReaderWithSidebarWorkspace | Local | No |
| `isFullscreen` | ReaderWithSidebarWorkspace | Local | No |
| `quoteFontSize` | SettingsWorkspace | Local | Yes (localStorage) |
| `metadataFontSize` | SettingsWorkspace | Local | Yes (localStorage) |
| `activeSlide` | PresentationPage | Local | No |
| `isActive` | PresentationPage | Local | No |

### 7.3 State Interactions

**Message Load Flow:**
```
messages (API) → currentMessageIndex → paragraphs → presentationData → reading
```

**Live Mode Flow:**
```
reading → live → isLive → sendToPresentation → activeSlide (PresentationPage)
```

**Search Flow:**
```
searchQuery → SearchWorkspace → results → handleSearchResult → openMessage → reading
```

**Setlist Flow:**
```
reading + currentMessageIndex → setlist → SetlistWorkspace → handleSelectEntry → reading
```

### 7.4 Reducer Actions

| Action | Payload | State Changes |
|--------|---------|---------------|
| `SET_WORKSPACE` | Workspace | `activeWorkspace` |
| `SET_MESSAGES` | Message[] | `messages` |
| `SET_MESSAGE` | { index, paragraphs, data } | `currentMessageIndex`, `paragraphs`, `presentationData`, `reading` |
| `SET_READING` | { paragraphIndex, slideIndex } | `reading` |
| `SET_LIVE` | { messageIndex, paragraphIndex, slideIndex } | `live`, `isLive` |
| `SET_IS_LIVE` | boolean | `isLive` |
| `CLEAR_LIVE` | - | `isLive`, `live` (reset) |
| `ADD_TO_SETLIST` | SetlistEntry | `setlist` |
| `REMOVE_FROM_SETLIST` | number | `setlist` |
| `SET_READER_QUERY` | string | `readerQuery` |
| `SET_SEARCH_QUERY` | string | `searchQuery` |

### 7.5 Side Effects

**Data Fetching:**
- `getMessages()` - on mount (AppContext)
- `getParagraphs()` - on message open
- `searchQuotes()` - on quote search

**Communication:**
- `sendToPresentation()` - on live toggle, message load
- `BroadcastChannel` - theme changes, slide updates

**Persistence:**
- localStorage - split ratio, collapsed state, theme settings
- localStorage fallback - presentation commands

**UI Updates:**
- Scroll to paragraph - on reading position change
- Custom events - reader search jumps

---

## 8. Component Relationships

### 8.1 Component Hierarchy

```
App (React Router)
├── WelcomePage
├── DockPage
│   └── AppShell
│       ├── Header
│       ├── AppShell (workspace-area)
│       │   ├── SearchWorkspace
│       │   ├── ReaderWorkspace
│       │   ├── ReaderWithSidebarWorkspace
│       │   │   ├── ReaderWorkspace
│       │   │   ├── SearchWorkspace
│       │   │   └── SplitPane
│       │   ├── SetlistWorkspace
│       │   └── SettingsWorkspace
│       ├── AppShell (reader-search-zone)
│       └── BottomNavigation
└── PresentationPage
```

### 8.2 Component Map

| Component | Type | Parent | Children | State Owned |
|-----------|------|--------|----------|-------------|
| `App` | Route | - | WelcomePage, DockPage, PresentationPage | None |
| `WelcomePage` | Page | App | None | Local (URL copy states) |
| `DockPage` | Page | App | AppShell | None |
| `AppShell` | Layout | DockPage | Header, Workspaces, BottomNavigation, SearchZone | None (uses context) |
| `Header` | UI | AppShell | None | None (uses context) |
| `BottomNavigation` | UI | AppShell | None | None (uses context) |
| `SearchWorkspace` | Workspace | AppShell | None | Local (results, searching, selectedIndex) |
| `ReaderWorkspace` | Workspace | AppShell | None | Local (contentRef) |
| `ReaderWithSidebarWorkspace` | Workspace | AppShell | ReaderWorkspace, SearchWorkspace, SplitPane | Local (readerSearchActive, isFullscreen) |
| `SetlistWorkspace` | Workspace | AppShell | None | None (uses context) |
| `SettingsWorkspace` | Workspace | AppShell | None | Local (font sizes) |
| `SplitPane` | UI | ReaderWithSidebarWorkspace | LeftContent, RightContent | Local (split, isDragging, isCollapsed) |
| `PresentationPage` | Page | App | None | Local (activeSlide, isActive) |
| `AppContextProvider` | Context | DockPage | All workspaces | Global (AppState) |

### 8.3 Communication Patterns

**Context-Based:**
- AppContext provides global state
- All workspaces consume via `useApp()`
- Centralized state management

**Event-Based:**
- Custom events: `readerJumpTo`
- Cross-component communication
- Reader search → ReaderWorkspace

**Prop-Based:**
- SplitPane: leftContent, rightContent
- Direct parent-child communication
- Layout components

**Channel-Based:**
- BroadcastChannel: presentation_channel
- Cross-tab/window communication
- Real-time sync

**Storage-Based:**
- localStorage: persistence
- Cross-session communication
- Fallback mechanism

### 8.4 Data Flow

**Top-Down (State):**
```
AppContext → Workspaces → UI Components
```

**Bottom-Up (Actions):**
```
UI Components → Workspaces → AppContext Actions
```

**Lateral (Events):**
```
Component A → Custom Event → Component B
```

**External (API):**
```
Component → Service → Supabase → Component
```

---

## 9. UX Review & Improvement Opportunities

### 9.1 Confusing Workflows

**Issue 1: Multiple Reader Workspaces**
- **Problem:** Three reader workspaces (reader, reader-with-sidebar, search)
- **Confusion:** Users may not understand which to use
- **Current:** Reader (full), Reader+ (split), Search (list)
- **Recommendation:** Consolidate or clarify purpose in UI

**Issue 2: Live Toggle Behavior**
- **Problem:** Clicking same paragraph toggles live off
- **Confusion:** Users may expect re-sending slide
- **Current:** Toggle on/off on same click
- **Recommendation:** Add explicit "Go Live" button or change behavior

**Issue 3: Search Scope Ambiguity**
- **Problem:** Global search vs reader search not clearly differentiated
- **Confusion:** Users may search in wrong place
- **Current:** Different locations, similar appearance
- **Recommendation:** Visual distinction or unified search

### 9.2 Duplicate Actions

**Issue 1: Message Selection**
- **Problem:** Can select from Search workspace or sidebar
- **Duplication:** Same action, multiple locations
- **Current:** Search workspace + sidebar in Reader+
- **Recommendation:** Clarify primary vs secondary access

**Issue 2: Navigation Controls**
- **Problem:** Keyboard + click navigation
- **Duplication:** Multiple ways to do same thing
- **Current:** Arrow keys + card clicks
- **Recommendation:** Document shortcuts, add visual hints

### 9.3 Unnecessary Clicks

**Issue 1: Workspace Switching**
- **Problem:** Selecting message auto-switches to reader
- **Extra Click:** If user wants to stay in search
- **Current:** Auto-switch on message selection
- **Recommendation:** Option to stay in search, or explicit "Open" button

**Issue 2: Setlist Navigation**
- **Problem:** Clicking setlist entry switches workspace
- **Extra Click:** User may want to preview without leaving
- **Current:** Auto-switch to reader
- **Recommendation:** Preview in setlist, explicit "Open" action

### 9.4 Missing Shortcuts

**Missing:**
- Workspace switching (1-5 keys)
- Quick setlist add (e.g., 'S' key)
- Toggle sidebar (e.g., '[' or ']')
- Quick search (e.g., '/' key)
- Clear live (e.g., 'Esc' when live)

**Current:**
- Arrow keys: Navigate paragraphs
- Enter: Toggle live
- F: Fullscreen (Reader+ only)
- Escape: Clear search

### 9.5 State Inconsistencies

**Issue 1: Search State**
- **Problem:** Search query persists but results don't
- **Inconsistency:** Query shown but no results after workspace switch
- **Current:** query saved, results computed per workspace
- **Recommendation:** Clear query on workspace switch or persist results

**Issue 2: Live State**
- **Problem:** Live state clears on message change
- **Inconsistency:** User may expect live to persist
- **Current:** isLive resets on new message
- **Recommendation:** Clarify behavior or add option

### 9.6 Workflow Simplification Opportunities

**Opportunity 1: Unified Search**
- **Current:** Separate global and reader search
- **Simplified:** Single search with scope toggle
- **Benefit:** Reduced confusion, clearer intent

**Opportunity 2: Quick Actions**
- **Current:** Multiple clicks for common actions
- **Simplified:** Context menus or keyboard shortcuts
- **Benefit:** Faster workflow for power users

**Opportunity 3: Message Preview**
- **Current:** Must open message to see content
- **Simplified:** Hover preview or expandable cards
- **Benefit:** Faster message discovery

**Opportunity 4: Setlist Integration**
- **Current:** Separate workspace for setlist
- **Simplified:** Setlist as sidebar panel
- **Benefit:** Always accessible, less context switching

**Opportunity 5: Live Mode Indicators**
- **Current:** Header badge + card highlighting
- **Simplified:** More prominent live indicator
- **Benefit:** Clearer feedback for presenters

### 9.7 UX Strengths

**Strengths:**
1. **Fast Navigation:** Keyboard shortcuts for paragraph navigation
2. **Real-time Sync:** BroadcastChannel for instant presentation updates
3. **Flexible Layout:** Resizable split pane with collapse
4. **Search Intent:** Smart search routing based on query pattern
5. **Theme Customization:** Live font size adjustment
6. **Fallback Mechanisms:** localStorage fallback for communication
7. **Clean State:** Reset on refresh provides clean slate

---

## 10. Architecture Separation for Future Work

### 10.1 UI Components (Reusable)

**Layout Components:**
- `SplitPane` - Resizable split layout with collapse
- `AppShell` - Main application shell structure
- `Header` - Top navigation bar
- `BottomNavigation` - Tab-based navigation

**Pattern Components:**
- Search input with dropdown
- Card-based list with selection
- Collapsible panels
- Fullscreen toggle
- Keyboard navigation handlers

**Styling:**
- CSS variables for theming
- Consistent spacing and borders
- Responsive design patterns

### 10.2 User Interactions (Reusable Patterns)

**Navigation:**
- Tab-based workspace switching
- Keyboard shortcuts (arrows, enter, escape)
- Click-to-select with visual feedback
- Scroll-to-item on selection

**Search:**
- Debounced input
- Intent-based routing
- Result highlighting
- Dropdown suggestions

**Layout:**
- Draggable splitter
- Collapse/expand toggle
- Fullscreen mode
- Responsive sizing

### 10.3 State Management (Application-Specific)

**Message App State:**
- Messages, paragraphs, sermon data
- Reading position, live position
- Setlist entries
- Search queries

**Bible App State (Future):**
- Books, chapters, verses
- Current book/chapter/verse
- Language selection
- Search queries

**Separation:**
- Different data models
- Different business logic
- Different state shapes
- Same management pattern (Context + reducer)

### 10.4 Presentation Workflow (Domain-Specific)

**Message App:**
- Sermon parsing to slides
- Lower third overlay
- Live presentation mode
- OBS browser source integration

**Bible App (Future):**
- Verse display
- Chapter navigation
- Language switching
- No presentation mode (likely)

**Separation:**
- Completely different workflows
- Different output formats
- Different user goals
- No shared presentation logic

### 10.5 Business Logic (Domain-Specific)

**Message App:**
- Sermon parsing (sermonParser)
- Slide generation (textMeasurer)
- Theme management (presentationTheme)
- Quote search (Supabase queries)

**Bible App (Future):**
- Book/chapter/verse navigation
- Language translation lookup
- Reference parsing (e.g., "John 3:16")
- Text search within Bible

**Separation:**
- Different data sources
- Different parsing logic
- Different search algorithms
- No shared business logic

### 10.6 Reusable Architecture Patterns

**Pattern 1: Context + Reducer**
```typescript
// Reusable pattern
const [state, dispatch] = useReducer(reducer, initialState);
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);
```

**Pattern 2: Workspace Switching**
```typescript
// Reusable pattern
const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(defaultWorkspace);
// Render based on activeWorkspace
```

**Pattern 3: Split Layout**
```typescript
// Reusable pattern
<SplitPane
  leftContent={<Reader />}
  rightContent={<Sidebar />}
  defaultSplit={70}
  collapsible={true}
/>
```

**Pattern 4: Search Intent Routing**
```typescript
// Reusable pattern
class SearchRouter {
  handlers: Handler[];
  async search(query) {
    for (const handler of this.handlers) {
      if (handler.matches(query)) {
        return handler.execute(query);
      }
    }
  }
}
```

**Pattern 5: Communication Channel**
```typescript
// Reusable pattern
const channel = new BroadcastChannel('channel_name');
channel.postMessage({ action, data });
```

---

## 11. Recommendations for Bible App Implementation

### 11.1 UI Reuse

**Reuse:**
- SplitPane component (exact copy)
- Layout structure (header + main + navigation)
- Card-based list styling
- Search input styling
- Keyboard navigation patterns
- Collapse/expand interactions

**Adapt:**
- Header content (Bible-specific)
- Navigation tabs (Bible-specific workspaces)
- Card content (books instead of messages)

### 11.2 State Management

**Similar Pattern:**
```typescript
interface BibleAppState {
  activeWorkspace: 'search' | 'reader' | 'settings';
  books: Book[];
  currentBook: string;
  chapters: Chapter[];
  verses: Verse[];
  reading: { chapter: string; verse: string };
  language: 'en' | 'hi';
  searchQuery: string;
}
```

**Same Approach:**
- Context + reducer
- useCallback for actions
- useRef for latest state
- Similar action types

### 11.3 Component Structure

**Bible App Components:**
- `BibleAppShell` (adapted from AppShell)
- `BibleHeader` (adapted from Header)
- `BibleReader` (adapted from ReaderWorkspace)
- `BibleSidebar` (adapted from SearchWorkspace)
- `BibleSettings` (adapted from SettingsWorkspace)
- `SplitPane` (exact reuse)

### 11.4 Search Implementation

**Bible Search Router:**
```typescript
class BibleSearchRouter {
  handlers: Handler[];
  // Book search
  // Reference search (e.g., "John 3:16")
  // Chapter search (e.g., "John 3")
  // Text search within current chapter
}
```

### 11.5 Navigation

**Bible Navigation:**
- Arrow keys: Next/previous verse
- Chapter navigation: Previous/Next buttons
- Book selection: Sidebar or dropdown
- Language toggle: Toolbar button

### 11.6 What NOT to Share

**Do Not Share:**
- Message data structures
- Sermon parsing logic
- Presentation workflow
- Live mode functionality
- Setlist functionality
- Quote search implementation
- Slide generation logic

**Completely Separate:**
- Data models
- Business logic
- State shapes
- Service layers
- Parser modules

---

## 12. Conclusion

### 12.1 Current Architecture Summary

The WMB Message application is well-structured with:
- Clear separation of concerns (UI, state, business logic)
- Centralized state management via Context API
- Flexible layout with resizable split pane
- Real-time presentation sync via BroadcastChannel
- Smart search with intent routing
- Keyboard navigation for power users

### 12.2 Key Strengths

1. **Modular Design:** Clear component hierarchy
2. **State Management:** Centralized and predictable
3. **Communication:** Robust channel-based sync
4. **Search:** Intelligent intent routing
5. **Layout:** Flexible and user-customizable
6. **Performance:** Debounced searches, memoized computations

### 12.3 Areas for Improvement

1. **Workspace Confusion:** Clarify or consolidate reader workspaces
2. **Search Scope:** Better differentiation between search types
3. **Shortcuts:** Add more keyboard shortcuts
4. **State Consistency:** Clarify persistence behavior
5. **UX Simplification:** Reduce unnecessary clicks and context switches

### 12.4 Bible App Implementation Strategy

**Reuse:**
- UI components (SplitPane, layout structure)
- Interaction patterns (navigation, search, layout)
- Styling system (CSS variables, design tokens)
- State management pattern (Context + reducer)

**Separate:**
- Data models (Bible-specific)
- Business logic (Bible navigation, parsing)
- State shapes (Bible-specific state)
- Service layer (Bible data sources)
- Domain workflows (no presentation mode)

This audit provides a complete foundation for implementing the Bible application with UI/UX consistency while maintaining complete separation of domain logic and business rules.
