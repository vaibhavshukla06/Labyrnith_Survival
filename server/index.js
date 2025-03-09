const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import game logic modules
const RoomManager = require('./game/RoomManager');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Create room manager
const roomManager = new RoomManager();

// API routes
app.get('/api/rooms', (req, res) => {
  res.json({
    success: true,
    rooms: roomManager.getPublicRooms()
  });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send available rooms to the client
  socket.emit('availableRooms', roomManager.getPublicRooms());
  
  // Create a new room
  socket.on('createRoom', (options, callback) => {
    const result = roomManager.createRoom(null, options);
    
    if (result.success) {
      // Join the room automatically
      const joinResult = roomManager.joinRoom(socket.id, result.room.code, options.playerName || 'Player');
      
      // Join the socket.io room
      socket.join(result.room.code);
      
      // Notify all clients about the new room
      io.emit('roomCreated', {
        code: result.room.code,
        players: 1,
        maxPlayers: result.room.options.maxPlayers,
        gameMode: result.room.options.gameMode,
        state: result.room.state
      });
      
      // Send success response
      if (callback) callback({
        success: true,
        room: {
          code: result.room.code,
          options: result.room.options,
          players: 1,
          state: result.room.state
        }
      });
    } else {
      // Send error response
      if (callback) callback({
        success: false,
        message: result.message
      });
    }
  });
  
  // Join an existing room
  socket.on('joinRoom', (data, callback) => {
    const { roomCode, playerName } = data;
    const result = roomManager.joinRoom(socket.id, roomCode, playerName);
    
    if (result.success) {
      // Join the socket.io room
      socket.join(roomCode);
      
      // Get player count
      const playerCount = result.room.players.size;
      
      // Notify all clients in the room about the new player
      socket.to(roomCode).emit('playerJoinedRoom', {
        id: socket.id,
        name: playerName || 'Player',
        playerCount
      });
      
      // Update available rooms for all clients
      io.emit('availableRooms', roomManager.getPublicRooms());
      
      // Send success response
      if (callback) callback({
        success: true,
        room: {
          code: result.room.code,
          options: result.room.options,
          players: playerCount,
          state: result.room.state
        }
      });
    } else {
      // Send error response
      if (callback) callback({
        success: false,
        message: result.message
      });
    }
  });
  
  // Leave current room
  socket.on('leaveRoom', (callback) => {
    const result = roomManager.leaveRoom(socket.id);
    
    if (result.success) {
      // Leave the socket.io room
      if (!result.roomRemoved) {
        // Notify all clients in the room about the player leaving
        socket.to(result.roomCode).emit('playerLeftRoom', {
          id: socket.id
        });
      }
      
      // Update available rooms for all clients
      io.emit('availableRooms', roomManager.getPublicRooms());
      
      // Send success response
      if (callback) callback({
        success: true,
        message: result.message
      });
    } else {
      // Send error response
      if (callback) callback({
        success: false,
        message: result.message
      });
    }
  });
  
  // Start game in a room
  socket.on('startGame', (options, callback) => {
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (!room) {
      if (callback) callback({
        success: false,
        message: 'Not in a room'
      });
      return;
    }
    
    // Start the game
    const result = roomManager.startGame(room.code, options);
    
    if (result.success) {
      // Notify all clients in the room that the game has started
      io.to(room.code).emit('gameStarted', {
        gameMode: room.options.gameMode,
        maze: room.gameManager.getMaze(),
        players: Array.from(room.players).map(id => ({
          id,
          position: room.gameManager.getPlayer(id)?.position || { x: 0, y: 0, z: 0 }
        })),
        timeLimit: room.options.timeLimit
      });
      
      // Update available rooms for all clients
      io.emit('availableRooms', roomManager.getPublicRooms());
      
      // Send success response
      if (callback) callback({
        success: true,
        message: 'Game started'
      });
    } else {
      // Send error response
      if (callback) callback({
        success: false,
        message: result.message
      });
    }
  });
  
  // Player movement
  socket.on('playerMove', (position) => {
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (!room || room.state !== 'playing') return;
    
    // Update player position in game manager
    room.gameManager.updatePlayerPosition(socket.id, position);
    
    // Broadcast to all other players in the room
    socket.to(room.code).emit('playerMoved', {
      id: socket.id,
      position
    });
  });
  
  // Player interaction
  socket.on('playerInteract', (callback) => {
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (!room || room.state !== 'playing') {
      if (callback) callback({
        success: false,
        message: 'Not in an active game'
      });
      return;
    }
    
    // Handle interaction
    const result = room.gameManager.handlePlayerInteraction(socket.id);
    
    // Broadcast interaction result to all players in the room
    if (result.success) {
      io.to(room.code).emit('interactionResult', {
        playerId: socket.id,
        ...result
      });
    }
    
    // Send response to the player
    if (callback) callback(result);
  });
  
  // Player escape attempt
  socket.on('playerEscape', (callback) => {
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (!room || room.state !== 'playing') {
      if (callback) callback({
        success: false,
        message: 'Not in an active game'
      });
      return;
    }
    
    // Handle escape attempt
    const result = room.gameManager.playerEscape(socket.id);
    
    if (result.escaped) {
      // Broadcast to all players in the room
      io.to(room.code).emit('playerEscaped', {
        id: socket.id,
        playersEscaped: room.gameManager.getPlayersEscaped()
      });
      
      // Check game over conditions
      const gameOverResult = room.gameManager.checkGameOverConditions();
      if (gameOverResult.isGameOver) {
        // End the game
        roomManager.endGame(room.code);
        
        // Notify all players in the room
        io.to(room.code).emit('gameOver', gameOverResult);
        
        // Update available rooms for all clients
        io.emit('availableRooms', roomManager.getPublicRooms());
      }
    }
    
    // Send response to the player
    if (callback) callback(result);
  });
  
  // Player damage
  socket.on('playerDamage', (data) => {
    const { targetId, damage, source } = data;
    
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (!room || room.state !== 'playing') return;
    
    // Apply damage to the target player
    const result = room.gameManager.applyDamageToPlayer(targetId, damage);
    
    if (result.success) {
      // Broadcast to all players in the room
      io.to(room.code).emit('playerDamaged', {
        id: targetId,
        damage,
        source,
        currentHealth: result.currentHealth,
        isDead: result.isDead
      });
      
      // Check if player died
      if (result.isDead) {
        // Check game over conditions
        const gameOverResult = room.gameManager.checkGameOverConditions();
        if (gameOverResult.isGameOver) {
          // End the game
          roomManager.endGame(room.code);
          
          // Notify all players in the room
          io.to(room.code).emit('gameOver', gameOverResult);
          
          // Update available rooms for all clients
          io.emit('availableRooms', roomManager.getPublicRooms());
        }
      }
    }
  });
  
  // Handle player disconnect
  socket.on('disconnect', () => {
    // Get the player's room
    const room = roomManager.getPlayerRoom(socket.id);
    
    if (room) {
      // Leave the room
      const result = roomManager.leaveRoom(socket.id);
      
      if (result.success && !result.roomRemoved) {
        // Notify all clients in the room about the player leaving
        socket.to(room.code).emit('playerLeftRoom', {
          id: socket.id
        });
        
        // If the game is in progress, also send a playerLeft event
        if (room.state === 'playing') {
          socket.to(room.code).emit('playerLeft', socket.id);
          
          // Check game over conditions
          const gameOverResult = room.gameManager.checkGameOverConditions();
          if (gameOverResult.isGameOver) {
            // End the game
            roomManager.endGame(room.code);
            
            // Notify all players in the room
            io.to(room.code).emit('gameOver', gameOverResult);
          }
        }
      }
      
      // Update available rooms for all clients
      io.emit('availableRooms', roomManager.getPublicRooms());
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

// Game loop for each active room
const TICK_RATE = 30; // 30 updates per second
setInterval(() => {
  // Process each active room
  for (const [roomCode, room] of roomManager.rooms.entries()) {
    if (room.state !== 'playing') continue;
    
    // Update game timer
    room.gameManager.updateGameTimer(1000 / TICK_RATE);
    
    // Update monsters
    room.monsterManager.updateMonsters(
      Array.from(room.players).map(id => room.gameManager.getPlayer(id)),
      1000 / TICK_RATE
    );
    
    // Shift maze if needed
    const mazeUpdated = room.mazeGenerator.updateMaze(1000 / TICK_RATE);
    if (mazeUpdated) {
      room.gameManager.setMaze(room.mazeGenerator.getMaze());
      io.to(roomCode).emit('mazeUpdated', room.gameManager.getMaze());
    }
    
    // Broadcast game updates to all players in the room
    io.to(roomCode).emit('gameUpdate', {
      monsters: room.monsterManager.getMonsters(),
      gameTimer: room.gameManager.getGameTimer()
    });
    
    // Check for time-based game over
    if (room.gameManager.getGameTimer() >= room.options.timeLimit) {
      const gameOverResult = room.gameManager.checkGameOverConditions();
      if (gameOverResult.isGameOver) {
        // End the game
        roomManager.endGame(roomCode);
        
        // Notify all players in the room
        io.to(roomCode).emit('gameOver', gameOverResult);
        
        // Update available rooms for all clients
        io.emit('availableRooms', roomManager.getPublicRooms());
      }
    }
  }
}, 1000 / TICK_RATE);

// Try different ports if the default one is in use
const tryPort = (port) => {
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Open your browser and navigate to http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use, trying port ${port + 1}...`);
      tryPort(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
};

// Start the server with port 3000 as the first option
const PORT = process.env.PORT || 3000;
tryPort(PORT); 