'use client';

import { RadioPlayer } from '@/components/RadioPlayer';
import { MenuSidebar } from '@/components/MenuSidebar';
import { ScrollableListeners } from '@/components/ScrollableListeners';
import { Waves } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 z-40 flex items-center gap-3 select-none">
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-lg">
          <Waves className="w-6 h-6 text-sky-600" />
        </div>
        <h1 className="text-2xl font-black tracking-tighter text-sky-900 drop-shadow-sm hidden md:block">
          Wavy <span className="text-sky-500">Radio</span>
        </h1>
      </div>

      {/* Navigation */}
      <MenuSidebar />

      {/* Main Content - Centered Player */}
      <div className="z-10 w-full animate-fade-in">
        <RadioPlayer />
      </div>

      {/* Footer - Scrollable Listeners */}
      <ScrollableListeners />
    </main>
  );
}
