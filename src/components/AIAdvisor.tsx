'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/use-store';
import { SuggestionCard } from './SuggestionCard';

const PRO_QUESTIONS = [
  { label: 'Review my beat', prompt: 'Review my composition like a pro producer. What works, what needs fixing?' },
  { label: 'Fix harmony', prompt: 'Check if all notes are in key and the chord progression makes sense. Fix any clashing notes by suggesting modified pitches.' },
  { label: 'Add melody', prompt: 'Suggest a counter-melody or lead melody that complements what I have.' },
  { label: 'Improve drums', prompt: 'Make the drum pattern more interesting — add fills, ghost notes, or hat variations.' },
  { label: 'Fill gaps', prompt: 'Find any empty measures or gaps where instruments drop out and fill them.' },
  { label: 'Add instrument', prompt: 'Suggest a new instrument that would fill out the frequency spectrum.' },
  { label: 'Fix dynamics', prompt: 'Review the velocity/dynamics of all tracks. Modify notes that are too loud or too soft — adjust velocity values to create better dynamic range and groove.' },
  { label: 'More groove', prompt: 'Make the beat groove harder — adjust swing, syncopation, or rhythmic feel. Use modify suggestions to shift timing or change note durations.' },
  { label: 'Simplify', prompt: 'The beat feels too busy. Suggest which notes or instruments to remove.' },
];

export function AIAdvisor() {
  const {
    advisorOpen, advisorMessages, isAdvisorGenerating, ghostNotes, ghostOnlyView,
    askAdvisor, clearAdvisor, acceptAllGhosts, rejectAllGhosts, toggleAdvisor, toggleGhostOnlyView,
  } = useStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [advisorMessages]);

  const handleSend = (text?: string) => {
    const q = (text || input).trim();
    if (!q || isAdvisorGenerating) return;
    setInput('');
    askAdvisor(q);
  };

  if (!advisorOpen) return null;

  const pendingGhosts = ghostNotes.filter(g => g.status === 'pending');

  return (
    <div className="flex flex-col border-l border-roast-light" style={{ width: 'min(300px, 28vw)', minWidth: 220, background: '#1a1210' }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-roast-light flex items-center justify-between flex-none">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--caramel)" strokeWidth="2" strokeLinecap="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
          <span className="text-[11px] text-cream font-medium">AI Advisor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleGhostOnlyView}
            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${ghostOnlyView ? 'bg-caramel/20 text-caramel' : 'text-warm-dim hover:text-cream hover:bg-roast-light'}`}
            title={ghostOnlyView ? 'Show all notes' : 'Show AI notes only'}
          >
            {ghostOnlyView ? '◈ AI View' : '◈'}
          </button>
          <button onClick={clearAdvisor} className="text-[9px] text-warm-dim hover:text-cream px-1.5 py-0.5 rounded hover:bg-roast-light transition-colors" title="Clear all">Clear</button>
          <button onClick={toggleAdvisor} className="w-5 h-5 rounded text-warm-dim hover:text-cream flex items-center justify-center" title="Close">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>
      </div>

      {/* Pro quick questions — always visible at top */}
      <div className="px-2 py-2 border-b border-roast-light flex-none">
        <div className="flex flex-wrap gap-1">
          {PRO_QUESTIONS.map(q => (
            <button
              key={q.label}
              onClick={() => handleSend(q.prompt)}
              disabled={isAdvisorGenerating}
              className="text-[9px] px-2 py-1 rounded-full border border-roast-light text-warm-dim hover:text-caramel hover:border-caramel/30 hover:bg-caramel/5 disabled:opacity-30 transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages + Cards */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {advisorMessages.length === 0 && (
          <div className="text-center py-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warm-dim)" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-2 opacity-30"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
            <p className="text-[10px] text-warm-dim/50">Click a question above or type your own below</p>
          </div>
        )}

        {advisorMessages.map(msg => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end mb-1">
                <div className="bg-caramel/10 border border-caramel/15 rounded-lg px-3 py-1.5 max-w-[90%]">
                  <p className="text-[11px] text-cream">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <p className="text-[11px] text-warm-dim leading-relaxed mb-2">{msg.content}</p>
                {msg.suggestions?.map(sg => {
                  try {
                    if (!sg || !sg.id) return null;
                    return <SuggestionCard key={sg.id} suggestion={sg} />;
                  } catch { return null; }
                })}
              </div>
            )}
          </div>
        ))}

        {isAdvisorGenerating && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-caramel animate-pulse" />
            <span className="text-[10px] text-warm-dim">Analyzing your composition...</span>
          </div>
        )}
      </div>

      {/* Global accept/reject bar */}
      {pendingGhosts.length > 0 && (
        <div className="px-3 py-1.5 border-t border-roast-light flex gap-1.5 flex-none">
          <button onClick={acceptAllGhosts} className="flex-1 py-1 rounded text-[10px] font-medium bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors">
            Accept All ({pendingGhosts.length})
          </button>
          <button onClick={rejectAllGhosts} className="flex-1 py-1 rounded text-[10px] font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors">
            Reject All
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-roast-light flex gap-1.5 flex-none">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          disabled={isAdvisorGenerating}
          placeholder={isAdvisorGenerating ? 'Thinking...' : 'Ask anything about your beat...'}
          className="flex-1 bg-espresso border border-roast-light rounded px-2 py-1.5 text-[11px] text-cream placeholder:text-warm-dim/40 focus:outline-none focus:border-caramel/40 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isAdvisorGenerating}
          className="px-2 py-1.5 rounded bg-caramel/20 text-caramel text-[10px] font-medium hover:bg-caramel/30 disabled:opacity-30 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
