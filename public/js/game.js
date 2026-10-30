// game.js – ChessMate Complete Game Logic (Self Play + AI + Multiplayer)

// ============================================================
//  URL PARAMS
// ============================================================
const params      = new URLSearchParams(window.location.search);
const roomId      = params.get('roomId');
const playerName  = params.get('playerName') || 'Player';
const playerColor = params.get('color') || 'white';
const vsComputer  = params.get('vsComputer') === 'true';
const difficulty  = params.get('difficulty') || 'medium';
const isSelfPlay  = params.get('mode') === 'self-play' || params.get('vsSelf') === 'true' || params.get('selfplay') === 'true';

// ============================================================
//  SOCKET
// ============================================================
let socket = null;
if (!isSelfPlay) {
  try {
    socket = io();
  } catch (e) {
    console.warn("Socket.io not connected", e);
  }
}

// ============================================================
//  STATE
// ============================================================
let chess          = null;
let selectedSquare = null;
let possibleMoves  = [];
let gameActive     = false;
let boardFlipped   = false;
let moveHalf       = 0;
let currentRow     = null;

// Clocks (10 minutes each)
let whiteSeconds = 600;
let blackSeconds = 600;
let clockInterval = null;

// ============================================================
//  DOM SHORTCUTS
// ============================================================
const $ = id => document.getElementById(id);

// ============================================================
//  INIT ON LOAD
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // chess.js loads from CDN / local script — wait for it if necessary
  if (typeof Chess === 'undefined') {
    showToast('Loading chess engine...', false);
    const interval = setInterval(() => {
      if (typeof Chess !== 'undefined') {
        clearInterval(interval);
        initGame();
      }
    }, 100);
  } else {
    initGame();
  }
});

// ============================================================
//  AUDIO SYNTHESIZER (Web Audio API)
// ============================================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const isMuted = localStorage.getItem('chessMate_sound') === 'false';
    if (isMuted) return;

    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'move') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.09);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'capture') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'check') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.setValueAtTime(720, now + 0.08);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch(e) {}
}

function initGame() {
  chess = new Chess();
  gameActive = true;

  if (isSelfPlay) {
    // Setup for Self Play (Me vs Me)
    document.body.classList.add('mode-no-chat');
    const roomBadge = $('roomCodeBadge');
    if (roomBadge) roomBadge.style.display = 'none';
    const drawBtn = $('drawBtn');
    if (drawBtn) drawBtn.style.display = 'none';
    const chatPanel = $('chatPanel') || document.querySelector('.chat-panel');
    if (chatPanel) chatPanel.style.display = 'none';
    const reactionsPanel = $('reactionsPanel');
    if (reactionsPanel) reactionsPanel.style.display = 'none';

    $('roomIdDisplay').textContent  = 'Self Play';
    $('infoMode').textContent       = '♟ Self Play (Me vs Me)';
    $('infoDifficulty').textContent = 'Local 👤';
    $('infoStatus').textContent     = 'In Progress';
    $('whiteName').textContent      = 'White (You)';
    $('blackName').textContent      = 'Black (You)';
    $('whiteLabel').textContent     = 'White (You)';
    $('blackLabel').textContent     = 'Black (You)';

    buildBoard();
    buildLabels();
    setupControls();
    updateTurnUI('w');
    updateStatusDot('active');
    showToast('Self Play started! You control both White and Black. ♟');
    return;
  }

  // Multiplayer or vs AI setup
  if (vsComputer) {
    document.body.classList.add('mode-no-chat');
    const chatPanel = $('chatPanel') || document.querySelector('.chat-panel');
    if (chatPanel) chatPanel.style.display = 'none';
    const reactionsPanel = $('reactionsPanel');
    if (reactionsPanel) reactionsPanel.style.display = 'none';
  }

  $('roomIdDisplay').textContent  = roomId || '–';
  $('infoMode').textContent       = vsComputer ? 'vs AI 🤖' : 'vs Player 👥';
  $('infoDifficulty').textContent = vsComputer ? cap(difficulty) : 'N/A';
  $('whiteName').textContent      = playerColor === 'white' ? playerName : '...';
  $('blackName').textContent      = playerColor === 'black' ? playerName : (vsComputer ? `AI (${cap(difficulty)})` : 'Waiting...');

  $('whiteLabel').textContent = playerColor === 'white' ? 'White (You)' : 'White';
  $('blackLabel').textContent = playerColor === 'black' ? 'Black (You)' : 'Black';

  buildBoard();
  buildLabels();
  setupControls();
  setupChat();
  setupEmojis();

  if (socket) {
    socket.emit('joinGame', { roomId, playerName, vsComputer, difficulty, color: playerColor });
  }

  updateTurnUI('w');
  updateStatusDot('active');
  updateOpeningBadge();
  $('statusText').textContent = vsComputer ? 'Your turn ♟ (White)' : 'Waiting for opponent...';
}

// ============================================================
//  BUILD BOARD SQUARES
// ============================================================
function buildBoard() {
  const board = $('chessBoard');
  board.innerHTML = '';

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const fOrd  = boardFlipped ? [...files].reverse() : files;

  for (let ri = 0; ri < 8; ri++) {
    for (let fi = 0; fi < 8; fi++) {
      const rank = ranks[ri];
      const file = fOrd[fi];
      const sq   = file + rank;

      const div = document.createElement('div');
      div.id             = `sq-${sq}`;
      div.className      = 'square';
      div.dataset.square = sq;

      const isLight = (files.indexOf(file) + rank) % 2 === 0;
      div.classList.add(isLight ? 'light' : 'dark');

      div.addEventListener('click', onSquareClick);
      board.appendChild(div);
    }
  }
  renderPieces();
}

function buildLabels() {
  const rankEl = $('rankLabels');
  const fileEl = $('fileLabels');
  rankEl.innerHTML = '';
  fileEl.innerHTML = '';

  const ranks = boardFlipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = boardFlipped
    ? ['h','g','f','e','d','c','b','a']
    : ['a','b','c','d','e','f','g','h'];

  ranks.forEach(r => {
    const s = document.createElement('span');
    s.textContent = r;
    rankEl.appendChild(s);
  });
  files.forEach(f => {
    const s = document.createElement('span');
    s.textContent = f;
    fileEl.appendChild(s);
  });
}

// ============================================================
//  PIECE CONSTANTS & NAMES
// ============================================================
const PIECES = {
  P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔',
  p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚'
};

const PIECE_NAMES = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

