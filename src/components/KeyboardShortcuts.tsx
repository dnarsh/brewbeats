'use client';

import { useEffect } from 'react';
import * as Tone from 'tone';
import { useStore } from '@/store/use-store';

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      const state = useStore.getState();
      if (state.editorOpen) return; // Editor handles its own shortcuts

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state.composition && !state.isGenerating && !state.isStreamingTracks) {
            state.togglePlayPause();
          }
          break;
        case 'Escape':
          e.preventDefault();
          state.stop();
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              state.redo();
            } else {
              state.undo();
            }
          }
          break;
        case 'KeyY':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            state.redo();
          }
          break;

        // Arrow keys: rewind/forward when playing, scroll timeline when not
        case 'ArrowLeft': {
          e.preventDefault();
          if (state.isPlaying && state.composition) {
            const transport = Tone.getTransport();
            transport.seconds = Math.max(0, transport.seconds - 5);
          } else {
            const tl = document.querySelector('.timeline-scroll');
            if (tl) tl.scrollBy({ left: -80, behavior: 'smooth' });
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (state.isPlaying && state.composition) {
            const transport = Tone.getTransport();
            const bpm = state.bpm || 90;
            const bpb = parseInt(state.composition.timeSignature?.split('/')[0]) || 4;
            const totalSec = (state.composition.measures * bpb * 60) / bpm;
            transport.seconds = Math.min(totalSec - 0.1, transport.seconds + 5);
          } else {
            const tl = document.querySelector('.timeline-scroll');
            if (tl) tl.scrollBy({ left: 80, behavior: 'smooth' });
          }
          break;
        }

        // WASD + ArrowUp/Down: always scroll timeline
        case 'KeyW':
        case 'ArrowUp': {
          const tl = document.querySelector('.timeline-scroll');
          if (tl) { e.preventDefault(); tl.scrollBy({ top: -60, behavior: 'smooth' }); }
          break;
        }
        case 'KeyS':
        case 'ArrowDown': {
          const tl = document.querySelector('.timeline-scroll');
          if (tl) { e.preventDefault(); tl.scrollBy({ top: 60, behavior: 'smooth' }); }
          break;
        }
        case 'KeyA': {
          const tl = document.querySelector('.timeline-scroll');
          if (tl) { e.preventDefault(); tl.scrollBy({ left: -80, behavior: 'smooth' }); }
          break;
        }
        case 'KeyD': {
          const tl = document.querySelector('.timeline-scroll');
          if (tl) { e.preventDefault(); tl.scrollBy({ left: 80, behavior: 'smooth' }); }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
