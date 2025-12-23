import { serve } from "bun";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Game state storage
interface Player {
  ws: WebSocket;
  color: "white" | "black";
  connected: boolean;
  disconnectTimeout?: Timer;
}

interface GameState {
  id: string;
  variant: "double-kings" | "double-queens";
  players: Map<WebSocket, Player>;
  board: string[][];
  currentTurn: "white" | "black";
  moveHistory: string[];
  whiteTime: number;
  blackTime: number;
  increment: number;
  lastMoveTime: number;
  gameStarted: boolean;
  gameOver: boolean;
  winner: "white" | "black" | "draw" | null;
  drawOffer: "white" | "black" | null;
  takebackRequest: "white" | "black" | null;
  positions: Map<string, number>; // For threefold repetition
  halfMoveClock: number; // For 50-move rule
  castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
  enPassantSquare: string | null;
  movedPieces: Set<string>; // Track which pieces have moved (for castling)
}

const games = new Map<string, GameState>();

function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getInitialBoard(variant: "double-kings" | "double-queens"): string[][] {
  if (variant === "double-kings") {
    return [
      ["br", "bn", "bb", "bk", "bk", "bb", "bn", "br"],
      ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
      ["wr", "wn", "wb", "wk", "wk", "wb", "wn", "wr"],
    ];
  } else {
    return [
      ["br", "bn", "bb", "bq", "bq", "bb", "bn", "br"],
      ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
      ["wr", "wn", "wb", "wq", "wq", "wb", "wn", "wr"],
    ];
  }
}

function getMimeType(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".woff")) return "font/woff";
  return "application/octet-stream";
}

