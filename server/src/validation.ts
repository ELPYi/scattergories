import { ValidationMode, RoundAnswers, VoteState } from './types';
import { normalizeAnswer } from './utils';

export function validateAnswers(
  answers: RoundAnswers,
  letter: string,
  numCategories: number,
  mode: ValidationMode,
  voteState?: VoteState,
  totalPlayers?: number
): { [playerId: string]: { [catIndex: number]: boolean } } {
  const results: { [playerId: string]: { [catIndex: number]: boolean } } = {};
  const lowerLetter = letter.toLowerCase();

  for (const playerId of Object.keys(answers)) {
    results[playerId] = {};
    for (let i = 0; i < numCategories; i++) {
      const answer = answers[playerId]?.[i] || '';
      const normalized = normalizeAnswer(answer);

      if (!normalized) {
        results[playerId][i] = false;
        continue;
      }

      switch (mode) {
        case 'auto':
          results[playerId][i] = normalized.startsWith(lowerLetter);
          break;

        case 'vote':
          if (voteState && totalPlayers !== undefined) {
            const votes = voteState[i]?.[playerId] || {};
            const acceptCount = Object.values(votes).filter((v) => v).length;
            // Majority needed (the answerer doesn't vote on their own)
            const voterCount = totalPlayers - 1;
            results[playerId][i] = voterCount === 0 || acceptCount > voterCount / 2;
          } else {
            results[playerId][i] = true;
          }
          break;
      }
    }
  }

  return results;
}
