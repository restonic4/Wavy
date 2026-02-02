'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Trophy, Clock, Medal, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

export const Leaderboard = () => {
    const [leaders, setLeaders] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        try {
            const data = await api.users.leaderboard();
            if (data && Array.isArray(data)) {
                setLeaders(data);
            }
        } catch (err) {
            console.error("Failed to fetch leaderboard:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        // Refresh leaderboard every 60 seconds
        const interval = setInterval(fetchLeaderboard, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <GlassCard className="h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-400/20 rounded-xl">
                        <Trophy className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="font-bold text-sky-900">Top Listeners</h2>
                </div>
                <span className="text-[10px] font-black bg-sky-100 text-sky-600 px-2 py-1 rounded-lg uppercase tracking-wider">Lifetime</span>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white/20 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : leaders.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold uppercase tracking-widest text-sky-900/40">
                        No champions yet... be the first!
                    </div>
                ) : (
                    leaders.map((leader, index) => (
                        <motion.div
                            key={leader.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group flex items-center justify-between p-3 rounded-2xl bg-white/30 border border-white/20 hover:bg-white/50 hover:border-sky-200 transition-all cursor-default"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold relative z-10 ${index === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                        index === 1 ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                            index === 2 ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                                'bg-sky-100 text-sky-600'
                                        }`}>
                                        {index < 3 ? (
                                            index === 0 ? <Crown className="w-5 h-5 fill-amber-400 text-amber-600" /> :
                                                <Medal className="w-5 h-5" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    {index === 0 && (
                                        <div className="absolute inset-0 bg-amber-400 blur-lg opacity-20 animate-pulse z-0" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-sky-900 leading-none mb-1 max-w-[120px] truncate">{leader.username}</h3>
                                    <div className="flex items-center gap-1 text-[10px] text-sky-800/50 font-bold uppercase tracking-tighter">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatTime(leader.total_listen_time)}
                                    </div>
                                </div>
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <div className="mt-8 p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10">
                <p className="text-[11px] font-medium text-sky-800/70 text-center italic">
                    Keep listening to climb the ranks! Heartbeats are sent every minute.
                </p>
            </div>
        </GlassCard>
    );
};
