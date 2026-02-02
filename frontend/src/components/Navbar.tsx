'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GlassButton } from './ui/GlassButton';
import { Waves, User, LogOut, LayoutDashboard } from 'lucide-react';

export const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-center">
            <div className="glass w-full max-w-6xl px-8 py-3 flex items-center justify-between backdrop-blur-xl bg-white/30 border-white/40 shadow-xl overflow-hidden relative">
                {/* Shine effect */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

                <Link href="/" className="flex items-center gap-2 group transition-all">
                    <div className="p-2 bg-sky-500 rounded-xl shadow-lg shadow-sky-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                        <Waves className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-sky-900">
                        Wavy<span className="text-sky-500">Radio</span>
                    </span>
                </Link>

                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <div className="flex items-center gap-3 px-4 py-2 bg-sky-100/50 rounded-2xl border border-sky-200/50">
                                <div className="w-8 h-8 rounded-full bg-sky-400 flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm">
                                    {user.username[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-sky-900">{user.username}</span>
                            </div>

                            {user.role.toLowerCase() === 'admin' && (
                                <Link href="/admin">
                                    <GlassButton className="flex items-center gap-2 !px-4 !py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20">
                                        <LayoutDashboard className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
                                    </GlassButton>
                                </Link>
                            )}

                            <GlassButton onClick={logout} className="!px-3 !py-2 bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20">
                                <LogOut className="w-4 h-4" />
                            </GlassButton>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <span className="text-sm font-bold text-sky-800 hover:text-sky-600 px-4 py-2 transition-colors">Login</span>
                            </Link>
                            <Link href="/register">
                                <GlassButton className="bg-sky-500 text-white border-sky-400 hover:bg-sky-600 shadow-sky-200">
                                    Sign Up
                                </GlassButton>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};
