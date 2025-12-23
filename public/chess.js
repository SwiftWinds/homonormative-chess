// ============================================
// HOMONORMATIVE CHESS - GAME ENGINE
// Supports Double Kings and Double Queens variants
// ============================================

class ChessGame {
  constructor(variant = 'double-kings') {
    this.variant = variant;
    this.board = this.getInitialBoard();
    this.currentTurn = 'white';
    this.moveHistory = [];
    this.positionHistory = [];
    this.halfMoveClock = 0;
    this.enPassantSquare = null;
    this.movedPieces = new Set();
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null;
    this.gameOver = false;
    this.winner = null;
    this.isFlipped = false; // For local play
    
    // The critical piece type for this variant
    this.criticalPiece = variant === 'double-kings' ? 'k' : 'q';
  }
  
  getInitialBoard() {
    if (this.variant === 'double-kings') {
      return [
        ['br', 'bn', 'bb', 'bk', 'bk', 'bb', 'bn', 'br'],
        ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
        ['wr', 'wn', 'wb', 'wk', 'wk', 'wb', 'wn', 'wr'],
      ];
    } else {
      return [
        ['br', 'bn', 'bb', 'bq', 'bq', 'bb', 'bn', 'br'],
        ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
        ['wr', 'wn', 'wb', 'wq', 'wq', 'wb', 'wn', 'wr'],
      ];
    }
  }
  