function renderPieces() {
  if (!chess) return;
  document.querySelectorAll('.square').forEach(sq => {
    const old = sq.querySelector('.piece');
    if (old) sq.removeChild(old);

    const notation = sq.dataset.square;
    const piece    = chess.get(notation);
    if (!piece) {
      sq.removeAttribute('title');
      return;
    }

    const span = document.createElement('span');
    span.className = `piece ${piece.color === 'w' ? 'piece-white' : 'piece-black'}`;
    const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
    const pieceName = `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type] || ''}`;

    span.title = pieceName;
    sq.title   = `${pieceName} on ${notation.toUpperCase()}`;

    if (window.CHESS_SVGS && window.CHESS_SVGS[key]) {
      span.innerHTML = window.CHESS_SVGS[key];
    } else {
      span.textContent = PIECES[key] || '?';
    }
    sq.appendChild(span);
  });
}

// ============================================================
//  HIGHLIGHTS & SELECTION
// ============================================================
function clearHighlights() {
  document.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('selected', 'move-dot', 'capture-ring', 'coach-hint-from', 'coach-hint-to');
    const piece = chess ? chess.get(sq.dataset.square) : null;
    if (piece) {
      sq.title = `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type] || ''} on ${sq.dataset.square.toUpperCase()}`;
    } else {
      sq.removeAttribute('title');
    }
  });
}

function deselect() {
  clearHighlights();
  selectedSquare = null;
  possibleMoves  = [];
}

// ============================================================
//  CLICK HANDLER (FIDE Legal Move & Warning System)
// ============================================================
function onSquareClick(e) {
  if (!gameActive || !chess) {
    showToast("The game has ended. No more moves are allowed. 🛑", true);
    return;
  }

  const sq = e.currentTarget.dataset.square;
  const currentTurn = chess.turn(); // 'w' or 'b'
  const inCheck = typeof chess.in_check === 'function' ? chess.in_check() : (typeof chess.inCheck === 'function' ? chess.inCheck() : false);

  if (isSelfPlay) {
    // ------------------------------------------------------------
    // SELF PLAY (ME vs ME) LOGIC
    // ------------------------------------------------------------
    const piece = chess.get(sq);

    if (!selectedSquare) {
      // Step 1: Select Piece
      if (!piece) return;

      if (piece.color !== currentTurn) {
        if (currentTurn === 'w') {
          showToast("Not White's turn. Please move a White piece. ⚠️", true);
        } else {
          showToast("Not Black's turn. Please move a Black piece. ⚠️", true);
        }
        return;
      }

      const legalMoves = chess.moves({ square: sq, verbose: true });
      if (legalMoves.length === 0) {
        if (inCheck) {
          showToast("Your King is in check! This piece cannot block or escape check. 🚨", true);
        } else {
          showToast("This piece has no legal moves. 🛑", true);
        }
        return;
      }

      clearHighlights();
      selectedSquare = sq;
      possibleMoves  = legalMoves;
      $(`sq-${sq}`)?.classList.add('selected');

      possibleMoves.forEach(m => {
        const el = $(`sq-${m.to}`);
        if (el) {
          if (m.captured) {
            el.classList.add('capture-ring');
            const capPiece = chess.get(m.to);
            const capName = capPiece ? `${capPiece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[capPiece.type] || ''}` : 'Piece';
            el.title = `Capture ${capName} on ${m.to.toUpperCase()}`;
          } else {
            el.classList.add('move-dot');
            el.title = `Legal Move to ${m.to.toUpperCase()}`;
          }
        }
      });
    } else {
      // Step 2: Move or Reselect
      if (sq === selectedSquare) {
        deselect();
        return;
      }

      const move = possibleMoves.find(m => m.to === sq);

      if (!move) {
        // If clicking another piece of the current turn's color, re-select
        if (piece && piece.color === currentTurn) {
          const newMoves = chess.moves({ square: sq, verbose: true });
          if (newMoves.length === 0) {
            showToast("This piece has no legal moves. 🛑", true);
            return;
          }
          clearHighlights();
          selectedSquare = sq;
          possibleMoves  = newMoves;
          $(`sq-${sq}`)?.classList.add('selected');

          possibleMoves.forEach(m => {
            const el = $(`sq-${m.to}`);
            if (el) {
              if (m.captured) {
                el.classList.add('capture-ring');
                const capPiece = chess.get(m.to);
                const capName = capPiece ? `${capPiece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[capPiece.type] || ''}` : 'Piece';
                el.title = `Capture ${capName} on ${m.to.toUpperCase()}`;
              } else {
                el.classList.add('move-dot');
                el.title = `Legal Move to ${m.to.toUpperCase()}`;
              }
            }
          });
          return;
        }

        // Invalid move warning
        if (inCheck) {
          showToast("Illegal move! You cannot leave your King in check. 🚨", true);
        } else {
          showToast("Invalid move! Please select one of the highlighted squares. ⚠️", true);
        }
        return;
      }

      // Legal move selected
      const fromSq = selectedSquare;
      deselect();

      if (move.flags && move.flags.includes('p')) {
        showPromotion(fromSq, sq, currentTurn === 'w' ? 'white' : 'black');
      } else {
        executeSelfPlayMove(fromSq, sq, undefined);
      }
    }
    return;
  }

  // ------------------------------------------------------------
  // MULTIPLAYER / VS COMPUTER LOGIC
  // ------------------------------------------------------------
  const myColor = playerColor === 'white' ? 'w' : 'b';

  // Rule: Turn check
  if (chess.turn() !== myColor) {
    const activeColor = chess.turn() === 'w' ? 'White' : 'Black';
    showToast(`Wait for your turn! ⏳ It's ${activeColor}'s turn.`, true);
    return;
  }

  const piece = chess.get(sq);

  if (!selectedSquare) {
    if (!piece) return;

    if (piece.color !== myColor) {
      showToast("Warning: You can only move your own pieces. ⚠️", true);
      return;
    }

    const legalMoves = chess.moves({ square: sq, verbose: true });
    if (legalMoves.length === 0) {
      showToast("This piece has no legal moves. 🛑", true);
      return;
    }

    clearHighlights();
    selectedSquare = sq;
    possibleMoves  = legalMoves;
    $(`sq-${sq}`)?.classList.add('selected');

    possibleMoves.forEach(m => {
      const el = $(`sq-${m.to}`);
      if (el) {
        if (m.captured) {
          el.classList.add('capture-ring');
          const capPiece = chess.get(m.to);
          const capName = capPiece ? `${capPiece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[capPiece.type] || ''}` : 'Piece';
          el.title = `Capture ${capName} on ${m.to.toUpperCase()}`;
        } else {
          el.classList.add('move-dot');
          el.title = `Legal Move to ${m.to.toUpperCase()}`;
        }
      }
    });

  } else {
    if (sq === selectedSquare) {
      deselect();
      return;
    }

    const move = possibleMoves.find(m => m.to === sq);

    if (!move) {
      if (piece && piece.color === myColor) {
        const newMoves = chess.moves({ square: sq, verbose: true });
        if (newMoves.length === 0) {
          showToast("This piece has no legal moves. 🛑", true);
          return;
        }
        clearHighlights();
        selectedSquare = sq;
        possibleMoves  = newMoves;
        $(`sq-${sq}`)?.classList.add('selected');
        possibleMoves.forEach(m => {
          const el = $(`sq-${m.to}`);
          if (el) {
            if (m.captured) {
              el.classList.add('capture-ring');
              const capPiece = chess.get(m.to);
              const capName = capPiece ? `${capPiece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[capPiece.type] || ''}` : 'Piece';
              el.title = `Capture ${capName} on ${m.to.toUpperCase()}`;
            } else {
              el.classList.add('move-dot');
              el.title = `Legal Move to ${m.to.toUpperCase()}`;
            }
          }
        });
        return;
      }

      if (inCheck) {
        showToast("Your King is in check. You must remove the check! 🚨", true);
      } else {
        showToast("Invalid move! Choose a highlighted square. ⚠️", true);
      }
      return;
    }

    if (move.flags && move.flags.includes('p')) {
      const fromSq = selectedSquare;
      deselect();
      showPromotion(fromSq, sq, playerColor);
    } else {
      const fromSq = selectedSquare;
      deselect();
      emitMove(fromSq, sq, undefined);
    }
  }
}

