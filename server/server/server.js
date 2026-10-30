const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public folder
app.use(express.static('public'));

// In‑memory store for game rooms
const rooms = {};

function generateRoomId() {
  // 6‑character alphanumeric ID
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // ---------- Create Game ----------
  socket.on('createGame', data => {
    let roomId = generateRoomId();
    while (rooms[roomId]) {
      roomId = generateRoomId();
    }
    rooms[roomId] = {
      chess: new Chess(),
      players: {
        white: { id: socket.id, name: data.playerName },
        black: null,
      },
      turn: 'w', // w = white, b = black
      status: 'waiting',
    };
    socket.join(roomId);
    socket.emit('gameCreated', { roomId, playerName: data.playerName });
    console.log(`Game created – room ${roomId}`);
  });

  // ---------- Join Game ----------
  socket.on('joinGame', data => {
    const room = rooms[data.roomId];
    if (!room) {
      socket.emit('errorMessage', 'Room not found');
      return;
    }
    if (room.players.black) {
      socket.emit('errorMessage', 'Room already full');
      return;
    }
    room.players.black = { id: socket.id, name: data.playerName };
    socket.join(data.roomId);
    // Notify both players that the second player has joined
    io.to(data.roomId).emit('playerJoined', { roomId: data.roomId, playerName: data.playerName });
    socket.emit('gameJoined', { roomId: data.roomId, playerName: data.playerName });
    // Send initial game state
    io.to(data.roomId).emit('gameState', {
      fen: room.chess.fen(),
      turn: room.turn,
      players: { white: room.players.white.name, black: room.players.black.name },
    });
    console.log(`Player ${data.playerName} joined room ${data.roomId}`);
  });

  // ---------- Make Move ----------
  socket.on('makeMove', data => {
    const room = rooms[data.roomId];
    if (!room) return;

    // Validate turn
    const expectedColor = room.turn === 'w' ? 'white' : 'black';
    if (data.color !== expectedColor) {
      socket.emit('errorMessage', "It's not your turn");
      return;
    }
    // Try to make the move on the server‑side Chess instance
    const move = room.chess.move({ from: data.from, to: data.to, promotion: data.promotion });
    if (!move) {
      socket.emit('errorMessage', 'Invalid move');
      return;
    }
    // Update turn
    room.turn = room.chess.turn();

    // Build result information if the game ended
    let result = null;
    if (room.chess.game_over()) {
      if (room.chess.in_checkmate()) {
        result = `${data.color.charAt(0).toUpperCase() + data.color.slice(1)} wins by checkmate`;
      } else if (room.chess.in_stalemate()) {
        result = 'Draw by stalemate';
      } else if (room.chess.in_draw()) {
        result = 'Draw';
      }
    }

    // Broadcast the move to both participants
    io.to(data.roomId).emit('moveMade', {
      from: data.from,
      to: data.to,
      fen: room.chess.fen(),
      san: move.san,
      turn: room.turn,
      result,
    });

    if (result) {
      io.to(data.roomId).emit('gameOver', { result });
    }
  });

  // ---------- Resign ----------
  socket.on('resignGame', data => {
    const room = rooms[data.roomId];
    if (!room) return;
    const winner = data.color === 'white' ? 'Black' : 'White';
    io.to(data.roomId).emit('gameOver', { result: `${winner} wins by resignation` });
  });

  // ---------- Offer Draw ----------
  socket.on('offerDraw', data => {
    const room = rooms[data.roomId];
    if (!room) return;
    const opponentId = data.color === 'white' ? (room.players.black?.id) : (room.players.white?.id);
    if (opponentId) {
      io.to(opponentId).emit('drawOffered', { from: data.playerName });
    }
  });

  // ---------- Accept Draw ----------
  socket.on('drawAccepted', data => {
    const room = rooms[data.roomId];
    if (!room) return;
    io.to(data.roomId).emit('gameOver', { result: 'Draw by agreement' });
  });

  // ---------- New Game (restart) ----------
  socket.on('newGame', data => {
    const room = rooms[data.roomId];
    if (!room) return;
    room.chess = new Chess();
    room.turn = 'w';
    io.to(data.roomId).emit('gameState', {
      fen: room.chess.fen(),
      turn: room.turn,
      players: { white: room.players.white.name, black: room.players.black.name },
    });
  });

  // ---------- Disconnect handling ----------
  socket.on('disconnect', () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.white?.id === socket.id) {
        io.to(roomId).emit('playerDisconnected', { color: 'white' });
        delete rooms[roomId];
        console.log(`White disconnected – room ${roomId} closed`);
        break;
      }
      if (room.players.black?.id === socket.id) {
        io.to(roomId).emit('playerDisconnected', { color: 'black' });
        delete rooms[roomId];
        console.log(`Black disconnected – room ${roomId} closed`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