function broadcastToGame(gameId: string, message: object, excludeWs?: WebSocket) {
  const game = games.get(gameId);
  if (!game) return;

  const data = JSON.stringify(message);
  for (const [ws, player] of game.players) {
    if (ws !== excludeWs && player.connected && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function sendToPlayer(ws: WebSocket, message: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getPlayerColor(game: GameState, ws: WebSocket): "white" | "black" | null {
  const player = game.players.get(ws);
  return player?.color || null;
}

function getOpponentWs(game: GameState, ws: WebSocket): WebSocket | null {
  for (const [otherWs, player] of game.players) {
    if (otherWs !== ws) {
      return otherWs;
    }
  }
  return null;
}

function boardToFEN(board: string[][]): string {
  return board.map(row => row.map(p => p || "-").join("")).join("/");
}

function handleDisconnect(gameId: string, ws: WebSocket) {
  const game = games.get(gameId);
  if (!game) return;

  const player = game.players.get(ws);
  if (!player) return;

  player.connected = false;

  // Start disconnect timeout
  player.disconnectTimeout = setTimeout(() => {
    if (!player.connected && !game.gameOver) {
      game.gameOver = true;
      game.winner = player.color === "white" ? "black" : "white";
      broadcastToGame(gameId, {
        type: "gameOver",
        reason: "disconnect",
        winner: game.winner,
      });
    }
  }, 60000); // 1 minute timeout

  broadcastToGame(gameId, {
    type: "playerDisconnected",
    color: player.color,
  }, ws);
}

function handleReconnect(gameId: string, ws: WebSocket, color: "white" | "black") {
  const game = games.get(gameId);
  if (!game) return false;

  // Find the disconnected player
  for (const [oldWs, player] of game.players) {
    if (player.color === color && !player.connected) {
      // Clear disconnect timeout
      if (player.disconnectTimeout) {
        clearTimeout(player.disconnectTimeout);
      }
      
      // Remove old ws and add new one
      game.players.delete(oldWs);
      game.players.set(ws, { ...player, ws, connected: true, disconnectTimeout: undefined });
      
      broadcastToGame(gameId, {
        type: "playerReconnected",
        color: color,
      });
      
      return true;
    }
  }
  return false;
}

const PORT = process.env.PORT || 3000;

const server = serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    
    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Serve static files
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const fullPath = join(import.meta.dir, "public", filePath);

    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath);
        return new Response(content, {
          headers: { "Content-Type": getMimeType(filePath) },
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }

    // Fallback to index.html for SPA routing
    const indexPath = join(import.meta.dir, "public", "index.html");
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath);
      return new Response(content, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: {
    open(ws) {
      console.log("WebSocket connected");
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case "createGame": {
            const gameCode = generateGameCode();
            const game: GameState = {
              id: gameCode,
              variant: data.variant,
              players: new Map(),
              board: getInitialBoard(data.variant),
              currentTurn: "white",
              moveHistory: [],
              whiteTime: data.time * 60 * 1000,
              blackTime: data.time * 60 * 1000,
              increment: (data.increment || 0) * 1000,
              lastMoveTime: 0,
              gameStarted: false,
              gameOver: false,
              winner: null,
              drawOffer: null,
              takebackRequest: null,
              positions: new Map(),
              halfMoveClock: 0,
              castlingRights: {
                whiteKingSide: true,
                whiteQueenSide: true,
                blackKingSide: true,
                blackQueenSide: true,
              },
              enPassantSquare: null,
              movedPieces: new Set(),
            };
            
            game.players.set(ws, { ws, color: "white", connected: true });
            games.set(gameCode, game);
            
            sendToPlayer(ws, {
              type: "gameCreated",
              gameCode,
              color: "white",
              variant: data.variant,
            });
            break;
          }
          
          case "joinGame": {
            const game = games.get(data.gameCode);
            if (!game) {
              sendToPlayer(ws, { type: "error", message: "Game not found" });
              return;
            }
            
            if (game.players.size >= 2) {
              // Try to reconnect
              if (data.reconnectColor && handleReconnect(data.gameCode, ws, data.reconnectColor)) {
                sendToPlayer(ws, {
                  type: "reconnected",
                  gameCode: data.gameCode,
                  color: data.reconnectColor,
                  variant: game.variant,
                  board: game.board,
                  currentTurn: game.currentTurn,
                  moveHistory: game.moveHistory,
                  whiteTime: game.whiteTime,
                  blackTime: game.blackTime,
                  gameStarted: game.gameStarted,
                });
                return;
              }
              sendToPlayer(ws, { type: "error", message: "Game is full" });
              return;
            }
            
            game.players.set(ws, { ws, color: "black", connected: true });
            
            sendToPlayer(ws, {
              type: "gameJoined",
              gameCode: data.gameCode,
              color: "black",
              variant: game.variant,
              board: game.board,
              whiteTime: game.whiteTime,
              blackTime: game.blackTime,
            });
            
            // Notify white player
            broadcastToGame(data.gameCode, {
              type: "opponentJoined",
            }, ws);
            
            // Start the game
            game.gameStarted = true;
            game.lastMoveTime = Date.now();
            
            broadcastToGame(data.gameCode, {
              type: "gameStarted",
              board: game.board,
              currentTurn: game.currentTurn,
              whiteTime: game.whiteTime,
              blackTime: game.blackTime,
            });
            break;
          }
          
          case "move": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (playerColor !== game.currentTurn) return;
            
            // Clear any pending draw offers or takeback requests
            if (game.drawOffer || game.takebackRequest) {
              game.drawOffer = null;
              game.takebackRequest = null;
              broadcastToGame(data.gameCode, {
                type: "offerCleared",
              });
            }
            
            // Update board
            game.board = data.board;
            game.moveHistory.push(data.move);
            
            // Update en passant square
            game.enPassantSquare = data.enPassantSquare || null;
            
            // Track moved pieces for castling
            if (data.movedPiece) {
              game.movedPieces.add(data.movedPiece);
            }
            
            // Update castling rights
            if (data.castlingRights) {
              game.castlingRights = data.castlingRights;
            }
            
            // Update clocks
            const now = Date.now();
            const elapsed = now - game.lastMoveTime;
            
            if (game.currentTurn === "white") {
              game.whiteTime -= elapsed;
              game.whiteTime += game.increment;
            } else {
              game.blackTime -= elapsed;
              game.blackTime += game.increment;
            }
            
            game.lastMoveTime = now;
            
            // Update half-move clock (for 50-move rule)
            if (data.isCapture || data.isPawnMove) {
              game.halfMoveClock = 0;
            } else {
              game.halfMoveClock++;
            }
            
            // Track position for threefold repetition
            const posKey = boardToFEN(game.board) + game.currentTurn;
            game.positions.set(posKey, (game.positions.get(posKey) || 0) + 1);
            
            // Switch turns
            game.currentTurn = game.currentTurn === "white" ? "black" : "white";
            
            // Check game end conditions
            if (data.isCheckmate) {
              game.gameOver = true;
              game.winner = playerColor;
              broadcastToGame(data.gameCode, {
                type: "gameOver",
                reason: "checkmate",
                winner: playerColor,
              });
            } else if (data.isStalemate) {
              game.gameOver = true;
              game.winner = "draw";
              broadcastToGame(data.gameCode, {
                type: "gameOver",
                reason: "stalemate",
                winner: "draw",
              });
            } else if (game.halfMoveClock >= 100) {
              game.gameOver = true;
              game.winner = "draw";
              broadcastToGame(data.gameCode, {
                type: "gameOver",
                reason: "50-move-rule",
                winner: "draw",
              });
            } else if ((game.positions.get(posKey) || 0) >= 3) {
              game.gameOver = true;
              game.winner = "draw";
              broadcastToGame(data.gameCode, {
                type: "gameOver",
                reason: "threefold-repetition",
                winner: "draw",
              });
            } else if (data.insufficientMaterial) {
              game.gameOver = true;
              game.winner = "draw";
              broadcastToGame(data.gameCode, {
                type: "gameOver",
                reason: "insufficient-material",
                winner: "draw",
              });
            }
            
            // Broadcast move
            broadcastToGame(data.gameCode, {
              type: "moveMade",
              board: game.board,
              move: data.move,
              currentTurn: game.currentTurn,
              whiteTime: game.whiteTime,
              blackTime: game.blackTime,
              enPassantSquare: game.enPassantSquare,
            });
            break;
          }
          
          case "resign": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (!playerColor) return;
            
            game.gameOver = true;
            game.winner = playerColor === "white" ? "black" : "white";
            
            broadcastToGame(data.gameCode, {
              type: "gameOver",
              reason: "resignation",
              winner: game.winner,
            });
            break;
          }
          
          case "offerDraw": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (!playerColor) return;
            
            game.drawOffer = playerColor;
            
            const opponentWs = getOpponentWs(game, ws);
            if (opponentWs) {
              sendToPlayer(opponentWs, {
                type: "drawOffered",
                by: playerColor,
              });
            }
            break;
          }
          
          case "acceptDraw": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver || !game.drawOffer) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (playerColor === game.drawOffer) return; // Can't accept your own offer
            
            game.gameOver = true;
            game.winner = "draw";
            
            broadcastToGame(data.gameCode, {
              type: "gameOver",
              reason: "agreement",
              winner: "draw",
            });
            break;
          }
          
          case "declineDraw": {
            const game = games.get(data.gameCode);
            if (!game || !game.drawOffer) return;
            
            game.drawOffer = null;
            
            broadcastToGame(data.gameCode, {
              type: "drawDeclined",
            });
            break;
          }
          
          case "requestTakeback": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver || game.moveHistory.length === 0) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (!playerColor) return;
            
            game.takebackRequest = playerColor;
            
            const opponentWs = getOpponentWs(game, ws);
            if (opponentWs) {
              sendToPlayer(opponentWs, {
                type: "takebackRequested",
                by: playerColor,
              });
            }
            break;
          }
          
          case "acceptTakeback": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver || !game.takebackRequest) return;
            
            const playerColor = getPlayerColor(game, ws);
            if (playerColor === game.takebackRequest) return;
            
            // Remove last move
            game.moveHistory.pop();
            game.takebackRequest = null;
            
            // Reset board to previous position
            if (data.previousBoard) {
              game.board = data.previousBoard;
              game.currentTurn = game.currentTurn === "white" ? "black" : "white";
            }
            
            broadcastToGame(data.gameCode, {
              type: "takebackAccepted",
              board: game.board,
              currentTurn: game.currentTurn,
              moveHistory: game.moveHistory,
            });
            break;
          }
          
          case "declineTakeback": {
            const game = games.get(data.gameCode);
            if (!game || !game.takebackRequest) return;
            
            game.takebackRequest = null;
            
            broadcastToGame(data.gameCode, {
              type: "takebackDeclined",
            });
            break;
          }
          
          case "timeout": {
            const game = games.get(data.gameCode);
            if (!game || game.gameOver) return;
            
            const loser = data.color;
            game.gameOver = true;
            game.winner = loser === "white" ? "black" : "white";
            
            broadcastToGame(data.gameCode, {
              type: "gameOver",
              reason: "timeout",
              winner: game.winner,
            });
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    },
    close(ws) {
      // Find and handle disconnect for any game this ws is part of
      for (const [gameId, game] of games) {
        if (game.players.has(ws)) {
          handleDisconnect(gameId, ws);
          break;
        }
      }
    },
  },
});

console.log(`🏰 Homonormative Chess server running at http://localhost:${server.port}`);

