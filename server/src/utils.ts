export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function sanitizeNickname(name: string): string {
  return name.trim().slice(0, 20).replace(/[<>"'&]/g, '');
}

export function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}
