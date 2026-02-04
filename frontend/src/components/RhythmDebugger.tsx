'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSync, RhythmEvent } from '@/contexts/SyncContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayback } from '@/contexts/PlaybackContext';

export const RhythmDebugger = () => {
    const { currentSong, rhythmEvents } = useSync();
    const { audioRef, syncStatus } = usePlayback();
    const [isOnRight, setIsOnRight] = useState(false);
    const lastEventIndexRef = useRef(-1);
    const [progressMs, setProgressMs] = useState(0);
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);
    const [triggeredEvents, setTriggeredEvents] = useState<Set<number>>(new Set());

    // Sync window size
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Main Sync & Trigger Loop
    useEffect(() => {
        // CRITICAL: Reset tracking when the song changes
        lastEventIndexRef.current = -1;
        setTriggeredEvents(new Set());
        setIsOnRight(false);
        setProgressMs(0);

        if (!currentSong) return;

        const interval = setInterval(() => {
            if (!rhythmEvents || !audioRef.current) return;

            // USE THE SAME LOGIC AS HERO PLAYER:
            // Sync with the actual audio element's clock
            const basePos = syncStatus?.client_base_pos_ms || 0;
            const absolutePos = basePos + (audioRef.current.currentTime * 1000);
            const songProgress = absolutePos - currentSong.started_at_ms;

            setProgressMs(Math.max(0, songProgress));

            // Process events based on REAL audio time
            for (let i = lastEventIndexRef.current + 1; i < rhythmEvents.length; i++) {
                const event = rhythmEvents[i];
                if (songProgress >= event.time) {
                    if (event.identifier === 'whistle') {
                        setIsOnRight(prev => !prev);
                        setTriggeredEvents(prev => new Set(prev).add(i));
                    }
                    lastEventIndexRef.current = i;
                } else {
                    break;
                }
            }
        }, 16);

        return () => clearInterval(interval);
    }, [currentSong?.id, rhythmEvents, syncStatus?.client_base_pos_ms]); // Re-run when song ID or events change

    if (!currentSong) return null;

    const duration = currentSong.duration_ms || 1; // Avoid divide by zero
    const progressPercent = Math.min(100, (progressMs / duration) * 100);

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none p-6 flex flex-col justify-between">
            {/* Top: The Square */}
            <div className="relative h-16 w-full">
                <motion.div
                    animate={{
                        x: isOnRight ? windowWidth - 110 : 0,
                        backgroundColor: isOnRight ? '#38bdf8' : '#10b981',
                        rotate: isOnRight ? 180 : 0,
                        scale: isOnRight ? 1.2 : 1,
                    }}
                    transition={{
                        x: { type: 'spring', stiffness: 200, damping: 25 },
                        backgroundColor: { duration: 0.2 }
                    }}
                    className="w-16 h-16 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)] border-4 border-white flex items-center justify-center text-white backdrop-blur-md"
                >
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                        {isOnRight ? 'Right' : 'Left'}
                    </span>
                </motion.div>
            </div>

            {/* Bottom: The Timeline */}
            <div className="w-full space-y-4">
                {/* Telemetry Panel */}
                <div className="bg-sky-950/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl max-w-xs ml-auto text-white font-mono text-[10px] uppercase tracking-widest space-y-1">
                    <div className="flex justify-between">
                        <span className="opacity-50">Pulse Status:</span>
                        <span className={isOnRight ? 'text-sky-400' : 'text-emerald-400'}>{isOnRight ? 'RIGHT' : 'LEFT'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-50">Progress:</span>
                        <span>{Math.floor(progressMs)} / {duration}ms</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-50">Whistles:</span>
                        <span>{rhythmEvents.filter(e => e.identifier === 'whistle').length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-50">System Offset:</span>
                        <span>{Date.now() - new Date(currentSong.started_at).getTime()}ms</span>
                    </div>
                </div>

                {/* The Progress Bar & Events */}
                <div className="relative h-12 bg-sky-950/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden px-2 flex items-center">
                    {/* Background Track */}
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-400/5 to-transparent pointer-events-none" />

                    {/* Tick Markers (Every 10 seconds) */}
                    {Array.from({ length: Math.ceil(duration / 10000) }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-2 w-px bg-white/10"
                            style={{ left: `${(i * 10000 / duration) * 100}%` }}
                        />
                    ))}

                    {/* Event Markers (Whistles) */}
                    {rhythmEvents.map((event, i) => (
                        event.identifier === 'whistle' && (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    scale: triggeredEvents.has(i) ? [1, 1.5, 1] : 1,
                                    backgroundColor: triggeredEvents.has(i) ? '#ffffff' : 'rgba(14, 165, 233, 0.3)',
                                    opacity: triggeredEvents.has(i) ? 1 : 0.5,
                                }}
                                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full border border-white/20 z-10"
                                style={{ left: `${(event.time / duration) * 100}%` }}
                            />
                        )
                    ))}

                    {/* Active Progress Bar */}
                    <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 h-full bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    {/* Playhead */}
                    <motion.div
                        className="absolute top-0 h-full w-0.5 bg-white z-20 shadow-[0_0_10px_white]"
                        style={{ left: `${progressPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
