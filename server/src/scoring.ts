import { RoundAnswers, RoundResult, CategoryResult } from './types';
import { normalizeAnswer } from './utils';

export function calculateRoundResults(
  answers: RoundAnswers,
  validationResults: { [playerId: string]: { [catIndex: number]: boolean } },
  numCategories: number
): RoundResult {
  const results: RoundResult = {};

  for (let catIndex = 0; catIndex < numCategories; catIndex++) {
    const catResults: CategoryResult[] = [];

    // Collect all valid answers for this category
    const validAnswers: { playerId: string; answer: string; normalized: string }[] = [];
    for (const playerId of Object.keys(answers)) {
      const rawAnswer = answers[playerId]?.[catIndex] || '';
      const normalized = normalizeAnswer(rawAnswer);
      const isValid = validationResults[playerId]?.[catIndex] ?? false;

      if (isValid && normalized) {
        validAnswers.push({ playerId, answer: rawAnswer, normalized });
      }
    }

    // Find duplicates (same normalized answer)
    const answerCounts = new Map<string, string[]>();
    for (const va of validAnswers) {
      const existing = answerCounts.get(va.normalized) || [];
      existing.push(va.playerId);
      answerCounts.set(va.normalized, existing);
    }

    // Build results for each player
    for (const playerId of Object.keys(answers)) {
      const rawAnswer = answers[playerId]?.[catIndex] || '';
      const normalized = normalizeAnswer(rawAnswer);
      const isValid = validationResults[playerId]?.[catIndex] ?? false;

      if (!isValid || !normalized) {
        catResults.push({
          playerId,
          answer: rawAnswer,
          valid: false,
          duplicate: false,
          points: 0,
        });
      } else {
        const duplicatePlayers = answerCounts.get(normalized) || [];
        const isDuplicate = duplicatePlayers.length > 1;
        catResults.push({
          playerId,
          answer: rawAnswer,
          valid: true,
          duplicate: isDuplicate,
          points: isDuplicate ? 0 : 1,
        });
      }
    }

    results[catIndex] = catResults;
  }

  return results;
}

export function sumRoundPoints(results: RoundResult, playerId: string): number {
  let total = 0;
  for (const catResults of Object.values(results)) {
    const entry = catResults.find((r: CategoryResult) => r.playerId === playerId);
    if (entry) total += entry.points;
  }
  return total;
}
