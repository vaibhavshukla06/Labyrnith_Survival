/**
 * Manages the overall game flow, rules, and game modes.
 */
class GameManager {
  /**
   * Creates a new game manager.
   */
  constructor() {
    // Game settings
    this.gameTimeLimit = 600; // 10 minutes in seconds
    this.maxPlayers = 8;
    
    // Game state
    this.gameTimer = 0;
    this.playersEscaped = 0;
    this.playersTrapped = 0;
    this.isGameOver = false;
    this.gameMode = 'coop'; // coop, betrayal, pvp
    
    // Player management
    this.players = new Map();
    
    // Maze reference
    this.maze = null;
  }
  
  /**
   * Updates the game timer.
   * @param {number} deltaTime - Time since last update in milliseconds
   */
  updateGameTimer(deltaTime) {
    if (this.isGameOver) return;
    
    this.gameTimer += deltaTime / 1000; // Convert to seconds
    
    // Check for time-based game over
    if (this.gameTimer >= this.gameTimeLimit) {
      this.checkGameOverConditions();
    }
  }
  
  /**
   * Adds a new player to the game.
   * @param {string} playerId - The player's socket ID
   * @returns {Object} The created player object
   */
  addPlayer(playerId) {
    // Create a new player object
    const player = {
      id: playerId,
      position: this.getRandomSpawnPosition(),
      health: 100,
      hasEscaped: false,
      isTrapped: false,
      inventory: []
    };
    
    // Add to players map
    this.players.set(playerId, player);
    
    return player;
  }
  
  /**
   * Removes a player from the game.
   * @param {string} playerId - The player's socket ID
   */
  removePlayer(playerId) {
    this.players.delete(playerId);
  }
  
  /**
   * Gets a random spawn position for a new player.
   * @returns {Object} A position object with x, y, z coordinates
   */
  getRandomSpawnPosition() {
    // If no maze yet, return a default position
    if (!this.maze) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // Find a random path cell that's not the exit
    const validCells = [];
    for (let x = 0; x < this.maze.width; x++) {
      for (let y = 0; y < this.maze.height; y++) {
        if (!this.maze.grid[x][y] && 
            (x !== this.maze.exitPosition.x || y !== this.maze.exitPosition.y)) {
          validCells.push({ x, y });
        }
      }
    }
    
    if (validCells.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    // Pick a random cell
    const cell = validCells[Math.floor(Math.random() * validCells.length)];
    
    // Convert to world position
    return {
      x: cell.x * this.maze.cellSize,
      y: 0, // Ground level
      z: cell.y * this.maze.cellSize
    };
  }
  
  /**
   * Updates a player's position.
   * @param {string} playerId - The player's socket ID
   * @param {Object} position - The new position
   */
  updatePlayerPosition(playerId, position) {
    const player = this.players.get(playerId);
    if (player) {
      player.position = position;
    }
  }
  
  /**
   * Handles a player's interaction with the environment.
   * @param {string} playerId - The player's socket ID
   * @returns {Object} The result of the interaction
   */
  handlePlayerInteraction(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    // Check if player is near the exit
    if (this.isPlayerNearExit(player)) {
      return {
        success: true,
        type: 'exit',
        message: 'Press E to escape'
      };
    }
    
    // Check for items nearby
    const item = this.findItemNearPlayer(player);
    if (item) {
      // Add item to player's inventory
      player.inventory.push(item);
      
      return {
        success: true,
        type: 'item',
        item: item,
        message: `Picked up ${item.name}`
      };
    }
    
    return { success: false, message: 'Nothing to interact with' };
  }
  
  /**
   * Checks if a player is near the exit.
   * @param {Object} player - The player object
   * @returns {boolean} True if the player is near the exit
   */
  isPlayerNearExit(player) {
    if (!this.maze || !this.maze.exitPosition) return false;
    
    // Convert exit position to world coordinates
    const exitWorldPos = {
      x: this.maze.exitPosition.x * this.maze.cellSize,
      z: this.maze.exitPosition.y * this.maze.cellSize
    };
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(player.position.x - exitWorldPos.x, 2) +
      Math.pow(player.position.z - exitWorldPos.z, 2)
    );
    
    return distance < 3; // Within 3 units of the exit
  }
  
  /**
   * Finds an item near a player.
   * @param {Object} player - The player object
   * @returns {Object|null} The item if found, null otherwise
   */
  findItemNearPlayer(player) {
    // This would be implemented with actual item spawning logic
    // For now, just return null (no items)
    return null;
  }
  
  /**
   * Handles a player escaping the maze.
   * @param {string} playerId - The player's socket ID
   * @returns {Object} The result of the escape attempt
   */
  playerEscape(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return { escaped: false, message: 'Player not found' };
    }
    