// ============================================================
//  EXECUTE MOVE IN SELF PLAY (OFFLINE / ME VS ME)
// ============================================================
function executeSelfPlayMove(from, to, promotion) {
  const moveRes = chess.move({ from, to, promotion: promotion || 'q' });
  if (!moveRes) {
    showToast("Invalid move! Please select one of the highlighted squares. ⚠️", true);
    return;
  }

  renderPieces();
  highlightLastMove(from, to);
  addMoveToHistory(moveRes.san, false);
  updateCaptures();
  updateOpeningBadge();
  if (threatMapActive) updateThreatMap();
  removeCoachHints();

  const inCheck = typeof chess.in_check === 'function' ? chess.in_check() : (typeof chess.inCheck === 'function' ? chess.inCheck() : false);
  if (inCheck) {
    playSound('check');
  } else if (moveRes.captured) {
    playSound('capture');
  } else {
    playSound('move');
  }

  // Check Game Ending conditions
  const isCheckmate = typeof chess.in_checkmate === 'function' ? chess.in_checkmate() : (typeof chess.isCheckmate === 'function' ? chess.isCheckmate() : false);
  const isStalemate = typeof chess.in_stalemate === 'function' ? chess.in_stalemate() : (typeof chess.isStalemate === 'function' ? chess.isStalemate() : false);
  const isDraw = typeof chess.in_draw === 'function' ? chess.in_draw() : (typeof chess.isDraw === 'function' ? chess.isDraw() : false);

  if (isCheckmate) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    triggerGameOver('👑', 'CHECKMATE!', `Me vs Me — ${winner} Wins`);
    return;
  }

  if (isStalemate) {
    triggerGameOver('🤝', 'STALEMATE!', 'Game Drawn');
    return;
  }

  if (isDraw) {
    triggerGameOver('🤝', 'DRAW!', 'Game Drawn (50-move rule / 3-fold repetition / insufficient material)');
    return;
  }

  updateTurnUI(chess.turn());
}

function emitMove(from, to, promotion) {
  const destPiece = chess.get(to);
  const isCapture = !!destPiece;

  if (socket) {
    socket.emit('makeMove', { roomId, from, to, promotion: promotion || 'q', color: playerColor });
  }

  if (isCapture) playSound('capture');
  else playSound('move');

  // Show AI thinking indicator
  if (vsComputer) {
    const el = $('aiThinking');
    if (el) el.style.display = 'flex';
  }
}

// ============================================================
//  PROMOTION MODAL
// ============================================================
function showPromotion(from, to, promotingColor) {
  const isWhite = promotingColor === 'white' || promotingColor === 'w';
  const options = isWhite
    ? [{ p:'q', k:'Q' },{ p:'r', k:'R' },{ p:'b', k:'B' },{ p:'n', k:'N' }]
    : [{ p:'q', k:'q' },{ p:'r', k:'r' },{ p:'b', k:'b' },{ p:'n', k:'n' }];

  const container = $('promoPieces');
  container.innerHTML = '';

  options.forEach(({ p, k }) => {
    const div = document.createElement('div');
    div.className   = 'promo-piece';
    if (window.CHESS_SVGS && window.CHESS_SVGS[k]) {
      div.innerHTML = window.CHESS_SVGS[k];
    } else {
      div.textContent = PIECES[k] || p;
    }
    div.addEventListener('click', () => {
      $('promotionModal').style.display = 'none';
      if (isSelfPlay) {
        executeSelfPlayMove(from, to, p);
      } else {
        emitMove(from, to, p);
      }
    });
    container.appendChild(div);
  });

  $('promotionModal').style.display = 'flex';
}

function highlightLastMove(from, to) {
  document.querySelectorAll('.square').forEach(sq =>
    sq.classList.remove('last-from', 'last-to')
  );
  $(`sq-${from}`)?.classList.add('last-from');
  $(`sq-${to}`)?.classList.add('last-to');
}

function highlightCheck() {
  document.querySelectorAll('.square').forEach(sq => sq.classList.remove('in-check'));
  if (!chess) return;
  const isCheck = typeof chess.in_check === 'function' ? chess.in_check() : (typeof chess.inCheck === 'function' ? chess.inCheck() : false);
  if (!isCheck) return;

  const turn  = chess.turn();
  const board = chess.board();
  const files = ['a','b','c','d','e','f','g','h'];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn) {
        $(`sq-${files[c]}${8 - r}`)?.classList.add('in-check');
      }
    }
  }
}

