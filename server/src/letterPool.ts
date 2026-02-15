const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPRSTW'.split('');

export function pickLetter(usedLetters: string[]): string {
  const remaining = AVAILABLE_LETTERS.filter((l) => !usedLetters.includes(l));
  if (remaining.length === 0) {
    // Reset if all letters used
    return AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];
  }
  return remaining[Math.floor(Math.random() * remaining.length)];
}
