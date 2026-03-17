'use client';

/**
 * FUSION PAGE — Showcase landing + BrewBeats studio
 *
 * This is a separate file from page.tsx. To use this as the main page:
 *   1. Rename the original page.tsx → page-original.tsx
 *   2. Rename this file → page.tsx
 *
 * The original page.tsx uses BrewBeatsScroll as the landing.
 * This version uses the cinematic showcase slides instead.
 * All studio/app code remains identical.
 */

import { useState, useEffect } from 'react';
import { useStore } from '@/store/use-store';
import { ShowcaseLanding } from '@/components/ShowcaseLanding';
import { BeatEditor } from '@/components/BeatEditor';
import { Header } from '@/components/Header';
import { ChatPanel } from '@/components/ChatPanel';
import { Timeline } from '@/components/Timeline';
import { Mixer } from '@/components/Mixer';
import { Transport } from '@/components/Transport';
import { Settings } from '@/components/Settings';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { EffectsSidebar } from '@/components/EffectsSidebar';
import { StudioVisualizer } from '@/components/StudioVisualizer';

export default function HomeShowcase() {
  const showLanding = useStore((s) => s.showLanding);
  const enterApp = useStore((s) => s.enterApp);
  const [hydrated, setHydrated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverBottom, setHoverBottom] = useState(false);
  const [hoverTop, setHoverTop] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  if (!hydrated) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#b0a090' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.3 }}>&#9835;</div>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.1em' }}>Loading BrewBeats...</div>
      </div>
    </div>
  );

  // ── SHOWCASE LANDING (instead of BrewBeatsScroll) ──
  if (showLanding) {
    return <ShowcaseLanding onEnterApp={enterApp} />;
  }

  if (isFullscreen) {
    return (
      <div className="h-screen flex flex-col overflow-hidden relative studio-shell bg-espresso">
        <StudioVisualizer />
        <KeyboardShortcuts />
        <Settings />

        <div
          className="fixed top-0 left-0 right-0 z-[200] h-2"
          onMouseEnter={() => setHoverTop(true)}
        />
        <div
          className={`fixed top-0 left-0 right-0 z-[150] transition-transform duration-300 ${
            hoverTop ? 'translate-y-0' : '-translate-y-full'
          }`}
          onMouseEnter={() => setHoverTop(true)}
          onMouseLeave={() => setHoverTop(false)}
        >
          <Header />
        </div>

        <div
          className="fixed top-0 left-0 bottom-0 z-[140] w-2"
          onMouseEnter={() => setHoverLeft(true)}
        />
        <div
          className={`fixed top-0 left-0 bottom-0 z-[130] w-[340px] transition-transform duration-300 ${
            hoverLeft ? 'translate-x-0' : '-translate-x-full'
          }`}
          onMouseEnter={() => setHoverLeft(true)}
          onMouseLeave={() => setHoverLeft(false)}
        >
          <div className="h-full shadow-2xl shadow-black/50">
            <ChatPanel />
          </div>
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 z-[140] h-2"
          onMouseEnter={() => setHoverBottom(true)}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 z-[130] transition-transform duration-300 ${
            hoverBottom ? 'translate-y-0' : 'translate-y-full'
          }`}
          onMouseEnter={() => setHoverBottom(true)}
          onMouseLeave={() => setHoverBottom(false)}
        >
          <div className="shadow-2xl shadow-black/50">
            <Transport onToggleFullscreen={() => setIsFullscreen(false)} isFullscreen={true} />
            <Mixer />
          </div>
        </div>

        <EffectsSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Timeline />
        </div>

        <div className="fixed top-3 right-16 z-[100] text-warm-dim/30 text-[10px] pointer-events-none">
          ESC to exit fullscreen
        </div>
        <BeatEditor />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative studio-shell">
      <StudioVisualizer />
      <KeyboardShortcuts />
      <Settings />

      <div className="relative z-[100]">
        <Header />
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative z-[1]">
        <div className="w-[340px] min-w-[280px] max-w-[400px] flex-none overflow-hidden">
          <ChatPanel />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Timeline />
        </div>
      </div>

      <Transport onToggleFullscreen={() => setIsFullscreen(true)} isFullscreen={false} />

      <Mixer />

      <EffectsSidebar />
      <BeatEditor />
    </div>
  );
}
