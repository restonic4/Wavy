import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({ isOpen, onClose, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-lg pointer-events-auto"
                        >
                            <GlassCard className="max-h-[90vh] flex flex-col shadow-2xl shadow-sky-900/20 border-white/50 bg-white/80">
                                <div className="flex items-center justify-between p-6 border-b border-white/20">
                                    <h2 className="text-xl font-bold text-sky-900">{title}</h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-black/5 text-sky-900/60 hover:text-sky-900 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto custom-scrollbar">
                                    {children}
                                </div>
                            </GlassCard>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
