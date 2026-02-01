-- LINKS SONGS <-> TAGS (0 to N relationships with Score)
-- This is where the 0.0 - 1.0 logic lives
CREATE TABLE song_tags (
    song_id INTEGER,
    tag_id INTEGER,
    score REAL CHECK(score >= 0 AND score <= 1), -- Enforces 0.0 to 1.0 range
    PRIMARY KEY (song_id, tag_id),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Index to speed up the "slider" search (finding scores > 0.5 etc)
CREATE INDEX idx_song_tags_score ON song_tags(score);