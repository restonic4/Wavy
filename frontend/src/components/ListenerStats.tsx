'use client';

import React from 'react';
import { GlassCard } from './ui/GlassCard';
import { Clock, Timer, User } from 'lucide-react';
import { usePlayback } from '@/contexts/PlaybackContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const ListenerStats = () => {
    const { sessionSeconds } = usePlayback();
    const { user } = useAuth();

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) return `${hrs}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    if (!user) return null;

    const stats = {
        username: user.username,
        session_seconds: sessionSeconds,
        total_seconds: user.total_listen_time + sessionSeconds
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <GlassCard className="border-sky-400/30 shadow-[0_8px_32px_rgba(14,165,233,0.1)]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-sky-500/20 rounded-2xl">
                        <User className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                        <h2 className="font-black text-sky-900 leading-none">Your Stats</h2>
                        <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-1">{stats.username}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/40 rounded-2xl border border-white/40 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Timer className="w-3 h-3 text-sky-900" />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-sky-900">Session</span>
                        </div>
                        <span className="text-xl font-black text-sky-900 tabular-nums">
                            {formatTime(stats.session_seconds)}
                        </span>
                    </div>

                    <div className="p-4 bg-white/40 rounded-2xl border border-white/40 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Clock className="w-3 h-3 text-sky-900" />
                            <span className="text-[9px] font-black uppercase tracking-tighter text-sky-900">Lifetime</span>
                        </div>
                        <span className="text-xl font-black text-sky-900 tabular-nums">
                            {formatTime(stats.total_seconds)}
                        </span>
                    </div>
                </div>

                {/* TODO: Update with DB / connection status */}
                <div className="mt-6 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 rounded-full border border-emerald-500/10">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                        Wavying Live
                    </span>
                </div>
            </GlassCard>
        </motion.div>
    );
};
