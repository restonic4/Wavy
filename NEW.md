# New Backend Features (Listener Time Tracking)

We have implemented listener time tracking to support session and lifetime stats for users.

## 🕒 Listen Time Tracking

The `/api/heartbeat` endpoint now tracks and returns listen time statistics.

### **Endpoint: Post `/api/heartbeat`**

**Request Body:**
```json
{
  "connect_time": "2026-02-01T17:33:20Z",
  "played_seconds": 120.5
}
```

**Response:**
```json
{
  "status": "ok",
  "session_seconds": 360,
  "total_seconds": 5400,
  "username": "Listener_1234"
}
```

**Fields:**
- `session_seconds`: Total seconds listened during the current active session (since the first heartbeat).
- `total_seconds`: Lifetime total seconds listened for the user (stored in DB).
- `username`: The current user's name (authenticated or anonymous).

### **How it works:**
1. **Session Tracking**: The backend tracks when a user first connects and calculates `session_seconds` based on subsequent heartbeats.
2. **Persistence**: For logged-in users, the backend increments their `total_listen_time` in the database.
3. **Anti-Spam**: To avoid excessive database writes, updates are batched. The database is only updated every **30 seconds** of active listening.
4. **Anonymous Users**: Anonymous users also get `session_seconds` and a temporary `total_seconds` (which will be the same as session time if it's their first time), but their stats are not persisted in the database.

## 🖼️ Song Images (Album Art)

Songs now support optional album art/images.

### **Endpoint: Get `/songs/{id}/image`**

Returns the image for the specified song.

**Response:**
- `200 OK`: Returns the image binary (Content-Type: `image/png`).
- `404 Not Found`: If the song has no image.

### **Endpoint: Post `/songs/upload` (Updated)**

You can now upload an image along with the song file.

**Multipart Fields:**
- `file`: The audio file (.mp3).
- `image` (Optional): The image file (.png).
- `title`: Song title.
- `album_id` (Optional): ID of the album.
- `artist_ids` (Optional): Comma-separated list of artist IDs.

### **Metadata Changes**

The `Song` object now includes a `has_image` boolean field.

```json
{
  "id": 1,
  "title": "Song Title",
  "album_id": 101,
  "album_title": "Album Name",
  "artist_names": "Artist 1, Artist 2",
  "has_image": true
}
```

## 🔍 Search & Discovery

We've added ways to browse the library without playing, strictly for discovery.

### **Endpoint: Get `/songs?q={query}`**

Search for songs by title or artist name.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Song Title",
    "artist_names": "Artist 1, Artist 2",
    "album_title": "Album Name",
    "has_image": true
  }
]
```

### **Endpoint: Post `/tags/search`**

"Vibe" search. Allows searching songs based on their tag scores.

**Request Body:**
```json
[
  { "name": "Chill", "target_score": 0.8 },
  { "name": "Electronic", "target_score": 0.5 }
]
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Song Title",
    "artist_names": "Artist 1, Artist 2",
    "album_title": "Album Name",
    "has_image": true,
    "match_error": 0.04
  }
]
```

### **Endpoint: Get `/users/leaderboard`**

Returns the top 10 most active listeners based on total listening time.

**Response:**
```json
[
  {
    "id": 1,
    "username": "SuperFan",
    "role": "user",
    "total_listen_time": 10500,
    "artist_id": null
  },
  ...
]
```

## 🗄️ Database Changes
- Added `total_listen_time` (INTEGER, default 0) to the `users` table.
- Added `has_image` (BOOLEAN, default FALSE) to the `songs` table.

## 🚀 Future Improvements (Planned)
- [x] **Listener Ranking API**: An endpoint to retrieve users sorted by `total_listen_time`.
- [ ] **Session Recovery**: Allow users to recover session time if they refresh quickly.