  clone() {
    const copy = new ChessGame(this.variant);
    copy.board = this.board.map(row => [...row]);
    copy.currentTurn = this.currentTurn;
    copy.moveHistory = [...this.moveHistory];
    copy.positionHistory = [...this.positionHistory];
    copy.halfMoveClock = this.halfMoveClock;
    copy.enPassantSquare = this.enPassantSquare;
    copy.movedPieces = new Set(this.movedPieces);
    copy.lastMove = this.lastMove;
    copy.gameOver = this.gameOver;
    copy.winner = this.winner;
    copy.isFlipped = this.isFlipped;
    return copy;
  }
  
  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }
  
  getPieceColor(piece) {
    if (!piece) return null;
    return piece[0] === 'w' ? 'white' : 'black';
  }
  
  getPieceType(piece) {
    if (!piece) return null;
    return piece[1];
  }
  
  isOwnPiece(piece) {
    return this.getPieceColor(piece) === this.currentTurn;
  }
  
  isEnemyPiece(piece) {
    const color = this.getPieceColor(piece);
    return color && color !== this.currentTurn;
  }
  
  // Get all critical pieces (kings in Double Kings, queens in Double Queens)
  getCriticalPieces(color) {
    const pieces = [];
    const prefix = color === 'white' ? 'w' : 'b';
    const critical = prefix + this.criticalPiece;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.board[row][col] === critical) {
          pieces.push({ row, col });
        }
      }
    }
    return pieces;
  }
  
  // Check if a square is attacked by the opponent
  isSquareAttacked(row, col, byColor) {
    const prefix = byColor === 'white' ? 'w' : 'b';
    
    // Check for pawn attacks
    const pawnDir = byColor === 'white' ? 1 : -1;
    const pawnRow = row + pawnDir;
    if (pawnRow >= 0 && pawnRow <= 7) {
      if (col > 0 && this.board[pawnRow][col - 1] === prefix + 'p') return true;
      if (col < 7 && this.board[pawnRow][col + 1] === prefix + 'p') return true;
    }
    
    // Check for knight attacks
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        if (this.board[nr][nc] === prefix + 'n') return true;
      }
    }
    
    // Check for king attacks (kings can still attack even if they're the critical piece)
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    for (const [dr, dc] of kingMoves) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        if (this.board[nr][nc] === prefix + 'k') return true;
      }
    }
    
    // Check for straight line attacks (rook, queen)
    const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dr, dc] of straightDirs) {
      let nr = row + dr;
      let nc = col + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const piece = this.board[nr][nc];
        if (piece) {
          if (piece === prefix + 'r' || piece === prefix + 'q') return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    
    // Check for diagonal attacks (bishop, queen)
    const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of diagDirs) {
      let nr = row + dr;
      let nc = col + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const piece = this.board[nr][nc];
        if (piece) {
          if (piece === prefix + 'b' || piece === prefix + 'q') return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    
    return false;
  }
  
  // Check if a critical piece is in check
  isCriticalPieceInCheck(row, col, color) {
    const enemyColor = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(row, col, enemyColor);
  }
  
  // Check if any critical piece of the current player is in check
  isInCheck(color = this.currentTurn) {
    const criticalPieces = this.getCriticalPieces(color);
    for (const piece of criticalPieces) {
      if (this.isCriticalPieceInCheck(piece.row, piece.col, color)) {
        return true;
      }
    }
    return false;
  }
  
  // Get positions of critical pieces that are in check
  getCheckedPieces(color = this.currentTurn) {
    const criticalPieces = this.getCriticalPieces(color);
    const checked = [];
    for (const piece of criticalPieces) {
      if (this.isCriticalPieceInCheck(piece.row, piece.col, color)) {
        checked.push(piece);
      }
    }
    return checked;
  }
  
  // Generate raw moves for a piece (without checking for leaving critical pieces in check)
  getRawMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];
    
    const type = this.getPieceType(piece);
    const color = this.getPieceColor(piece);
    const moves = [];
    
    switch (type) {
      case 'p':
        this.getPawnMoves(row, col, color, moves);
        break;
      case 'n':
        this.getKnightMoves(row, col, color, moves);
        break;
      case 'b':
        this.getBishopMoves(row, col, color, moves);
        break;
      case 'r':
        this.getRookMoves(row, col, color, moves);
        break;
      case 'q':
        this.getQueenMoves(row, col, color, moves);
        break;
      case 'k':
        this.getKingMoves(row, col, color, moves);
        break;
    }
    
    return moves;
  }
  
  getPawnMoves(row, col, color, moves) {
    const dir = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    const newRow = row + dir;
    if (newRow >= 0 && newRow <= 7 && !this.board[newRow][col]) {
      moves.push({ row: newRow, col, type: 'move' });
      
      // Double forward from start
      const doubleRow = row + 2 * dir;
      if (row === startRow && !this.board[doubleRow][col]) {
        moves.push({ row: doubleRow, col, type: 'double' });
      }
    }
    
    // Captures
    for (const dc of [-1, 1]) {
      const newCol = col + dc;
      if (newCol >= 0 && newCol <= 7 && newRow >= 0 && newRow <= 7) {
        const target = this.board[newRow][newCol];
        if (target && this.getPieceColor(target) !== color) {
          moves.push({ row: newRow, col: newCol, type: 'capture' });
        }
        
        // En passant
        if (this.enPassantSquare === `${newRow},${newCol}`) {
          moves.push({ row: newRow, col: newCol, type: 'enpassant' });
        }
      }
    }
    
    return moves;
  }
  
  getKnightMoves(row, col, color, moves) {
    const deltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const target = this.board[nr][nc];
        if (!target) {
          moves.push({ row: nr, col: nc, type: 'move' });
        } else if (this.getPieceColor(target) !== color) {
          moves.push({ row: nr, col: nc, type: 'capture' });
        }
      }
    }
  }
  
  getSlidingMoves(row, col, color, moves, directions) {
    for (const [dr, dc] of directions) {
      let nr = row + dr;
      let nc = col + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const target = this.board[nr][nc];
        if (!target) {
          moves.push({ row: nr, col: nc, type: 'move' });
        } else {
          if (this.getPieceColor(target) !== color) {
            moves.push({ row: nr, col: nc, type: 'capture' });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  
  getBishopMoves(row, col, color, moves) {
    this.getSlidingMoves(row, col, color, moves, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  }
  
  getRookMoves(row, col, color, moves) {
    this.getSlidingMoves(row, col, color, moves, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
  }
  
  getQueenMoves(row, col, color, moves) {
    this.getBishopMoves(row, col, color, moves);
    this.getRookMoves(row, col, color, moves);
    
    // In Double Queens variant, queens can castle
    if (this.variant === 'double-queens') {
      this.getCastlingMoves(row, col, color, moves);
    }
  }
  
  getKingMoves(row, col, color, moves) {
    const deltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [dr, dc] of deltas) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const target = this.board[nr][nc];
        if (!target) {
          moves.push({ row: nr, col: nc, type: 'move' });
        } else if (this.getPieceColor(target) !== color) {
          moves.push({ row: nr, col: nc, type: 'capture' });
        }
      }
    }
    
    // Castling - for kings in Double Kings, for queens in Double Queens
    const piece = this.board[row][col];
    if (piece && piece[1] === this.criticalPiece) {
      this.getCastlingMoves(row, col, color, moves);
    }
  }
  
  getCastlingMoves(row, col, color, moves) {
    const pieceKey = `${row},${col}`;
    const piece = this.board[row][col];
    
    // Check if this piece has moved
    if (this.movedPieces.has(pieceKey)) return;
    
    // Check if the critical piece is in check (can't castle out of check)
    if (this.isCriticalPieceInCheck(row, col, color)) return;
    
    const baseRow = color === 'white' ? 7 : 0;
    if (row !== baseRow) return;
    
    // King-side castling
    const kRook = this.board[row][7];
    if (kRook && kRook[1] === 'r' && !this.movedPieces.has(`${row},7`)) {
      let canCastle = true;
      // Check path is clear
      for (let c = col + 1; c < 7; c++) {
        if (this.board[row][c]) {
          canCastle = false;
          break;
        }
      }
      // Check king doesn't pass through or end in check
      if (canCastle) {
        const enemyColor = color === 'white' ? 'black' : 'white';
        for (let c = col; c <= col + 2 && c <= 6; c++) {
          if (this.isSquareAttacked(row, c, enemyColor)) {
            canCastle = false;
            break;
          }
        }
      }
      if (canCastle && col + 2 <= 6) {
        moves.push({ row, col: col + 2, type: 'castle-king' });
      }
    }
    
    // Queen-side castling
    const qRook = this.board[row][0];
    if (qRook && qRook[1] === 'r' && !this.movedPieces.has(`${row},0`)) {
      let canCastle = true;
      // Check path is clear
      for (let c = col - 1; c > 0; c--) {
        if (this.board[row][c]) {
          canCastle = false;
          break;
        }
      }
      // Check king doesn't pass through or end in check
      if (canCastle) {
        const enemyColor = color === 'white' ? 'black' : 'white';
        for (let c = col; c >= col - 2 && c >= 2; c--) {
          if (this.isSquareAttacked(row, c, enemyColor)) {
            canCastle = false;
            break;
          }
        }
      }
      if (canCastle && col - 2 >= 1) {
        moves.push({ row, col: col - 2, type: 'castle-queen' });
      }
    }
  }
  
  // Get legal moves for a piece (checking that all critical pieces are safe)
  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece || this.getPieceColor(piece) !== this.currentTurn) return [];
    
    const rawMoves = this.getRawMoves(row, col);
    const legalMoves = [];
    
    for (const move of rawMoves) {
      // Simulate the move
      const testGame = this.clone();
      testGame.makeMove(row, col, move.row, move.col, move.type, null, true);
      
      // Check that ALL critical pieces are safe
      const criticalPieces = testGame.getCriticalPieces(this.currentTurn);
      let allSafe = true;
      for (const cp of criticalPieces) {
        if (testGame.isCriticalPieceInCheck(cp.row, cp.col, this.currentTurn)) {
          allSafe = false;
          break;
        }
      }
      
      if (allSafe) {
        legalMoves.push(move);
      }
    }
    
    return legalMoves;
  }
  
  // Get all legal moves for the current player
  getAllLegalMoves() {
    const moves = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && this.getPieceColor(piece) === this.currentTurn) {
          const pieceMoves = this.getLegalMoves(row, col);
          for (const move of pieceMoves) {
            moves.push({ from: { row, col }, to: move });
          }
        }
      }
    }
    return moves;
  }
  
  // Make a move on the board
  makeMove(fromRow, fromCol, toRow, toCol, moveType, promotionPiece = null, isSimulation = false) {
    const piece = this.board[fromRow][fromCol];
    const capturedPiece = this.board[toRow][toCol];
    const pieceType = this.getPieceType(piece);
    const color = this.getPieceColor(piece);
    
    // Track piece movement for castling rights
    this.movedPieces.add(`${fromRow},${fromCol}`);
    
    // Handle en passant capture
    if (moveType === 'enpassant') {
      const captureRow = color === 'white' ? toRow + 1 : toRow - 1;
      this.board[captureRow][toCol] = '';
    }
    
    // Handle castling
    if (moveType === 'castle-king') {
      // Move rook
      const rook = this.board[fromRow][7];
      this.board[fromRow][7] = '';
      this.board[fromRow][toCol - 1] = rook;
      this.movedPieces.add(`${fromRow},7`);
    } else if (moveType === 'castle-queen') {
      // Move rook
      const rook = this.board[fromRow][0];
      this.board[fromRow][0] = '';
      this.board[fromRow][toCol + 1] = rook;
      this.movedPieces.add(`${fromRow},0`);
    }
    
    // Move the piece
    this.board[fromRow][fromCol] = '';
    this.board[toRow][toCol] = piece;
    
    // Handle pawn promotion
    const promotionRow = color === 'white' ? 0 : 7;
    if (pieceType === 'p' && toRow === promotionRow) {
      if (promotionPiece) {
        const prefix = color === 'white' ? 'w' : 'b';
        this.board[toRow][toCol] = prefix + promotionPiece;
      }
    }
    
    // Set en passant square
    if (moveType === 'double') {
      const epRow = color === 'white' ? toRow + 1 : toRow - 1;
      this.enPassantSquare = `${epRow},${toCol}`;
    } else {
      this.enPassantSquare = null;
    }
    
    // Update half-move clock
    if (pieceType === 'p' || capturedPiece || moveType === 'enpassant') {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
    
    if (!isSimulation) {
      // Record move
      this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
      
      // Generate move notation
      const notation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece, moveType, promotionPiece);
      this.moveHistory.push(notation);
      
      // Record position
      this.positionHistory.push(this.getBoardHash());
      
      // Switch turns
      this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
    }
    
    return {
      capturedPiece,
      isPawnMove: pieceType === 'p',
      isCapture: !!capturedPiece || moveType === 'enpassant'
    };
  }
  
  getMoveNotation(fromRow, fromCol, toRow, toCol, piece, captured, moveType, promotion) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    const pieceSymbols = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };
    const pieceType = piece[1];
    
    let notation = '';
    
    if (moveType === 'castle-king') {
      notation = 'O-O';
    } else if (moveType === 'castle-queen') {
      notation = 'O-O-O';
    } else {
      notation = pieceSymbols[pieceType];
      
      // Add disambiguation for non-pawns if needed
      if (pieceType !== 'p') {
        notation += files[fromCol];
      }
      
      // Add capture symbol
      if (captured || moveType === 'enpassant') {
        if (pieceType === 'p') {
          notation += files[fromCol];
        }
        notation += 'x';
      }
      
      // Add destination
      notation += files[toCol] + ranks[toRow];
      
      // Add promotion
      if (promotion) {
        notation += '=' + pieceSymbols[promotion].toUpperCase();
      }
      
      // Add en passant marker
      if (moveType === 'enpassant') {
        notation += ' e.p.';
      }
    }
    
    // Check for check or checkmate
    const testGame = this.clone();
    testGame.currentTurn = testGame.currentTurn === 'white' ? 'black' : 'white';
    
    if (testGame.isCheckmate()) {
      notation += '#';
    } else if (testGame.isInCheck()) {
      notation += '+';
    }
    
    return notation;
  }
  
  getBoardHash() {
    return this.board.map(row => row.join(',')).join('/') + 
           '|' + this.currentTurn +
           '|' + (this.enPassantSquare || '-');
  }
  
  // Check for checkmate - all critical pieces cannot escape
  isCheckmate() {
    if (!this.isInCheck()) return false;
    return this.getAllLegalMoves().length === 0;
  }
  
  // Check for stalemate
  isStalemate() {
    if (this.isInCheck()) return false;
    return this.getAllLegalMoves().length === 0;
  }
  
  // Check for threefold repetition
  isThreefoldRepetition() {
    const currentHash = this.getBoardHash();
    let count = 0;
    for (const hash of this.positionHistory) {
      if (hash === currentHash) count++;
      if (count >= 3) return true;
    }
    return false;
  }
  
  // Check for 50-move rule
  isFiftyMoveRule() {
    return this.halfMoveClock >= 100; // 50 moves = 100 half-moves
  }
  
  // Check for insufficient material
  isInsufficientMaterial() {
    const pieces = { w: [], b: [] };
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece) {
          const color = piece[0];
          const type = piece[1];
          pieces[color].push({ type, row, col });
        }
      }
    }
    
    // With the critical piece rule, check if the opponent has enough to checkmate both
    // This is complex, so we'll use simple heuristics
    
    // If there are pawns, queens, or rooks, there's enough material
    for (const color of ['w', 'b']) {
      for (const p of pieces[color]) {
        if (p.type === 'p' || p.type === 'q' || p.type === 'r') {
          return false;
        }
      }
    }
    
    // Count knights and bishops
    const whiteMinor = pieces.w.filter(p => p.type === 'n' || p.type === 'b');
    const blackMinor = pieces.b.filter(p => p.type === 'n' || p.type === 'b');
    
    // King(s) vs King(s) - insufficient
    if (whiteMinor.length === 0 && blackMinor.length === 0) {
      return true;
    }
    
    // King(s) + minor vs King(s) - insufficient
    if ((whiteMinor.length <= 1 && blackMinor.length === 0) ||
        (blackMinor.length <= 1 && whiteMinor.length === 0)) {
      return true;
    }
    
    return false;
  }
  
  // Select a square
  selectSquare(row, col) {
    const piece = this.board[row][col];
    
    // If clicking on own piece, select it
    if (piece && this.isOwnPiece(piece)) {
      this.selectedSquare = { row, col };
      this.validMoves = this.getLegalMoves(row, col);
      return { selected: true, moves: this.validMoves };
    }
    
    // If a piece is selected and clicking on valid move
    if (this.selectedSquare) {
      const validMove = this.validMoves.find(m => m.row === row && m.col === col);
      if (validMove) {
        return { 
          move: true, 
          from: this.selectedSquare, 
          to: { row, col }, 
          type: validMove.type,
          needsPromotion: this.needsPromotion(this.selectedSquare.row, row)
        };
      }
    }
    
    // Deselect
    this.selectedSquare = null;
    this.validMoves = [];
    return { deselected: true };
  }
  
  needsPromotion(fromRow, toRow) {
    if (!this.selectedSquare) return false;
    const piece = this.board[this.selectedSquare.row][this.selectedSquare.col];
    if (!piece || piece[1] !== 'p') return false;
    const color = piece[0] === 'w' ? 'white' : 'black';
    return (color === 'white' && toRow === 0) || (color === 'black' && toRow === 7);
  }
  
  getPromotionOptions() {
    // In Double Kings, you can promote to king too
    // In Double Queens, you can promote to queen (obviously) and king
    if (this.variant === 'double-kings') {
      return ['q', 'r', 'b', 'n', 'k'];
    } else {
      return ['q', 'r', 'b', 'n', 'k'];
    }
  }
  
  clearSelection() {
    this.selectedSquare = null;
    this.validMoves = [];
  }
  
  // Set board state (for syncing with server)
  setState(state) {
    if (state.board) this.board = state.board;
    if (state.currentTurn) this.currentTurn = state.currentTurn;
    if (state.moveHistory) this.moveHistory = state.moveHistory;
    if (state.enPassantSquare !== undefined) this.enPassantSquare = state.enPassantSquare;
    if (state.lastMove) this.lastMove = state.lastMove;
  }
}

// Export for use in app.js
window.ChessGame = ChessGame;

