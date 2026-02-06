# Frontend Codebase Audit

## 1. Project Structure Map

```text
src
├── app
│   ├── admin
│   │   └── page.tsx           # Admin Dashboard entry point
│   ├── favicon.ico
│   ├── globals.css            # Global CSS styles and Tailwind directives
│   ├── layout.tsx             # Root layout with basic HTML structure
│   ├── login
│   │   └── page.tsx           # Login page UI
│   ├── page.tsx               # Main public Radio/Home page
│   ├── register
│   │   └── page.tsx           # Registration page UI
│   └── template.tsx           # Page transition template
├── components
│   ├── ActiveListeners.tsx    # List-style component showing active listener avatars
│   ├── admin
│   │   ├── AlbumsManager.tsx  # CRUD interface for album management
│   │   ├── ArtistsManager.tsx # CRUD interface for artist management
│   │   ├── SongsManager.tsx   # Complex management for song uploads and tagging
│   │   └── TagsManager.tsx    # CRUD interface for vibe tag management
│   ├── AdminGuard.tsx         # Route protection component for admin access
│   ├── Background.tsx         # Global animated decorative background
│   ├── ClientLayout.tsx       # Client-side wrapper for providers and global UI
│   ├── HeroPlayer.tsx         # Main interactive audio player and visualizer on home page
│   ├── Leaderboard.tsx        # Ranking display for top listeners
│   ├── ListenerStats.tsx      # User-specific listening metrics display
│   ├── MenuSidebar.tsx        # Slide-out navigation and user profile menu
│   ├── Navbar.tsx             # Standard top navigation bar (for non-home pages)
│   ├── NowPlaying.tsx         # Current song metadata display with sync status
│   ├── RadioPlayer.tsx        # Minimal orb-style audio playback controller
│   ├── RhythmDebugger.tsx     # Visual overlay for debugging audio-rhythm synchronization
│   ├── ScrollableListeners.tsx # Marquee-style footer showing active listener names
│   ├── Search.tsx             # Text and vibe-based song search interface
│   ├── SongVisual.tsx         # Procedural or image-based song representation
│   └── ui
│       ├── GlassButton.tsx    # Reusable primary/secondary/ghost button with glass effect
│       ├── GlassCard.tsx      # Reusable container with glassmorphism styling
│       └── GlassModal.tsx     # Reusable animated modal dialog
├── contexts
│   ├── AuthContext.tsx        # Global state for user session and authentication
│   ├── PlaybackContext.tsx    # Global state for audio playback and sync reporting
│   └── SyncContext.tsx        # WebSocket-based real-time song and rhythm synchronization
└── lib
    ├── api.ts                 # Centralized API client and fetch wrapper
    ├── rhythm.ts              # Utility for decoding and decompiling rhythm data
    ├── types.ts               # Shared TypeScript interfaces and types
    └── utils.ts               # General-purpose utility functions (Tailwind merging)
```

## 2. File Inventory

| File Path | Description of Responsibilities |
| :--- | :--- |
| `src/app/admin/page.tsx` | Main entry point for the admin dashboard, coordinating management tabs and stats. |
| `src/app/globals.css` | Defines core design system variables and global utility classes. |
| `src/app/layout.tsx` | Standard Next.js root layout providing font initialization and body structure. |
| `src/app/login/page.tsx` | Handles user authentication input for existing accounts. |
| `src/app/page.tsx` | Assembles the public radio experience with the Hero Player and Sidebar. |
| `src/app/register/page.tsx` | Manages registration flow and account creation for new users. |
| `src/app/template.tsx` | Provides common entry animations for page transitions. |
| `src/components/ActiveListeners.tsx` | Fetches and displays a list of active users currently tuning in. |
| `src/components/admin/AlbumsManager.tsx` | Manages create, read, update, and delete operations for music albums. |
| `src/components/admin/ArtistsManager.tsx` | Manages create, read, update, and delete operations for music artists. |
| `src/components/admin/SongsManager.tsx` | Handles complex song uploads, metadata editing, and vibe-tag assignments. |
| `src/components/admin/TagsManager.tsx` | Manages the library of vibe tags used for procedural song searching. |
| `src/components/AdminGuard.tsx` | Ensures that the wrapped children are only rendered if the user is an admin. |
| `src/components/Background.tsx` | Renders an immersive, animated background with glossy orbs and gradients. |
| `src/components/ClientLayout.tsx` | Wraps the application in necessary React Context providers and global visuals. |
| `src/components/HeroPlayer.tsx` | Provides the central playback experience, including sync, progress, and visuals. |
| `src/components/Leaderboard.tsx` | Displays high-ranking users based on cumulative listening duration. |
| `src/components/ListenerStats.tsx` | Presents current session and lifetime listening durations for the logged-in user. |
| `src/components/MenuSidebar.tsx` | Slide-out navigation drawer containing main links, profile stats, and search triggers. |
| `src/components/Navbar.tsx` | Secondary navigation header used on administrative and auth-related pages. |
| `src/components/NowPlaying.tsx` | Displays the current track name and artist with real-time sync status. |
| `src/components/RadioPlayer.tsx` | Mini-player component providing basic play/pause and volume controls. |
| `src/components/RhythmDebugger.tsx` | Technical overlay used to verify that audio rhythm events match visual timing. |
| `src/components/ScrollableListeners.tsx` | Displays an infinite scrolling marquee of current listeners at the bottom of the screen. |
| `src/components/Search.tsx` | Interactive component for finding songs by name or via target vibe scores. |
| `src/components/SongVisual.tsx` | Generates a visual identity for songs using images or procedural gradients. |
| `src/components/ui/GlassButton.tsx` | Standardized button component implementing the project's glassmorphic design language. |
| `src/components/ui/GlassCard.tsx` | Reusable layout container with frosted glass styling and consistent padding. |
| `src/components/ui/GlassModal.tsx` | Foundational modal component used for search, login, and administrative forms. |
| `src/contexts/AuthContext.tsx` | Manages user session persistence, login/logout logic, and identity state. |
| `src/contexts/PlaybackContext.tsx` | Stores current playback state, volume, and coordinates server heartbeat reporting. |
| `src/contexts/SyncContext.tsx` | Handles WebSocket communication for instant cross-client song changes and rhythm events. |
| `src/lib/api.ts` | Pre-configured axios-like client for making authenticated requests to the backend. |
| `src/lib/rhythm.ts` | Specialized utility for transforming encoded server rhythm data into usable JSON. |
| `src/lib/types.ts` | Central repository for all shared TypeScript interfaces used across the project. |
| `src/lib/utils.ts` | Exposes common helper functions like Tailwind class merging (cn). |