// ============================================================
//  MOVE HISTORY TABLE & UNDO
// ============================================================
function addMoveToHistory(san, isAI) {
  const body = $('moveTableBody');

  if (moveHalf % 2 === 0) {
    // White's move — new row
    const tr   = document.createElement('tr');
    const tdN  = document.createElement('td');
    const tdW  = document.createElement('td');
    const tdB  = document.createElement('td');

    tdN.textContent = Math.floor(moveHalf / 2) + 1;
    tdW.textContent = san;

    if (isAI && playerColor === 'black') tdW.style.color = 'var(--gold)';

    body.querySelectorAll('tr.last-move').forEach(r => r.classList.remove('last-move'));
    tr.classList.add('last-move');
    tr.appendChild(tdN);
    tr.appendChild(tdW);
    tr.appendChild(tdB);
    body.appendChild(tr);
    currentRow = tr;
  } else {
    // Black's move — fill in existing row
    if (currentRow) {
      const tdB = currentRow.querySelector('td:last-child');
      if (tdB) {
        tdB.textContent = san;
        if (isAI) tdB.style.color = 'var(--gold)';
      }
    }
  }

  moveHalf++;
  $('infoMoves').textContent = moveHalf;

  const scroll = $('moveHistoryScroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

function removeLastMoveFromHistory() {
  if (moveHalf <= 0) return;
  moveHalf--;
  $('infoMoves').textContent = moveHalf;

  const body = $('moveTableBody');
  const rows = body.querySelectorAll('tr');
  if (rows.length === 0) return;

  const lastRow = rows[rows.length - 1];
  if (moveHalf % 2 === 1) {
    // Undid Black's move: clear Black cell in the last row
    const tdB = lastRow.querySelector('td:last-child');
    if (tdB) tdB.textContent = '';
    currentRow = lastRow;
  } else {
    // Undid White's move: remove entire row
    lastRow.remove();
    const remainingRows = body.querySelectorAll('tr');
    currentRow = remainingRows.length > 0 ? remainingRows[remainingRows.length - 1] : null;
  }
}

function undoMove() {
  if (!chess || chess.history().length === 0) {
    showToast("No moves to undo! ↩", true);
    return;
  }

  const undone = chess.undo();
  if (undone) {
    deselect();
    renderPieces();
    removeLastMoveFromHistory();
    updateCaptures();
    updateOpeningBadge();
    if (threatMapActive) updateThreatMap();
    removeCoachHints();

    // Update last move highlight
    const history = chess.history({ verbose: true });
    if (history.length > 0) {
      const last = history[history.length - 1];
      highlightLastMove(last.from, last.to);
    } else {
      document.querySelectorAll('.square').forEach(sq => sq.classList.remove('last-from', 'last-to'));
    }

    if (!gameActive) {
      gameActive = true;
      $('gameOverlay').style.display = 'none';
      $('infoStatus').textContent = 'In Progress';
    }

    updateTurnUI(chess.turn());
    playSound('move');
    showToast(`Undid move: ${undone.san} ↩`);
  }
}

// ============================================================
//  CLOCK
// ============================================================
function startClock(turn) {
  clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    if (turn === 'w') {
      whiteSeconds = Math.max(0, whiteSeconds - 1);
      renderClock('white', whiteSeconds);
      if (whiteSeconds === 0) {
        clearInterval(clockInterval);
        triggerGameOver('⏱', 'Time Up!', isSelfPlay ? 'Me vs Me — Black wins on time' : 'Black wins on time');
      }
    } else {
      blackSeconds = Math.max(0, blackSeconds - 1);
      renderClock('black', blackSeconds);
      if (blackSeconds === 0) {
        clearInterval(clockInterval);
        triggerGameOver('⏱', 'Time Up!', isSelfPlay ? 'Me vs Me — White wins on time' : 'White wins on time');
      }
    }
  }, 1000);
}

function stopClock() { clearInterval(clockInterval); }

