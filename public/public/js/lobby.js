// lobby.js – ChessMate New Lobby Logic
// Screens: Home → Single Player / Multiplayer Hub

const socket = io();

// ============================================================
//  ANIMATED BACKGROUND CANVAS
// ============================================================
(function initCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Chess piece symbols to float
  const symbols = ['♟','♜','♞','♝','♛','♚','♙','♖','♘','♗','♕','♔'];

  for (let i = 0; i < 28; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 16 + 8,
      speedY: -(Math.random() * 0.4 + 0.15),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.12 + 0.03,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.4,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = '#f0c040';
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y < -40) {
        p.y = H + 40;
        p.x = Math.random() * W;
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ============================================================
//  SCREEN NAVIGATION
// ============================================================
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}
window.goTo = goTo;

// ============================================================
//  DIFFICULTY SELECTION
// ============================================================
let selectedDifficulty = 'easy';

function selectDiff(btn) {
  document.querySelectorAll('.diff-card').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDifficulty = btn.dataset.level;
}
window.selectDiff = selectDiff;

// ============================================================
//  SINGLE PLAYER – Play vs AI
// ============================================================
document.getElementById('playCpuBtn').addEventListener('click', () => {
  const name = document.getElementById('cpuPlayerName').value.trim();
  if (!name) return showMsg('cpuMsg', 'Please enter your name ✍️', 'error');
  socket.emit('createAIGame', { playerName: name, difficulty: selectedDifficulty });
  showMsg('cpuMsg', 'Creating game...', 'success');
});

// ============================================================
//  MULTIPLAYER – Create Room
// ============================================================
document.getElementById('createRoomBtn').addEventListener('click', () => {
  const name = document.getElementById('multiPlayerName').value.trim();
  if (!name) return showMsg('inviteMsg', 'Please enter your name first ✍️', 'error');
  socket.emit('createGame', { playerName: name });
  showMsg('inviteMsg', 'Creating room...', 'success');
});

// ============================================================
//  MULTIPLAYER – Join Room
// ============================================================
document.getElementById('joinRoomBtn').addEventListener('click', () => {
  const name   = document.getElementById('multiPlayerName').value.trim();
  const code   = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  if (!name)   return showMsg('inviteMsg', 'Please enter your name first ✍️', 'error');
  if (!code)   return showMsg('inviteMsg', 'Please enter a room code ✍️', 'error');
  if (code.length !== 6) return showMsg('inviteMsg', 'Room code must be 6 characters', 'error');
  socket.emit('joinGame', { roomId: code, playerName: name });
  showMsg('inviteMsg', 'Joining room...', 'success');
});

// Allow Enter key on join input
document.getElementById('joinCodeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('joinRoomBtn').click();
});

// ============================================================
//  MULTIPLAYER – Find Random Match
// ============================================================
let isSearching = false;
document.getElementById('findMatchBtn').addEventListener('click', () => {
  const name = document.getElementById('multiPlayerName').value.trim();
  if (!name) return showMsg('inviteMsg', 'Please enter your name first ✍️', 'error');

  if (!isSearching) {
    isSearching = true;
    const btn = document.getElementById('findMatchBtn');
    btn.classList.add('searching');
    document.getElementById('findMatchText').textContent = 'Searching...';
    document.getElementById('findMatchSpinner').style.display = 'block';
    socket.emit('findRandomMatch', { playerName: name });
    showToast('🌍 Looking for an opponent...', 'success');
  }
});

// ============================================================
//  FRIEND LIST (LocalStorage based)
// ============================================================
let friends = JSON.parse(localStorage.getItem('chessMate_friends') || '[]');
let activeRoomCode = null; // room code to share with friends

function saveFriends() {
  localStorage.setItem('chessMate_friends', JSON.stringify(friends));
}

function addFriend() {
  const input = document.getElementById('addFriendInput');
  const name  = input.value.trim();
  if (!name) return showMsg('friendMsg', 'Enter a friend\'s name', 'error');
  if (friends.find(f => f.name.toLowerCase() === name.toLowerCase())) {
    return showMsg('friendMsg', `${name} is already in your list!`, 'error');
  }
  friends.push({ name, addedAt: Date.now() });
  saveFriends();
  renderFriendList();
  input.value = '';
  showMsg('friendMsg', `${name} added! ✅`, 'success');
}
window.addFriend = addFriend;

// Also allow Enter key on add friend input
document.getElementById('addFriendInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addFriend();
});

function removeFriend(name) {
  friends = friends.filter(f => f.name !== name);
  saveFriends();
  renderFriendList();
  showToast(`${name} removed from friend list`);
}

function inviteFriend(friendName) {
  if (!activeRoomCode) {
    showMsg('friendMsg', 'Create a room first, then invite friends!', 'error');
    return;
  }
  showToast(`📩 Share code "${activeRoomCode}" with ${friendName}!`, 'success');
  // Copy room code to clipboard
  navigator.clipboard.writeText(activeRoomCode).catch(() => {});
}

