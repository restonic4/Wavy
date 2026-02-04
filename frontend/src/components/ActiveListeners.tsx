'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Users, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { ActiveListener as Listener } from '@/lib/types';

export const ActiveListeners = () => {
    const [listeners, setListeners] = useState<Listener[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchListeners = async () => {
        try {
            const data = await api.listeners.list();
            setListeners(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch listeners:", err);
        }
    };

    useEffect(() => {
        fetchListeners();
        const interval = setInterval(fetchListeners, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const colors = ['bg-sky-400', 'bg-emerald-400', 'bg-purple-400', 'bg-blue-400', 'bg-cyan-400', 'bg-indigo-400'];

    return (
        <GlassCard className="transition-all duration-500 hover:shadow-sky-200/50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-400/20 rounded-xl">
                        <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h2 className="font-bold text-sky-900">Now Listening</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-100 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">{listeners.length} Online</span>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                    {loading ? (
                        <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse border-2 border-white/40" />
                    ) : (
                        listeners.map((listener, index) => (
                            <motion.div
                                key={`${listener.username}-${index}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 260,
                                    damping: 20,
                                    delay: index * 0.05
                                }}
                                className="group relative"
                            >
                                <div className={`w-10 h-10 rounded-full ${colors[index % colors.length]} border-2 border-white shadow-sm flex items-center justify-center text-white font-bold text-xs ring-4 ring-transparent hover:ring-sky-200 transition-all cursor-pointer`}>
                                    {listener.username.charAt(0).toUpperCase()}
                                </div>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-sky-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                    <div className="flex flex-col items-center">
                                        <span>{listener.username}</span>
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sky-900" />
                                </div>
                            </motion.div>
                        ))
                    )}

                    {listeners.length === 0 && !loading && (
                        <div className="w-10 h-10 rounded-full bg-white/40 border-2 border-dashed border-white/60 flex items-center justify-center text-sky-900/40">
                            <User className="w-4 h-4" />
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-[10px] font-bold text-sky-800/40 uppercase tracking-widest">
                    Vibrating together in harmony
                </p>
            </div>
        </GlassCard>
    );
};
