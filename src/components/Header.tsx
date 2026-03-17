'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/use-store';

export function Header() {
  const { toggleSettings, goToLanding, openEditor, composition, currentSessionId, sessionList, createSession, switchSession, renameSession, deleteSession } = useStore();
  const [showSessions, setShowSessions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessionList.find((s) => s.id === currentSessionId);

  const closeDropdown = () => {
    setShowSessions(false);
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  // Focus rename input
  useEffect(() => {
    if (editingId && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editingId]);

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameSession(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    setConfirmDeleteId(null);
  };

  const handleNewSession = () => {
    createSession();
    setShowSessions(false);
  };

  return (
    <header className="bg-roast border-b border-roast-light px-4 py-2.5 flex items-center justify-between relative z-[1]">
      <div className="flex items-center gap-2.5">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-caramel via-gold to-dusk flex items-center justify-center shadow-[0_0_10px_rgba(232,192,108,0.25)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1210" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold text-cream leading-none">BrewBeats</h1>
          <p className="text-[10px] text-warm-dim leading-none mt-0.5">AI Music Studio</p>
        </div>
      </div>

      {/* Session selector (center) */}
      <div className="relative">
        <button
          onClick={() => setShowSessions(!showSessions)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-roast-light hover:bg-espresso border border-roast-light hover:border-caramel/30 transition-all text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-caramel">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-cream max-w-[180px] truncate">{currentSession?.name || 'Untitled'}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-warm-dim transition-transform ${showSessions ? 'rotate-180' : ''}`}>
            <polygon points="0,3 10,3 5,8" />
          </svg>
        </button>

        {/* Dropdown with backdrop */}
        {showSessions && (
          <>
            {/* Invisible backdrop — closes dropdown on any outside click */}
            <div className="fixed inset-0 z-40" onClick={closeDropdown} />

            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-[340px] bg-roast border border-roast-light rounded-xl shadow-2xl overflow-hidden z-50">
              {/* New session button */}
              <button
                onClick={handleNewSession}
                className="w-full px-4 py-2.5 text-left text-sm text-caramel hover:bg-roast-light/50 transition-colors flex items-center gap-2 border-b border-roast-light/50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Session
              </button>

              {/* Session list */}
              <div className="max-h-[280px] overflow-y-auto">
                {sessionList.length === 0 && (
                  <div className="px-4 py-3 text-xs text-warm-dim text-center">No sessions yet</div>
                )}
                {sessionList.map((s) => (
                  <div key={s.id}>
                    {/* Delete confirmation bar */}
                    {confirmDeleteId === s.id ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-red-900/20 border-b border-red-900/30">
                        <span className="text-xs text-red-300 flex-1">Delete &ldquo;{s.name}&rdquo;?</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-red-600/80 text-white hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-roast-light text-warm-dim hover:text-cream transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-1.5 px-3 py-2.5 hover:bg-roast-light/40 transition-colors ${
                          s.id === currentSessionId ? 'bg-caramel/8' : ''
                        }`}
                      >
                        {editingId === s.id ? (
                          <input
                            ref={inputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => handleRename(s.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(s.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 bg-espresso text-cream text-sm px-2 py-1 rounded border border-caramel/30 outline-none"
                          />
                        ) : (
                          <>
                            {/* Session info — click to switch */}
                            <button
                              onClick={() => { switchSession(s.id); closeDropdown(); }}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                {s.id === currentSessionId && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-caramel flex-none" />
                                )}
                                <span className="text-sm text-cream truncate">{s.name}</span>
                              </div>
                              <span className="text-[10px] text-warm-dim/50 ml-3.5">
                                {new Date(s.updatedAt).toLocaleDateString()} {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </button>

                            {/* Rename button */}
                            <button
                              onClick={() => { setEditingId(s.id); setEditName(s.name); }}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-warm-dim/60 hover:text-caramel hover:bg-roast-light transition-all flex-none"
                              title="Rename session"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => setConfirmDeleteId(s.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-warm-dim/60 hover:text-red-400 hover:bg-red-400/10 transition-all flex-none"
                              title="Delete session"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-warm-dim/50 px-2 py-0.5 rounded bg-roast-light">
          Local AI Engine
        </span>
        <button
          onClick={goToLanding}
          className="w-8 h-8 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-cream flex items-center justify-center transition-colors"
          title="Home"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
        {/* Beat Editor button */}
        <button
          onClick={openEditor}
          disabled={!composition}
          className="w-8 h-8 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-caramel disabled:opacity-30 flex items-center justify-center transition-colors"
          title="Beat Editor"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        {/* Help / Guide button */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-8 h-8 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-caramel flex items-center justify-center transition-colors"
          title="Help & Guide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <button
          onClick={toggleSettings}
          className="w-8 h-8 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-cream flex items-center justify-center transition-colors"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Help Guide Modal */}
      {showHelp && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowHelp(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-roast border border-roast-light rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[80vh] overflow-y-auto pointer-events-auto">
              {/* Header */}
              <div className="sticky top-0 bg-roast border-b border-roast-light/50 px-5 py-3.5 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-caramel">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <h2 className="text-sm font-bold text-cream">BrewBeats Guide</h2>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-7 h-7 rounded-lg bg-roast-light hover:bg-espresso text-warm-dim hover:text-cream flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Chat Panel */}
                <section>
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-wider mb-1.5">Chat Panel (Left)</h3>
                  <p className="text-[11px] text-cream/80 leading-relaxed">
                    Describe what you want to hear in plain language. The AI generates a full multi-track composition from your prompt.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-cream/60">
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span>Try: &quot;chill lo-fi beat with piano and soft drums&quot;</li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span>Modify: &quot;add a guitar&quot;, &quot;make it faster&quot;, &quot;remove bass&quot;</li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span>Duration: &quot;make it 1 minute long&quot;, &quot;30 seconds&quot;</li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span>Genre presets available via the clock icon in the input</li>
                  </ul>
                </section>

                {/* Timeline */}
                <section>
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-wider mb-1.5">Composition Timeline (Center)</h3>
                  <p className="text-[11px] text-cream/80 leading-relaxed">
                    Visual piano-roll showing all tracks and their notes over time.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-cream/60">
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Colored blocks</strong> = notes. Width = duration, position = timing</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Labels inside blocks</strong> = note pitch (C4, E3, etc.)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">K, H, S</strong> in drum rows = Kick, Hihat, Snare</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Thin vertical line</strong> = playhead (current position)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Faint grid lines</strong> = subdivisions (16th notes)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Bold grid lines</strong> = measure boundaries</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span>Click any empty cell to add a note, click a note to remove it</li>
                  </ul>
                </section>

                {/* Transport */}
                <section>
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-wider mb-1.5">Transport Bar (Bottom)</h3>
                  <ul className="mt-1 space-y-1 text-[11px] text-cream/60">
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Stop / Play</strong> = control playback (Space bar shortcut)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">BPM</strong> = tempo (beats per minute). Use +/- to adjust</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Swing</strong> = shuffle feel (0% = straight, higher = more swing)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Key / Time / Bars</strong> = composition metadata</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Undo / Redo</strong> = revert or restore changes</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Export</strong> = download as .wav audio file</span></li>
                  </ul>
                </section>

                {/* Mixer */}
                <section>
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-wider mb-1.5">Mixer (Bottom Panel)</h3>
                  <p className="text-[11px] text-cream/80 leading-relaxed">
                    Per-track audio controls. Click the arrow to expand/collapse.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-cream/60">
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Volume slider</strong> = track loudness (0-100%)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Rev</strong> = reverb amount (room echo effect)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">Dly</strong> = delay amount (echo/repeat effect)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">M</strong> = mute (silence this track)</span></li>
                    <li className="flex gap-1.5"><span className="text-caramel">&#8226;</span><span><strong className="text-cream/80">S</strong> = solo (hear only this track)</span></li>
                  </ul>
                </section>

                {/* Keyboard Shortcuts */}
                <section>
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-wider mb-1.5">Keyboard Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-cream/60">Play / Pause</span><kbd className="text-cream/80 bg-espresso px-1.5 py-0.5 rounded text-[10px]">Space</kbd></div>
                    <div className="flex justify-between"><span className="text-cream/60">Undo</span><kbd className="text-cream/80 bg-espresso px-1.5 py-0.5 rounded text-[10px]">Ctrl+Z</kbd></div>
                    <div className="flex justify-between"><span className="text-cream/60">Redo</span><kbd className="text-cream/80 bg-espresso px-1.5 py-0.5 rounded text-[10px]">Ctrl+Y</kbd></div>
                    <div className="flex justify-between"><span className="text-cream/60">Export WAV</span><kbd className="text-cream/80 bg-espresso px-1.5 py-0.5 rounded text-[10px]">Ctrl+E</kbd></div>
                  </div>
                </section>

                {/* Tips */}
                <section className="border-t border-roast-light/50 pt-4">
                  <h3 className="text-xs font-bold text-dusk uppercase tracking-wider mb-1.5">Pro Tips</h3>
                  <ul className="space-y-1 text-[11px] text-cream/60">
                    <li className="flex gap-1.5"><span className="text-dusk">&#9733;</span>Be specific: &quot;jazzy piano with walking bass at 110 BPM in Bb minor&quot;</li>
                    <li className="flex gap-1.5"><span className="text-dusk">&#9733;</span>Modify iteratively: start simple, then &quot;add strings&quot;, &quot;more reverb&quot;</li>
                    <li className="flex gap-1.5"><span className="text-dusk">&#9733;</span>Use Solo (S) to isolate tracks and hear them individually</li>
                    <li className="flex gap-1.5"><span className="text-dusk">&#9733;</span>Sessions auto-save — switch between projects anytime</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
