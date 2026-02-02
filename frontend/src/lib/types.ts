
export interface Song {
    id: number;
    title: string;
    artist_names: string;
    album_title?: string;
    album_id?: number;
    has_image: boolean;
    match_error?: number; // For vibe search
}

export interface PlaybackStats {
    session_seconds: number;
    total_seconds: number;
    username: string;
}

export interface ServerStatus {
    history: Song[];
    listeners: number | any[]; // Backend might return count or list
}

export interface VibeTag {
    name: string;
    target_score: number;
}

export interface User {
    id: number;
    username: string;
    role: string;
    total_listen_time: number;
    artist_id?: number | null;
}
