'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { PlaybackStats } from '@/lib/types';

interface PlaybackContextType {
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    stats: PlaybackStats | null;
    connectTime: string | null;
}

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider = ({ children }: { children: React.ReactNode }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [stats, setStats] = useState<PlaybackStats | null>(null);
    const [connectTime, setConnectTime] = useState<string | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const sendHeartbeat = async (explicitConnectTime?: string) => {
        const timeToUse = explicitConnectTime || connectTime;
        if (!timeToUse) return;

        const playedSeconds = startTimeRef.current
            ? (Date.now() - startTimeRef.current) / 1000
            : 0;

        try {
            const data = await api.status.heartbeat({
                connect_time: timeToUse,
                played_seconds: playedSeconds
            });
            setStats(data);
        } catch (err) {
            console.error("Heartbeat failed:", err);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            const now = new Date().toISOString();
            setConnectTime(now);
            startTimeRef.current = Date.now();

            // Send heartbeat every 20 seconds
            heartbeatIntervalRef.current = setInterval(() => sendHeartbeat(now), 20000);

            // Send one immediately
            sendHeartbeat(now);
        } else {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
            // Reset connect time when stopped? 
            // The backend uses session tracking, so if we stop and start, it's a new "listen segment"
            // but the backend handles it via connect_time.
            setConnectTime(null);
            startTimeRef.current = null;
        }

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, [isPlaying]);

    return (
        <PlaybackContext.Provider value={{ isPlaying, setIsPlaying, stats, connectTime }}>
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