function renderFriendList() {
  const list  = document.getElementById('friendList');
  const empty = document.getElementById('friendEmpty');

  // Remove existing friend items (keep the empty placeholder)
  list.querySelectorAll('.friend-item').forEach(el => el.remove());

  if (friends.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  friends.forEach(friend => {
    const initials = friend.name.slice(0, 2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `
      <div class="friend-avatar">${initials}</div>
      <div style="flex:1; min-width:0;">
        <div class="friend-name">${escHtml(friend.name)}</div>
        <div class="friend-status">♟ Chess Player</div>
      </div>
      <div class="friend-actions">
        <button class="friend-invite-btn ${activeRoomCode ? '' : 'disabled'}"
                onclick="inviteFriend('${escHtml(friend.name)}')"
                title="${activeRoomCode ? 'Share room code' : 'Create a room first'}">
          ${activeRoomCode ? '📩 Invite' : '🔒 Invite'}
        </button>
        <button class="friend-remove-btn" onclick="removeFriend('${escHtml(friend.name)}')" title="Remove">✕</button>
      </div>
    `;
    list.appendChild(div);
  });
}
window.removeFriend  = removeFriend;
window.inviteFriend  = inviteFriend;

// Initial render
renderFriendList();

// ============================================================
//  COPY ROOM CODE
// ============================================================
function copyCode() {
  if (!activeRoomCode) return;
  navigator.clipboard.writeText(activeRoomCode).then(() => {
    const btn = document.getElementById('copyBtn');
    if (btn) {
      btn.textContent = '✅ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copy';
        btn.classList.remove('copied');
      }, 2000);
    }
    showToast('Room code copied! 📋', 'success');
  });
}
window.copyCode = copyCode;

// ============================================================
//  SOCKET EVENTS
// ============================================================

// Game created (by this player as white / as AI host)
socket.on('gameCreated', data => {
  if (data.vsComputer) {
    // AI game – go straight to game board
    gotoGame(data.roomId, data.playerName, 'white', true, selectedDifficulty);
    return;
  }
  // Multiplayer friend game – show room code
  activeRoomCode = data.roomId;

  const box = document.getElementById('roomCreatedBox');
  const codeSpan = document.getElementById('roomCodeShow');
  if (box && codeSpan) {
    codeSpan.textContent = data.roomId;
    box.style.display = 'block';
  }
  // Disable create button
  const createBtn = document.getElementById('createRoomBtn');
  if (createBtn) { createBtn.disabled = true; createBtn.style.opacity = '0.5'; }

  // Refresh friend list so invite buttons activate
  renderFriendList();

  showToast(`🔐 Room created: ${data.roomId}`, 'success');

  // Store pending
  sessionStorage.setItem('pendingRoom', JSON.stringify({
    roomId: data.roomId,
    playerName: data.playerName,
    color: 'white',
    vsComputer: false
  }));
});

// Opponent joined – white player goes to game
socket.on('playerJoined', data => {
  const pending = JSON.parse(sessionStorage.getItem('pendingRoom') || '{}');
  if (pending.roomId === data.roomId) {
    showToast(`${data.playerName} joined! Starting game... ♟`, 'success');
    setTimeout(() => gotoGame(pending.roomId, pending.playerName, 'white', false), 800);
  }
});

// This player joined as black
socket.on('gameJoined', data => {
  showToast('Joined! Starting game... ♟', 'success');
  setTimeout(() => gotoGame(data.roomId, data.playerName, 'black', false), 800);
});

// Random match found
socket.on('randomMatchFound', data => {
  showToast('Opponent found! Starting game... 🎯', 'success');
  setTimeout(() => gotoGame(data.roomId, data.playerName, data.color, false), 800);
});

// Error from server
socket.on('errorMessage', msg => {
  showToast(msg, 'error');
  showMsg('inviteMsg', msg, 'error');
  // Reset searching state
  isSearching = false;
  const btn = document.getElementById('findMatchBtn');
  btn.classList.remove('searching');
  document.getElementById('findMatchText').textContent = 'Find Match';
  document.getElementById('findMatchSpinner').style.display = 'none';
});

// ============================================================
//  NAVIGATION TO GAME
// ============================================================
function gotoGame(roomId, playerName, color, vsComputer, difficulty) {
  const p = new URLSearchParams({ roomId, playerName, color, vsComputer: vsComputer ? 'true' : 'false' });
  if (difficulty) p.set('difficulty', difficulty);
  window.location.href = `game.html?${p.toString()}`;
}

// ============================================================
//  HELPERS
// ============================================================
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('globalToast');
  if (!el) return;
  el.textContent = msg;
  el.className = `global-toast show${type ? ' ' + type : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'global-toast'; }, 3500);
}

function showMsg(elId, msg, type = 'error') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
  setTimeout(() => { el.textContent = ''; }, 4000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
