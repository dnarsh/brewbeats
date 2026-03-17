'use client';

import { useEffect } from 'react';

interface ShowcaseLandingProps {
  onEnterApp: () => void;
}

export function ShowcaseLanding({ onEnterApp }: ShowcaseLandingProps) {
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'brewbeats-enter-app') {
        onEnterApp();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnterApp]);

  // Force html/body to allow the iframe to fill viewport
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <iframe
      src="/showcase.html"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
        zIndex: 9999,
        background: '#0a0908',
      }}
      title="BrewBeats Showcase"
      allow="autoplay"
    />
  );
}
