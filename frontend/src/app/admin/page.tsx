'use client';

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { api } from '@/lib/api';
import { Music, Tag, User, Activity, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { SongsManager } from '@/components/admin/SongsManager';
import { ArtistsManager } from '@/components/admin/ArtistsManager';
import { TagsManager } from '@/components/admin/TagsManager';

import { AlbumsManager } from '@/components/admin/AlbumsManager';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'songs' | 'artists' | 'albums' | 'tags'>('songs');
    const [stats, setStats] = useState({ songs: 0, artists: 0, albums: 0, tags: 0 });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [songs, artists, albums, tags] = await Promise.all([
                    api.songs.list(),
                    api.artists.list(),
                    api.albums.list(),
                    api.tags.list()
                ]);
                setStats({
                    songs: songs.length,
                    artists: artists.length,
                    albums: albums.length,
                    tags: tags.length
                });
            } catch (error) {
                console.error("Failed to load stats", error);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [activeTab]); // Refresh stats when switching tabs (simple way to keep them arguably fresh)

    const tabs = [
        { id: 'songs', label: 'Songs', icon: Music },
        { id: 'artists', label: 'Artists', icon: User },
        { id: 'albums', label: 'Albums', icon: Disc },
        { id: 'tags', label: 'Tags', icon: Tag },
    ] as const;

    return (
        <AdminGuard>
            <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-sky-900 leading-tight">Admin <span className="text-sky-500">Dashboard</span></h1>
                        <p className="text-sky-800/60 font-medium">Manage your radio station and library</p>
                    </div>

                    <div className="flex bg-white/40 glass p-1.5 rounded-2xl gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                                    : 'text-sky-800/60 hover:bg-white/40'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        <GlassCard className="bg-sky-500/5 group">
                            <h2 className="font-bold text-sky-900 mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-sky-500" /> Library Stats
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/20 border border-white/40 group-hover:bg-white/40 transition-colors">
                                    <span className="text-sm font-bold text-sky-800/70">Total Songs</span>
                                    <span className="font-black text-sky-600">{loadingStats ? '...' : stats.songs}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/20 border border-white/40 group-hover:bg-white/40 transition-colors">
                                    <span className="text-sm font-bold text-sky-800/70">Artists</span>
                                    <span className="font-black text-sky-600">{loadingStats ? '...' : stats.artists}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/20 border border-white/40 group-hover:bg-white/40 transition-colors">
                                    <span className="text-sm font-bold text-sky-800/70">Albums</span>
                                    <span className="font-black text-indigo-600">{loadingStats ? '...' : stats.albums}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/20 border border-white/40 group-hover:bg-white/40 transition-colors">
                                    <span className="text-sm font-bold text-sky-800/70">Vibe Tags</span>
                                    <span className="font-black text-sky-600">{loadingStats ? '...' : stats.tags}</span>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="bg-emerald-500/5">
                            <h2 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Live Status
                            </h2>
                            <p className="text-sm font-medium text-emerald-800/70 mb-4">System Online</p>
                            <GlassButton className="w-full py-2 bg-emerald-500 text-white text-xs shadow-emerald-200">View Server Logs</GlassButton>
                        </GlassCard>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-3">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'songs' && <SongsManager />}
                            {activeTab === 'artists' && <ArtistsManager />}
                            {activeTab === 'albums' && <AlbumsManager />}
                            {activeTab === 'tags' && <TagsManager />}
                        </motion.div>
                    </div>
                </div>
            </div>
        </AdminGuard>
    );
}
