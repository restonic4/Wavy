'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const Background = () => {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Main Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#f0f9ff] via-[#e0f2fe] to-[#f0fdf4]" />

            {/* Large Soft Blobs */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -100, 50, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-300/20 blur-[100px] rounded-full"
            />

            <motion.div
                animate={{
                    x: [0, -80, 120, 0],
                    y: [0, 150, -100, 0],
                    scale: [1, 1.3, 0.8, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-200/15 blur-[120px] rounded-full"
            />

            {/* Glossy Orbs - More distinct Frutiger Aero style */}
            <motion.div
                animate={{
                    y: [0, -40, 0],
                    x: [0, 20, 0],
                    rotate: [0, 10, 0]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full bg-gradient-to-br from-white/60 to-sky-400/30 border border-white/40 shadow-xl backdrop-blur-sm overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent h-1/2 rounded-full translate-y-[-10%]" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 60, 0],
                    x: [0, -30, 0],
                    rotate: [0, -15, 0]
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full bg-gradient-to-tr from-white/50 to-emerald-400/20 border border-white/40 shadow-2xl backdrop-blur-md overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-1/2 rounded-full translate-y-[-10%]" />
            </motion.div>

            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[40%] left-[60%] w-24 h-24 rounded-full bg-gradient-to-br from-white/40 to-blue-300/30 border border-white/30 shadow-lg blur-[2px]"
            />

            {/* Subtle Texture */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
    );
};
