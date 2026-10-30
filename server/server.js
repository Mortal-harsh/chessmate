const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static('public/public'));  // HTML, JS
app.use(express.static('public'));         // CSS, assets

// In-memory store for game rooms
const rooms = {};

// Matchmaking queue for random matches
let randomQueue = null;

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ============================================================
//  AI ENGINE (Minimax with Alpha-Beta Pruning)
// ============================================================

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables for positional evaluation
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ]
};

function squareIndex(sq) {
  const files = { a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7 };
  const col = files[sq[0]];
  const row = 8 - parseInt(sq[1]);
  return row * 8 + col;
}

function evaluateBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99999 : 99999;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const idx = r * 8 + c;
      const mirrorIdx = (7 - r) * 8 + c;
      const pst = PST[piece.type];
      const pieceVal = PIECE_VALUES[piece.type];
      if (piece.color === 'w') {
        score += pieceVal + (pst ? pst[mirrorIdx] : 0);
      } else {
        score -= pieceVal + (pst ? pst[idx] : 0);
      }
    }
  }
  return score;
}

function minimax(chess, depth, alpha, beta, maximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }
  const moves = chess.moves({ verbose: true });
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestAIMove(chess, difficulty) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Difficulty settings
  const config = {
    easy:   { depth: 1, randomFactor: 0.85 },
    medium: { depth: 2, randomFactor: 0.3  },
    hard:   { depth: 3, randomFactor: 0     }
  };
  const cfg = config[difficulty] || config.medium;

  // Easy: mostly random moves
  if (cfg.randomFactor > 0 && Math.random() < cfg.randomFactor) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Minimax search
  const isMaximizing = chess.turn() === 'w';
  let bestMove = null;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, cfg.depth - 1, -Infinity, Infinity, !isMaximizing);
    chess.undo();
    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove || moves[0];
}

// AI Chat and Emoji Response Generators
function getAIChatReply(message, difficulty) {
  const lower = (message || '').toLowerCase().trim();
  if (/^(hi|hello|hey|hola|namaste|hlo|helo)/.test(lower)) {
    return [
      'Hello! Ready for a great battle? ♟️',
      'Hey there! Let\'s see your opening strategy 🤖',
      'Greetings! May the best player win on this board!'
    ];
  }
  if (/good|nice|well played|gg|awesome|great|brilliant|smooth/.test(lower)) {
    return [
      'Thank you! I calculated that move over 10,000 simulations 🤖',
      'Appreciate it! You\'re playing skillfully as well ♟️',
      'Thanks! Every piece on my board has a mission 🎯'
    ];
  }
  if (/noob|easy|bot|loser|i will win|you lose|har|jeet/.test(lower)) {
    return [
      'Bold words! But the 64 squares never lie 😉 Let\'s see your endgame!',
      'Hehe, don\'t underestimate silicon calculations! ⚡',
      'We\'ll see on the board! My king is well protected 👑'
    ];
  }
  if (/help|hint|advice|suggest|kya kru|kaise khelu/.test(lower)) {
    return [
      'Tip: Control the four center squares (d4, d5, e4, e5) and develop your knights/bishops!',
      'Tip: Don\'t bring your Queen out too early, and castle your King for safety! 🏰',
      'Tip: Look for undefended pieces and fork opportunities with your Knights 🐴'
    ];
  }
  if (/check|mate|queen|rook|knight|bishop|pawn|ghoda|hathi|vazir/.test(lower)) {
    return [
      'Tactical awareness is key! Keep an eye on piece coordination ⚔️',
      'Every pawn is a potential queen! 👑',
      'The position is getting sharp! Let\'s see how this unfolds ♟️'
    ];
  }
  return [
    'Interesting move! Let\'s see where this strategy leads ♟️',
    'My neural circuits are engaged! Having fun in this match 🤖',
    'Focusing on the position... you have solid board control!',
    'Chess is a battle of patience and depth. Let\'s keep playing! ⚔️'
  ];
}

