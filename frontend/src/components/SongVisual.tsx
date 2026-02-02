'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SongVisualProps {
    songId?: number;
    title?: string;
    hasImage?: boolean;
    className?: string;
}

export const SongVisual = ({ songId, title, hasImage, className }: SongVisualProps) => {
    const [imageError, setImageError] = useState(false);

    // Generate a pseudo-random color based on songId/title
    const colors = useMemo(() => {
        const seed = songId || (title ? title.length : 0);
        const hue1 = (seed * 137.5) % 360;
        const hue2 = (hue1 + 40) % 360;
        return {
            from: `hsl(${hue1}, 70%, 70%)`,
            to: `hsl(${hue2}, 80%, 60%)`,
            accent: `hsl(${(hue1 + 180) % 360}, 100%, 90%)`
        };
    }, [songId, title]);

    const imageUrl = songId && hasImage ? api.songs.getImageUrl(songId) : null;

    return (
        <div className={`relative overflow-hidden rounded-2xl aspect-square bg-white/20 border border-white/40 shadow-inner group ${className}`}>
            {/* Base Gradient - Only if no image */}
            {(!imageUrl || imageError) && (
                <div
                    className="absolute inset-0 transition-all duration-1000"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                />
            )}

            {/* Actual Image */}
            <AnimatePresence>
                {imageUrl && !imageError && (
                    <motion.img
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        src={imageUrl}
                        alt={title || 'Song Image'}
                        className="absolute inset-0 w-full h-full object-cover z-10"
                        onError={() => setImageError(true)}
                    />
                )}
            </AnimatePresence>

            {/* Animated Shapes (Only if no image or image error) */}
            {(!imageUrl || imageError) && (
                <motion.div
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] opacity-40 blur-2xl rounded-full"
                    style={{ background: colors.accent }}
                />
            )}

            {/* Glossy Overlay - ONLY if no image to keep images clean */}
            {(!imageUrl || imageError) && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/40 to-transparent pointer-events-none" />
            )}

            {/* Inner Ring (Only if no image) */}
            {(!imageUrl || imageError) && (
                <div className="absolute inset-4 rounded-full border border-white/20" />
            )}

            {/* Center Detail (Only if no image) */}
            {(!imageUrl || imageError) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-lg">
                        <div className="w-6 h-6 bg-white rounded-full opacity-60" />
                    </div>
                </div>
            )}

            {/* Top Shine - Reduced opacity and only a hint when image is present */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-2xl z-20",
                (!imageUrl || imageError) ? "opacity-30" : "opacity-10"
            )} />
        </div>
    );
};
