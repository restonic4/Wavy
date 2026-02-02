'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { Disc, Edit2, Trash2, Plus, Search } from 'lucide-react';

interface Album {
    id: number;
    title: string;
}

export const AlbumsManager = () => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
    const [formData, setFormData] = useState({ title: '' });
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAlbums = async () => {
        try {
            const data = await api.albums.list();
            setAlbums(data);
        } catch (error) {
            console.error('Failed to fetch albums:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbums();
    }, []);

    const handleOpenModal = (album?: Album) => {
        if (album) {
            setEditingAlbum(album);
            setFormData({ title: album.title });
        } else {
            setEditingAlbum(null);
            setFormData({ title: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingAlbum) {
                await api.albums.update(editingAlbum.id, formData.title);
            } else {
                await api.albums.create(formData.title);
            }
            await fetchAlbums();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save album:', error);
            alert('Failed to save album');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will remove the album reference from all songs in this album.')) return;
        try {
            await api.albums.delete(id);
            setAlbums(albums.filter(a => a.id !== id));
        } catch (error) {
            console.error('Failed to delete album:', error);
            alert('Failed to delete album');
        }
    };

    const filteredAlbums = albums.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-sky-800/60 font-bold animate-pulse">Loading albums...</div>;

    return (
        <GlassCard className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-200">
                        <Disc className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-sky-900">Manage Albums</h2>
                        <p className="text-sm text-sky-800/60 font-medium">{albums.length} albums total</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-800/40" />
                        <input
                            type="text"
                            placeholder="Search albums..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/50 border border-white/40 rounded-xl text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20 w-48"
                        />
                    </div>
                    <GlassButton onClick={() => handleOpenModal()} className="bg-indigo-500 text-white shadow-indigo-200 hover:bg-indigo-600 border-indigo-400">
                        <Plus className="w-4 h-4 mr-2" /> New Album
                    </GlassButton>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredAlbums.map((album) => (
                    <div key={album.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60 hover:border-indigo-300 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-black">
                                {album.title[0]?.toUpperCase() || '#'}
                            </div>
                            <h3 className="font-bold text-sky-900 truncate">{album.title}</h3>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-lg p-1">
                            <button onClick={() => handleOpenModal(album)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors">
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(album.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredAlbums.length === 0 && (
                    <div className="col-span-full py-12 text-center text-sky-800/40 font-medium">
                        No albums found.
                    </div>
                )}
            </div>

            <GlassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAlbum ? 'Edit Album' : 'New Album'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1">Album Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="Enter album title"
                            autoFocus
                        />
                    </div>
                    <GlassButton
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-indigo-500 text-white font-bold shadow-indigo-200 hover:bg-indigo-600 border-indigo-400"
                    >
                        {submitting ? 'Saving...' : 'Save Album'}
                    </GlassButton>
                </form>
            </GlassModal>
        </GlassCard>
    );
};
