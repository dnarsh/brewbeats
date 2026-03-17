'use client';

import { useState } from 'react';
import { useStore } from '@/store/use-store';
import { Suggestion } from '@/types/advisor';

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { acceptGroup, rejectGroup, acceptGhostNote, rejectGhostNote, lockRejection, applyRemoval, ghostNotes, deleteTrack, composition, askAdvisor, isAdvisorGenerating } = useStore();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  if (!suggestion) return null;

  const isDone = suggestion.status === 'applied' || suggestion.status === 'dismissed';
  const typeColors: Record<string, string> = { add: 'text-green-400', remove: 'text-red-400', modify: 'text-yellow-400', highlight: 'text-blue-400' };
  const typeIcons: Record<string, string> = { add: '+', remove: '−', modify: '~', highlight: '◉' };
  const groupGhosts = (ghostNotes || []).filter(g => g.groupId === suggestion.id);
  const sg = suggestion as any;

  return (
    <div className={`bg-espresso border border-roast-light rounded-lg p-3 mb-2 transition-opacity ${isDone ? 'opacity-40' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-sm font-bold ${typeColors[suggestion.type] || 'text-warm-dim'}`}>{typeIcons[suggestion.type] || '•'}</span>
        <span className="text-xs font-medium text-cream flex-1">{suggestion.title}</span>
        {isDone && <span className="text-[9px] text-warm-dim uppercase">{suggestion.status === 'applied' ? 'Applied' : 'Dismissed'}</span>}
      </div>

      {/* Description */}
      <p className="text-[11px] text-warm-dim leading-relaxed mb-2">{suggestion.description}</p>

      {/* New instrument indicator */}
      {sg.newInstrument && (
        <div className="text-[10px] text-teal-400 bg-teal-900/15 rounded px-2 py-1 mb-2 border border-teal-900/20">
          New instrument: <span className="font-mono font-medium">{sg.newInstrument}</span>
        </div>
      )}

      {/* Remove track indicator */}
      {sg.removeTrack !== undefined && composition && (
        <div className="text-[10px] text-red-400 bg-red-900/15 rounded px-2 py-1 mb-2 border border-red-900/20">
          Remove track: <span className="font-medium">{composition.tracks[sg.removeTrack]?.instrument || `Track ${sg.removeTrack}`}</span>
        </div>
      )}

      {/* Ghost note pills */}
      {groupGhosts.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {groupGhosts.map(gn => {
            if (!gn || !gn.id) return null;
            return (
            <span key={gn.id} className="inline-flex items-center gap-0.5">
              <button
                onClick={() => {
                  if (gn.status === 'pending') acceptGhostNote(gn.id);
                  else if (gn.status === 'accepted') rejectGhostNote(gn.id);
                }}
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                  gn.status === 'accepted' ? 'bg-green-900/30 text-green-400' :
                  gn.status === 'rejected' ? 'bg-red-900/30 text-red-400 line-through' :
                  'bg-roast-light text-cream hover:bg-caramel/20'
                }`}
                title={`${gn.note} at ${gn.time} — ${gn.status}${gn.locked ? ' (locked)' : ''}`}
              >
                {gn.locked ? '⊘ ' : ''}{gn.replacesNote ? `${gn.replacesNote.note}→${gn.note}` : gn.note} {gn.time}
              </button>
              {gn.status === 'rejected' && !gn.locked && (
                <button
                  onClick={() => lockRejection(gn.id)}
                  className="text-[7px] px-1 py-0.5 rounded bg-warm-dim/10 text-warm-dim/50 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  title="Lock — AI won't re-suggest"
                >
                  ⊘
                </button>
              )}
            </span>
          );
          })}
        </div>
      )}

      {/* Highlight pills (for highlight/remove types) */}
      {suggestion.highlights && suggestion.highlights.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestion.highlights.map((h, i) => (
            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
              h.color === 'red' ? 'bg-red-900/20 text-red-400' :
              h.color === 'green' ? 'bg-green-900/20 text-green-400' :
              'bg-yellow-900/20 text-yellow-400'
            }`}>
              {h.note || h.drum || '?'} {h.time}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            {(suggestion.type === 'add' || suggestion.type === 'modify') && groupGhosts.some(g => g.status === 'pending') && (
              <>
                <button onClick={() => acceptGroup(suggestion.id)} className="flex-1 py-1 rounded text-[10px] font-medium bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-900/20 transition-colors">
                  Accept
                </button>
                <button onClick={() => rejectGroup(suggestion.id)} className="flex-1 py-1 rounded text-[10px] font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/20 transition-colors">
                  Reject
                </button>
              </>
            )}
            {suggestion.type === 'remove' && suggestion.highlights && (
              <button
                onClick={() => {
                  if (sg.removeTrack !== undefined) deleteTrack(sg.removeTrack);
                  else applyRemoval(suggestion.highlights!);
                }}
                className="flex-1 py-1 rounded text-[10px] font-medium bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/20 transition-colors"
              >
                {sg.removeTrack !== undefined ? 'Remove Track' : 'Apply Removal'}
              </button>
            )}
            <button
              onClick={() => setReplyOpen(!replyOpen)}
              className="px-2 py-1 rounded text-[10px] font-medium bg-roast-light text-warm-dim hover:text-caramel hover:bg-caramel/10 border border-roast-light transition-colors"
              title="Reply with feedback or counter-suggestion"
            >
              Reply
            </button>
          </div>

          {/* Counter / Reply input */}
          {replyOpen && (
            <div className="flex gap-1">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && replyText.trim() && !isAdvisorGenerating) {
                    askAdvisor(`Regarding your suggestion "${suggestion.title}": ${replyText.trim()}`);
                    setReplyText('');
                    setReplyOpen(false);
                  }
                }}
                disabled={isAdvisorGenerating}
                placeholder="e.g. try Eb instead, make it louder..."
                className="flex-1 bg-espresso border border-roast-light rounded px-2 py-1 text-[10px] text-cream placeholder:text-warm-dim/40 focus:outline-none focus:border-caramel/40 disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={() => {
                  if (replyText.trim() && !isAdvisorGenerating) {
                    askAdvisor(`Regarding your suggestion "${suggestion.title}": ${replyText.trim()}`);
                    setReplyText('');
                    setReplyOpen(false);
                  }
                }}
                disabled={!replyText.trim() || isAdvisorGenerating}
                className="px-2 py-1 rounded bg-caramel/20 text-caramel text-[9px] font-medium hover:bg-caramel/30 disabled:opacity-30 transition-colors"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
