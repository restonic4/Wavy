'use client';

import React, { createContext, useContext, useState } from 'react';
import { api } from '@/lib/api';

interface SyncStatus {
    desync_ms: number;
    server_position_ms: number;
    client_base_pos_ms: number;
}

interface PlaybackContextType {
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    syncStatus: SyncStatus | null;
    reportProgress: (positionMs: number) => Promise<void>;
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider = ({ children }: { children: React.ReactNode }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const reportProgress = async (positionMs: number) => {
        try {
            const data = await api.status.heartbeat(Math.floor(positionMs));
            setSyncStatus(data);
        } catch (err) {
            console.error("Heartbeat failed:", err);
        }
    };

    return (
        <PlaybackContext.Provider value={{ isPlaying, setIsPlaying, syncStatus, reportProgress, audioRef }}>
            {children}
        </PlaybackContext.Provider>
    );
};

export const usePlayback = () => {
    const context = useContext(PlaybackContext);
    if (context === undefined) {
        throw new Error('usePlayback must be used within a PlaybackProvider');
    }
    return context;
};
