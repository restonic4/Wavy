'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Song, ServerStatus } from '@/lib/types';
import { GlassCard } from './ui/GlassCard';
import { Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongVisual } from './SongVisual';
import { useSync } from '@/contexts/SyncContext';

export const NowPlaying = () => {
    const { currentSong: syncSong, isConnected } = useSync();
    const [listeners, setListeners] = useState<any[]>([]);
    const [enrichedSong, setEnrichedSong] = useState<Song | null>(null);

    // Still fetch status occasionally for listeners count
    const fetchStatus = async () => {
        try {
            const data = await api.listeners.list();
            setListeners(data);
        } catch (err) {
            console.error("Failed to fetch listeners:", err);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // Effect to enrich song data whenever the sync song changes
    useEffect(() => {
        if (!syncSong) {
            setEnrichedSong(null);
            return;
        }

        console.log('[NowPlaying] Enriching song with ID:', syncSong.id);
        const enrich = async () => {
            try {
                const fullSong = await api.songs.get(syncSong.id);
                console.log('[NowPlaying] Enriched song:', fullSong);
                setEnrichedSong(fullSong);
            } catch (err) {
                console.error("Failed to fetch song details for enrichment:", err);
                // Fallback to sync metadata
                setEnrichedSong({
                    id: syncSong.id,
                    title: syncSong.title,
                    artist_names: syncSong.artist_names || 'Unknown Artist',
                    album_title: syncSong.album_title,
                    has_image: true, // Optimistic
                } as Song);
            }
        };

        enrich();
    }, [syncSong]);

    const currentSong = enrichedSong;
    const loading = !isConnected && !currentSong;

    return (
        <GlassCard className="min-w-[300px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-sky-500/20 rounded-xl">
                    <Music2 className="w-4 h-4 text-sky-600" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-900/40">Now Playing</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="w-16 h-16 rounded-xl bg-sky-200/20 animate-pulse" />
                        <div className="space-y-2">
                            <div className="w-32 h-4 bg-sky-200/20 animate-pulse rounded" />
                            <div className="w-24 h-3 bg-sky-200/20 animate-pulse rounded" />
                        </div>
                    </motion.div>
                ) : currentSong ? (
                    <motion.div
                        key={currentSong.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-4"
                    >
                        <SongVisual
                            songId={currentSong.id}
                            title={currentSong.title}
                            hasImage={currentSong.has_image}
                            className="w-16 h-16 shadow-lg shadow-sky-200"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg leading-tight text-sky-900 truncate">{currentSong.title}</h3>
                            <p className="text-sm text-sky-900/70 truncate">{currentSong.artist_names}</p>
                            {currentSong.album_title && (
                                <p className="text-xs text-sky-900/40 mt-1 italic truncate">{currentSong.album_title}</p>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.p
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm italic opacity-50"
                    >
                        Silence is golden... (No songs in history)
                    </motion.p>
                )}
            </AnimatePresence>

            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-40">
                <span>Live Listeners</span>
                <span>{listeners.length}</span>
            </div>
        </GlassCard>
    );
};
