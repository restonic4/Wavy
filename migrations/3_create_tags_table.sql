-- TAGS: The definitions (e.g., "Summer", "Fast Paced")
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);