function getAIEmojiReply(emoji) {
  const map = {
    '👏': ['🤝', '😎', '👏'],
    '🤔': ['🧐', '💡', '🤖'],
    '😅': ['😄', '🤖', '🔥'],
    '🎉': ['🔥', '👏', '👑'],
    '😤': ['😏', '⚡', '🛡️'],
    '🤝': ['🤝', '♟️', '👑']
  };
  const options = map[emoji] || ['🤖', '⚡', '😎', '♟️', '🔥'];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================
//  SOCKET EVENTS
// ============================================================
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // ---------- Create AI Game ----------
  socket.on('createAIGame', data => {
    let roomId = generateRoomId();
    while (rooms[roomId]) roomId = generateRoomId();

    const difficulty = data.difficulty || 'medium';
    rooms[roomId] = {
      chess: new Chess(),
      players: {
        white: { id: socket.id, name: data.playerName || 'Player' },
        black: { id: 'AI', name: `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` },
      },
      turn: 'w',
      status: 'playing',
      vsAI: true,
      difficulty,
      disconnectTimer: null,
    };
    socket.join(roomId);

    // Send gameCreated so lobby knows to redirect
    socket.emit('gameCreated', { roomId, playerName: data.playerName, vsComputer: true });
    console.log(`AI game created – room ${roomId}, difficulty: ${difficulty}`);
  });

  // ---------- Create Game (vs Friend) ----------
  socket.on('createGame', data => {
    let roomId = generateRoomId();
    while (rooms[roomId]) roomId = generateRoomId();

    rooms[roomId] = {
      chess: new Chess(),
      players: {
        white: { id: socket.id, name: data.playerName || 'Player 1' },
        black: null,
      },
      turn: 'w',
      status: 'waiting',
      vsAI: false,
      disconnectTimer: null,
    };
    socket.join(roomId);
    socket.emit('gameCreated', { roomId, playerName: data.playerName, vsComputer: false });
    console.log(`Game created – room ${roomId}`);
  });

  // ---------- Join Game ----------
  socket.on('joinGame', data => {
    let room = rooms[data.roomId];

    // If AI game and room was not found or refreshed, auto-create room smoothly
    if (!room && (data.vsComputer || (data.roomId && data.roomId.length === 6))) {
      const difficulty = data.difficulty || 'medium';
      room = rooms[data.roomId] = {
        chess: new Chess(),
        players: {
          white: { id: socket.id, name: data.playerName || 'Player' },
          black: { id: 'AI', name: `AI (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})` },
        },
        turn: 'w',
        status: 'playing',
        vsAI: true,
        difficulty,
        disconnectTimer: null,
      };
    }

    if (!room) {
      socket.emit('errorMessage', 'Room not found');
      return;
    }

    // Clear any pending disconnect cleanup timer since player is back
    if (room.disconnectTimer) {
      clearTimeout(room.disconnectTimer);
      room.disconnectTimer = null;
    }

    // If it's an AI game, link socket and send state
    if (room.vsAI) {
      room.players.white.id = socket.id;
      if (data.playerName) room.players.white.name = data.playerName;
      socket.join(data.roomId);
      socket.emit('gameState', {
        fen: room.chess.fen(),
        turn: room.turn,
        players: { white: room.players.white.name, black: room.players.black.name },
        vsAI: true,
        difficulty: room.difficulty,
      });
      console.log(`Player joined AI room ${data.roomId}`);
      return;
    }

    // Multiplayer: Check if White is reconnecting (e.g. from lobby to game page)
    if (room.players.white && (room.players.white.name === data.playerName || data.color === 'white')) {
      room.players.white.id = socket.id;
      if (data.playerName) room.players.white.name = data.playerName;
      socket.join(data.roomId);
      socket.emit('gameState', {
        fen: room.chess.fen(),
        turn: room.turn,
        players: { white: room.players.white.name, black: room.players.black?.name || 'Waiting...' },
        vsAI: false,
      });
      console.log(`White player active in room ${data.roomId}`);
      return;
    }

    // Multiplayer: Check if Black is reconnecting
    if (room.players.black && (room.players.black.name === data.playerName || data.color === 'black')) {
      room.players.black.id = socket.id;
      socket.join(data.roomId);
      socket.emit('gameState', {
        fen: room.chess.fen(),
        turn: room.turn,
        players: { white: room.players.white.name, black: room.players.black.name },
        vsAI: false,
      });
      console.log(`Black player re-joined room ${data.roomId}`);
      return;
    }

    // Multiplayer: Black joining for first time
    if (room.players.black) {
      socket.emit('errorMessage', 'Room already full');
      return;
    }

    room.players.black = { id: socket.id, name: data.playerName };
    room.status = 'playing';
    socket.join(data.roomId);
    io.to(data.roomId).emit('playerJoined', { roomId: data.roomId, playerName: data.playerName });
    socket.emit('gameJoined', { roomId: data.roomId, playerName: data.playerName });
    io.to(data.roomId).emit('gameState', {
      fen: room.chess.fen(),
      turn: room.turn,
      players: { white: room.players.white.name, black: room.players.black.name },
      vsAI: false,
    });
    console.log(`Player ${data.playerName} joined room ${data.roomId}`);
  });

  // ---------- Find Random Match ----------
  socket.on('findRandomMatch', data => {
    if (randomQueue) {
      // Match found!
      const opponent = randomQueue;
      randomQueue = null;
      let roomId = generateRoomId();
      while (rooms[roomId]) roomId = generateRoomId();

      rooms[roomId] = {
        chess: new Chess(),
        players: {
          white: { id: opponent.socketId, name: opponent.playerName },
          black: { id: socket.id, name: data.playerName },
        },
        turn: 'w',
        status: 'playing',
        vsAI: false,
        disconnectTimer: null,
      };
      socket.join(roomId);
      io.sockets.sockets.get(opponent.socketId)?.join(roomId);

      io.to(opponent.socketId).emit('randomMatchFound', { roomId, playerName: opponent.playerName, color: 'white' });
      socket.emit('randomMatchFound', { roomId, playerName: data.playerName, color: 'black' });

      io.to(roomId).emit('gameState', {
        fen: rooms[roomId].chess.fen(),
        turn: 'w',
        players: { white: opponent.playerName, black: data.playerName },
        vsAI: false,
      });
    } else {
      randomQueue = { socketId: socket.id, playerName: data.playerName };
    }
  });

  // ---------- Make Move ----------
  socket.on('makeMove', data => {
    const room = rooms[data.roomId];
    if (!room) return;

    // Validate turn for multiplayer
    if (!room.vsAI) {
      const expectedColor = room.turn === 'w' ? 'white' : 'black';
      if (data.color !== expectedColor) {
        socket.emit('errorMessage', "It's not your turn");
        return;
      }
    }

    // For AI game: only white (human) can send moves
    if (room.vsAI && data.color !== 'white') return;

    // Try move
    let move;
    try {
      move = room.chess.move({ from: data.from, to: data.to, promotion: data.promotion || 'q' });
    } catch(e) {
      move = null;
    }
    if (!move) {
      socket.emit('errorMessage', 'Invalid move');
      return;
    }

    room.turn = room.chess.turn();
    const result = getGameResult(room.chess, 'white');

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
      return;
    }

    // AI responds if it's an AI game and now it's AI's turn (black)
    if (room.vsAI && room.turn === 'b') {
      setTimeout(() => {
        if (!rooms[data.roomId]) return; // room may have been deleted
        const aiMove = getBestAIMove(room.chess, room.difficulty);
        if (!aiMove) return;

        let applied;
        try {
          applied = room.chess.move(aiMove);
        } catch(e) { return; }
        if (!applied) return;

        room.turn = room.chess.turn();
        const aiResult = getGameResult(room.chess, 'black');

        io.to(data.roomId).emit('moveMade', {
          from: applied.from,
          to: applied.to,
          fen: room.chess.fen(),
          san: applied.san,
          turn: room.turn,
          result: aiResult,
          isAI: true,
        });

        if (aiResult) {
          io.to(data.roomId).emit('gameOver', { result: aiResult });
        }
      }, 400); // Small delay so AI move feels natural
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
    if (room.vsAI) {
      // AI always declines draw (medium/hard) or accepts (easy)
      if (room.difficulty === 'easy') {
        io.to(data.roomId).emit('gameOver', { result: 'Draw by agreement' });
      } else {
        socket.emit('drawDeclined', { from: 'AI' });
      }
      return;
    }
    const opponentId = data.color === 'white' ? room.players.black?.id : room.players.white?.id;
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
      vsAI: room.vsAI,
      difficulty: room.difficulty,
    });
  });

  // ---------- Chat ----------
  socket.on('chatMessage', data => {
    const room = rooms[data.roomId];
    if (!room) return;

    // Broadcast user's message to room
    io.to(data.roomId).emit('chatMessage', { playerName: data.playerName, message: data.message });

    // If AI game, trigger smart AI response
    if (room.vsAI) {
      const replies = getAIChatReply(data.message, room.difficulty);
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const delay = Math.floor(Math.random() * 400) + 600; // 600-1000ms natural delay
      setTimeout(() => {
        if (!rooms[data.roomId]) return;
        io.to(data.roomId).emit('chatMessage', {
          playerName: room.players.black.name || 'AI Bot 🤖',
          message: reply,
          isAI: true
        });
      }, delay);
    }
  });

  // ---------- Emoji Reaction ----------
  socket.on('emojiReaction', data => {
    const room = rooms[data.roomId];
    if (!room) return;

    // Broadcast user reaction
    io.to(data.roomId).emit('emojiReaction', { emoji: data.emoji, from: data.playerName });

    // If AI game, trigger AI reaction back
    if (room.vsAI) {
      const aiEmoji = getAIEmojiReply(data.emoji);
      const delay = Math.floor(Math.random() * 300) + 500; // 500-800ms natural delay
      setTimeout(() => {
        if (!rooms[data.roomId]) return;
        io.to(data.roomId).emit('emojiReaction', {
          emoji: aiEmoji,
          from: room.players.black.name || 'AI Bot 🤖',
          isAI: true
        });
      }, delay);
    }
  });

  // ---------- Disconnect ----------
  socket.on('disconnect', () => {
    // Remove from random queue if present
    if (randomQueue && randomQueue.socketId === socket.id) {
      randomQueue = null;
    }
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players.white?.id === socket.id || room.players.black?.id === socket.id) {
        const isWhite = room.players.white?.id === socket.id;
        const color = isWhite ? 'white' : 'black';

        // Set a 45-second grace period timer before deleting room
        // so navigation/reloads don't destroy active games
        if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
        room.disconnectTimer = setTimeout(() => {
          if (rooms[roomId]) {
            const currentP = isWhite ? rooms[roomId].players.white : rooms[roomId].players.black;
            if (currentP?.id === socket.id) {
              if (!room.vsAI) {
                io.to(roomId).emit('playerDisconnected', { color });
              }
              delete rooms[roomId];
              console.log(`Room ${roomId} removed after disconnect timeout`);
            }
          }
        }, 45000);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// ---- Helper ----
function getGameResult(chess, lastMoveColor) {
  if (chess.isCheckmate()) {
    const winner = lastMoveColor === 'white' ? 'White' : 'Black';
    return `${winner} wins by checkmate! 🏆`;
  }
  if (chess.isStalemate())        return 'Draw by stalemate';
  if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition';
  if (chess.isInsufficientMaterial()) return 'Draw by insufficient material';
  if (chess.isDraw())             return 'Draw';
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
