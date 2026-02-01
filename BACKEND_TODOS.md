# Backend - Features & Suggestions (Frontend Team)

This document lists features that are currently missing from the Backend API or could be improved to enhance the Wavy Radio experience.

## 🔴 Missing / Required
- [x] **Album Art / Song Images**: Currently, there is no field for an image URL or binary image data for songs/albums. We need a way to fetch and display visual assets for the now-playing song. (The images should be stored the same way as the audios, the file named after the song id, it should get removed if the song is removed, etc, all necesary things.)
- [x] **Lifetime Listener Stats**: Logged-in users should have a `total_listen_time` field in the DB. We need endpoints to track and retrieve this data for leaderboard features.
- [x] **Search by Discovery (Vibe-only)**: Since this is a radio, we don't want a "skip" or "next" feature, but a search to browse the library (not play) is still useful for discovery.

## 🟡 Suggestions & Improvements
- [x] **Listener Ranking API**: An endpoint to get "Most Active Listeners" (sorted by a mix of current session time and lifetime time).
- [ ] **WebSockets for Status**: Instead of polling `/api/status` every second, a WebSocket would allow for instantaneous "Now Playing" and "Listener Joined" notifications.
- [x] **Time Tracking Improvements**: The `/api/heartbeat` should be used to increment lifetime listening stats on the backend.

## 🟢 Experimental
- [ ] **Song Likes/Hearts**: Allow users to "favorite" a song which could influence future radio rotations or just show up in their profile.
- [ ] **Static Image Fallbacks**: Until the backend supports images, the frontend will use a combination of generated templates or pattern-based visuals.

