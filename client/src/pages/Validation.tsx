import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Validation() {
  const { state, submitVotes } = useGame();
  const [votes, setVotes] = useState<{ [catIndex: number]: { [playerId: string]: boolean } }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!state.answersForVoting) return null;

  const allPlayers = Object.entries(state.answersForVoting);
  const otherPlayers = allPlayers.filter(([pid]) => pid !== state.playerId);
  const myData = state.answersForVoting[state.playerId!];

  // Compute duplicates per category: normalized answer -> list of player IDs
  const duplicatesPerCat: { [catIdx: number]: Set<string> } = {};
  for (let catIdx = 0; catIdx < state.categories.length; catIdx++) {
    const answerMap = new Map<string, string[]>();
    for (const [pid, data] of allPlayers) {
      const raw = (data.answers[catIdx] || '').trim().toLowerCase();
      if (!raw) continue;
      const existing = answerMap.get(raw) || [];
      existing.push(pid);
      answerMap.set(raw, existing);
    }
    const dupSet = new Set<string>();
    for (const pids of answerMap.values()) {
      if (pids.length > 1) pids.forEach((pid) => dupSet.add(pid));
    }
    duplicatesPerCat[catIdx] = dupSet;
  }

  const isDuplicate = (catIdx: number, pid: string): boolean =>
    duplicatesPerCat[catIdx]?.has(pid) ?? false;

  const toggleVote = (catIndex: number, playerId: string) => {
    setVotes((prev) => {
      const catVotes = prev[catIndex] || {};
      return {
        ...prev,
        [catIndex]: {
          ...catVotes,
          [playerId]: catVotes[playerId] === undefined ? false : !catVotes[playerId],
        },
      };
    });
  };

  const getVote = (catIndex: number, playerId: string): boolean => {
    return votes[catIndex]?.[playerId] ?? true; // Default to accept
  };

  const handleSubmit = () => {
    // Fill in default votes (true) for anything not explicitly set
    // Blank answers are auto-rejected (false)
    const fullVotes: { [catIndex: number]: { [playerId: string]: boolean } } = {};
    for (let i = 0; i < state.categories.length; i++) {
      fullVotes[i] = {};
      for (const [pid, data] of otherPlayers) {
        const answer = (data.answers[i] || '').trim();
        const isDup = isDuplicate(i, pid);
        fullVotes[i][pid] = (answer && !isDup) ? getVote(i, pid) : false;
      }
    }
    submitVotes(fullVotes);
    setSubmitted(true);
  };

  const connectedCount = state.players.filter((p) => p.connected).length;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center animate-fade-in">
          <p className="font-display text-2xl text-teal-300 mb-2">Votes Submitted!</p>
          <p className="text-primary-200">Waiting for other players...</p>
          <p className="text-primary-300 text-sm mt-2">
            {state.votedCount}/{connectedCount} voted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-accent-400 mb-1">Vote on Answers</h1>
          <p className="text-primary-200 text-sm">
            Tap to reject answers that don't fit. Green = accept, Red = reject.
          </p>
        </div>

        {state.categories.map((cat, catIdx) => {
          const myAnswer = myData ? (myData.answers[catIdx] || '').trim() : '';
          const myIsBlank = !myAnswer;
          const myIsDup = myData ? isDuplicate(catIdx, state.playerId!) : false;

          return (
            <div key={catIdx} className="card mb-3">
              <h3 className="font-bold text-teal-300 text-sm mb-2">
                {catIdx + 1}. {cat}
              </h3>
              <div className="space-y-1">
                {/* Own answer — read-only */}
                {myData && (
                  <div
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                      myIsBlank
                        ? 'bg-primary-700/40 border border-primary-600/30 opacity-50'
                        : myIsDup
                          ? 'bg-accent-400/15 border border-accent-400/40'
                          : 'bg-primary-600/20 border border-primary-400/30'
                    }`}
                  >
                    <span className="text-primary-300 text-xs">You</span>
                    <span className={`font-semibold ${
                      myIsBlank
                        ? 'text-primary-400 italic'
                        : myIsDup
                          ? 'text-accent-400'
                          : 'text-primary-200'
                    }`}>
                      {myIsBlank ? 'No answer' : myIsDup ? `${myAnswer} (duplicate)` : myAnswer}
                    </span>
                    <span className="text-primary-400 text-xs">—</span>
                  </div>
                )}

                {/* Other players — votable */}
                {otherPlayers.map(([pid, data]) => {
                  const answer = (data.answers[catIdx] || '').trim();
                  const isBlank = !answer;
                  const isDup = isDuplicate(catIdx, pid);
                  const accepted = (isBlank || isDup) ? false : getVote(catIdx, pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => !isBlank && !isDup && toggleVote(catIdx, pid)}
                      disabled={isBlank || isDup}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                        isBlank
                          ? 'bg-primary-700/40 border border-primary-600/30 opacity-50 cursor-not-allowed'
                          : isDup
                            ? 'bg-accent-400/15 border border-accent-400/40 cursor-not-allowed'
                            : accepted
                              ? 'bg-teal-500/20 border border-teal-500/40'
                              : 'bg-red-500/20 border border-red-500/40'
                      }`}
                    >
                      <span className="text-primary-200 text-xs">{data.nickname}</span>
                      <span className={`font-semibold ${
                        isBlank
                          ? 'text-primary-400 italic'
                          : isDup
                            ? 'text-accent-400'
                            : accepted ? 'text-teal-300' : 'text-red-300 line-through'
                      }`}>
                        {isBlank ? 'No answer' : isDup ? `${answer} (duplicate)` : answer}
                      </span>
                      <span>{isBlank ? '—' : isDup ? '—' : accepted ? '✓' : '✗'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button onClick={handleSubmit} className="btn-accent w-full text-lg py-4 mt-4">
          Submit Votes
        </button>
      </div>
    </div>
  );
}
