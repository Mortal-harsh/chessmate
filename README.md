# ♟️ ChessMate PRO

> **Advanced Real-Time Multiplayer & AI Chess Web Application**  
> *Developed by Harsh Raj (UID: 26MCA20215) & Prince Raj (UID: 26MCA20216)*

---

## 📌 Project Overview
**ChessMate PRO** is a feature-rich, high-performance web-based chess platform. Built with modern web technologies, it features real-time WebSocket communication, an offline Minimax AI engine with Alpha-Beta pruning, live opening book detection, in-game tactical hints, threat radar blunder prevention, and full PGN/FEN tournament export capabilities.

---

## 🚀 Key Features

### 🎮 Game Modes
* **Play vs Computer (AI Engine):** Powered by Minimax with Alpha-Beta Pruning and Piece-Square Tables (PST) across 3 difficulty tiers (Easy, Medium, Hard).
* **Private Multiplayer Rooms:** Create unique 6-character room codes to invite and play with friends in real-time.
* **Random Matchmaking:** Queue up and instantly connect with any online opponent worldwide.
* **Self Play (Me vs Me / Pass & Play):** Local sandbox analysis mode with step-by-step move undo support.

### 🌟 Advanced & Unique Tools
* **📖 Live Opening Book Explorer:** Automatically detects over 50+ classic and modern chess openings and variations (Italian Game, Sicilian: Najdorf/Dragon, Ruy Lopez, Queen's Gambit, King's Indian, London System, etc.) and displays a live glowing badge.
* **💡 AI Tactical Coach / Smart Move Hint:** In-game tactical advisor calculating the optimal move (checkmate, tactical captures, forks, center control, piece development, king safety) with visual highlights and explanations.
* **🛡️ Danger Vision / Threat Radar:** Real-time raycasting engine highlighting all squares threatened by the opponent, including automated pulsing red warnings on hanging (undefended) pieces.
* **📋 PGN & FEN Export Suite:** Formatted Portable Game Notation (PGN), live FEN string generator, and one-click `.pgn` file download to analyze games on Chess.com or Lichess.

### 🎨 Visual & Quality-of-Life Design
* **Pixel-Perfect 64-Square Grid:** Strictly balanced responsive CSS Grid layout preventing row collapse and piece distortion.
* **4 Premium Board Themes:** Royal Walnut (Classic Wood), Emerald Master (Tournament Green), Cyber Neon (Dark Sci-Fi), and Amethyst Frost (Purple Royal).
* **Live Advantage Bar:** Real-time visual evaluation bar tracking material advantage between White and Black.
* **Dual Blitz Countdown Clocks:** Tabular countdown clocks with low-time warning blinking animation (< 30 seconds).
* **Captured Pieces Showcase:** Visual capture trays displaying pieces captured by each player with point differentials.
* **In-Game Chat & Floating Emojis:** Interactive chat box and floating animated emoji reactions (👏, 🤔, 😅, 🎉, 😤, 🤝).
* **Full FIDE Tournament Rules:** Pawn promotion modal, castling, en passant, threefold repetition, 50-move rule, and draw/resign modals.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, Modern CSS3 (Glassmorphism, CSS Grid, Custom SVG Pieces), Vanilla JavaScript (ES6+).
* **Backend:** Node.js, Express.js.
* **Networking:** Socket.IO (Real-time bidirectional WebSockets).
* **Rule Engine:** Chess.js (FIDE standard rule validation).
* **Sound Effects:** Web Audio API (Synthesized acoustic chimes).

---

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/chessmate-pro.git
   cd chessmate-pro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
