# Homonormative Chess ♚♚ ♛♛

A web-based chess variant platform featuring **Double Kings Chess** and **Double Queens Chess**.

## 🎮 Game Variants

### Double Kings Chess
- Each player has **two kings** instead of a king and queen
- **Both kings** must escape check at the end of each turn
- Win by checkmating either king, or by forking both kings such that one cannot be saved
- Both kings can castle (with standard castling restrictions)
- Pawns can promote to king (check rules apply to promoted kings too!)

### Double Queens Chess
- Each player has **two queens** instead of a king and queen
- **Both queens** must escape "check" (being attacked) at the end of each turn
- Win by "checkmating" either queen, or by attacking both queens at once
- Both queens can castle (like kings in standard chess)
- Pawns can promote to queen or king

## 🚀 Getting Started

### Prerequisites
- [Bun](https://bun.sh/) runtime

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd homonormative-chess

# Start the server
bun run server.ts
```

The game will be available at `http://localhost:3000`

### Development

```bash
# Run with auto-reload
bun run dev
```

## 🎯 How to Play

### Online Mode
1. Choose your variant (Double Kings or Double Queens)
2. Select a time control
3. Create a new game and share the 6-character code with a friend
4. Your friend enters the code to join
5. Play!

### Local Mode (Over the Board)
1. Choose your variant
2. Select "Over the Board" mode
3. The board automatically flips after each move
4. Perfect for playing with someone sitting across from you!

## ⏱️ Time Controls

**Rapid:**
- 30 minutes
- 15 minutes + 10 second increment
- 10 minutes (default)
- 5 minutes

**Blitz:**
- 3 minutes + 2 second increment
- 3 minutes

**Bullet:**
- 2 minutes + 1 second increment
- 1 minute

## 🎮 Game Features

- **Move list** showing all moves in algebraic notation
- **Timers** with color-coding and low-time warnings
- **Draw offers** and **takeback requests**
- **Resignation** option
- **Disconnect timeout** (1 minute grace period)
- All standard chess rules apply:
  - En passant
  - 50-move rule
  - Threefold repetition
  - Insufficient material detection

## 🛠️ Tech Stack

- **Backend:** Bun with WebSocket support
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Fonts:** Cinzel (display), Cormorant Garamond (body)

## 📜 License

MIT License - feel free to use and modify!
