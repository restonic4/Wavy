'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Song, ServerStatus } from '@/lib/types';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongVisual } from './SongVisual';
import { usePlayback } from '@/contexts/PlaybackContext';
import { cn } from '@/lib/utils';

export const HeroPlayer = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setIsPlaying } = usePlayback();
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [status, setStatus] = useState<ServerStatus | null>(null);
    const [enrichedSong, setEnrichedSong] = useState<Song | null>(null);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [currentSongId, setCurrentSongId] = useState<number | null>(null);
    const prevSongIdRef = useRef<number | null>(null);

    // Fetch Status & Song Logic (Reused from NowPlaying)
    const fetchStatus = React.useCallback(async () => {
        try {
            const data = await api.status.get();
            setStatus(data);

            // History comes in OLDEST FIRST, so the LAST item is the currently playing song
            const newSongId = data?.history && data.history.length > 0
                ? data.history[data.history.length - 1].id
                : null;

            if (newSongId !== prevSongIdRef.current) {
                console.log('Song changed from', prevSongIdRef.current, 'to', newSongId);
                prevSongIdRef.current = newSongId;
                setCurrentSongId(newSongId);
            }
        } catch (err) {
            console.error("Failed to fetch status:", err);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Enrich song data whenever currentSongId changes
    useEffect(() => {
        if (!currentSongId) {
            setEnrichedSong(null);
            return;
        }

        console.log('Enriching song with ID:', currentSongId);
        const enrich = async () => {
            try {
                const fullSong = await api.songs.get(currentSongId);
                console.log('Enriched song:', fullSong);
                setEnrichedSong(fullSong);
            } catch (err) {
                console.error("Failed to enrich song:", err);
                // Fallback - get the last item from history
                const fallback = status?.history && status.history.length > 0
                    ? status.history[status.history.length - 1]
                    : null;
                setEnrichedSong(fallback);
            }
        };
        enrich();
    }, [currentSongId, status]);

    const currentSong = enrichedSong || (status?.history && status.history.length > 0 ? status.history[status.history.length - 1] : null);

    // Audio Logic
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.src = api.streamUrl;

        // Attempt Autoplay
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    setIsPlaying(true);
                    setAutoplayBlocked(false);
                })
                .catch((error) => {
                    console.log("Autoplay prevented:", error);
                    setAutoplayBlocked(true);
                    setIsPlaying(false);
                });
        }

        const handleError = () => {
            setIsPlaying(false);
            // Retry or show error? For now, we rely on user re-clicking if stream breaks logic
            // But we treat it similar to autoplay block to get them back
            setAutoplayBlocked(true);
        };

        audio.addEventListener('error', handleError);
        return () => audio.removeEventListener('error', handleError);
    }, []); // Run once on mount

    // Volume Logic
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const handleManualStart = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setAutoplayBlocked(false);
                setIsPlaying(true);
                // Trigger an immediate fetch to ensure UI updates ASAP
                fetchStatus();
            }).catch(console.error);
        }
    };

    return (
        <div className="relative w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 p-8">
            <audio ref={audioRef} crossOrigin="anonymous" loop={false} />

            {/* Left: The Orb */}
            <div className="relative group shrink-0">
                {/* Visual Rings */}
                <AnimatePresence>
                    {isPlaying && (
                        <>
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.4, opacity: 0 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                                className="absolute inset-0 rounded-full border-2 border-sky-400/30 -z-10"
                            />
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.6, opacity: 0 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
                                className="absolute inset-0 rounded-full border-2 border-sky-300/20 -z-10"
                            />
                        </>
                    )}
                </AnimatePresence>

                <div className={cn(
                    "w-64 h-64 md:w-96 md:h-96 rounded-full relative z-10 p-2 bg-gradient-to-br from-white/40 to-sky-300/10 backdrop-blur-md border border-white/40 shadow-2xl transition-all duration-700",
                    isPlaying ? "shadow-[0_0_80px_rgba(14,165,233,0.4)]" : "shadow-xl"
                )}>
                    <SongVisual
                        songId={currentSong?.id}
                        title={currentSong?.title}
                        hasImage={currentSong?.has_image}
                        className="w-full h-full rounded-full shadow-inner"
                    />

                    {/* Gloss Overlay */}
                    <div className="absolute top-[5%] left-[10%] w-[80%] h-[40%] bg-gradient-to-b from-white/30 to-transparent rounded-[100%] pointer-events-none" />
                </div>
            </div>

            {/* Right: Info & Controls */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 max-w-xl">
                <AnimatePresence mode="wait">
                    {currentSong ? (
                        <motion.div
                            key={currentSong.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-2"
                        >
                            <h1 className="text-4xl md:text-6xl font-black text-sky-900 tracking-tighter leading-none drop-shadow-sm">
                                {currentSong.title}
                            </h1>
                            <h2 className="text-2xl md:text-4xl font-light text-sky-800/80 tracking-wide">
                                {currentSong.artist_names}
                            </h2>
                            {currentSong.album_title && (
                                <h3 className="text-lg md:text-2xl text-sky-900/40 italic font-serif">
                                    {currentSong.album_title}
                                </h3>
                            )}
                        </motion.div>
                    ) : status ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-2 opacity-60"
                        >
                            <h2 className="text-2xl font-bold text-sky-900/40">Waiting for next song...</h2>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            <div className="w-64 h-12 bg-sky-900/5 rounded-xl animate-pulse" />
                            <div className="w-48 h-8 bg-sky-900/5 rounded-xl animate-pulse" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Controls */}
                <div className="flex items-center gap-6 pt-4 bg-white/30 p-4 rounded-full backdrop-blur-md border border-white/40 shadow-lg mt-4">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 rounded-full hover:bg-white/40 text-sky-800 transition-colors"
                    >
                        {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>

                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-32 md:w-48 h-2 bg-sky-900/10 rounded-lg appearance-none cursor-pointer"
                    />

                    <div className="text-xs font-bold text-sky-900/40 uppercase tracking-widest min-w-[60px]">
                        {Math.round(volume * 100)}%
                    </div>
                </div>
            </div>

            {/* Autoplay Blocker Overlay - Moved to bottom for stacking order */}
            <AnimatePresence>
                {autoplayBlocked && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg cursor-pointer"
                        onClick={handleManualStart}
                    >
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-sky-500/80 hover:bg-sky-400 text-white rounded-full p-8 shadow-[0_0_100px_rgba(14,165,233,0.6)] border-4 border-white/20 backdrop-blur-xl group"
                        >
                            <Play className="w-24 h-24 ml-2 fill-current" />
                            <span className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-bold bg-white/20 px-4 py-2 rounded-full">
                                Click to Tune In
                            </span>
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
