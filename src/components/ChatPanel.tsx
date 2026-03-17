'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '@/store/use-store';
import { GENRE_PRESETS, getInstrumentColor } from '@/types/composition';
import { getInstrumentConfig } from '@/lib/audio/instrument-registry';
import { PromptInput } from './PromptInput';

function CompositionCard({ comp }: { comp: import('@/types/composition').Composition }) {
  return (
    <div className="mt-2 rounded-lg bg-espresso/60 border border-caramel/20 p-2.5 comp-card-stream">
      <div className="flex items-center gap-2 mb-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-caramel">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <span className="text-xs font-semibold text-cream">{comp.title}</span>
      </div>
      <div className="flex gap-3 text-[10px] text-warm-dim mb-2">
        <span>{comp.bpm} BPM</span>
        <span>Key: {comp.key}</span>
        <span>{comp.measures} bars</span>
        <span>{comp.timeSignature}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {comp.tracks.map((track, i) => {
          const color = getInstrumentColor(track.instrument);
          const config = getInstrumentConfig(track.instrument);
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-espresso"
              style={{ backgroundColor: color }}
            >
              {config.icon} {config.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { messages, isGenerating, composition, generate } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-roast border-r border-roast-light">
      {/* Header */}
      <div className="px-4 py-3 border-b border-roast-light flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-caramel" />
        <span className="text-sm font-medium text-cream">Chat</span>
        {composition && (
          <span className="ml-auto text-xs text-warm-dim px-2 py-0.5 bg-roast-light rounded">
            {composition.title}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {!hasMessages && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <h2 className="text-2xl font-bold text-cream mb-1">BrewBeats</h2>
              <p className="text-sm text-warm-dim">Describe the music you want to create</p>
            </div>

            {/* Genre Presets */}
            <div className="space-y-2">
              <p className="text-xs text-warm-dim uppercase tracking-wider">Quick Start</p>
              <div className="grid grid-cols-2 gap-2">
                {GENRE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => generate(preset.prompt)}
                    disabled={isGenerating}
                    className="text-left p-3 rounded-lg bg-roast-light hover:bg-espresso border border-transparent hover:border-caramel/30 transition-all group disabled:opacity-50 hover-lift"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{preset.icon}</span>
                      <span className="text-sm font-medium text-cream group-hover:text-caramel transition-colors">
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-xs text-warm-dim leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`animate-fade-in ${
              msg.role === 'user' ? 'flex justify-end' : ''
            }`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-dusk/40 text-cream rounded-br-sm'
                  : 'bg-roast-light text-warm-white rounded-bl-sm'
              }`}
            >
              {msg.content && (
                <div className="chat-markdown">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              {msg.composition && <CompositionCard comp={msg.composition} />}
              <span className="text-[10px] text-warm-dim mt-1 block">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="animate-fade-in flex items-center gap-2 text-warm-dim text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-caramel animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Brewing your beat...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <PromptInput />
    </div>
  );
}
