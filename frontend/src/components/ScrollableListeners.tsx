'use client';

import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

interface Listener {
    username: string;
    connected_at: string;
    is_authenticated: boolean;
}

export const ScrollableListeners = () => {
    const [listeners, setListeners] = useState<Listener[]>([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    const fetchListeners = async () => {
        try {
            const data = await api.status.get();
            if (data && Array.isArray(data.listeners)) {
                setListeners(data.listeners);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch listeners:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListeners();
        const interval = setInterval(fetchListeners, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && contentRef.current) {
                setShouldScroll(contentRef.current.scrollWidth > containerRef.current.clientWidth);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [listeners]);

    if (loading) {
        return (
            <div className="absolute bottom-6 w-full flex justify-center items-center z-20">
                <div className="w-4 h-4 rounded-full bg-sky-200/50 animate-bounce" />
            </div>
        );
    }

    if (listeners.length === 0) {
        return (
            <div className="absolute bottom-6 w-full flex justify-center font-bold text-sky-900/40 text-xs uppercase tracking-widest z-20">
                Waiting for listeners...
            </div>
        );
    }

    // Prepare the content for display
    const ListenerItem = ({ listener }: { listener: Listener }) => (
        <span className="mx-2 text-sky-900/70 font-medium text-sm whitespace-nowrap">
            {listener.username}
        </span>
    );

    const animationDuration = Math.max(listeners.length * 3, 10); // At least 10s

    return (
        <div
            className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white/40 via-white/10 to-transparent flex items-center justify-center overflow-hidden z-20 pointer-events-none"
            ref={containerRef}
        >
            <div className="flex items-center gap-2">
                <span className="font-bold text-sky-700 text-sm whitespace-nowrap">Listeners:</span>

                {shouldScroll ? (
                    // Scrolling Content
                    <div
                        className="flex whitespace-nowrap overflow-hidden"
                        style={{ maxWidth: 'calc(100vw - 120px)' }}
                    >
                        <div
                            className="flex"
                            style={{
                                animation: `scroll-left ${animationDuration}s linear infinite`,
                            }}
                        >
                            <div className="flex" ref={contentRef}>
                                {listeners.map((l, i) => <ListenerItem key={`orig-${i}`} listener={l} />)}
                            </div>
                            {/* Duplicate for infinite loop effect */}
                            <div className="flex">
                                {listeners.map((l, i) => <ListenerItem key={`dup-${i}`} listener={l} />)}
                            </div>
                            {/* Duplicate again just in case screen is very wide */}
                            <div className="flex">
                                {listeners.map((l, i) => <ListenerItem key={`dup2-${i}`} listener={l} />)}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Static Content
                    <div className="flex whitespace-nowrap" ref={contentRef}>
                        {listeners.map((l, i) => <ListenerItem key={i} listener={l} />)}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes scroll-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
            `}</style>
        </div>
    );
};
