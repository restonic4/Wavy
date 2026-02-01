# Song Upload & Cookie-Based Authentication

## Overview

This document describes the production-ready features for the Wavy Radio streaming system:

1. **Admin Song Upload** - File upload endpoint with automatic conversion
2. **Cookie-Based Listener Authentication** - Secure authentication using HTTP-only cookies

## 1. Song Upload System

### Endpoint

```
POST /songs/upload
Content-Type: multipart/form-data
Authorization: Required (Admin role only via cookie)
```

### Request

**Form Fields:**
- `file` (required): Audio file in any format
- `title` (required): Song title
- `album_id` (optional): Album ID to associate with

### Response

```json
{
  "song_id": 123,
  "message": "Song 'My Song' uploaded successfully"
}
```

### Process Flow

1. **Upload**: Admin uploads audio file via multipart form
2. **Database Entry**: Song record created with temporary data
3. **Save Raw**: File saved to `raw_songs/{song_id}.raw`
4. **Convert**: `convert.sh` script converts to `data/{song_id}.mp3`
   - Converts to 44.1kHz, stereo, 192kbps MP3
   - Removes video/album art
   - Optimized for streaming
5. **Cleanup**: Raw file deleted after successful conversion
6. **Return ID**: Frontend receives `song_id` for metadata updates

### Frontend Integration Example

```typescript
// Next.js/React
const uploadSong = async (file: File, title: string, albumId?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  if (albumId) formData.append('album_id', albumId.toString());

  const res = await fetch('/songs/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include' // IMPORTANT: Sends auth cookie
  });

  if (!res.ok) throw new Error(await res.text());
  
  const { song_id } = await res.json();
  return song_id;
};
```

## 2. Cookie-Based Listener Authentication

### Overview

**Authentication is 100% cookie-based:**
- ✅ Authenticated users identified by HTTP-only session cookie
- ✅ Anonymous listeners allowed (no cookie = anonymous)
- ✅ Frontend never sends username - server determines identity from cookie
- ✅ Secure, cannot be spoofed

### How It Works

1. **User Logs In**: Server sets HTTP-only cookie with user ID
2. **Heartbeat Sent**: Client sends heartbeat (no username in payload)
3. **Server Checks Cookie**: 
   - Cookie exists + valid → Authenticated user (username from database)
   - No cookie or invalid → Anonymous listener (auto-generated name)
4. **Response**: `is_authenticated` flag indicates auth status

### Updated Listener Model

```rust
pub struct Listener {
    pub username: String,           // From DB if authenticated, or "Listener_1234"
    pub current_song_id: u64,
    pub drift_seconds: f64,
    pub last_seen: DateTime<Utc>,
    pub is_authenticated: bool,     // true if cookie valid
}
```

### API: Heartbeat (Updated)

```
POST /api/heartbeat
Content-Type: application/json
Cookie: auth_session=<encrypted-user-id> (optional)

Body:
{
  "connect_time": "2026-02-01T12:00:00Z",
  "played_seconds": 42.5
}

Note: NO username in payload!
      Server reads cookie to determine identity
```

### API: Status Response

```json
{
  "history": [...],
  "listeners": [
    {
      "username": "john_doe",           // From database
      "is_authenticated": true,         // Cookie was valid
      "current_song_id": 42,
      "drift_seconds": 0.15,
      "last_seen": "2026-02-01T12:00:00Z"
    },
    {
      "username": "Listener_5432",      // Auto-generated
      "is_authenticated": false,        // No cookie
      "current_song_id": 42,
      "drift_seconds": 0.23,
      "last_seen": "2026-02-01T12:00:00Z"
    }
  ],
  "server_time": "2026-02-01T12:00:00Z"
}
```

### Frontend Integration Example

```typescript
// Next.js/React - Heartbeat
const sendHeartbeat = async (connectTime: string, playedSeconds: number) => {
  await fetch('/api/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT: Sends cookie
    body: JSON.stringify({
      connect_time: connectTime,
      played_seconds: playedSeconds
      // NO username field!
    })
  });
};

// Listener Display Component
interface Listener {
  username: string;
  current_song_id: number;
  drift_seconds: number;
  last_seen: string;
  is_authenticated: boolean;
}

const ListenerBadge = ({ listener }: { listener: Listener }) => (
  <div className="flex items-center gap-2">
    <span className="font-semibold">{listener.username}</span>
    {listener.is_authenticated ? (
      <Badge variant="primary" className="bg-blue-500">
        ✓ User
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-500">
        Anonymous
      </Badge>
    )}
  </div>
);
```

## 3. Authentication Flow

### Register

```
POST /auth/register
Body: { "username": "user", "password": "pass" }
Response: Sets HTTP-only cookie, returns user object
```

