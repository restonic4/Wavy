'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Play, Square, Volume2, VolumeX } from 'lucide-react';
import { GlassButton } from './ui/GlassButton';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayback } from '@/contexts/PlaybackContext';

export const RadioPlayer = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setIsPlaying } = usePlayback();
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleError = () => {
            setError("Stream interrupted. Click play to reconnect.");
            setIsPlaying(false);
        };

        audio.addEventListener('error', handleError);
        return () => audio.removeEventListener('error', handleError);
    }, [setIsPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            // For live streams, we often want to "reset" to live when playing again
            audioRef.current.src = '';
            setIsPlaying(false);
        } else {
            audioRef.current.src = api.streamUrl;
            audioRef.current.play().catch(err => {
                console.error("Playback failed:", err);
                setError("Autoplay blocked or stream unavailable. Click Play!");
                setIsPlaying(false);
            });
            setIsPlaying(true);
            setError(null);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <audio ref={audioRef} crossOrigin="anonymous" />

            {/* The Central Orb (Visual Representation) */}
            <div className="relative group">
                <AnimatePresence>
                    {isPlaying && (
                        <>
                            {/* Pulse Rings */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                                className="absolute inset-0 rounded-full border-2 border-sky-400/30 -z-10"
                            />
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.8, opacity: 0 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                className="absolute inset-0 rounded-full border-2 border-sky-300/20 -z-10"
                            />
                        </>
                    )}
                </AnimatePresence>

                <div className={cn(
                    "w-56 h-56 aero-orb flex items-center justify-center transition-all duration-700 relative z-10",
                    isPlaying ? "scale-110 shadow-[0_0_50px_rgba(14,165,233,0.3)]" : "scale-100 opacity-90 shadow-xl"
                )}>
                    {/* Inner spinning elements when playing */}
                    <div className={cn(
                        "absolute inset-0 rounded-full border-[12px] border-white/10 transition-all duration-1000",
                        isPlaying ? "rotate-180 border-sky-400/10" : "rotate-0"
                    )} />

                    <div className={cn(
                        "absolute inset-4 rounded-full border-[1px] border-white/20 transition-all duration-[2000ms]",
                        isPlaying ? "rotate-[-360deg]" : "rotate-0"
                    )} />

                    {/* Glossy Reflection */}
                    <div className="absolute top-[10%] left-[20%] w-[60%] h-[30%] bg-gradient-to-b from-white/40 to-transparent rounded-[100%] blur-[2px]" />

                    <GlassButton
                        onClick={togglePlay}
                        className="w-24 h-24 rounded-full p-0 flex items-center justify-center bg-white/40 hover:bg-white/60 active:scale-90 transition-all z-20 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {isPlaying ? (
                            <Square className="w-10 h-10 fill-sky-600 text-sky-600 drop-shadow-sm" />
                        ) : (
                            <Play className="w-10 h-10 fill-sky-600 text-sky-600 translate-x-1 drop-shadow-sm" />
                        )}
                    </GlassButton>
                </div>
            </div>

            {/* Basic Controls */}
            <div className="glass px-6 py-3 flex items-center gap-4">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-xl hover:bg-white/40 text-sky-800 hover:text-sky-500 transition-all active:scale-90"
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted || volume === 0 ? <VolumeX size={20} className="drop-shadow-sm" /> : <Volume2 size={20} className="drop-shadow-sm" />}
                </button>

                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-32 cursor-pointer"
                />
            </div>

            {error && (
                <p className="text-xs text-red-500 font-medium animate-pulse">{error}</p>
            )}

            <p className="text-sm font-medium text-sky-900 opacity-60 uppercase tracking-widest">
                {isPlaying ? "LIVE STREAMING" : "RADIO STANDBY"}
            </p>
        </div>
    );
};
