// ============================================
// HOMONORMATIVE CHESS - APPLICATION
// Main application logic and UI controller
// ============================================

class ChessApp {
  constructor() {
    this.game = null;
    this.ws = null;
    this.gameCode = null;
    this.playerColor = null;
    this.variant = null;
    this.mode = 'online'; // 'online' or 'local'
    this.timeControl = { time: 10, increment: 0 };
    
    this.whiteTime = 0;
    this.blackTime = 0;
    this.timerInterval = null;
    this.lastTickTime = 0;
    
    this.pendingPromotion = null;
    this.boardPositions = []; // For takeback
    
    this.init();
  }
  
  init() {
    this.bindHomeScreen();
    this.bindSetupScreen();
    this.bindWaitingScreen();
    this.bindGameScreen();
  }
  
  // ============================================
  // SCREEN MANAGEMENT
  // ============================================
  
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }
  
  // ============================================
  // HOME SCREEN
  // ============================================
  
  bindHomeScreen() {
    document.querySelectorAll('.variant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.variant = btn.dataset.variant;
        document.getElementById('setup-variant-name').textContent = 
          this.variant === 'double-kings' ? '♚♚ Double Kings' : '♛♛ Double Queens';
        this.showScreen('setup-screen');
      });
    });
  }
  
  // ============================================
  // SETUP SCREEN
  // ============================================
  
  bindSetupScreen() {
    // Back button
    document.getElementById('setup-back-btn').addEventListener('click', () => {
      this.showScreen('home-screen');
    });
    
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.mode = btn.dataset.mode;
        
        const onlineSection = document.querySelector('.online-only');
        if (this.mode === 'local') {
          onlineSection.classList.add('hidden');
        } else {
          onlineSection.classList.remove('hidden');
        }
      });
    });
    
    // Time preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.timeControl = {
          time: parseInt(btn.dataset.time),
          increment: parseInt(btn.dataset.increment)
        };
      });
    });
    
    // Create/Join game toggle
    document.getElementById('create-game-btn').addEventListener('click', () => {
      document.getElementById('create-game-btn').classList.add('active');
      document.getElementById('join-game-btn').classList.remove('active');
    });
    
    // Game code input
    const codeInput = document.getElementById('game-code-input');
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase();
      if (codeInput.value.length > 0) {
        document.getElementById('create-game-btn').classList.remove('active');
        document.getElementById('join-game-btn').classList.add('active');
      }
    });
    
    // Join game button
    document.getElementById('join-game-btn').addEventListener('click', () => {
      const code = codeInput.value.trim();
      if (code.length === 6) {
        this.joinGame(code);
      }
    });
    
    // Start game button
    document.getElementById('start-game-btn').addEventListener('click', () => {
      if (this.mode === 'local') {
        this.startLocalGame();
      } else {
        const code = codeInput.value.trim();
        if (code.length === 6) {
          this.joinGame(code);
        } else {
          this.createGame();
        }
      }
    });
  }
  
  // ============================================
  // WAITING SCREEN
  // ============================================
  
  bindWaitingScreen() {
    document.getElementById('copy-code-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(this.gameCode);
      const btn = document.getElementById('copy-code-btn');
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = '📋', 1500);
    });
    
    document.getElementById('cancel-wait-btn').addEventListener('click', () => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      this.showScreen('setup-screen');
    });
  }
  
  // ============================================
  // GAME SCREEN
  // ============================================
  
  bindGameScreen() {
    // Game controls
    document.getElementById('offer-draw-btn').addEventListener('click', () => {
      this.offerDraw();
    });
    
    document.getElementById('takeback-btn').addEventListener('click', () => {
      this.requestTakeback();
    });
    
    document.getElementById('resign-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to resign?')) {
        this.resign();
      }
    });
    
    // Modal buttons
    document.getElementById('accept-offer-btn').addEventListener('click', () => {
      this.acceptOffer();
    });
    
    document.getElementById('decline-offer-btn').addEventListener('click', () => {
      this.declineOffer();
    });
    
    document.getElementById('new-game-btn').addEventListener('click', () => {
      this.showScreen('home-screen');
      this.cleanup();
    });
  }
  
  // ============================================
  // WEBSOCKET CONNECTION
  // ============================================
  
  connectWebSocket() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed');
      };
    });
  }
  
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  handleServerMessage(data) {
    switch (data.type) {
      case 'gameCreated':
        this.gameCode = data.gameCode;
        this.playerColor = data.color;
        document.getElementById('display-game-code').textContent = this.gameCode;
        this.showScreen('waiting-screen');
        break;
        
      case 'gameJoined':
        this.gameCode = data.gameCode;
        this.playerColor = data.color;
        this.whiteTime = data.whiteTime;
        this.blackTime = data.blackTime;
        this.initGame(data.board);
        break;
        
      case 'opponentJoined':
        // Game will start
        break;
        
      case 'gameStarted':
        this.whiteTime = data.whiteTime;
        this.blackTime = data.blackTime;
        this.initGame(data.board);
        this.startTimers();
        break;
        
      case 'moveMade':
        this.game.setState({
          board: data.board,
          currentTurn: data.currentTurn,
          enPassantSquare: data.enPassantSquare
        });
        this.game.moveHistory.push(data.move);
        this.whiteTime = data.whiteTime;
        this.blackTime = data.blackTime;
        this.renderBoard();
        this.updateMoveList();
        this.updateTimerDisplay();
        this.updateStatus();
        break;
        
      case 'drawOffered':
        this.showOfferModal('Draw Offer', `${data.by === 'white' ? 'White' : 'Black'} offers a draw.`, 'draw');
        break;
        
      case 'drawDeclined':
        this.hideModal('offer-modal');
        this.showStatus('Draw declined');
        break;
        
      case 'takebackRequested':
        this.showOfferModal('Takeback Request', `${data.by === 'white' ? 'White' : 'Black'} requests a takeback.`, 'takeback');
        break;
        
      case 'takebackDeclined':
        this.hideModal('offer-modal');
        this.showStatus('Takeback declined');
        break;
        
      case 'takebackAccepted':
        this.game.setState({
          board: data.board,
          currentTurn: data.currentTurn,
          moveHistory: data.moveHistory
        });
        this.renderBoard();
        this.updateMoveList();
        this.hideModal('offer-modal');
        this.showStatus('Takeback accepted');
        break;
        
      case 'offerCleared':
        this.hideModal('offer-modal');
        break;
        
      case 'playerDisconnected':
        this.showStatus(`${data.color === 'white' ? 'White' : 'Black'} disconnected. Waiting for reconnection...`);
        break;
        
      case 'playerReconnected':
        this.showStatus(`${data.color === 'white' ? 'White' : 'Black'} reconnected`);
        break;
        
      case 'gameOver':
        this.handleGameOver(data.reason, data.winner);
        break;
        
      case 'error':
        alert(data.message);
        break;
    }
  }
  
  // ============================================
  // GAME INITIALIZATION
  // ============================================
  
  async createGame() {
    try {
      await this.connectWebSocket();
      this.send({
        type: 'createGame',
        variant: this.variant,
        time: this.timeControl.time,
        increment: this.timeControl.increment
      });
    } catch (error) {
      alert('Failed to connect to server');
    }
  }
  
  async joinGame(code) {
    try {
      await this.connectWebSocket();
      this.send({
        type: 'joinGame',
        gameCode: code
      });
    } catch (error) {
      alert('Failed to connect to server');
    }
  }
  
  startLocalGame() {
    this.game = new ChessGame(this.variant);
    this.playerColor = 'white';
    this.whiteTime = this.timeControl.time * 60 * 1000;
    this.blackTime = this.timeControl.time * 60 * 1000;
    
    this.showScreen('game-screen');
    this.setupBoard();
    this.renderBoard();
    this.updateTimerDisplay();
    this.updateStatus();
    this.startTimers();
  }
  
  initGame(board) {
    this.game = new ChessGame(this.variant);
    if (board) {
      this.game.board = board;
    }
    
    this.showScreen('game-screen');
    this.setupBoard();
    this.renderBoard();
    this.updateTimerDisplay();
    this.updateStatus();
    
    // Update player indicators
    this.updatePlayerIndicators();
  }
  
  updatePlayerIndicators() {
    const selfIndicator = document.querySelector('.self-color');
    const opponentIndicator = document.querySelector('.opponent-color');
    
    if (this.playerColor === 'white') {
      selfIndicator.classList.add('white');
      selfIndicator.classList.remove('black');
      opponentIndicator.classList.add('black');
      opponentIndicator.classList.remove('white');
    } else {
      selfIndicator.classList.add('black');
      selfIndicator.classList.remove('white');
      opponentIndicator.classList.add('white');
      opponentIndicator.classList.remove('black');
    }
  }
  
  // ============================================
  // BOARD RENDERING
  // ============================================
  
  setupBoard() {
    const boardEl = document.getElementById('chess-board');
    boardEl.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement('div');
        square.className = 'square';
        square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
        square.dataset.row = row;
        square.dataset.col = col;
        
        square.addEventListener('click', () => this.handleSquareClick(row, col));
        
        boardEl.appendChild(square);
      }
    }
  }
  
  renderBoard() {
    const boardEl = document.getElementById('chess-board');
    const squares = boardEl.querySelectorAll('.square');
    const isFlipped = this.mode === 'local' ? 
      (this.game.currentTurn === 'black') : 
      (this.playerColor === 'black');
    
    // Update coordinates
    this.updateCoordinates(isFlipped);
    
    squares.forEach(square => {
      let row = parseInt(square.dataset.row);
      let col = parseInt(square.dataset.col);
      
      // Flip board for black player or in local mode when it's black's turn
      let displayRow = isFlipped ? 7 - row : row;
      let displayCol = isFlipped ? 7 - col : col;
      
      const piece = this.game.board[displayRow][displayCol];
      
      // Clear previous state
      square.innerHTML = '';
      square.classList.remove('selected', 'valid-move', 'valid-capture', 'check', 'last-move');
      
      // Re-apply light/dark based on actual position
      square.classList.remove('light', 'dark');
      square.classList.add((displayRow + displayCol) % 2 === 0 ? 'light' : 'dark');
      
      // Highlight last move
      if (this.game.lastMove) {
        const { from, to } = this.game.lastMove;
        if ((displayRow === from.row && displayCol === from.col) ||
            (displayRow === to.row && displayCol === to.col)) {
          square.classList.add('last-move');
        }
      }
      
      // Highlight selected square
      if (this.game.selectedSquare && 
          displayRow === this.game.selectedSquare.row && 
          displayCol === this.game.selectedSquare.col) {
        square.classList.add('selected');
      }
      
      // Highlight valid moves
      for (const move of this.game.validMoves) {
        if (displayRow === move.row && displayCol === move.col) {
          if (move.type === 'capture' || move.type === 'enpassant') {
            square.classList.add('valid-capture');
          } else {
            square.classList.add('valid-move');
          }
        }
      }
      
      // Highlight check on critical pieces
      if (piece) {
        const pieceType = piece[1];
        const pieceColor = piece[0] === 'w' ? 'white' : 'black';
        
        if (pieceType === this.game.criticalPiece && 
            this.game.isCriticalPieceInCheck(displayRow, displayCol, pieceColor)) {
          square.classList.add('check');
        }
      }
      
      // Add piece
      if (piece) {
        const pieceEl = document.createElement('span');
        pieceEl.className = 'piece';
        pieceEl.classList.add(piece[0] === 'w' ? 'white' : 'black');
        pieceEl.textContent = this.getPieceSymbol(piece);
        square.appendChild(pieceEl);
      }
    });
    
    // Update captured pieces display
    this.updateCapturedPieces();
  }
  
  updateCoordinates(isFlipped) {
    const files = isFlipped ? 'hgfedcba' : 'abcdefgh';
    const ranks = isFlipped ? '12345678' : '87654321';
    
    document.querySelectorAll('.board-coordinates.top span, .board-coordinates.bottom span').forEach((span, i) => {
      span.textContent = files[i];
    });
    
    document.querySelectorAll('.board-coordinates.left span, .board-coordinates.right span').forEach((span, i) => {
      span.textContent = ranks[i];
    });
  }
  
  getPieceSymbol(piece) {
    const symbols = {
      'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
      'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    };
    return symbols[piece] || '';
  }
  
  updateCapturedPieces() {
    // This would track captured pieces - simplified for now
    // In a full implementation, you'd track all captures and display them
  }
  
  // ============================================
  // MOVE HANDLING
  // ============================================
  
  handleSquareClick(visualRow, visualCol) {
    if (this.game.gameOver) return;
    
    // Convert visual position to actual board position
    const isFlipped = this.mode === 'local' ? 
      (this.game.currentTurn === 'black') : 
      (this.playerColor === 'black');
    
    const row = isFlipped ? 7 - visualRow : visualRow;
    const col = isFlipped ? 7 - visualCol : visualCol;
    
    // Check if it's this player's turn
    if (this.mode === 'online' && this.game.currentTurn !== this.playerColor) {
      return;
    }
    
    const result = this.game.selectSquare(row, col);
    
    if (result.selected) {
      this.renderBoard();
    } else if (result.move) {
      if (result.needsPromotion) {
        this.pendingPromotion = { from: result.from, to: result.to, type: result.type };
        this.showPromotionModal();
      } else {
        this.executeMove(result.from, result.to, result.type);
      }
    } else if (result.deselected) {
      this.renderBoard();
    }
  }
  
  executeMove(from, to, type, promotionPiece = null) {
    // Store board state for takeback
    this.boardPositions.push(JSON.stringify(this.game.board));
    
    const moveResult = this.game.makeMove(from.row, from.col, to.row, to.col, type, promotionPiece);
    
    this.game.clearSelection();
    this.renderBoard();
    this.updateMoveList();
    this.updateStatus();
    
    // Check game end conditions
    const checkmate = this.game.isCheckmate();
    const stalemate = this.game.isStalemate();
    const insufficientMaterial = this.game.isInsufficientMaterial();
    
    if (this.mode === 'online') {
      // Send move to server
      this.send({
        type: 'move',
        gameCode: this.gameCode,
        board: this.game.board,
        move: this.game.moveHistory[this.game.moveHistory.length - 1],
        enPassantSquare: this.game.enPassantSquare,
        isCapture: moveResult.isCapture,
        isPawnMove: moveResult.isPawnMove,
        isCheckmate: checkmate,
        isStalemate: stalemate,
        insufficientMaterial: insufficientMaterial,
        castlingRights: this.getCastlingRights()
      });
    } else {
      // Local game
      if (checkmate) {
        const winner = this.game.currentTurn === 'white' ? 'black' : 'white';
        this.handleGameOver('checkmate', winner);
      } else if (stalemate) {
        this.handleGameOver('stalemate', 'draw');
      } else if (insufficientMaterial) {
        this.handleGameOver('insufficient-material', 'draw');
      } else if (this.game.isThreefoldRepetition()) {
        this.handleGameOver('threefold-repetition', 'draw');
      } else if (this.game.isFiftyMoveRule()) {
        this.handleGameOver('50-move-rule', 'draw');
      }
    }
  }
  
  getCastlingRights() {
    // Check which rooks and critical pieces have moved
    return {
      whiteKingSide: !this.game.movedPieces.has('7,4') && !this.game.movedPieces.has('7,7'),
      whiteQueenSide: !this.game.movedPieces.has('7,4') && !this.game.movedPieces.has('7,0'),
      blackKingSide: !this.game.movedPieces.has('0,4') && !this.game.movedPieces.has('0,7'),
      blackQueenSide: !this.game.movedPieces.has('0,4') && !this.game.movedPieces.has('0,0')
    };
  }
  
  // ============================================
  // PROMOTION
  // ============================================
  
  showPromotionModal() {
    const modal = document.getElementById('promotion-modal');
    const options = document.getElementById('promotion-options');
    options.innerHTML = '';
    
    const pieces = this.game.getPromotionOptions();
    const color = this.game.currentTurn;
    const prefix = color === 'white' ? 'w' : 'b';
    
    for (const piece of pieces) {
      const btn = document.createElement('button');
      btn.className = 'promotion-option';
      btn.textContent = this.getPieceSymbol(prefix + piece);
      btn.addEventListener('click', () => {
        this.hideModal('promotion-modal');
        this.executeMove(
          this.pendingPromotion.from,
          this.pendingPromotion.to,
          this.pendingPromotion.type,
          piece
        );
        this.pendingPromotion = null;
      });
      options.appendChild(btn);
    }
    
    modal.classList.add('active');
  }
  
  // ============================================
  // TIMERS
  // ============================================
  
  startTimers() {
    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => this.tickTimer(), 100);
  }
  
  tickTimer() {
    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;
    
    if (this.game.gameOver) {
      clearInterval(this.timerInterval);
      return;
    }
    
    if (this.game.currentTurn === 'white') {
      this.whiteTime -= elapsed;
      if (this.whiteTime <= 0) {
        this.whiteTime = 0;
        this.handleTimeout('white');
      }
    } else {
      this.blackTime -= elapsed;
      if (this.blackTime <= 0) {
        this.blackTime = 0;
        this.handleTimeout('black');
      }
    }
    
    this.updateTimerDisplay();
  }
  
  handleTimeout(color) {
    if (this.mode === 'online') {
      this.send({
        type: 'timeout',
        gameCode: this.gameCode,
        color: color
      });
    } else {
      const winner = color === 'white' ? 'black' : 'white';
      this.handleGameOver('timeout', winner);
    }
  }
  
  updateTimerDisplay() {
    const playerTimer = document.getElementById('player-timer');
    const opponentTimer = document.getElementById('opponent-timer');
    
    let myTime, oppTime;
    if (this.mode === 'local') {
      // In local mode, show based on current view
      myTime = this.game.currentTurn === 'white' ? this.whiteTime : this.blackTime;
      oppTime = this.game.currentTurn === 'white' ? this.blackTime : this.whiteTime;
      
      // Active timer is current turn
      playerTimer.classList.toggle('active', true);
      opponentTimer.classList.remove('active');
    } else {
      myTime = this.playerColor === 'white' ? this.whiteTime : this.blackTime;
      oppTime = this.playerColor === 'white' ? this.blackTime : this.whiteTime;
      
      playerTimer.classList.toggle('active', this.game.currentTurn === this.playerColor);
      opponentTimer.classList.toggle('active', this.game.currentTurn !== this.playerColor);
    }
    
    playerTimer.textContent = this.formatTime(myTime);
    opponentTimer.textContent = this.formatTime(oppTime);
    
    // Low time warning
    playerTimer.classList.toggle('low-time', myTime < 30000 && myTime > 0);
    opponentTimer.classList.toggle('low-time', oppTime < 30000 && oppTime > 0);
  }
  
  formatTime(ms) {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // ============================================
  // MOVE LIST
  // ============================================
  
  updateMoveList() {
    const moveList = document.getElementById('move-list');
    moveList.innerHTML = '';
    
    for (let i = 0; i < this.game.moveHistory.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.game.moveHistory[i];
      const blackMove = this.game.moveHistory[i + 1] || '';
      
      const row = document.createElement('div');
      row.className = 'move-row';
      row.innerHTML = `
        <span class="move-number">${moveNumber}.</span>
        <span class="move-white">${whiteMove}</span>
        <span class="move-black">${blackMove}</span>
      `;
      moveList.appendChild(row);
    }
    
    // Scroll to bottom
    moveList.scrollTop = moveList.scrollHeight;
  }
  
  // ============================================
  // STATUS & UI
  // ============================================
  
  updateStatus() {
    const statusEl = document.getElementById('game-status');
    
    if (this.game.gameOver) {
      return;
    }
    
    let status = '';
    if (this.game.isInCheck()) {
      status = 'Check!';
    } else if (this.mode === 'local') {
      status = `${this.game.currentTurn === 'white' ? 'White' : 'Black'} to move`;
    } else {
      status = this.game.currentTurn === this.playerColor ? 'Your turn' : "Opponent's turn";
    }
    
    statusEl.textContent = status;
  }
  
  showStatus(message) {
    const statusEl = document.getElementById('game-status');
    statusEl.textContent = message;
  }
  
  // ============================================
  // GAME CONTROLS
  // ============================================
  
  offerDraw() {
    if (this.mode === 'online') {
      this.send({
        type: 'offerDraw',
        gameCode: this.gameCode
      });
      this.showStatus('Draw offered');
    }
  }
  
  requestTakeback() {
    if (this.mode === 'online' && this.game.moveHistory.length > 0) {
      this.send({
        type: 'requestTakeback',
        gameCode: this.gameCode
      });
      this.showStatus('Takeback requested');
    }
  }
  
  resign() {
    if (this.mode === 'online') {
      this.send({
        type: 'resign',
        gameCode: this.gameCode
      });
    } else {
      const winner = this.game.currentTurn === 'white' ? 'black' : 'white';
      this.handleGameOver('resignation', winner);
    }
  }
  
  // ============================================
  // MODALS
  // ============================================
  
  showOfferModal(title, message, type) {
    this.currentOfferType = type;
    document.getElementById('offer-title').textContent = title;
    document.getElementById('offer-message').textContent = message;
    document.getElementById('offer-modal').classList.add('active');
  }
  
  acceptOffer() {
    if (this.currentOfferType === 'draw') {
      this.send({ type: 'acceptDraw', gameCode: this.gameCode });
    } else if (this.currentOfferType === 'takeback') {
      const previousBoard = this.boardPositions.length > 0 ? 
        JSON.parse(this.boardPositions.pop()) : null;
      this.send({ 
        type: 'acceptTakeback', 
        gameCode: this.gameCode,
        previousBoard: previousBoard
      });
    }
    this.hideModal('offer-modal');
  }
  
  declineOffer() {
    if (this.currentOfferType === 'draw') {
      this.send({ type: 'declineDraw', gameCode: this.gameCode });
    } else if (this.currentOfferType === 'takeback') {
      this.send({ type: 'declineTakeback', gameCode: this.gameCode });
    }
    this.hideModal('offer-modal');
  }
  
  hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }
  
  handleGameOver(reason, winner) {
    this.game.gameOver = true;
    this.game.winner = winner;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    let title, message;
    
    if (winner === 'draw') {
      title = 'Draw!';
      switch (reason) {
        case 'stalemate':
          message = 'The game ended in stalemate.';
          break;
        case 'agreement':
          message = 'The game ended by mutual agreement.';
          break;
        case 'threefold-repetition':
          message = 'Draw by threefold repetition.';
          break;
        case '50-move-rule':
          message = 'Draw by the 50-move rule.';
          break;
        case 'insufficient-material':
          message = 'Draw due to insufficient material.';
          break;
        default:
          message = 'The game ended in a draw.';
      }
    } else {
      const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
      title = `${winnerName} Wins!`;
      
      switch (reason) {
        case 'checkmate':
          message = `${winnerName} wins by checkmate!`;
          break;
        case 'resignation':
          message = `${winnerName} wins by resignation.`;
          break;
        case 'timeout':
          message = `${winnerName} wins on time.`;
          break;
        case 'disconnect':
          message = `${winnerName} wins by opponent disconnection.`;
          break;
        default:
          message = `${winnerName} wins!`;
      }
    }
    
    document.getElementById('game-over-title').textContent = title;
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over-modal').classList.add('active');
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.game = null;
    this.gameCode = null;
    this.boardPositions = [];
    this.hideModal('game-over-modal');
    this.hideModal('offer-modal');
    this.hideModal('promotion-modal');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChessApp();
});