function renderClock(color, secs) {
  const el  = color === 'white' ? $('whiteClock') : $('blackClock');
  if (!el) return;
  const m   = Math.floor(secs / 60).toString().padStart(2, '0');
  const s   = (secs % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
  el.classList.toggle('low-time', secs < 30);
}

// ============================================================
//  EVAL BAR
// ============================================================
function updateEval() {
  if (!chess) return;
  const values = { p:1, n:3, b:3, r:5, q:9 };
  let w = 0, b = 0;
  chess.board().flat().forEach(piece => {
    if (!piece || piece.type === 'k') return;
    const v = values[piece.type] || 0;
    if (piece.color === 'w') w += v; else b += v;
  });

  const total  = (w + b) || 1;
  const wPct   = Math.min(88, Math.max(12, (w / total) * 100));
  const evalEl = $('evalWhite');
  if (evalEl) evalEl.style.width = wPct + '%';

  const diff = w - b;
  $('evalLabel').textContent      = diff === 0 ? 'Equal' : diff > 0 ? 'White ▲' : 'Black ▲';
  $('evalWhiteScore').textContent = w;
  $('evalBlackScore').textContent = b;
}

// ============================================================
//  CAPTURED PIECES
// ============================================================
function updateCaptures() {
  if (!chess) return;
  const history = chess.history({ verbose: true });
  const wCap = [], bCap = [];
  const map  = { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛' };

  history.forEach(m => {
    if (!m.captured) return;
    if (m.color === 'w') wCap.push(map[m.captured] || '');
    else bCap.push(map[m.captured] || '');
  });

  const wEl = $('whiteCaptures');
  const bEl = $('blackCaptures');
  if (wEl) wEl.textContent = wCap.join(' ');
  if (bEl) bEl.textContent = bCap.join(' ');
}

// ============================================================
//  TURN UI (Display "Your Turn" always in Self Play)
// ============================================================
function updateTurnUI(turn) {
  $('whiteCard')?.classList.toggle('active-turn', turn === 'w');
  $('blackCard')?.classList.toggle('active-turn', turn === 'b');

  const inCheck = typeof chess.in_check === 'function' ? chess.in_check() : (typeof chess.inCheck === 'function' ? chess.inCheck() : false);

  if (isSelfPlay) {
    updateStatusDot(inCheck ? 'check' : 'active');
    const sideName = turn === 'w' ? 'White' : 'Black';
    if (inCheck) {
      $('statusText').textContent = `CHECK! ${sideName} King is under attack. Your Turn — ${sideName} to Move 🚨`;
    } else {
      $('statusText').textContent = `Your Turn — ${sideName} to Move ♟`;
    }
  } else {
    const isMyTurn = (turn === 'w' && playerColor === 'white') ||
                     (turn === 'b' && playerColor === 'black');
    updateStatusDot(inCheck ? 'check' : 'active');
    if (inCheck) {
      $('statusText').textContent = isMyTurn ? 'CHECK! Your King is in check 🚨' : "Opponent is in CHECK! 🎯";
    } else {
      $('statusText').textContent = isMyTurn ? 'Your turn ♟' : (turn === 'w' ? "White's turn" : "Black's turn");
    }
  }

  startClock(turn);
  highlightCheck();
  updateEval();
}

function updateStatusDot(state) {
  const dot = $('statusDot');
  if (!dot) return;
  dot.className = `status-dot ${state}`;
}

// ============================================================
//  GAME OVER
// ============================================================
function triggerGameOver(icon, title, result) {
  gameActive = false;
  stopClock();
  updateStatusDot('over');
  $('statusText').textContent  = 'Game Over';
  $('infoStatus').textContent  = 'Finished';
  $('overlayIcon').textContent  = icon;
  $('overlayTitle').textContent = title;
  $('overlayResult').textContent = result;
  $('gameOverlay').style.display = 'flex';
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function showToast(msg, isError = false) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

// ============================================================
//  CONTROLS
// ============================================================
function setupControls() {
  // Board Theme Selector
  const themeSelect = $('boardThemeSelect');
  const boardEl = $('chessBoard');
  const savedTheme = localStorage.getItem('chessMate_theme') || 'wood';
  if (themeSelect) {
    themeSelect.value = savedTheme;
    if (boardEl) boardEl.className = `chess-board theme-${savedTheme}`;
    themeSelect.addEventListener('change', () => {
      const t = themeSelect.value;
      if (boardEl) boardEl.className = `chess-board theme-${t}`;
      localStorage.setItem('chessMate_theme', t);
      showToast(`Board theme changed to ${themeSelect.options[themeSelect.selectedIndex].text} 🎨`);
    });
  }

  // Sound Toggle
  let soundEnabled = localStorage.getItem('chessMate_sound') !== 'false';
  const soundBtn = $('soundToggleBtn');
  if (soundBtn) {
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('chessMate_sound', soundEnabled);
      soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
      showToast(soundEnabled ? 'Sound enabled 🔊' : 'Sound muted 🔇');
    });
  }

  // Room Code Copy Pill
  const roomBadge = $('roomCodeBadge');
  if (roomBadge && !isSelfPlay) {
    roomBadge.addEventListener('click', () => {
      if (!roomId) return;
      navigator.clipboard.writeText(roomId).then(() => {
        showToast(`Room code "${roomId}" copied! 📋`, false);
      }).catch(() => {
        showToast(`Room code: ${roomId}`, false);
      });
    });
  }

  // Undo button
  $('undoBtn')?.addEventListener('click', () => {
    if (isSelfPlay) {
      undoMove();
    } else {
      showToast("Undo is only available in Self Play mode ↩", true);
    }
  });

  // Flip board
  $('flipBoardBtn')?.addEventListener('click', () => {
    boardFlipped = !boardFlipped;
    buildBoard();
    buildLabels();
  });

  // Resign Modal & Button
  const resignModal = $('resignModal');
  const resignBtn   = $('resignBtn');
  const confirmResignBtn = $('confirmResignBtn');
  const cancelResignBtn  = $('cancelResignBtn');

  if (resignBtn) {
    resignBtn.addEventListener('click', () => {
      if (!gameActive) return;
      if (resignModal) {
        if (isSelfPlay) {
          const txt = $('resignModalText');
          if (txt) txt.textContent = "Are you sure you want to resign this Self Play game?";
        }
        resignModal.style.display = 'flex';
      } else {
        if (confirm('Are you sure you want to resign?')) {
          if (isSelfPlay) {
            triggerGameOver('🏳', 'Game Resigned', 'Me vs Me — Game Resigned');
          } else if (socket) {
            socket.emit('resignGame', { roomId, color: playerColor });
          }
        }
      }
    });
  }

  if (cancelResignBtn) {
    cancelResignBtn.addEventListener('click', () => {
      if (resignModal) resignModal.style.display = 'none';
    });
  }

  if (confirmResignBtn) {
    confirmResignBtn.addEventListener('click', () => {
      if (resignModal) resignModal.style.display = 'none';
      if (!gameActive) return;
      if (isSelfPlay) {
        triggerGameOver('🏳', 'Game Resigned', 'Me vs Me — Game Resigned');
        showToast("Game Resigned 🏳");
      } else if (socket) {
        socket.emit('resignGame', { roomId, color: playerColor });
      }
    });
  }

  // Draw button
  $('drawBtn')?.addEventListener('click', () => {
    if (!gameActive || isSelfPlay) return;
    if (socket) {
      socket.emit('offerDraw', { roomId, color: playerColor, playerName });
      showToast('Draw offer sent 🤝');
    }
  });

  // New game handlers
  const handleNewGame = () => {
    if (isSelfPlay) {
      chess = new Chess();
      $('moveTableBody').innerHTML = '';
      moveHalf = 0;
      currentRow = null;
      whiteSeconds = 600;
      blackSeconds = 600;
      renderClock('white', whiteSeconds);
      renderClock('black', blackSeconds);
      $('gameOverlay').style.display = 'none';
      gameActive = true;
      $('infoStatus').textContent = 'In Progress';
      buildBoard();
      buildLabels();
      updateCaptures();
      updateTurnUI('w');
      showToast('New Self Play game started! White to move. ♟');
    } else if (socket) {
      if (confirm('Start a new game? Board will reset.')) {
        socket.emit('newGame', { roomId });
      }
    }
  };

  $('newGameBtn')?.addEventListener('click', handleNewGame);
  $('overlayNewGame')?.addEventListener('click', () => {
    $('gameOverlay').style.display = 'none';
    if (isSelfPlay) {
      handleNewGame();
    } else if (socket) {
      socket.emit('newGame', { roomId });
    }
  });

  // 💡 Coach Hint Button
  $('coachHintBtn')?.addEventListener('click', showCoachHint);

  // 🛡️ Danger Map (Threat Vision) Button
  $('threatMapBtn')?.addEventListener('click', toggleThreatMap);

  // 📋 PGN & FEN Export
  setupExportModal();
}

// ============================================================
//  CHAT
// ============================================================
function setupChat() {
  if (isSelfPlay || vsComputer) {
    const chatBox = $('chatPanel') || document.querySelector('.chat-panel');
    if (chatBox) chatBox.style.display = 'none';
    return;
  }

  function sendChat() {
    const msg = $('chatInput').value.trim();
    if (!msg || !socket) return;
    socket.emit('chatMessage', { roomId, playerName, message: msg });
    $('chatInput').value = '';
  }
  $('chatSendBtn')?.addEventListener('click', sendChat);
  $('chatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
}

function appendChat(name, msg, isMe, isAI) {
  const el = $('chatMessages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-msg' + (isMe ? ' mine' : '') + (isAI ? ' ai-msg' : '');
  const badge = isAI ? ' <span style="font-size:0.7em; background:rgba(240,192,64,0.2); color:var(--gold); padding:1px 5px; border-radius:4px;">BOT</span>' : '';
  div.innerHTML = `<span class="msg-name">${esc(name)}${badge}</span>: ${esc(msg)}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// ============================================================
//  EMOJI REACTIONS
// ============================================================
function setupEmojis() {
  if (isSelfPlay || vsComputer) {
    const reactBox = $('reactionsPanel');
    if (reactBox) reactBox.style.display = 'none';
    return;
  }

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (socket) socket.emit('emojiReaction', { roomId, emoji, playerName });
      floatEmoji(emoji);
    });
  });
}

function floatEmoji(emoji) {
  const el = document.createElement('div');
  el.textContent = emoji;
  el.style.cssText = `
    position:fixed; bottom:5rem; right:3rem;
    font-size:3rem; z-index:1000; pointer-events:none;
    animation: floatUp 2s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

// Inject float animation once
const floatStyle = document.createElement('style');
floatStyle.textContent = `
  @keyframes floatUp {
    0%   { opacity:1; transform: translateY(0) scale(1); }
    100% { opacity:0; transform: translateY(-120px) scale(1.5); }
  }
`;
document.head.appendChild(floatStyle);

// ============================================================
//  SOCKET EVENT HANDLERS (Multiplayer / AI only)
// ============================================================
if (socket) {
  socket.on('gameState', data => {
    if (!chess) return;
    chess.load(data.fen);

    $('whiteName').textContent = data.players.white;
    $('blackName').textContent = data.players.black;
    $('infoMode').textContent       = data.vsAI ? 'vs AI 🤖' : 'vs Player 👥';
    $('infoDifficulty').textContent = data.vsAI ? cap(data.difficulty || difficulty) : 'N/A';
    $('infoStatus').textContent     = 'In Progress';

    $('moveTableBody').innerHTML = '';
    moveHalf = 0; currentRow = null;
    whiteSeconds = 600; blackSeconds = 600;
    renderClock('white', whiteSeconds);
    renderClock('black', blackSeconds);
    gameActive = true;
    $('gameOverlay').style.display = 'none';
    const aiEl = $('aiThinking');
    if (aiEl) aiEl.style.display = 'none';

    renderPieces();
    updateTurnUI(data.turn);
    showToast('Game started! Good luck ♟');
  });

  socket.on('playerJoined', data => {
    if (playerColor === 'white') $('blackName').textContent = data.playerName;
    else $('whiteName').textContent = data.playerName;
    showToast(`${data.playerName} joined! Game starting... ♟`);
  });

  socket.on('moveMade', data => {
    const aiEl = $('aiThinking');
    if (aiEl) aiEl.style.display = 'none';

    if (!chess) return;
    chess.load(data.fen);
    renderPieces();
    highlightLastMove(data.from, data.to);
    addMoveToHistory(data.san, data.isAI);
    updateCaptures();
    updateTurnUI(data.turn);
    updateOpeningBadge();
    if (threatMapActive) updateThreatMap();
    removeCoachHints();

    const inCheck = typeof chess.in_check === 'function' ? chess.in_check() : (typeof chess.inCheck === 'function' ? chess.inCheck() : false);
    if (inCheck) {
      playSound('check');
    } else if (data.isAI) {
      playSound(data.san.includes('x') ? 'capture' : 'move');
    }

    if (data.isAI) showToast(`AI played: ${data.san} 🤖`);
  });

  socket.on('gameOver', data => {
    const r = data.result;
    let icon = '♟', title = 'Game Over';
    if (r.includes('checkmate'))   { icon = '👑'; title = 'Checkmate!'; }
    else if (r.includes('resign')) { icon = '🏳'; title = 'Resignation'; }
    else if (r.toLowerCase().includes('draw')) { icon = '🤝'; title = 'Draw!'; }
    else if (r.includes('time'))   { icon = '⏱'; title = 'Time Up!'; }
    triggerGameOver(icon, title, r);
  });

  socket.on('drawOffered', data => {
    const ok = confirm(`${data.from} offered a draw. Accept?`);
    if (ok) socket.emit('drawAccepted', { roomId, playerName });
  });

  socket.on('drawDeclined', () => showToast('Draw offer declined', true));

  socket.on('playerDisconnected', data => {
    showToast(`${data.color} player disconnected`, true);
    gameActive = false;
    stopClock();
    updateStatusDot('over');
    $('statusText').textContent = `${cap(data.color)} disconnected`;
  });

  socket.on('chatMessage', data => {
    appendChat(data.playerName, data.message, data.playerName === playerName, data.isAI);
    if (data.playerName !== playerName) showToast(`💬 ${data.playerName}: ${data.message}`);
  });

  socket.on('emojiReaction', data => {
    if (data.from !== playerName) {
      floatEmoji(data.emoji);
      showToast(`${data.from} reacted ${data.emoji}`);
    }
  });

  socket.on('errorMessage', msg => showToast(msg, true));
}

// ============================================================
//  UTILITIES
// ============================================================
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================
//  FEATURE 1: OPENING BOOK IDENTIFIER & EXPLORER
// ============================================================
const OPENINGS = [
  // Specific Variations (Longest sequences first)
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], name: 'Sicilian: Najdorf Variation' },
  { moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'], name: 'Sicilian: Dragon Variation' },
  { moves: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6'], name: 'Sicilian: Taimanov Variation' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], name: 'Italian Game: Giuoco Piano' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], name: 'Italian: Two Knights Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], name: 'Ruy Lopez: Morphy Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'], name: 'King\'s Indian Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], name: 'Grünfeld Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], name: 'Nimzo-Indian Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], name: 'Queen\'s Indian Defense' },
  { moves: ['d4', 'd5', 'c4', 'e6'], name: 'Queen\'s Gambit Declined' },
  { moves: ['d4', 'd5', 'c4', 'dxc4'], name: 'Queen\'s Gambit Accepted' },
  { moves: ['d4', 'd5', 'c4', 'c6'], name: 'Slav Defense' },
  { moves: ['e4', 'c6', 'd4', 'd5'], name: 'Caro-Kann Defense' },
  { moves: ['e4', 'e6', 'd4', 'd5'], name: 'French Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], name: 'Scotch Game' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'], name: 'Four Knights Game' },
  { moves: ['e4', 'e5', 'f4', 'exf4'], name: 'King\'s Gambit Accepted' },
  { moves: ['e4', 'e5', 'f4'], name: 'King\'s Gambit' },
  { moves: ['e4', 'e5', 'Nf3', 'd6'], name: 'Philidor Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nf6'], name: 'Petrov\'s Defense' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], name: 'Italian Game' },
  { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], name: 'Ruy Lopez (Spanish)' },
  { moves: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'], name: 'Sicilian: Rossolimo' },
  { moves: ['e4', 'c5', 'c3'], name: 'Sicilian: Alapin' },
  { moves: ['e4', 'c5', 'Nc3'], name: 'Closed Sicilian' },
  { moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4'], name: 'London System' },
  { moves: ['d4', 'd5', 'Bf4'], name: 'London System' },
  { moves: ['d4', 'Nf6', 'c4', 'c5', 'd5'], name: 'Benoni Defense' },
  { moves: ['d4', 'Nf6', 'c4', 'e5'], name: 'Budapest Gambit' },
  { moves: ['d4', 'Nf6', 'Bg5'], name: 'Trompowsky Attack' },
  { moves: ['d4', 'f5'], name: 'Dutch Defense' },
  { moves: ['c4', 'e5'], name: 'English: King\'s English' },
  { moves: ['c4', 'c5'], name: 'English: Symmetrical' },
  { moves: ['Nf3', 'd5', 'g3'], name: 'King\'s Indian Attack' },

  // Base Openings
  { moves: ['e4', 'e5'], name: 'Open Game (King\'s Pawn)' },
  { moves: ['e4', 'c5'], name: 'Sicilian Defense' },
  { moves: ['e4', 'e6'], name: 'French Defense' },
  { moves: ['e4', 'c6'], name: 'Caro-Kann Defense' },
  { moves: ['e4', 'd5'], name: 'Scandinavian Defense' },
  { moves: ['e4', 'd6'], name: 'Pirc Defense' },
  { moves: ['e4', 'g6'], name: 'Modern Defense' },
  { moves: ['e4', 'Nf6'], name: 'Alekhine\'s Defense' },
  { moves: ['d4', 'd5', 'c4'], name: 'Queen\'s Gambit' },
  { moves: ['d4', 'd5'], name: 'Closed Game' },
  { moves: ['d4', 'Nf6'], name: 'Indian Defense' },
  { moves: ['c4'], name: 'English Opening' },
  { moves: ['Nf3'], name: 'Réti Opening' },
  { moves: ['f4'], name: 'Bird\'s Opening' },
  { moves: ['b3'], name: 'Nimzo-Larsen Attack' },
  { moves: ['e4'], name: 'King\'s Pawn Opening' },
  { moves: ['d4'], name: 'Queen\'s Pawn Opening' }
];

function updateOpeningBadge() {
  const badgeEl = $('openingBadge');
  const nameEl  = $('openingName');
  if (!badgeEl || !nameEl || !chess) return;

  const history = chess.history();
  if (history.length === 0) {
    badgeEl.style.display = 'none';
    return;
  }

  let matched = null;
  for (const op of OPENINGS) {
    if (op.moves.length <= history.length) {
      const match = op.moves.every((m, idx) => history[idx] === m);
      if (match) {
        matched = op.name;
        break;
      }
    }
  }

  if (matched) {
    nameEl.textContent = matched;
    badgeEl.style.display = 'inline-flex';
  } else if (history.length >= 8) {
    nameEl.textContent = 'Middlegame Strategy';
    badgeEl.style.display = 'inline-flex';
  } else {
    nameEl.textContent = 'Development Phase';
    badgeEl.style.display = 'inline-flex';
  }
}

// ============================================================
//  FEATURE 2: AI COACH & TACTICAL MOVE HINT
// ============================================================
function getBestCoachMove() {
  if (!chess) return null;
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const PIECE_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5', 'c4', 'c5', 'f4', 'f5'];

  let bestMove = null;
  let bestScore = -Infinity;
  let bestReason = '';

  for (const m of moves) {
    let score = 0;
    let reason = '';

    const testChess = new Chess(chess.fen());
    testChess.move(m);

    // 1. Checkmate
    const isMate = typeof testChess.in_checkmate === 'function' ? testChess.in_checkmate() : (typeof testChess.isCheckmate === 'function' ? testChess.isCheckmate() : false);
    if (isMate) {
      return { move: m, reason: 'Delivers Checkmate to win the game! 👑' };
    }

    // 2. Check
    const inCheck = typeof testChess.in_check === 'function' ? testChess.in_check() : (typeof testChess.inCheck === 'function' ? testChess.inCheck() : false);
    if (inCheck) {
      score += 50;
      reason = `Checks the opponent King with ${PIECE_NAMES[m.piece] || 'piece'}! ⚡`;
    }

    // 3. Captures
    if (m.captured) {
      const victimVal = PIECE_VALS[m.captured] || 100;
      const attackerVal = PIECE_VALS[m.piece] || 100;
      score += victimVal * 1.5 - (attackerVal * 0.1);
      reason = `Captures ${m.captured === 'p' ? 'pawn' : PIECE_NAMES[m.captured]} on ${m.to.toUpperCase()} (+${Math.round(victimVal / 100)} pts)! 🎯`;
    }

    // 4. Castling
    if (m.flags.includes('k') || m.flags.includes('q')) {
      score += 70;
      reason = 'Castles King to safety and activates the Rook! 🏰';
    }

    // 5. Center control
    if (CENTER_SQUARES.includes(m.to)) {
      score += 30;
      if (!reason) reason = `Controls critical central square ${m.to.toUpperCase()}! ♟️`;
    }

    // 6. Development (Knights & Bishops)
    if ((m.piece === 'n' || m.piece === 'b') && (m.from.endsWith('1') || m.from.endsWith('8'))) {
      score += 35;
      if (!reason) reason = `Develops ${PIECE_NAMES[m.piece]} to active square ${m.to.toUpperCase()}! 🐎`;
    }

    // 7. Promotion
    if (m.promotion) {
      score += 850;
      reason = `Promotes pawn on ${m.to.toUpperCase()} to Queen! 👑`;
    }

    score += Math.random() * 8;

    if (!reason) {
      reason = `Solid tactical move: advances ${PIECE_NAMES[m.piece] || 'piece'} to ${m.to.toUpperCase()}.`;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
      bestReason = reason;
    }
  }

  return { move: bestMove, reason: bestReason };
}

function showCoachHint() {
  if (!gameActive || !chess) {
    showToast("Game is not active! 🛑", true);
    return;
  }
  const turn = chess.turn();
  const myColorShort = playerColor === 'white' ? 'w' : 'b';
  if (!isSelfPlay && turn !== myColorShort) {
    showToast("Wait for your turn! ⏳", true);
    return;
  }

  const result = getBestCoachMove();
  if (!result || !result.move) {
    showToast("No legal moves available! ⚠️", true);
    return;
  }

  removeCoachHints();

  const { move, reason } = result;
  const fromEl = $(`sq-${move.from}`);
  const toEl   = $(`sq-${move.to}`);

  if (fromEl) fromEl.classList.add('coach-hint-from');
  if (toEl)   toEl.classList.add('coach-hint-to');

  playSound('move');
  showToast(`💡 Coach: ${move.san} (${move.from.toUpperCase()} → ${move.to.toUpperCase()})\n"${reason}"`);
}

function removeCoachHints() {
  document.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('coach-hint-from', 'coach-hint-to');
  });
}

