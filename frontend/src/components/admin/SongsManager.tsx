'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassModal } from '@/components/ui/GlassModal';
import { Song, VibeTag } from '@/lib/types';
import { Music, Upload, Tag, User, Save, Trash2, Edit2, Search, Plus, X, Image as ImageIcon, AlertCircle, CheckCircle2, Disc } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Sub-component: Song Upload Form ---
const SongUploadForm = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
    const [title, setTitle] = useState('');
    const [artistIds, setArtistIds] = useState('');
    const [albumId, setAlbumId] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!audioFile) {
            setStatus({ type: 'error', message: 'Please select an audio file' });
            return;
        }
        setUploading(true);
        setStatus(null);
        const formData = new FormData();
        formData.append('file', audioFile);
        if (imageFile) formData.append('image', imageFile);
        formData.append('title', title);
        if (artistIds.trim()) formData.append('artist_ids', artistIds.trim());
        if (albumId.trim()) formData.append('album_id', albumId.trim());

        try {
            await api.songs.upload(formData);
            setStatus({ type: 'success', message: 'Song successfully published!' });
            setTitle('');
            setArtistIds('');
            setAlbumId('');
            setAudioFile(null);
            setImageFile(null);
            // Reset inputs
            const audioInput = document.getElementById('audio-upload') as HTMLInputElement;
            const imageInput = document.getElementById('image-upload') as HTMLInputElement;
            if (audioInput) audioInput.value = '';
            if (imageInput) imageInput.value = '';
            onUploadSuccess();
        } catch (err: any) {
            console.error("Upload failed:", err);
            setStatus({ type: 'error', message: err.message || 'Failed to upload song' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-200">
                    <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-sky-900">Add New Song</h2>
                    <p className="text-sm text-sky-800/60 font-medium">Upload audio and set metadata</p>
                </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1 flex items-center gap-2">
                            <Tag className="w-3 h-3" /> Song Title
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="Enter song title"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1 flex items-center gap-2">
                            <User className="w-3 h-3" /> Artist IDs
                        </label>
                        <input
                            type="text"
                            value={artistIds}
                            onChange={(e) => setArtistIds(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="e.g. 1, 2 (Optional)"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1 flex items-center gap-2">
                            <Disc className="w-3 h-3" /> Album ID
                        </label>
                        <input
                            type="text"
                            value={albumId}
                            onChange={(e) => setAlbumId(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 border border-white/40 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                            placeholder="e.g. 5 (Optional)"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1">Audio File (.mp3)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept="audio/mpeg,audio/mp3"
                                required
                                className="hidden"
                                id="audio-upload"
                                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                            />
                            <label
                                htmlFor="audio-upload"
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${audioFile ? 'border-sky-400 bg-sky-50' : 'border-sky-200 bg-sky-50/30 hover:bg-sky-100/50 hover:border-sky-400'}`}
                            >
                                <Music className={`w-8 h-8 group-hover:scale-110 transition-transform mb-2 ${audioFile ? 'text-sky-500' : 'text-sky-400'}`} />
                                <span className="text-[10px] font-black text-sky-800/60 uppercase tracking-widest text-center px-4">
                                    {audioFile ? audioFile.name : 'Select Audio'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-sky-900 px-1">Album Art (Optional)</label>
                        <div className="relative group">
                            <input
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                id="image-upload"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            />
                            <label
                                htmlFor="image-upload"
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all group ${imageFile ? 'border-emerald-400 bg-emerald-50' : 'border-sky-200 bg-sky-50/30 hover:bg-sky-100/50 hover:border-sky-400'}`}
                            >
                                <ImageIcon className={`w-8 h-8 group-hover:scale-110 transition-transform mb-2 ${imageFile ? 'text-emerald-500' : 'text-sky-400'}`} />
                                <span className="text-[10px] font-black text-sky-800/60 uppercase tracking-widest text-center px-4">
                                    {imageFile ? imageFile.name : 'Select Image'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {status && (
                    <div className={`flex items-center gap-2 p-4 rounded-2xl text-sm font-medium ${status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border border-red-500/20 text-red-600'}`}>
                        {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <p>{status.message}</p>
                    </div>
                )}

                <GlassButton
                    type="submit"
                    disabled={uploading}
                    className={`w-full py-4 text-white font-bold text-lg shadow-xl ${uploading ? 'bg-sky-400 opacity-80 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        {uploading ? (
                            <>
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                <span>Publish to Radio</span>
                            </>
                        )}
                    </div>
                </GlassButton>
            </form>
        </GlassCard>
    );
};

interface VibeTagEntry {
    tag_id: number;
    name: string;
    score: number;
}

// --- Main Component ---
export const SongsManager = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Tag Management Modal State
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [songTags, setSongTags] = useState<VibeTagEntry[]>([]);
    const [availableTags, setAvailableTags] = useState<{ id: number, name: string }[]>([]);
    const [newTagId, setNewTagId] = useState<number | ''>('');
    const [newTagScore, setNewTagScore] = useState<number>(0.5);

    const fetchSongs = async () => {
        try {
            const data = await api.songs.list();
            setSongs(data);
        } catch (error) {
            console.error('Failed to fetch songs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSongs();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this song?')) return;
        try {
            await api.songs.delete(id);
            setSongs(songs.filter(s => s.id !== id));
        } catch (error) {
            console.error('Failed to delete song:', error);
            alert('Failed to delete song');
        }
    };

    const openTagModal = async (song: Song) => {
        setSelectedSong(song);
        setTagModalOpen(true);
        try {
            const [tags, allTags] = await Promise.all([
                api.songs.getTags(song.id),
                api.tags.list()
            ]);
            setSongTags(tags);
            setAvailableTags(allTags);
        } catch (error) {
            console.error('Failed to fetch tags for song:', error);
        }
    };

    const handleAddTag = async () => {
        if (!selectedSong || !newTagId) return;
        try {
            await api.songs.addTag(selectedSong.id, Number(newTagId), newTagScore);
            const updatedTags = await api.songs.getTags(selectedSong.id);
            setSongTags(updatedTags);
            setNewTagId('');
            setNewTagScore(0.5);
        } catch (error) {
            console.error('Failed to add tag:', error);
            alert('Failed to add tag');
        }
    };

    const handleRemoveTag = async (tagId: number) => {
        if (!selectedSong) return;
        try {
            await api.songs.removeTag(selectedSong.id, tagId);
            setSongTags(songTags.filter(t => t.tag_id !== tagId));
        } catch (error) {
            console.error('Failed to remove tag:', error);
            alert('Failed to remove tag');
        }
    };

    const filteredSongs = songs.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist_names.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <SongUploadForm onUploadSuccess={fetchSongs} />

            <GlassCard className="p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-sky-500 rounded-2xl shadow-lg shadow-sky-200">
                            <Music className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-sky-900">Manage Library</h2>
                            <p className="text-sm text-sky-800/60 font-medium">{songs.length} songs total</p>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-800/40" />
                        <input
                            type="text"
                            placeholder="Search songs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white/50 border border-white/40 rounded-xl text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20 w-64"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    {filteredSongs.map((song) => (
                        <div key={song.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 border border-white/60 hover:border-sky-300 transition-all group">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-12 h-12 rounded-xl bg-sky-100 flex-shrink-0 relative overflow-hidden">
                                    {song.has_image ? (
                                        <img src={api.songs.getImageUrl(song.id)} alt={song.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-sky-300">
                                            <Music className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="truncate">
                                    <h3 className="font-bold text-sky-900 truncate">{song.title}</h3>
                                    <p className="text-xs text-sky-800/60 font-medium truncate">{song.artist_names}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-lg p-1.5 ml-4">
                                <button
                                    onClick={() => openTagModal(song)}
                                    className="flex items-center gap-1 px-2 py-1 hover:bg-sky-100 rounded-lg text-sky-600 transition-colors text-xs font-bold"
                                    title="Manage Vibe Tags"
                                >
                                    <Tag className="w-3.5 h-3.5" /> Tags
                                </button>
                                <button
                                    onClick={() => handleDelete(song.id)}
                                    className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                    title="Delete Song"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {filteredSongs.length === 0 && (
                        <div className="py-12 text-center text-sky-800/40 font-medium">
                            {loading ? 'Loading songs...' : 'No songs found.'}
                        </div>
                    )}
                </div>
            </GlassCard>

            <GlassModal
                isOpen={tagModalOpen}
                onClose={() => setTagModalOpen(false)}
                title={`Tags for "${selectedSong?.title}"`}
            >
                <div className="space-y-6">
                    {/* Add New Tag */}
                    <div className="space-y-3 p-4 bg-sky-50 rounded-xl border border-sky-100">
                        <h4 className="text-sm font-bold text-sky-900">Add Tag</h4>
                        <div className="flex gap-2">
                            <select
                                value={newTagId}
                                onChange={(e) => setNewTagId(Number(e.target.value))}
                                className="flex-1 px-3 py-2 bg-white rounded-xl border border-sky-200 text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                            >
                                <option value="">Select a tag...</option>
                                {availableTags.map(tag => (
                                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={newTagScore}
                                onChange={(e) => setNewTagScore(Number(e.target.value))}
                                className="w-20 px-3 py-2 bg-white rounded-xl border border-sky-200 text-sm font-medium text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                                placeholder="0.0 - 1.0"
                                title="Vibe Score (0.0 to 1.0)"
                            />
                            <button
                                onClick={handleAddTag}
                                disabled={!newTagId}
                                className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-sky-800/60">Score: 0.0 (Does not match) to 1.0 (Matches perfectly)</p>
                    </div>

                    {/* Existing Tags */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-sky-900">Assigned Tags</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {songTags.map(tag => (
                                <div key={tag.tag_id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/60">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sky-900 text-sm">{tag.name}</span>
                                        <span className="text-xs font-mono bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md">{tag.score.toFixed(1)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTag(tag.tag_id)}
                                        className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {songTags.length === 0 && (
                                <p className="text-sm text-sky-800/40 italic">No tags assigned yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
};
