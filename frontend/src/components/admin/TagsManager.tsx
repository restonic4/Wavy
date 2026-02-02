'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { Tag, Edit2, Trash2, Plus, Search } from 'lucide-react';

interface TagData {
    id: number;
    name: string;
}

export const TagsManager = () => {
    const [tags, setTags] = useState<TagData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<TagData | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTags = async () => {
        try {
            const data = await api.tags.list();
            setTags(data);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleOpenModal = (tag?: TagData) => {
        if (tag) {
            setEditingTag(tag);
            setFormData({ name: tag.name });
        } else {
            setEditingTag(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingTag) {
                await api.tags.update(editingTag.id, formData.name);
            } else {
                await api.tags.create(formData.name);
            }
            await fetchTags();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to save tag:', error);
            alert('Failed to save tag');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will remove the tag from all songs.')) return;
        try {
            await api.tags.delete(id);
            setTags(tags.filter(t => t.id !== id));
        } catch (error) {
            console.error('Failed to delete tag:', error);
            alert('Failed to delete tag');
        }
    };

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-sky-800/60">Loading tags...</div>;

    return (
        <GlassCard className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-200">
                        <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-sky-900">Vibe Tags</h2>
                        <p className="text-sm text-sky-800/60 font-medium">{tags.length} tags available</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-800/40" />
                        <input
                            type="text"
                            placeholder="Search tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/50 border border-white/40 rounded-xl text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20 w-48"
                        />
                    </div>
                    <GlassButton onClick={() => handleOpenModal()} className="bg-sky-500 text-white shadow-sky-200">
                        <Plus className="w-4 h-4 mr-2" /> New Tag
                    </GlassButton>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {filteredTags.map((tag) => (
                    <div key={tag.id} className="pl-4 pr-3 py-2.5 rounded-2xl bg-white/40 border border-white/60 hover:border-sky-300 transition-all group flex items-center gap-2">
                        <span className="font-bold text-sky-900">{tag.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 border-l border-sky-800/10 pl-2">
                            <button onClick={() => handleOpenModal(tag)} className="p-1 hover:bg-sky-100 rounded text-sky-600 transition-colors">
                                <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(tag.id)} className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
                {filteredTags.length === 0 && (
                    <div className="w-full py-12 text-center text-sky-800/40 font-medium">
                        No tags found.
                    </div>
                )}
            </div>

            <GlassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTag ? 'Edit Tag' : 'New Tag'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1">Tag Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="Enter tag name (e.g. Chill, Upbeat)"
                            autoFocus
                        />
                    </div>
                    <GlassButton
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-sky-500 text-white font-bold shadow-sky-200"
                    >
                        {submitting ? 'Saving...' : 'Save Tag'}
                    </GlassButton>
                </form>
            </GlassModal>
        </GlassCard>
    );
};