    // Check if player is already escaped
    if (player.hasEscaped) {
      return { escaped: false, message: 'Player already escaped' };
    }
    
    // Check if player is near the exit
    if (!this.isPlayerNearExit(player)) {
      return { escaped: false, message: 'Not near the exit' };
    }
    
    // Mark player as escaped
    player.hasEscaped = true;
    this.playersEscaped++;
    
    return { 
      escaped: true, 
      message: 'Successfully escaped!',
      playersEscaped: this.playersEscaped
    };
  }
  
  /**
   * Checks for game over conditions based on the current game mode.
   * @returns {Object} Game over result
   */
  checkGameOverConditions() {
    if (this.isGameOver) {
      return { isGameOver: true, gameMode: this.gameMode };
    }
    
    const totalPlayers = this.players.size;
    const timeUp = this.gameTimer >= this.gameTimeLimit;
    
    let isGameOver = false;
    let message = '';
    let isVictory = false;
    
    // Game over conditions based on game mode
    switch (this.gameMode) {
      case 'coop':
        // All players must escape, or time runs out
        if (this.playersEscaped === totalPlayers || timeUp) {
          isGameOver = true;
          isVictory = this.playersEscaped === totalPlayers;
          message = isVictory ? 
            'All players escaped! Victory!' : 
            'Not everyone escaped. Game over!';
        }
        break;
        
      case 'betrayal':
        // Game ends when one player escapes or time runs out
        if (this.playersEscaped > 0 || timeUp) {
          isGameOver = true;
          isVictory = this.playersEscaped > 0;
          message = isVictory ? 
            'A player has escaped!' : 
            'Time ran out. Game over!';
        }
        break;
        
      case 'pvp':
        // Game ends when all players have either escaped or been trapped, or time runs out
        if (this.playersEscaped + this.playersTrapped === totalPlayers || timeUp) {
          isGameOver = true;
          isVictory = this.playersEscaped > 0;
          message = isVictory ? 
            'Some players escaped!' : 
            'No one escaped. Game over!';
        }
        break;
    }
    
    if (isGameOver) {
      this.isGameOver = true;
    }
    
    return {
      isGameOver,
      gameMode: this.gameMode,
      message,
      isVictory,
      playersEscaped: this.playersEscaped,
      playersTrapped: this.playersTrapped,
      totalPlayers,
      gameTimer: this.gameTimer
    };
  }
  
  /**
   * Applies damage to a player.
   * @param {string} playerId - The player's socket ID
   * @param {number} damage - The amount of damage to apply
   * @returns {Object} The result of the damage application
   */
  applyDamageToPlayer(playerId, damage) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
    
    // Apply damage
    player.health -= damage;
    
    // Check if player died
    if (player.health <= 0) {
      player.health = 0;
      player.isTrapped = true;
      this.playersTrapped++;
      
      return { 
        success: true, 
        died: true, 
        health: 0,
        message: 'Player died'
      };
    }
    
    return { 
      success: true, 
      died: false, 
      health: player.health,
      message: 'Player took damage'
    };
  }
  
  /**
   * Sets the maze data.
   * @param {Object} maze - The maze data
   */
  setMaze(maze) {
    this.maze = maze;
  }
  
  /**
   * Gets the current maze data.
   * @returns {Object} The maze data
   */
  getMaze() {
    return this.maze;
  }
  
  /**
   * Gets all players.
   * @returns {Array} Array of player objects
   */
  getPlayers() {
    return Array.from(this.players.values());
  }
  
  /**
   * Gets a specific player.
   * @param {string} playerId - The player's socket ID
   * @returns {Object|undefined} The player object if found
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }
  
  /**
   * Gets the current game mode.
   * @returns {string} The game mode
   */
  getGameMode() {
    return this.gameMode;
  }
  
  /**
   * Sets the game mode.
   * @param {string} mode - The game mode to set
   */
  setGameMode(mode) {
    if (['coop', 'betrayal', 'pvp'].includes(mode)) {
      this.gameMode = mode;
    }
  }
  
  /**
   * Gets the current game timer.
   * @returns {number} The game timer in seconds
   */
  getGameTimer() {
    return this.gameTimer;
  }
  
  /**
   * Gets the number of players who have escaped.
   * @returns {number} The number of escaped players
   */
  getPlayersEscaped() {
    return this.playersEscaped;
  }
  
  /**
   * Resets the game state.
   */
  resetGame() {
    this.gameTimer = 0;
    this.playersEscaped = 0;
    this.playersTrapped = 0;
    this.isGameOver = false;
    
    // Reset player states but keep them in the game
    this.players.forEach(player => {
      player.position = this.getRandomSpawnPosition();
      player.health = 100;
      player.hasEscaped = false;
      player.isTrapped = false;
      player.inventory = [];
    });
  }
}

module.exports = GameManager; 