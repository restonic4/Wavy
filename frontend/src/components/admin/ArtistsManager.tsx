'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { User, Edit2, Trash2, Plus, Search } from 'lucide-react';

interface Artist {
    id: number;
    name: string;
}

export const ArtistsManager = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchArtists = async () => {
        try {
            const data = await api.artists.list();
            setArtists(data);
        } catch (error) {
            console.error('Failed to fetch artists:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArtists();
    }, []);

    const handleOpenModal = (artist?: Artist) => {
        if (artist) {
            setEditingArtist(artist);
            setFormData({ name: artist.name });
        } else {
            setEditingArtist(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingArtist) {
                await api.artists.update(editingArtist.id, formData.name);
            } else {
                await api.artists.create(formData.name);
            }
            await fetchArtists();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save artist:', error);
            alert('Failed to save artist');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will remove the artist from all songs.')) return;
        try {
            await api.artists.delete(id);
            setArtists(artists.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete artist:', error);
            alert('Failed to delete artist');
        }
    };

    const filteredArtists = artists.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-sky-800/60">Loading artists...</div>;

    return (
        <GlassCard className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-200">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-sky-900">Manage Artists</h2>
                        <p className="text-sm text-sky-800/60 font-medium">{artists.length} artists in library</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-800/40" />
                        <input
                            type="text"
                            placeholder="Search artists..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/50 border border-white/40 rounded-xl text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20 w-48"
                        />
                    </div>
                    <GlassButton onClick={() => handleOpenModal()} className="bg-sky-500 text-white shadow-sky-200">
                        <Plus className="w-4 h-4 mr-2" /> New Artist
                    </GlassButton>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredArtists.map((artist) => (
                    <div key={artist.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60 hover:border-sky-300 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-sky-100 flex-shrink-0 flex items-center justify-center text-sky-600 font-black">
                                {artist.name[0]?.toUpperCase()}
                            </div>
                            <h3 className="font-bold text-sky-900 truncate">{artist.name}</h3>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-lg p-1">
                            <button onClick={() => handleOpenModal(artist)} className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(artist.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredArtists.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sky-800/40 font-medium">
                        No artists found.
                    </div>
                )}
            </div>

            <GlassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingArtist ? 'Edit Artist' : 'New Artist'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1">Artist Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="Enter artist name"
                            autoFocus
                        />
                    </div>
                    <GlassButton
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-sky-500 text-white font-bold shadow-sky-200"
                    >
                        {submitting ? 'Saving...' : 'Save Artist'}
                    </GlassButton>
                </form>
            </GlassModal>
        </GlassCard>
    );
};
