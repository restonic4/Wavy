'use client';

import React, { useState } from 'react';
import { Menu, X, Search as SearchIcon, Trophy, Settings, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from './ui/GlassButton';
import { GlassModal } from './ui/GlassModal';
import { Search } from './Search';
import { Leaderboard } from './Leaderboard';
import { ListenerStats } from './ListenerStats';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayback } from '@/contexts/PlaybackContext';
import Link from 'next/link';

export const MenuSidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'search' | 'leaderboard' | 'profile' | null>(null);
    const { user, logout } = useAuth();
    const { syncStatus } = usePlayback();

    const menuItems = [
        {
            id: 'search',
            label: 'Search Songs',
            icon: SearchIcon,
            action: () => setActiveModal('search')
        },
        {
            id: 'leaderboard',
            label: 'Leaderboard',
            icon: Trophy,
            action: () => setActiveModal('leaderboard')
        },
        ...(user?.role.toLowerCase() === 'admin' ? [{
            id: 'admin',
            label: 'Admin Dashboard',
            icon: Settings,
            href: '/admin'
        }] : []),
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            action: () => setActiveModal('profile')
        }
    ];

    return (
        <>
            {/* Hamburger Button */}
            <div className="fixed top-6 right-6 z-[60]">
                <GlassButton
                    onClick={() => setIsOpen(true)}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 border-white/20"
                >
                    <Menu className="w-6 h-6 text-sky-900" />
                </GlassButton>
            </div>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[65]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-white/80 backdrop-blur-xl z-[70] shadow-2xl border-l border-white/50 flex flex-col p-6"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-2xl font-black text-sky-900 tracking-tight">Menu</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-full hover:bg-sky-100/50 text-sky-900 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                {menuItems.map((item) => (
                                    item.href ? (
                                        <Link key={item.id} href={item.href} onClick={() => setIsOpen(false)}>
                                            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 transition-all group cursor-pointer border border-transparent hover:border-white/40">
                                                <div className="p-2 bg-sky-100/50 rounded-xl group-hover:bg-sky-200/50 transition-colors">
                                                    <item.icon className="w-5 h-5 text-sky-700" />
                                                </div>
                                                <span className="font-bold text-sky-900">{item.label}</span>
                                            </div>
                                        </Link>
                                    ) : (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                item.action?.();
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 transition-all group cursor-pointer border border-transparent hover:border-white/40 text-left w-full"
                                        >
                                            <div className="p-2 bg-sky-100/50 rounded-xl group-hover:bg-sky-200/50 transition-colors">
                                                <item.icon className="w-5 h-5 text-sky-700" />
                                            </div>
                                            <span className="font-bold text-sky-900">{item.label}</span>
                                        </button>
                                    )
                                ))}
                            </div>

                            <div className="mt-auto">
                                {syncStatus && (
                                    <div className="mb-4 flex justify-center">
                                        <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${Math.abs(syncStatus.desync_ms) < 100
                                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                            : Math.abs(syncStatus.desync_ms) < 500
                                                ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                                                : 'bg-red-500/10 text-red-700 border-red-500/20'
                                            }`}>
                                            <div className={`w-2 h-2 rounded-full ${Math.abs(syncStatus.desync_ms) < 100
                                                ? 'bg-emerald-500 animate-pulse'
                                                : Math.abs(syncStatus.desync_ms) < 500
                                                    ? 'bg-amber-500'
                                                    : 'bg-red-500'
                                                }`} />
                                            Sync Delay: {syncStatus.desync_ms}ms
                                        </div>
                                    </div>
                                )}
                                <p className="text-center text-xs font-medium text-sky-900/40">
                                    Wavy Web &copy; 2026
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modals */}
            <GlassModal
                isOpen={activeModal === 'search'}
                onClose={() => setActiveModal(null)}
                title="Search Songs"
            >
                <Search />
            </GlassModal>

            <GlassModal
                isOpen={activeModal === 'leaderboard'}
                onClose={() => setActiveModal(null)}
                title="Leaderboard"
            >
                <Leaderboard />
            </GlassModal>

            <GlassModal
                isOpen={activeModal === 'profile'}
                onClose={() => setActiveModal(null)}
                title={user ? "Your Profile" : "Guest Access"}
            >
                <div className="flex flex-col items-center gap-6 py-4">
                    {user ? (
                        <>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-300 to-emerald-300 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white/30">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-2xl font-black text-sky-900">{user.username}</h3>
                                <div className="inline-block px-3 py-1 bg-sky-100 rounded-full">
                                    <p className="text-xs font-bold text-sky-600 uppercase tracking-widest">{user.role}</p>
                                </div>
                            </div>

                            <div className="w-full">
                                <ListenerStats />
                            </div>

                            <div className="w-full h-px bg-sky-900/10 my-2" />

                            <button
                                onClick={() => {
                                    logout();
                                    setActiveModal(null);
                                    setIsOpen(false);
                                }}
                                className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold transition-all flex items-center justify-center gap-2"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-sky-900/20 mb-2">
                                <User className="w-10 h-10" />
                            </div>
                            <div className="text-center max-w-xs">
                                <h3 className="text-xl font-bold text-sky-900 mb-2">Join the Waves</h3>
                                <p className="text-sm text-sky-900/60 leading-relaxed">
                                    Create an account to track your listening stats, climb the leaderboard, and customize your experience.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                <Link href="/login" onClick={() => setIsOpen(false)}>
                                    <button className="w-full py-3 rounded-xl bg-white/40 hover:bg-white/60 text-sky-900 font-bold border border-white/40 transition-all">
                                        Login
                                    </button>
                                </Link>
                                <Link href="/register" onClick={() => setIsOpen(false)}>
                                    <button className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-200 transition-all">
                                        Register
                                    </button>
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </GlassModal>
        </>
    );
};
