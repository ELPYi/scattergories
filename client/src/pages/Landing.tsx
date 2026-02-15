import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function Landing() {
  const { createRoom, joinRoom, state } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (nickname.trim()) createRoom(nickname.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && roomCode.trim()) joinRoom(roomCode.trim(), nickname.trim());
  };

  const hasNickname = nickname.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl md:text-6xl text-accent-400 mb-2 drop-shadow-lg">
            Scattergories
          </h1>
          <p className="text-primary-200 text-lg font-semibold">Online Party Game</p>
        </div>

        {mode === 'home' && (
          <div className="space-y-4 animate-slide-up">
            <div className="card">
              <input
                type="text"
                className="input-field text-center"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              className="btn-primary w-full text-xl py-4"
              disabled={!hasNickname}
            >
              Create Room
            </button>
            <button
              onClick={() => hasNickname && setMode('join')}
              className="btn-secondary w-full text-xl py-4"
              disabled={!hasNickname}
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="card space-y-4 animate-slide-up">
            <h2 className="font-display text-2xl text-center">Join Room</h2>
            <p className="text-primary-200 text-sm text-center">Playing as <span className="font-bold text-teal-300">{nickname}</span></p>
            <input
              type="text"
              className="input-field uppercase tracking-widest text-center text-2xl"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              autoFocus
            />
            <button
              type="submit"
              className="btn-accent w-full"
              disabled={roomCode.length < 4}
            >
              Join Game
            </button>
            <button
              type="button"
              onClick={() => setMode('home')}
              className="text-primary-300 text-sm w-full text-center hover:text-white transition-colors"
            >
              Back
            </button>
          </form>
        )}

        {state.error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/40 rounded-2xl p-3 text-center text-red-200 animate-slide-up">
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
}
