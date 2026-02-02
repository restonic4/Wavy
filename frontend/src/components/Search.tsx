'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Song, VibeTag } from '@/lib/types';
import { GlassCard } from './ui/GlassCard';
import { Search as SearchIcon, Wind, Sliders, X } from 'lucide-react';
import { SongVisual } from './SongVisual';
import { motion, AnimatePresence } from 'framer-motion';

export const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'text' | 'vibe'>('text');

    // Vibe search state
    const [vibeTags, setVibeTags] = useState<VibeTag[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);

    useEffect(() => {
        const fetchTags = async () => {
            try {
                const tags = await api.tags.list() as { name: string }[];
                setAvailableTags(tags.map(t => t.name));
            } catch (err) {
                console.error("Failed to fetch tags:", err);
            }
        };
        fetchTags();
    }, []);

    const handleTextSearch = async (val: string) => {
        setQuery(val);
        if (val.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await api.songs.search(val);
            setResults(data);
        } catch (err: any) {
            console.error("Search failed:", err);
            setError(err.message || "Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleVibeSearch = async () => {
        if (vibeTags.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.tags.search(vibeTags);
            setResults(data);
        } catch (err: any) {
            console.error("Vibe search failed:", err);
            setError(err.message || "Vibe search failed");
        } finally {
            setLoading(false);
        }
    };

    const toggleVibeTag = (tagName: string) => {
        if (vibeTags.find(t => t.name === tagName)) {
            setVibeTags(vibeTags.filter(t => t.name !== tagName));
        } else {
            setVibeTags([...vibeTags, { name: tagName, target_score: 0.5 }]);
        }
    };

    const updateVibeScore = (tagName: string, score: number) => {
        setVibeTags(vibeTags.map(t => t.name === tagName ? { ...t, target_score: score } : t));
    };

    return (
        <GlassCard className="w-full max-w-2xl mx-auto overflow-hidden">
            <div className="flex gap-4 mb-6 p-1 bg-white/20 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('text')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'text' ? 'bg-white shadow-sm text-sky-600' : 'text-sky-900/60 hover:text-sky-900'}`}
                >
                    SEARCH LIBRARY
                </button>
                <button
                    onClick={() => setActiveTab('vibe')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'vibe' ? 'bg-white shadow-sm text-sky-600' : 'text-sky-900/60 hover:text-sky-900'}`}
                >
                    VIBE FINDER
                </button>
            </div>

            {activeTab === 'text' ? (
                <div className="relative mb-6">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-900/30" />
                    <input
                        type="text"
                        placeholder="Search songs or artists..."
                        value={query}
                        onChange={(e) => handleTextSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/40 border border-white/40 rounded-2xl outline-none focus:ring-2 ring-sky-400/20 transition-all font-medium text-sky-900 placeholder:text-sky-900/40"
                    />
                </div>
            ) : (
                <div className="space-y-6 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleVibeTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${vibeTags.find(t => t.name === tag)
                                    ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                                    : 'bg-white/40 text-sky-900/60 border-white/40 hover:bg-white/60'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {vibeTags.map(tag => (
                            <div key={tag.name} className="flex items-center gap-4 bg-white/40 p-3 rounded-2xl border border-white/20">
                                <span className="text-xs font-bold text-sky-900 w-24 truncate">{tag.name}</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={tag.target_score}
                                    onChange={(e) => updateVibeScore(tag.name, parseFloat(e.target.value))}
                                    className="flex-1 h-1.5 bg-sky-200/50 rounded-full appearance-none cursor-pointer accent-sky-500"
                                />
                                <span className="text-[10px] font-black text-sky-600 w-8">{Math.round(tag.target_score * 100)}%</span>
                            </div>
                        ))}
                    </div>

                    {vibeTags.length > 0 && (
                        <button
                            onClick={handleVibeSearch}
                            className="w-full py-3 bg-sky-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sky-600 transition-all shadow-lg shadow-sky-200"
                        >
                            <Wind className="w-4 h-4" />
                            CALCULATE VIBE
                        </button>
                    )}
                </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-xs font-bold text-center mb-4"
                        >
                            <p>Backend Error: {error}</p>
                            <p className="font-normal opacity-60 mt-1">This is likely a backend database query issue (missing 'id' column).</p>
                        </motion.div>
                    )}

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 opacity-40">
                            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest">Scanning Waves...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((song, idx) => (
                            <motion.div
                                key={song.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-4 p-3 bg-white/30 rounded-2xl border border-white/20 hover:bg-white/60 transition-all group"
                            >
                                <SongVisual
                                    songId={song.id}
                                    title={song.title}
                                    hasImage={song.has_image}
                                    className="w-12 h-12"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sky-900 truncate">{song.title}</h4>
                                    <p className="text-[11px] font-medium text-sky-900/60 truncate">{song.artist_names}</p>
                                </div>
                                {song.match_error !== undefined && (
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-sky-500 uppercase">Match</div>
                                        <div className="text-xs font-bold text-sky-900">
                                            {Math.round((1 - song.match_error) * 100)}%
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    ) : (query || vibeTags.length > 0) && !loading ? (
                        <div className="py-12 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-sky-900/30">No matching vibes found</p>
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            {activeTab === 'text' ? (
                                <p className="text-xs font-bold uppercase tracking-widest italic text-sky-900/30">Start typing to discover</p>
                            ) : (
                                <p className="text-xs font-bold uppercase tracking-widest italic text-sky-900/30">Select tags to find your vibe</p>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </GlassCard>
    );
};