// ============================================================
//  FEATURE 3: DANGER VISION / THREAT RADAR
// ============================================================
let threatMapActive = false;

function toggleThreatMap() {
  threatMapActive = !threatMapActive;
  const btn = $('threatMapBtn');
  if (btn) btn.classList.toggle('active', threatMapActive);

  if (threatMapActive) {
    updateThreatMap();
    showToast("Danger Vision ON: Red highlights squares attacked by opponent 🛡️");
  } else {
    clearThreatMap();
    showToast("Danger Vision OFF 🛡️");
  }
}

function clearThreatMap() {
  document.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('threat-square', 'hanging-piece');
  });
}

function updateThreatMap() {
  clearThreatMap();
  if (!threatMapActive || !chess || !gameActive) return;

  const currentTurn = chess.turn();
  const opponentColor = currentTurn === 'w' ? 'b' : 'w';
  const board = chess.board();
  const files = ['a','b','c','d','e','f','g','h'];
  const attackedSquares = new Set();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== opponentColor) continue;

      const pType = piece.type;

      if (pType === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        const targetR = r + dir;
        if (targetR >= 0 && targetR < 8) {
          if (c - 1 >= 0) attackedSquares.add(`${files[c - 1]}${8 - targetR}`);
          if (c + 1 < 8)  attackedSquares.add(`${files[c + 1]}${8 - targetR}`);
        }
      } else if (pType === 'n') {
        const jumps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        jumps.forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            attackedSquares.add(`${files[nc]}${8 - nr}`);
          }
        });
      } else if (pType === 'k') {
        const dirs = [
          [-1,-1], [-1,0], [-1,1],
          [0,-1],          [0,1],
          [1,-1],  [1,0],  [1,1]
        ];
        dirs.forEach(([dr, dc]) => {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            attackedSquares.add(`${files[nc]}${8 - nr}`);
          }
        });
      } else {
        const dirs = [];
        if (pType === 'b' || pType === 'q') dirs.push([-1,-1], [-1,1], [1,-1], [1,1]);
        if (pType === 'r' || pType === 'q') dirs.push([-1,0], [1,0], [0,-1], [0,1]);

        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (true) {
            const nr = r + dr * step;
            const nc = c + dc * step;
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
            const sqName = `${files[nc]}${8 - nr}`;
            attackedSquares.add(sqName);
            if (board[nr][nc]) break;
            step++;
          }
        });
      }
    }
  }

  attackedSquares.forEach(sq => {
    const el = $(`sq-${sq}`);
    if (el) {
      el.classList.add('threat-square');
      const friendlyPiece = chess.get(sq);
      if (friendlyPiece && friendlyPiece.color === currentTurn && friendlyPiece.type !== 'k') {
        el.classList.add('hanging-piece');
      }
    }
  });
}

