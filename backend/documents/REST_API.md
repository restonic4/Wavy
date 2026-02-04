# Wavy REST API Documentation

This document describes the REST API for the Wavy Radio backend.

## General Information

- **Base URL**: `/api`
- **Authentication**: Most endpoints require a session cookie.
- **Session Cookie**: `auth_session` (Private/Encrypted cookie).
- **Format**: All request and response bodies are in JSON unless specified otherwise.

---

## Streaming

Endpoints related to the audio stream and listener tracking.

### GET /api/stream
Returns a continuous MPEG audio stream. Uses a burst buffer for immediate playback.
- **Authentication**: Required.
- **Response**: `audio/mpeg` stream.

### POST /api/heartbeat
Updates the listener's last seen status and returns desync information. Should be called periodically (at least 1 each 20 seconds) by the client.
- **Authentication**: Required.
- **Body**:
  ```json
  {
    "client_position_ms": 1234
  }
  ```
  *(Note: `client_position_ms` is the current playback position in the client's audio element buffer)*
- **Response**:
  ```json
  {
    "desync_ms": 0
  }
  ```

### GET /api/listeners
Returns a list of currently active listeners.
- **Authentication**: Required.
- **Response**:
  ```json
  [
    {
      "username": "string",
      "connected_at": "2024-02-04T12:00:00Z",
      "listen_time_ms": 120000
    }
  ]
  ```

---

## Authentication & Users

### POST /api/auth/register
Registers a new user and automatically logs them in.
- **Body**:
  ```json
  {
    "username": "myuser",
    "password": "mypassword"
  }
  ```
- **Response**: `User` object.
- **Side Effect**: Sets `auth_session` cookie.

### POST /api/auth/login
Authenticates a user and starts a session.
- **Body**:
  ```json
  {
    "identity": "myuser",
    "password": "mypassword"
  }
  ```
- **Response**: `User` object.
- **Side Effect**: Sets `auth_session` cookie.

### POST /api/auth/logout
Clears the current session.
- **Response**: `200 OK`
- **Side Effect**: Removes `auth_session` cookie.

### GET /api/auth/me
Returns information about the currently logged-in user.
- **Authentication**: Required.
- **Response**: `User` object.

### GET /api/users/leaderboard
Returns the top listeners based on their total listening time.
- **Response**: List of `User` objects.

### POST /api/users/{id}
Updates a user's information.
- **Authentication**: Required (Admin or Self).
- **Body** (all fields optional):
  ```json
  {
    "username": "newname",
    "password": "newpassword",
    "artist_id": 1,
    "role": "admin"
  }
  ```
- **Response**: Updated `User` object.
- **Restrictions**: `role` can only be updated by Admins.

### DELETE /api/users/{id}
Deletes a user.
- **Authentication**: Required (Admin or Self).
- **Response**: `204 No Content`.

#### User Object Schema
```json
{
  "id": 1,
  "username": "string",
  "artist_id": null,
  "role": "user",
  "total_listen_time": 0
}
```

---

## Artists

### GET /api/artists
Lists all artists.
- **Response**: List of `Artist` objects.

### GET /api/artists/{id}
Gets a specific artist.
- **Response**: `Artist` object.

### POST /api/artists
Creates a new artist.
- **Authentication**: Admin Only.
- **Body**: `{ "name": "Artist Name" }`
- **Response**: `Artist` object.

### POST /api/artists/{id}
Updates an artist.
- **Authentication**: Admin Only.
- **Body**: `{ "name": "New Name" }`
- **Response**: `Artist` object.

### DELETE /api/artists/{id}
Deletes an artist.
- **Authentication**: Admin Only.
- **Response**: `204 No Content`.

#### Artist Object Schema
```json
{
  "id": 1,
  "name": "string"
}
```

---

## Albums

### GET /api/albums
Lists all albums.
- **Response**: List of `Album` objects.

### GET /api/albums/{id}
Gets a specific album.
- **Response**: `Album` object.

### POST /api/albums
Creates a new album.
- **Authentication**: Admin Only.
- **Body**: `{ "title": "Album Title" }`
- **Response**: `Album` object.

### POST /api/albums/{id}
Updates an album.
- **Authentication**: Admin Only.
- **Body**: `{ "title": "New Title" }`
- **Response**: `Album` object.

### DELETE /api/albums/{id}
Deletes an album.
- **Authentication**: Admin Only.
- **Response**: `204 No Content`.

#### Album Object Schema
```json
{
  "id": 1,
  "title": "string"
}
```

---

## Songs

### GET /api/songs
Lists all songs.
- **Query Parameters**:
  - `q`: (Optional) Search query for song title.
- **Response**: List of `Song` objects.

### GET /api/songs/{id}
Gets a specific song.
- **Response**: `Song` object.

### GET /api/songs/{id}/image
Returns the cover art for the song.
- **Response**: `image/png` binary.

### POST /api/songs
Creates song metadata.
- **Authentication**: Admin Only.
- **Body**:
  ```json
  {
    "title": "Song Title",
    "album_id": 1,
    "artist_ids": [1, 2]
  }
  ```
- **Response**: `Song` object.

### POST /api/songs/upload
Uploads a song file and associated metadata.
- **Authentication**: Admin Only.
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: (Required) The MP3 file.
  - `image`: (Optional) Cover art image (PNG/JPG).
  - `title`: (Required) Song title.
  - `album_id`: (Optional) ID of the album.
  - `artist_ids`: (Optional) Comma-separated list of artist IDs.
- **Response**:
  ```json
  {
    "song_id": 1,
    "message": "Song '...' uploaded successfully"
  }
  ```

### POST /api/songs/{id}
Updates song metadata.
- **Authentication**: Admin Only.
- **Body** (all fields optional):
  ```json
  {
    "title": "New Title",
    "album_id": 1,
    "artist_ids": [1]
  }
  ```
- **Response**: Updated `Song` object.

### DELETE /api/songs/{id}
Deletes a song and its associated files.
- **Authentication**: Admin Only.
- **Response**: `204 No Content`.

#### Song Object Schema
```json
{
  "id": 1,
  "title": "string",
  "album_id": 1,
  "album_title": "string",
  "artist_names": "Artist 1, Artist 2"
}
```

---

## Tags & Recommendation

### GET /api/tags
Lists all available vibe tags.
- **Response**: List of `Tag` objects.

### GET /api/tags/{id}
Gets a specific tag.
- **Response**: `Tag` object.

### POST /api/tags
Creates a new tag.
- **Authentication**: Admin Only.
- **Body**: `{ "name": "Vibe Name" }`
- **Response**: `Tag` object.

### POST /api/tags/{id}
Updates a tag.
- **Authentication**: Admin Only.
- **Body**: `{ "name": "New Name" }`
- **Response**: `Tag` object.

### DELETE /api/tags/{id}
Deletes a tag.
- **Authentication**: Admin Only.
- **Response**: `204 No Content`.

### POST /api/tags/search
Searches for songs based on a vibe vector.
- **Body**:
  ```json
  [
    { "name": "Relaxing", "target_score": 0.8 },
    { "name": "Electronic", "target_score": 0.3 }
  ]
  ```
- **Response**:
  ```json
  [
    {
      "id": 1,
      "title": "Chill Song",
      "artist_names": "Lofi Artist",
      "album_title": "Relaxing Beats",
      "match_error": 0.05
    }
  ]
  ```
  *(Note: `match_error` indicates how far the song is from the requested vibe. Lower is better)*

### GET /api/songs/{song_id}/tags
Lists the tags assigned to a specific song.
- **Response**:
  ```json
  [
    {
      "tag_id": 1,
      "name": "Relaxing",
      "score": 0.9
    }
  ]
  ```

### POST /api/songs/{song_id}/tags
Assigns a tag to a song or updates its score.
- **Authentication**: Admin Only.
- **Body**:
  ```json
  {
    "tag_id": 1,
    "score": 0.85
  }
  ```
- **Response**: `200 OK`.

### DELETE /api/songs/{song_id}/tags/{tag_id}
Removes a tag from a song.
- **Authentication**: Admin Only.
- **Response**: `204 No Content`.