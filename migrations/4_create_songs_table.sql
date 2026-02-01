-- SONGS: The main metadata
-- Note: 'id' is used as the filename (e.g., 104.mp3)
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    album_id INTEGER, -- Optional: Can be NULL
    FOREIGN KEY (album_id) REFERENCES albums(id)
);