## 3. Issues & Recommendations Report

### 🚨 Duplicated Logic & Components

*   **Admin Management Redundancy:** `AlbumsManager.tsx`, `ArtistsManager.tsx`, and `TagsManager.tsx` use the exact same logic for fetching, listing, editing, and deleting items.
    *   *Action:* Create a generic `AdminCRUDManager` higher-order component or hook to handle these operations centrally.
*   **Listener Data Polling:** `ActiveListeners.tsx` and `ScrollableListeners.tsx` both independently call `api.listeners.list()` every 10 seconds.
    *   *Action:* Move listener data management to `SyncContext.tsx` (via WebSocket) or a dedicated `ListenerProvider` to avoid redundant API pressure.
*   **Song Enrichment Duplication:** `NowPlaying.tsx` and `HeroPlayer.tsx` both duplicate the logic for fetching full song metadata (`api.songs.get`) when a song change event is received from the WebSocket.
    *   *Action:* Move "Enriched Song" logic into `SyncContext.tsx` so the entire app benefits from full metadata as soon as the song changes.
*   **Playback Calculation:** `HeroPlayer.tsx` and `RhythmDebugger.tsx` both duplicate complex logic for calculating absolute song position relative to the server's global clock.
    *   *Action:* Extract this calculation into a custom hook (e.g., `useSongProgress`) or keep it inside `PlaybackContext`.

### 🐘 Monolithic Files (Need Breakout)

*   **File:** `SongsManager.tsx` (424 lines)
    *   *Issue:* It contains its own complex sub-components (`SongUploadForm`), handles file upload state, manages a separate Tag Management modal, and handles listing logic.
    *   *Action:* Split `SongUploadForm` into its own file; extract the `TagManagementModal` into a dedicated component.
*   **File:** `HeroPlayer.tsx` (345 lines)
    *   *Issue:* Combines complex audio synchronization logic, autoplay blocker overlays, UI progress animations, and volume controls.
    *   *Action:* Extract `AutoplayBlocker` and `ProgressRing` into sub-components; move audio sync logic to a dedicated hook.
*   **File:** `Search.tsx` (222 lines)
    *   *Issue:* Handles two completely different search paradigms (Text and Vibe) along with result rendering and error handling.
    *   *Action:* Split into `TextSearch` and `VibeSearch` components with a shared result list.

### 🧹 Organization & Naming Suggestions

*   **Confusion Between Players:** `RadioPlayer.tsx` and `HeroPlayer.tsx` both handle audio playback but for slightly different UI contexts. The naming doesn't clarify which is the "primary" or if one is specialized.
    *   *Suggestion:* Rename `HeroPlayer` to `StationPlayer` and `RadioPlayer` to `MiniPlayer`.
*   **Component Folders:** There are many top-level components in `src/components`.
    *   *Suggestion:* Group related components into subfolders (e.g., `layout/`, `playback/`, `listeners/`, `admin/`) to improve discoverability.
*   **Type Sharing:** While `lib/types.ts` is good, many components still define local interfaces (e.g., `Album`, `Artist` in manager files) that should be centralized.
