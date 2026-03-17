'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/store/use-store';
import { EditorToolbar } from './EditorToolbar';
import { InstrumentBrowser } from './InstrumentBrowser';
import { EditorGrid } from './EditorGrid';
import { AIAdvisor } from './AIAdvisor';

export function BeatEditor() {
  const editorOpen = useStore(s => s.editorOpen);
  const closeEditor = useStore(s => s.closeEditor);
  const setEditorTool = useStore(s => s.setEditorTool);
  const composition = useStore(s => s.composition);
  const isGenerating = useStore(s => s.isGenerating);
  const isStreamingTracks = useStore(s => s.isStreamingTracks);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    switch (e.key) {
      case '1': setEditorTool('pencil'); break;
      case '2': setEditorTool('eraser'); break;
      case '3': setEditorTool('select'); break;
      case ' ':
        e.preventDefault(); // Prevent page scroll, but don't play in editor
        break;
      case 'Escape': closeEditor(); break;
    }
  }, [setEditorTool, closeEditor]);

  useEffect(() => {
    if (!editorOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorOpen, handleKeyDown]);

  // Auto-close editor if generation starts while open
  useEffect(() => {
    if (editorOpen && (isGenerating || isStreamingTracks || !composition)) {
      closeEditor();
    }
  }, [editorOpen, isGenerating, isStreamingTracks, composition, closeEditor]);

  // Don't render unless explicitly opened with valid composition
  if (!editorOpen || !composition || isGenerating || isStreamingTracks) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: '#1a1210' }}>
      <EditorToolbar />
      <div className="flex-1 flex overflow-hidden">
        <InstrumentBrowser />
        <EditorGrid />
        <AIAdvisor />
      </div>
    </div>
  );
}
