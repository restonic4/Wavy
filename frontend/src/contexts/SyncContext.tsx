'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { CurrentSong, StationEvent } from '@/lib/types';
import { useAuth } from './AuthContext';
import { decompileRhythm } from '@/lib/rhythm';

export interface RhythmEvent {
    time: number;
    identifier: string;
}

interface SyncContextType {
    currentSong: CurrentSong | null;
    isConnected: boolean;
    rhythmEvents: RhythmEvent[];
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [currentSong, setCurrentSong] = useState<CurrentSong | null>(null);
    const [rhythmEvents, setRhythmEvents] = useState<RhythmEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        if (!user) return;

        const wsUrl = api.getWsUrl();
        console.log('[Sync] Connecting to WebSocket:', wsUrl);

        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
            console.log('[Sync] WebSocket Connected');
            setIsConnected(true);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        socket.onmessage = (event) => {
            try {
                const stationEvent: StationEvent = JSON.parse(event.data);
                if (stationEvent.type === 'SongChange') {
                    console.log('[Sync] New song:', stationEvent.data);
                    setCurrentSong(stationEvent.data);
                }
            } catch (err) {
                console.error('[Sync] Failed to parse message:', err);
            }
        };

        socket.onclose = () => {
            console.log('[Sync] WebSocket Closed, reconnecting...');
            setIsConnected(false);
            wsRef.current = null;
            if (user) {
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            }
        };

        socket.onerror = (err) => {
            console.error('[Sync] WebSocket Error:', err);
            socket.close();
        };
    };

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setIsConnected(false);
            if (wsRef.current) wsRef.current.close();
            return;
        }

        // Initial fetch to get the state immediately
        api.status.currentSong().then(song => {
            if (song) setCurrentSong(song);
        }).catch(err => {
            console.error('[Sync] Initial song fetch failed:', err);
        });

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [user, authLoading]);

    useEffect(() => {
        if (currentSong?.rhythm_data) {
            console.log('[Sync] Rhythm data detected, decompiling...');
            decompileRhythm(currentSong.rhythm_data).then(data => {
                console.log('[Sync] Decompiled rhythm JSON:', data);
                if (Array.isArray(data)) {
                    const sorted = [...data].sort((a, b) => a.time - b.time);
                    setRhythmEvents(sorted as RhythmEvent[]);
                } else {
                    setRhythmEvents([]);
                }
            }).catch(err => {
                console.error('[Sync] Failed to decompile rhythm:', err);
                setRhythmEvents([]);
            });
        } else {
            setRhythmEvents([]);
        }
    }, [currentSong]);

    return (
        <SyncContext.Provider value={{ currentSong, isConnected, rhythmEvents }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
