# Scattergories Online

A real-time multiplayer Scattergories party game built with React, Node.js, and Socket.IO.

<p align="center">
  <img src="screenshots/landing-desktop.png" alt="Landing Page - Desktop" width="700" />
</p>

<p align="center">
  <img src="screenshots/landing-mobile.png" alt="Landing Page - Mobile" width="250" />
</p>

## Features

- **Real-time multiplayer** — Create or join rooms with a 4-letter code
- **Voting mode** — Players vote to accept or reject each other's answers
- **500+ categories** — Huge variety so every game feels different
- **Procedural audio** — Background music and sound effects via Web Audio API (no files needed)
- **Animated backgrounds** — Floating particle effects across all screens
- **Letter roll animation** — Slot-machine style letter reveal at the start of each round
- **10-second warning** — Audio beep and visual alert when time is running low
- **Mobile-friendly** — Responsive design that works on phones and tablets

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Audio**: Web Audio API (procedurally generated)

## Getting Started

```bash
npm install
npm run dev
```

Opens on [http://localhost:5173](http://localhost:5173) (client) with the server on port 3001.

## How to Play

1. Enter a nickname and create a room
2. Share the room code with friends
3. Adjust settings (timer, rounds, categories, validation mode)
4. Each round, a random letter is rolled — come up with answers starting with that letter for each category
5. After time's up, vote on each other's answers
6. Unique valid answers score points — duplicates get nothing!

## License

All Rights Reserved. See [LICENSE](LICENSE) for details.
