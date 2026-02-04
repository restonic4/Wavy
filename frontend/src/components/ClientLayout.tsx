'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';

import { PlaybackProvider } from '@/contexts/PlaybackContext';
import { SyncProvider } from '@/contexts/SyncContext';
import { RhythmDebugger } from '@/components/RhythmDebugger';

import { usePathname } from 'next/navigation';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isHomePage = pathname === '/';

    return (
        <AuthProvider>
            <PlaybackProvider>
                <SyncProvider>
                    <Background />
                    <RhythmDebugger />
                    {!isHomePage && <Navbar />}
                    <main className={`relative z-0 min-h-screen ${isHomePage ? '' : 'pt-24 pb-12'}`}>
                        {children}
                    </main>
                </SyncProvider>
            </PlaybackProvider>
        </AuthProvider>
    );
};
