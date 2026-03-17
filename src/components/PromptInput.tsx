'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/use-store';

/** Parse a duration string like "1 min", "30s", "2:30", "90 seconds" into seconds */
function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // "2:30" format (min:sec)
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);

  // "90s", "90 sec", "90 seconds"
  const secMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)$/);
  if (secMatch) return parseFloat(secMatch[1]);

  // "1.5m", "1.5 min", "1.5 minutes", "2 min"
  const minMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes?)$/);
  if (minMatch) return parseFloat(minMatch[1]) * 60;

  // Plain number — treat as seconds
  const numMatch = s.match(/^(\d+(?:\.\d+)?)$/);
  if (numMatch) return parseFloat(numMatch[1]);

  return null;
}

export function PromptInput() {
  const [input, setInput] = useState('');
  const [duration, setDuration] = useState('');
  const [showDuration, setShowDuration] = useState(false);
  const { generate, isGenerating, initAudio, audioReady, bpm } = useStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const parsedSeconds = parseDuration(duration);

  const handleSubmit = async () => {
    if (!input.trim() || isGenerating) return;

    if (!audioReady) {
      await initAudio();
    }

    let prompt = input.trim();

    // Append duration context if specified
    if (parsedSeconds && parsedSeconds > 0) {
      const beatsPerMeasure = 4; // default 4/4
      const measures = Math.ceil(parsedSeconds * bpm / 60 / beatsPerMeasure);
      prompt += `\n\n[TARGET DURATION: ${parsedSeconds} seconds — generate exactly ${measures} measures at ${bpm} BPM to fill this duration]`;
    }

    setInput('');
    setDuration('');
    generate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 border-t border-roast-light">
      {/* Duration input row */}
      {showDuration && (
        <div className="flex items-center gap-2 mb-2 animate-fade-in">
          <span className="text-[10px] text-warm-dim uppercase tracking-wider whitespace-nowrap">Duration</span>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 1 min, 30s, 2:30"
            disabled={isGenerating}
            className="flex-1 bg-espresso text-cream text-xs px-2 py-1.5 rounded border border-roast-light focus:border-caramel/50 outline-none placeholder:text-warm-dim/40 disabled:opacity-50"
          />
          {parsedSeconds !== null && parsedSeconds > 0 && (
            <span className="text-[10px] text-caramel whitespace-nowrap">
              ~{Math.ceil(parsedSeconds * bpm / 60 / 4)} bars
            </span>
          )}
          <button
            onClick={() => { setShowDuration(false); setDuration(''); }}
            className="text-warm-dim hover:text-cream text-xs"
            title="Remove duration"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-espresso rounded-lg border border-roast-light focus-within:border-caramel/50 transition-colors">
        {/* Duration toggle */}
        <button
          onClick={() => setShowDuration(!showDuration)}
          disabled={isGenerating}
          className={`p-2.5 transition-colors disabled:opacity-30 ${
            showDuration ? 'text-caramel' : 'text-warm-dim/50 hover:text-warm-dim'
          }`}
          title="Set target duration (optional)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? 'Generating...' : 'Describe your beat... (Shift+Enter for new line)'}
          disabled={isGenerating}
          rows={1}
          className="flex-1 bg-transparent text-warm-white text-sm py-2.5 resize-none outline-none placeholder:text-warm-dim/60 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isGenerating || !input.trim()}
          className="p-2.5 text-caramel hover:text-cream disabled:text-warm-dim/30 transition-colors"
          title="Send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
