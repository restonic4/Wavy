'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role.toLowerCase() !== 'admin')) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user || user.role.toLowerCase() !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
                <p className="text-sky-900 font-bold animate-pulse">Checking Permissions...</p>
            </div>
        );
    }

    return <>{children}</>;
};