// ============================================================
//  FEATURE 4: PGN & FEN EXPORT MODAL
// ============================================================
function setupExportModal() {
  const exportBtn      = $('exportModalBtn');
  const exportModal    = $('exportModal');
  const closeBtn       = $('closeExportBtn');
  const copyPgnBtn     = $('copyPgnBtn');
  const copyFenBtn     = $('copyFenBtn');
  const downloadPgnBtn = $('downloadPgnBtn');
  const pgnOutput      = $('pgnOutput');
  const fenOutput      = $('fenOutput');

  if (exportBtn && exportModal) {
    exportBtn.addEventListener('click', () => {
      if (!chess) return;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      const white = $('whiteName')?.textContent || 'White';
      const black = $('blackName')?.textContent || 'Black';
      const result = !gameActive ? ($('overlayTitle')?.textContent || '*') : '*';

      let pgnHeader = `[Event "ChessMate Pro Online"]\n[Site "ChessMate Web App"]\n[Date "${today}"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n`;
      const fullPgn = pgnHeader + (chess.pgn() || chess.history().join(' '));

      if (pgnOutput) pgnOutput.value = fullPgn;
      if (fenOutput) fenOutput.value = chess.fen();

      exportModal.style.display = 'flex';
    });
  }

  if (closeBtn && exportModal) {
    closeBtn.addEventListener('click', () => {
      exportModal.style.display = 'none';
    });
  }

  if (copyPgnBtn) {
    copyPgnBtn.addEventListener('click', () => {
      if (!pgnOutput) return;
      navigator.clipboard.writeText(pgnOutput.value).then(() => {
        showToast("PGN copied to clipboard! 📋");
      }).catch(() => {
        showToast("Failed to copy PGN", true);
      });
    });
  }

  if (copyFenBtn) {
    copyFenBtn.addEventListener('click', () => {
      if (!fenOutput) return;
      navigator.clipboard.writeText(fenOutput.value).then(() => {
        showToast("FEN string copied to clipboard! 📋");
      }).catch(() => {
        showToast("Failed to copy FEN", true);
      });
    });
  }

  if (downloadPgnBtn) {
    downloadPgnBtn.addEventListener('click', () => {
      if (!pgnOutput) return;
      const blob = new Blob([pgnOutput.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chessmate-${Date.now()}.pgn`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("PGN file downloaded! 💾");
    });
  }
}