### Login

```
POST /auth/login
Body: { "identity": "user", "password": "pass" }
Response: Sets HTTP-only cookie, returns user object
```

### Logout

```
POST /auth/logout
Response: Clears cookie
```

### Check Current User

```
GET /auth/me
Response: Current user object (or 401 if not logged in)
```

### Frontend Example

```typescript
// Login
const login = async (username: string, password: string) => {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT
    body: JSON.stringify({ identity: username, password })
  });

  if (!res.ok) throw new Error('Invalid credentials');
  
  const user = await res.json();
  return user;
};

// Check if logged in
const checkAuth = async () => {
  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    return null;
  }
};
```

## 4. Demo Page

A complete working demo is available at `web.html` showing:

- ✅ Register/Login forms
- ✅ Cookie-based authentication
- ✅ Song upload (admin only)
- ✅ Live listener tracking with auth badges
- ✅ Complete API documentation
- ✅ Integration examples for Next.js/React

### Viewing the Demo

1. Start the server: `cargo run`
2. Open browser to: `http://localhost:3000/web.html`
3. Register a new account or login
4. Start listening to see yourself in the listener list
5. If admin, upload songs

## 5. Complete API Reference

### Authentication Endpoints

```
POST /auth/register       - Register new user (sets cookie)
POST /auth/login          - Login (sets cookie)
POST /auth/logout         - Logout (clears cookie)
GET  /auth/me             - Get current user (requires cookie)
```

### Song Management Endpoints

```
GET    /songs             - List all songs (public)
POST   /songs             - Create song metadata (admin, requires cookie)
POST   /songs/upload      - Upload audio file (admin, requires cookie)
GET    /songs/{id}        - Get song details (public)
POST   /songs/{id}        - Update song (admin, requires cookie)
DELETE /songs/{id}        - Delete song (admin, requires cookie)
```

### Streaming Endpoints

```
GET  /stream              - MP3 audio stream
POST /api/heartbeat       - Send listener heartbeat (cookie optional)
GET  /api/status          - Get listeners + history
```

## 6. Security Considerations

### Cookie-Based Auth
- ✅ HTTP-only cookies (JavaScript cannot access)
- ✅ Encrypted with AES-256 (axum-extra PrivateCookieJar)
- ✅ SameSite=Lax (CSRF protection)
- ✅ 30-day expiration
- ✅ Cannot be spoofed by client

### Upload Endpoint
- ✅ Admin-only access via cookie validation
- ✅ File validation (audio types only)
- ✅ Automatic cleanup on failure
- ✅ Isolated raw file storage

### Anonymous Listeners
- ✅ Fully supported (no cookie required)
- ✅ Auto-generated usernames
- ✅ No security implications
- ✅ Cannot impersonate authenticated users

## 7. Production Deployment

### Requirements
- FFmpeg installed on server
- `convert.sh` executable permissions
- Writable `raw_songs/` and `data/` directories
- SQLite database with proper migrations

### Environment Variables
```env
DATABASE_URL=sqlite:radio.db
COOKIE_KEY=<base64-encoded-64-byte-key>
```

Generate cookie key:
```bash
openssl rand -base64 64
```

### Recommended Nginx Config
```nginx
location /songs/upload {
    client_max_body_size 100M;
    proxy_pass http://localhost:3000;
    proxy_read_timeout 300s;
}

# Ensure cookies are passed
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Cookie $http_cookie;
}
```

## 8. Testing

### Test Upload
```bash
# First login to get cookie
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin","password":"password"}'

# Then upload
curl -b cookies.txt -X POST http://localhost:3000/songs/upload \
  -F "file=@test.mp3" \
  -F "title=Test Song"
```

### Test Listener Auth
```bash
# Check listener authentication status
curl http://localhost:3000/api/status | jq '.listeners[] | {username, is_authenticated}'
```

## 9. Key Differences from Previous Version

### ❌ Old (Incorrect) Approach
- Client sent username in heartbeat
- Server trusted client-provided username
- Could be spoofed

### ✅ New (Correct) Approach
- Client sends NO username
- Server reads encrypted cookie
- Cannot be spoofed
- Anonymous listeners auto-named

## 10. Frontend Developer Checklist

- ✅ Always use `credentials: 'include'` in fetch calls
- ✅ Never send username in heartbeat
- ✅ Check `/auth/me` on app load to detect existing session
- ✅ Display auth badges based on `is_authenticated` field
- ✅ Show upload UI only if `user.role === 'admin'`
- ✅ Handle 401 responses (redirect to login)

## 11. Support

For questions or issues:
- Check `web.html` for working examples
- Review this documentation
- Test endpoints with provided curl examples
- All authentication is cookie-based - no manual username handling needed!
