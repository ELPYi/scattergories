import { Server } from 'socket.io';
import { Room } from './types';
import { pickLetter } from './letterPool';
import { pickCategories } from './categories';
import { validateAnswers } from './validation';
import { calculateRoundResults, sumRoundPoints } from './scoring';

export function startRound(io: Server, room: Room): void {
  room.currentRound++;
  room.phase = 'ROUND_START';
  room.roundAnswers = {};
  room.submittedPlayers = new Set();
  room.voteState = {};
  room.votedPlayers = new Set();
  room.roundResults = {};

  // Pick letter and categories
  const letter = pickLetter(room.usedLetters);
  room.usedLetters.push(letter);
  room.currentLetter = letter;
  room.currentCategories = pickCategories(room.settings.numCategories);

  // Broadcast round start
  io.to(room.code).emit('game:round-start', {
    round: room.currentRound,
    totalRounds: room.settings.numRounds,
    letter: room.currentLetter,
    categories: room.currentCategories,
  });

  // After a brief letter-reveal delay, transition to PLAYING
  setTimeout(() => {
    room.phase = 'PLAYING';
    const timerMs = room.settings.timerSeconds * 1000;
    room.timerEndsAt = Date.now() + timerMs;

    io.to(room.code).emit('game:playing', {
      timerEndsAt: room.timerEndsAt,
    });

    // Server-side timer for expiration
    room.timerId = setTimeout(() => {
      handleTimeUp(io, room);
    }, timerMs);
  }, 4500); // 4.5 second letter reveal (roll animation + pause)
}

export function handlePlayerSubmit(
  io: Server,
  room: Room,
  playerId: string,
  answers: { [catIndex: number]: string }
): void {
  // Accept answers during PLAYING or COLLECTING (grace period after time-up)
  if (room.phase !== 'PLAYING' && room.phase !== 'COLLECTING' as any) return;

  room.roundAnswers[playerId] = answers;
  room.submittedPlayers.add(playerId);

  io.to(room.code).emit('game:player-submitted', {
    playerId,
    submittedCount: room.submittedPlayers.size,
    totalPlayers: room.players.filter((p) => p.connected).length,
  });

  // If everyone submitted early during PLAYING, skip straight to processing
  if (room.phase === 'PLAYING') {
    const connectedPlayers = room.players.filter((p) => p.connected);
    if (room.submittedPlayers.size >= connectedPlayers.length) {
      if (room.timerId) {
        clearTimeout(room.timerId);
        room.timerId = null;
      }
      room.timerEndsAt = null;
      // Skip grace period - everyone already submitted
      (room.phase as any) = 'COLLECTING';
      io.to(room.code).emit('game:time-up');
      processRound(io, room);
    }
  }
}

function handleTimeUp(io: Server, room: Room): void {
  if (room.phase !== 'PLAYING') return;

  // Enter grace period to collect auto-submitted answers
  (room.phase as any) = 'COLLECTING';
  room.timerEndsAt = null;
  room.timerId = null;

  // Tell clients time is up - they should auto-submit now
  io.to(room.code).emit('game:time-up');

  // Wait 2 seconds for any in-flight auto-submits to arrive
  setTimeout(() => {
    processRound(io, room);
  }, 2000);
}

function processRound(io: Server, room: Room): void {
  if (room.settings.validationMode === 'vote') {
    startValidation(io, room);
  } else {
    finishRound(io, room);
  }
}

function startValidation(io: Server, room: Room): void {
  room.phase = 'VALIDATION';
  room.voteState = {};
  room.votedPlayers = new Set();

  // Send all answers to clients for voting
  const answersForVoting: {
    [playerId: string]: { nickname: string; answers: { [catIndex: number]: string } };
  } = {};

  for (const player of room.players) {
    if (room.roundAnswers[player.id]) {
      answersForVoting[player.id] = {
        nickname: player.nickname,
        answers: room.roundAnswers[player.id],
      };
    }
  }

  io.to(room.code).emit('game:validation-start', {
    answers: answersForVoting,
    categories: room.currentCategories,
    letter: room.currentLetter,
  });
}

export function handleVote(
  io: Server,
  room: Room,
  voterId: string,
  votes: { [catIndex: number]: { [playerId: string]: boolean } }
): void {
  if (room.phase !== 'VALIDATION') return;

  // Store votes
  for (const catIdx of Object.keys(votes)) {
    const catIndex = Number(catIdx);
    if (!room.voteState[catIndex]) room.voteState[catIndex] = {};
    for (const playerId of Object.keys(votes[catIndex])) {
      if (playerId === voterId) continue; // Can't vote on own answers
      if (!room.voteState[catIndex][playerId]) room.voteState[catIndex][playerId] = {};
      room.voteState[catIndex][playerId][voterId] = votes[catIndex][playerId];
    }
  }

  room.votedPlayers.add(voterId);

  io.to(room.code).emit('game:player-voted', {
    votedCount: room.votedPlayers.size,
    totalPlayers: room.players.filter((p) => p.connected).length,
  });

  // Check if all players have voted
  const connectedPlayers = room.players.filter((p) => p.connected);
  if (room.votedPlayers.size >= connectedPlayers.length) {
    finishRound(io, room);
  }
}

function finishRound(io: Server, room: Room): void {
  const validationResults = validateAnswers(
    room.roundAnswers,
    room.currentLetter,
    room.settings.numCategories,
    room.settings.validationMode,
    room.voteState,
    room.players.filter((p) => p.connected).length
  );

  const roundResults = calculateRoundResults(
    room.roundAnswers,
    validationResults,
    room.settings.numCategories
  );
  room.roundResults = roundResults;

  // Update total scores
  for (const player of room.players) {
    player.totalScore += sumRoundPoints(roundResults, player.id);
  }

  const isFinalRound = room.currentRound >= room.settings.numRounds;

  if (isFinalRound) {
    room.phase = 'FINAL_RESULTS';
    io.to(room.code).emit('game:final-results', {
      roundResults: serializeRoundResults(roundResults),
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        totalScore: p.totalScore,
        roundScore: sumRoundPoints(roundResults, p.id),
      })),
    });
  } else {
    room.phase = 'ROUND_RESULTS';
    io.to(room.code).emit('game:round-results', {
      roundResults: serializeRoundResults(roundResults),
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        totalScore: p.totalScore,
        roundScore: sumRoundPoints(roundResults, p.id),
      })),
      currentRound: room.currentRound,
      totalRounds: room.settings.numRounds,
    });
  }
}

function serializeRoundResults(results: { [key: number]: any }): any {
  const serialized: any = {};
  for (const [key, value] of Object.entries(results)) {
    serialized[key] = value;
  }
  return serialized;
}

export function resetForPlayAgain(room: Room): void {
  room.phase = 'LOBBY';
  room.currentRound = 0;
  room.currentLetter = '';
  room.currentCategories = [];
  room.roundAnswers = {};
  room.submittedPlayers = new Set();
  room.voteState = {};
  room.votedPlayers = new Set();
  room.roundResults = {};
  room.usedLetters = [];
  if (room.timerId) {
    clearTimeout(room.timerId);
    room.timerId = null;
  }
  room.timerEndsAt = null;
  for (const player of room.players) {
    player.totalScore = 0;
  }
}
