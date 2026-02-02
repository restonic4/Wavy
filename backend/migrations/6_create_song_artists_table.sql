-- LINKS SONGS <-> ARTISTS (0 to N relationships)
-- Allows "Feat." artists or collaborations
CREATE TABLE song_artists (
    song_id INTEGER,
    artist_id INTEGER,
    PRIMARY KEY (song_id, artist_id),
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);