# Wavy Radio - REST API Documentation

This document provides a comprehensive guide to the Wavy Radio REST API. 

## 🔐 Authentication
All sensitive operations require the user to be logged in with a valid session cookie.

### Register
`POST /auth/register`
- **Body:** `{ "username": "string", "password": "string" }`
- **Response:** `200 OK` (User object + sets HTTP-only session cookie)

### Login
`POST /auth/login`
- **Body:** `{ "identity": "string", "password": "string" }`
- **Response:** `200 OK` (User object + sets HTTP-only session cookie)

### Logout
`POST /auth/logout`
- **Response:** `200 OK` (Clears session cookie)

### Get Current User
`GET /auth/me`
- **Response:** `200 OK` (User object) or `401 Unauthorized`

---

## 🎵 Song Management

### List Songs
`GET /songs`
- **Response:** `Vec<Song>`
```json
[
  {
    "id": 1,
    "title": "Summer Vibe",
    "album_id": 10,
    "album_title": "Summer Hits 2026",
    "artist_names": "Cool Band, DJ Wave"
  }
]
```

### Get Song Details
`GET /songs/{id}`
- **Response:** `Song` object

### Create Song Metadata (Admin Only)
`POST /songs`
- **Body:**
```json
{
  "title": "New Song",
  "album_id": 10,
  "artist_ids": [1, 2]
}
```

### Upload Audio File (Admin Only)
`POST /songs/upload`
- **Content-Type:** `multipart/form-data`
- **Fields:**
    - `file`: Audio file (mp3, wav, etc.)
    - `title`: string
    - `artist_ids`: string (comma-separated, e.g., "1,2")
    - `album_id`: number (optional)

### Update Song (Admin Only)
`POST /songs/{id}`
- **Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "album_id": 11,
  "artist_ids": [3]
}
```

### Delete Song (Admin Only)
`DELETE /songs/{id}`
- **Response:** `200 OK` (Removes song from DB and deletes local MP3 file)

---

## 👨‍🎤 Artist Management

### List Artists
`GET /artists`
- **Response:** `Vec<Artist>`

### Create Artist (Admin Only)
`POST /artists`
- **Body:** `{ "name": "string" }`

### Update Artist (Admin Only)
`POST /artists/{id}`
- **Body:** `{ "name": "string" }`

### Delete Artist (Admin Only)
`DELETE /artists/{id}`
- **Note:** Deleting an artist will nullify the `artist_id` for related users and remove links in `song_artists`.

---

## 💿 Album Management

### List Albums
`GET /albums`
- **Response:** `Vec<Album>`

### Create Album (Admin Only)
`POST /albums`
- **Body:** `{ "title": "string" }`

### Update Album (Admin Only)
`POST /albums/{id}`
- **Body:** `{ "title": "string" }`

### Delete Album (Admin Only)
`DELETE /albums/{id}`
- **Note:** Deleting an album will nullify the `album_id` for related songs.

---

## 🏷️ Tag Management & Search

### List All Tags
`GET /tags`
- **Response:** `Vec<Tag>`

### Create Tag (Admin Only)
`POST /tags`
- **Body:** `{ "name": "string" }`

### Update Tag (Admin Only)
`POST /tags/{id}`
- **Body:** `{ "name": "string" }`

### Delete Tag (Admin Only)
`DELETE /tags/{id}`
- **Note:** Deleting a tag triggers a CASCADE delete of all song scoring associations for that tag.

### Vector Search (Song Discovery)
`POST /tags/search`
- **Description:** Finds songs that closest match a specific "vibe" vector.
- **Body:** `Vec<TagRequest>`
```json
[
  { "name": "Chill", "target_score": 0.9 },
  { "name": "Electronic", "target_score": 0.2 }
]
```
- **Response:** `Vec<SongSearchResult>` (Sorted by lowest `match_error`)

### Manage Song Tags (Admin Only)
- **List tags for a song:** `GET /songs/{id}/tags`
- **Assign/Update tag score:** `POST /songs/{id}/tags`
    - **Body:** `{ "tag_id": number, "score": 0.0-1.0 }`
- **Remove tag from song:** `DELETE /songs/{id}/tags/{tag_id}`

---

## 📡 Streaming & Live Status

### Audio Stream
`GET /stream`
- **Response:** Infinite MP3 audio stream. 
- Supports burst buffering (starts with ~3s of audio instantly).

### Heartbeat
`POST /api/heartbeat`
- **Description:** Keeps the listener session alive and tracks drift.
- **Body:** `{ "connect_time": "ISO-Date", "played_seconds": number }`

### Server Status
`GET /api/status`
- **Response:** Current history and active listeners.
- **Anonymous Listeners:** Automatically identified and tracked if no session cookie is present.

---

## 🛠️ Developer Integration Tips
- **Cookies:** Ensure your fetch calls use `credentials: 'include'`.
- **Admin Access:** Check the `role` field in the user object from `/auth/me` to enable/disable admin UI.
- **Errors:** Handlers return descriptive error strings on failure (4xx/5xx).
