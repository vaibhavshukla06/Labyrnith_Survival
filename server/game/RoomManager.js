/**
 * Manages game rooms for multiplayer functionality.
 */
class RoomManager {
  /**
   * Creates a new room manager.
   */
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // Maps player IDs to room codes
  }

  /**
   * Creates a new game room.
   * @param {string} roomCode - The room code (optional, will be generated if not provided)
   * @param {Object} options - Room options (gameMode, maxPlayers, etc.)
   * @returns {Object} The created room
   */
  createRoom(roomCode = null, options = {}) {
    // Generate a random room code if not provided
    if (!roomCode) {
      roomCode = this.generateRoomCode();
    }

    // Check if room already exists
    if (this.rooms.has(roomCode)) {
      return { success: false, message: 'Room already exists' };
    }

    // Set default options
    const roomOptions = {
      gameMode: options.gameMode || 'coop',
      maxPlayers: options.maxPlayers || 8,
      mazeWidth: options.mazeWidth || 20,
      mazeHeight: options.mazeHeight || 20,
      timeLimit: options.timeLimit || 600,
      private: options.private || false
    };

    // Create the room
    const room = {
      code: roomCode,
      options: roomOptions,
      players: new Set(),
      gameManager: null, // Will be initialized when the game starts
      mazeGenerator: null, // Will be initialized when the game starts
      monsterManager: null, // Will be initialized when the game starts
      state: 'lobby', // lobby, playing, ended
      createdAt: Date.now()
    };

    // Add to rooms map
    this.rooms.set(roomCode, room);

    return { success: true, room };
  }

  /**
   * Adds a player to a room.
   * @param {string} playerId - The player's socket ID
   * @param {string} roomCode - The room code
   * @param {string} playerName - The player's name
   * @returns {Object} Result of the operation
   */
  joinRoom(playerId, roomCode, playerName = 'Player') {
    // Check if room exists
    if (!this.rooms.has(roomCode)) {
      return { success: false, message: 'Room not found' };
    }

    const room = this.rooms.get(roomCode);

    // Check if room is full
    if (room.players.size >= room.options.maxPlayers) {
      return { success: false, message: 'Room is full' };
    }

    // Check if game is already in progress
    if (room.state === 'playing') {
      return { success: false, message: 'Game already in progress' };
    }

    // Add player to room
    room.players.add(playerId);
    this.playerRooms.set(playerId, roomCode);

    return { 
      success: true, 
      room,
      message: `Joined room ${roomCode}`
    };
  }

  /**
   * Removes a player from their current room.
   * @param {string} playerId - The player's socket ID
   * @returns {Object} Result of the operation
   */
  leaveRoom(playerId) {
    // Check if player is in a room
    if (!this.playerRooms.has(playerId)) {
      return { success: false, message: 'Player not in a room' };
    }

    const roomCode = this.playerRooms.get(playerId);
    const room = this.rooms.get(roomCode);

    if (!room) {
      this.playerRooms.delete(playerId);
      return { success: false, message: 'Room not found' };
    }

    // Remove player from room
    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    // If room is empty, remove it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return { 
        success: true, 
        roomRemoved: true,
        message: `Left room ${roomCode} and room was removed`
      };
    }

    return { 
      success: true, 
      roomRemoved: false,
      message: `Left room ${roomCode}`
    };
  }

  /**
   * Starts a game in a room.
   * @param {string} roomCode - The room code
   * @param {Object} gameOptions - Additional game options
   * @returns {Object} Result of the operation
   */
  startGame(roomCode, gameOptions = {}) {
    // Check if room exists
    if (!this.rooms.has(roomCode)) {
      return { success: false, message: 'Room not found' };
    }

    const room = this.rooms.get(roomCode);

    // Check if there are enough players
    if (room.players.size < 1) {
      return { success: false, message: 'Not enough players' };
    }

    // Check if game is already in progress
    if (room.state === 'playing') {
      return { success: false, message: 'Game already in progress' };
    }

    // Initialize game components
    const GameManager = require('./GameManager');
    const MazeGenerator = require('./MazeGenerator');
    const MonsterManager = require('./MonsterManager');

    room.gameManager = new GameManager();
    room.gameManager.setGameMode(room.options.gameMode);
    
    room.mazeGenerator = new MazeGenerator(
      room.options.mazeWidth, 
      room.options.mazeHeight, 
      2 // Cell size
    );
    
    room.monsterManager = new MonsterManager();

    // Generate initial maze
    const maze = room.mazeGenerator.generateMaze();
    room.gameManager.setMaze(maze);

    // Update room state
    room.state = 'playing';

    return { 
      success: true, 
      message: 'Game started',
      room
    };
  }

  /**
   * Ends a game in a room.
   * @param {string} roomCode - The room code
   * @returns {Object} Result of the operation
   */
  endGame(roomCode) {
    // Check if room exists
    if (!this.rooms.has(roomCode)) {
      return { success: false, message: 'Room not found' };
    }

    const room = this.rooms.get(roomCode);

    // Update room state
    room.state = 'ended';

    return { 
      success: true, 
      message: 'Game ended',
      room
    };
  }

  /**
   * Gets a room by code.
   * @param {string} roomCode - The room code
   * @returns {Object|null} The room or null if not found
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Gets the room a player is in.
   * @param {string} playerId - The player's socket ID
   * @returns {Object|null} The room or null if not found
   */
  getPlayerRoom(playerId) {
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) return null;
    
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Gets all public rooms.
   * @returns {Array} Array of public rooms
   */
  getPublicRooms() {
    const publicRooms = [];
    
    for (const [code, room] of this.rooms.entries()) {
      if (!room.options.private) {
        publicRooms.push({
          code,
          players: room.players.size,
          maxPlayers: room.options.maxPlayers,
          gameMode: room.options.gameMode,
          state: room.state
        });
      }
    }
    
    return publicRooms;
  }

  /**
   * Generates a random room code.
   * @returns {string} A random 6-character room code
   */
  generateRoomCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar-looking characters
    let code;
    
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.rooms.has(code)); // Ensure code is unique
    
    return code;
  }
}

module.exports = RoomManager; 