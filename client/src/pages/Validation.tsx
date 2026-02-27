import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useI18n } from '../context/I18nContext';
import { translateCategory } from '../lib/categoryTranslations';

export default function Validation() {
  const { state, submitVotes } = useGame();
  const { t, language } = useI18n();
  const [votes, setVotes] = useState<{ [catIndex: number]: { [playerId: string]: boolean } }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!state.answersForVoting) return null;

  const allPlayers = Object.entries(state.answersForVoting);
  const otherPlayers = allPlayers.filter(([pid]) => pid !== state.playerId);
  const myData = state.answersForVoting[state.playerId!];

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
    return votes[catIndex]?.[playerId] ?? true;
  };

  const handleSubmit = () => {
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
          <p className="font-display text-2xl text-teal-300 mb-2">{t('validation.votesSubmitted')}</p>
          <p className="text-primary-200">{t('validation.waitingForOthers')}</p>
          <p className="text-primary-300 text-sm mt-2">
            {t('validation.votedCount', { voted: state.votedCount, total: connectedCount })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-accent-400 mb-1">{t('validation.voteOnAnswers')}</h1>
          <p className="text-primary-200 text-sm">{t('validation.instructions')}</p>
        </div>

        {state.categories.map((cat, catIdx) => {
          const myAnswer = myData ? (myData.answers[catIdx] || '').trim() : '';
          const myIsBlank = !myAnswer;
          const myIsDup = myData ? isDuplicate(catIdx, state.playerId!) : false;

          return (
            <div key={catIdx} className="card mb-3">
              <h3 className="font-bold text-teal-300 text-sm mb-2">
                {catIdx + 1}. {translateCategory(cat, language)}
              </h3>
              <div className="space-y-1">
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
                    <span className="text-primary-300 text-xs">{t('validation.you')}</span>
                    <span className={`font-semibold ${
                      myIsBlank
                        ? 'text-primary-400 italic'
                        : myIsDup
                          ? 'text-accent-400'
                          : 'text-primary-200'
                    }`}>
                      {myIsBlank ? t('validation.noAnswer') : myIsDup ? `${myAnswer} ${t('validation.duplicateSuffix')}` : myAnswer}
                    </span>
                    <span className="text-primary-400 text-xs">-</span>
                  </div>
                )}

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
                        {isBlank ? t('validation.noAnswer') : isDup ? `${answer} ${t('validation.duplicateSuffix')}` : answer}
                      </span>
                      <span>{isBlank ? '-' : isDup ? '-' : accepted ? 'OK' : 'X'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button onClick={handleSubmit} className="btn-accent w-full text-lg py-4 mt-4">
          {t('validation.submitVotes')}
        </button>
      </div>
    </div>
  );
}
