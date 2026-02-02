'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, User, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await register({ username, password });
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <GlassCard className="p-8 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-200 mb-2">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-sky-900">Join Wavy</h1>
                        <p className="text-sky-800/60 font-medium">Create an account to start vibing</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-sky-900 px-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-sky-400 group-focus-within:text-sky-600 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                                        placeholder="Choose a username"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-sky-900 px-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-sky-400 group-focus-within:text-sky-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-sky-900 px-1">Confirm Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-sky-400 group-focus-within:text-sky-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10 outline-none rounded-2xl transition-all font-medium text-sky-900"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm font-medium"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <p>{error}</p>
                            </motion.div>
                        )}

                        <GlassButton
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 text-white font-bold text-lg shadow-xl transition-all ${loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-emerald-200'
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                "Create Account"
                            )}
                        </GlassButton>
                    </form>

                    <p className="text-center text-sky-800/60 font-medium">
                        Already have an account?{' '}
                        <Link href="/login" className="text-sky-600 hover:text-sky-700 font-bold underline decoration-sky-500/30 underline-offset-4">
                            Log in here
                        </Link>
                    </p>
                </GlassCard>
            </motion.div>
        </div>
    );
}
