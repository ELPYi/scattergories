import React from 'react';
import { useGame } from '../context/GameContext';

export default function RoundResults() {
  const { state, isHost, nextRound } = useGame();

  const sortedPlayers = [...state.playerScores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-accent-400 mb-1">Round {state.currentRound} Results</h1>
          <p className="text-primary-200 text-sm">
            Round {state.currentRound} of {state.totalRounds}
          </p>
        </div>

        {/* Scoreboard */}
        <div className="card mb-4">
          <h3 className="font-bold text-teal-300 mb-3">Scores</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, rank) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  rank === 0 ? 'bg-accent-400/20 border border-accent-400/40' : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg w-6 text-center">
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`}
                  </span>
                  <span className="font-semibold">{p.nickname}</span>
                </div>
                <div className="text-right">
                  <span className="text-teal-300 font-bold">+{p.roundScore}</span>
                  <span className="text-primary-300 text-sm ml-2">({p.totalScore} total)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer breakdown */}
        {state.roundResults && (
          <div className="card mb-4">
            <h3 className="font-bold text-teal-300 mb-3">Answer Breakdown</h3>
            {state.categories.map((cat, catIdx) => {
              const results = state.roundResults![catIdx] || [];
              return (
                <div key={catIdx} className="mb-3 last:mb-0">
                  <p className="text-xs text-primary-300 font-bold mb-1">
                    {catIdx + 1}. {cat}
                  </p>
                  <div className="space-y-1">
                    {results.map((r) => {
                      const player = state.players.find((p) => p.id === r.playerId);
                      return (
                        <div
                          key={r.playerId}
                          className="flex items-center justify-between text-sm px-2 py-1 rounded-lg bg-white/5"
                        >
                          <span className="text-primary-200 text-xs w-20 truncate">
                            {player?.nickname}
                          </span>
                          <span
                            className={`flex-1 text-center font-medium ${
                              !r.valid
                                ? 'text-red-300 line-through'
                                : r.duplicate
                                  ? 'text-accent-400'
                                  : 'text-teal-300'
                            }`}
                          >
                            {r.answer || '-'}
                          </span>
                          <span className="w-12 text-right font-bold">
                            {r.duplicate ? (
                              <span className="text-accent-400 text-xs">DUP</span>
                            ) : (
                              <span className={r.points > 0 ? 'text-teal-300' : 'text-red-300'}>
                                {r.points}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isHost && (
          <button onClick={nextRound} className="btn-accent w-full text-lg py-4">
            Next Round
          </button>
        )}
        {!isHost && (
          <p className="text-center text-primary-300 text-sm italic">
            Waiting for host to continue...
          </p>
        )}
      </div>
    </div>
  );
}
