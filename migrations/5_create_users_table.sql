CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    artist_id INTEGER,
    role TEXT NOT NULL DEFAULT 'user', -- 'user', 'minimod', 'mod', 'admin'
    FOREIGN KEY (artist_id) REFERENCES artists(id)
);