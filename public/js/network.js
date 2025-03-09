/**
 * Handles network communication with the server.
 */
class Network {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = {};
    this.offlineMode = false;
    this.currentRoom = null;
    
    console.log('Network initialized');
  }
  
  /**
   * Connects to the server.
   * @param {string} roomCode - Optional room code for joining a specific game
   */
  connect(roomCode = null) {
    try {
      // Check if we should use offline mode
      if (Config.offlineMode) {
        console.log('Starting in offline mode');
        this.startOfflineMode();
        return;
      }
      
      console.log('Connecting to server:', Config.serverUrl);
      
      // Connect to the server
      this.socket = io(Config.serverUrl);
      
      // Set up event handlers
      this.socket.on('connect', () => {
        console.log('Connected to server with ID:', this.socket.id);
        this.isConnected = true;
        
        // Join room if provided
        if (roomCode) {
          this.joinRoom(roomCode);
        }
        
        // Trigger connected event
        this.triggerEvent('connected');
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        
        // Fall back to offline mode if server is unavailable
        if (!this.isConnected && !this.offlineMode) {
          console.log('Server unavailable, falling back to offline mode');
          this.startOfflineMode();
        }
      });
      
      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
        this.currentRoom = null;
        this.triggerEvent('disconnected');
      });
      
      // Room events
      this.socket.on('availableRooms', (rooms) => this.triggerEvent('availableRooms', rooms));
      this.socket.on('roomCreated', (room) => this.triggerEvent('roomCreated', room));
      this.socket.on('playerJoinedRoom', (data) => this.triggerEvent('playerJoinedRoom', data));
      this.socket.on('playerLeftRoom', (data) => this.triggerEvent('playerLeftRoom', data));
      
      // Game state events
      this.socket.on('gameStarted', (data) => this.triggerEvent('gameStarted', data));
      this.socket.on('playerJoined', (data) => this.triggerEvent('playerJoined', data));
      this.socket.on('playerLeft', (data) => this.triggerEvent('playerLeft', data));
      this.socket.on('playerMoved', (data) => this.triggerEvent('playerMoved', data));
      this.socket.on('playerDamaged', (data) => this.triggerEvent('playerDamaged', data));
      this.socket.on('interactionResult', (data) => this.triggerEvent('interactionResult', data));
      this.socket.on('playerEscaped', (data) => this.triggerEvent('playerEscaped', data));
      this.socket.on('gameUpdate', (data) => this.triggerEvent('gameUpdate', data));
      this.socket.on('mazeUpdated', (data) => this.triggerEvent('mazeUpdated', data));
      this.socket.on('gameOver', (data) => this.triggerEvent('gameOver', data));
    } catch (error) {
      console.error('Error connecting to server:', error);
      this.startOfflineMode();
    }
  }
  
  /**
   * Creates a new game room.
   * @param {Object} options - Room options
   * @param {Function} callback - Callback function
   */
  createRoom(options, callback) {
    if (this.offlineMode) {
      this.startOfflineMode();
      if (callback) callback({
        success: true,
        room: {
          code: 'OFFLINE',
          options: {
            gameMode: options.gameMode || 'coop',
            maxPlayers: 1,
            timeLimit: Config.gameTimeLimit
          },
          players: 1,
          state: 'lobby'
        }
      });
      return;
    }
    
    if (this.socket && this.isConnected) {
      this.socket.emit('createRoom', options, (response) => {
        if (response.success) {
          this.currentRoom = response.room;
        }
        if (callback) callback(response);
      });
    } else if (callback) {
      callback({
        success: false,
        message: 'Not connected to server'
      });
    }
  }
  
  /**
   * Joins an existing game room.
   * @param {string} roomCode - The room code
   * @param {string} playerName - The player's name
   * @param {Function} callback - Callback function
   */
  joinRoom(roomCode, playerName = 'Player', callback) {
    if (this.offlineMode) {
      this.startOfflineMode();
      if (callback) callback({
        success: true,
        room: {
          code: 'OFFLINE',
          options: {
            gameMode: 'coop',
            maxPlayers: 1,
            timeLimit: Config.gameTimeLimit
          },
          players: 1,
          state: 'lobby'
        }
      });
      return;
    }
    
    if (this.socket && this.isConnected) {
      this.socket.emit('joinRoom', { roomCode, playerName }, (response) => {
        if (response.success) {
          this.currentRoom = response.room;
        }
        if (callback) callback(response);
      });
    } else if (callback) {
      callback({
        success: false,
        message: 'Not connected to server'
      });
    }
  }
  
  /**
   * Leaves the current game room.
   * @param {Function} callback - Callback function
   */
  leaveRoom(callback) {
    if (this.offlineMode) {
      this.offlineMode = false;
      this.isConnected = false;
      this.currentRoom = null;
      this.triggerEvent('disconnected');
      if (callback) callback({
        success: true,
        message: 'Left offline mode'
      });
      return;
    }
    
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveRoom', (response) => {
        if (response.success) {
          this.currentRoom = null;
        }
        if (callback) callback(response);
      });
    } else if (callback) {
      callback({
        success: false,
        message: 'Not connected to server'
      });
    }
  }
  
  /**
   * Starts the game in the current room.
   * @param {Object} options - Game options
   * @param {Function} callback - Callback function
   */
  startGame(options, callback) {
    if (this.offlineMode) {
      // Simulate a game start
      setTimeout(() => {
        this.triggerEvent('gameStarted', {
          gameMode: 'coop',
          gameTimer: Config.gameTimeLimit,
          players: [{ id: 'local-player', name: 'You' }],
          playersEscaped: 0,
          monsters: [],
          items: []
        });
        
        if (callback) callback({
          success: true,
          message: 'Game started in offline mode'
        });
      }, 500);
      return;
    }
    
    if (this.socket && this.isConnected && this.currentRoom) {
      this.socket.emit('startGame', options, callback);
    } else if (callback) {
      callback({
        success: false,
        message: 'Not connected to server or not in a room'
      });
    }
  }
  
  /**
   * Starts the game in offline mode.
   */
  startOfflineMode() {
    console.log('Starting offline mode');
    this.offlineMode = true;
    this.isConnected = true; // Pretend we're connected
    
    // Simulate a connection
    setTimeout(() => {
      this.triggerEvent('connected');
      
      // Simulate joining a room
      this.currentRoom = {
        code: 'OFFLINE',
        options: {
          gameMode: 'coop',
          maxPlayers: 1,
          timeLimit: Config.gameTimeLimit
        },
        players: 1,
        state: 'lobby'
      };
      
      this.triggerEvent('availableRooms', [{
        code: 'OFFLINE',
        players: 1,
        maxPlayers: 1,
        gameMode: 'coop',
        state: 'lobby'
      }]);
    }, 500);
  }
  
  /**
   * Disconnects from the server.
   */
  disconnect() {
    if (this.offlineMode) {
      this.offlineMode = false;
      this.isConnected = false;
      this.currentRoom = null;
      this.triggerEvent('disconnected');
      return;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoom = null;
    }
  }
  
  /**
   * Sends an event to the server.
   * @param {string} event - The event name
   * @param {*} data - The data to send
   * @param {Function} callback - Optional callback for response
   */
  emit(event, data, callback) {
    if (this.offlineMode) {
      // Handle offline mode events
      this.handleOfflineEvent(event, data, callback);
      return;
    }
    
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data, callback);
    } else if (callback) {
      callback({
        success: false,
        message: 'Not connected to server'
      });
    }
  }
  
  /**
   * Handles events in offline mode.
   * @param {string} event - The event name
   * @param {*} data - The event data
   * @param {Function} callback - Optional callback for response
   */
  handleOfflineEvent(event, data, callback) {
    console.log('Handling offline event:', event, data);
    
    switch (event) {
      case 'playerInteract':
        // Handle player interaction
        if (window.game && window.game.player) {
          const playerPos = window.game.player.position;
          const maze = window.game.mazeRenderer.maze;
          
          // Check if player is near exit
          if (maze && maze.exit) {
            const exitX = maze.exit.x * maze.cellSize + maze.cellSize / 2;
            const exitZ = maze.exit.z * maze.cellSize + maze.cellSize / 2;
            const dx = playerPos.x - exitX;
            const dz = playerPos.z - exitZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < 2) {
              // Player is near exit
              this.triggerEvent('interactionResult', {
                playerId: 'local-player',
                type: 'exit',
                success: true,
                message: 'You found the exit!'
              });
              
              if (callback) callback({
                success: true,
                type: 'exit',
                message: 'You found the exit!'
              });
              return;
            }
          }
          
          // No interaction found
          if (callback) callback({
            success: false,
            message: 'Nothing to interact with'
          });
        }
        break;
        
      case 'playerEscape':
        // Handle player escape
        if (window.game && window.game.player) {
          const playerPos = window.game.player.position;
          const maze = window.game.mazeRenderer.maze;
          
          // Check if player is near exit
          if (maze && maze.exit) {
            const exitX = maze.exit.x * maze.cellSize + maze.cellSize / 2;
            const exitZ = maze.exit.z * maze.cellSize + maze.cellSize / 2;
            const dx = playerPos.x - exitX;
            const dz = playerPos.z - exitZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < 2) {
              // Player escaped
              this.triggerEvent('playerEscaped', {
                id: 'local-player',
                name: 'You',
                playersEscaped: 1,
                totalPlayers: 1
              });
              
              // Game over
              this.triggerEvent('gameOver', {
                isGameOver: true,
                victory: true,
                message: 'You escaped the labyrinth!'
              });
              
              if (callback) callback({
                escaped: true,
                message: 'Successfully escaped!'
              });
              return;
            }
          }
          
          // Not near exit
          if (callback) callback({
            escaped: false,
            message: 'Not near the exit'
          });
        }
        break;
        
      case 'playerMove':
        // Nothing to do in offline mode
        break;
        
      case 'playerDamage':
        // Nothing to do in offline mode
        break;
        
      case 'useItem':
        // Nothing to do in offline mode
        break;
        
      case 'restartGame':
        // Restart the game
        setTimeout(() => {
          this.triggerEvent('gameStarted', {
            gameMode: 'coop',
            gameTimer: Config.gameTimeLimit,
            players: [{ id: 'local-player', name: 'You' }],
            playersEscaped: 0,
            monsters: [],
            items: []
          });
          
          if (callback) callback({
            success: true,
            message: 'Game restarted'
          });
        }, 500);
        break;
        
      default:
        if (callback) callback({
          success: false,
          message: 'Event not supported in offline mode'
        });
    }
  }
  
  /**
   * Registers an event handler.
   * @param {string} event - The event name
   * @param {Function} callback - The callback function
   */
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }
  
  /**
   * Triggers an event.
   * @param {string} event - The event name
   * @param {*} data - The event data
   */
  triggerEvent(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(callback => callback(data));
    }
  }
  
  /**
   * Gets the current room.
   * @returns {Object|null} The current room or null if not in a room
   */
  getCurrentRoom() {
    return this.currentRoom;
  }
  
  /**
   * Checks if the client is in a room.
   * @returns {boolean} True if in a room, false otherwise
   */
  isInRoom() {
    return this.currentRoom !== null;
  }
} 