/**
 * Main game controller that initializes and manages the game.
 */
class Game {
  constructor() {
    // Game state
    this.isRunning = false;
    this.isGameOver = false;
    this.gameMode = 'coop';
    
    // Game objects
    this.network = null;
    this.mazeRenderer = null;
    this.player = null;
    this.monsters = [];
    this.items = new Map(); // Map of item IDs to item objects
    
    // UI elements
    this.ui = new UI();
    
    // Debug flag
    this.debug = true;
    
    // Make game instance globally accessible
    window.game = this;
    
    // Initialize the game
    this.init();
  }
  
  /**
   * Initializes the game.
   */
  async init() {
    console.log('Initializing game...');
    
    // Show loading screen
    this.ui.showLoadingScreen();
    
    try {
      // Initialize network
      this.network = new Network();
      
      // Initialize Three.js scene with a timeout
      try {
        this.mazeRenderer = new MazeRenderer();
        
        // Set a timeout to prevent getting stuck
        const rendererPromise = Promise.race([
          this.mazeRenderer.init(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Maze renderer initialization timeout')), 15000)
          )
        ]);
        
        await rendererPromise;
        
        if (this.debug) console.log('Maze renderer initialized successfully');
      } catch (error) {
        console.error('Error initializing maze renderer:', error);
        // Continue without proper rendering, show an error message
        this.ui.showMessage('Error initializing 3D renderer. The game may not display correctly.', 'error');
      }
      
      // Initialize monster model loader with a timeout
      try {
        window.monsterModelLoader = new MonsterModelLoader();
        
        // Set a timeout to prevent getting stuck
        const loaderPromise = Promise.race([
          window.monsterModelLoader.init(),
          new Promise((resolve) => setTimeout(() => {
            console.warn('Monster model loader initialization timeout');
            resolve(null);
          }, 10000))
        ]);
        
        await loaderPromise;
        
        if (this.debug) console.log('Monster model loader initialized');
      } catch (error) {
        console.error('Error initializing monster model loader:', error);
        // Continue without monster models
      }
      
      // Initialize player
      try {
        if (this.mazeRenderer && this.mazeRenderer.scene && this.mazeRenderer.camera) {
          this.player = new Player(this.mazeRenderer.scene, this.mazeRenderer.camera);
          if (this.debug) console.log('Player initialized successfully');
        } else {
          console.error('Cannot initialize player: maze renderer not properly initialized');
        }
      } catch (error) {
        console.error('Error initializing player:', error);
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Show menu screen
      this.ui.hideLoadingScreen();
      this.ui.showMenuScreen();
      
      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Error initializing game:', error);
      this.ui.showMessage('Error initializing game. Please refresh the page.', 'error');
      
      // Force hide loading screen after a timeout
      setTimeout(() => {
        this.ui.hideLoadingScreen();
        this.ui.showMenuScreen();
      }, 3000);
    }
  }
  
  /**
   * Sets up event listeners for the game.
   */
  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Menu buttons
    document.getElementById('host-btn').addEventListener('click', () => this.hostGame());
    document.getElementById('join-btn').addEventListener('click', () => this.ui.toggleJoinForm());
    document.getElementById('connect-btn').addEventListener('click', () => this.joinGame());
    document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
    
    // Game over buttons
    document.getElementById('play-again-btn').addEventListener('click', () => this.restartGame());
    document.getElementById('main-menu-btn').addEventListener('click', () => this.returnToMenu());
    
    // Network events
    if (this.network) {
      this.network.on('connected', () => this.onConnected());
      this.network.on('disconnected', () => this.onDisconnected());
      this.network.on('gameState', (data) => this.onGameState(data));
      this.network.on('playerJoined', (data) => this.onPlayerJoined(data));
      this.network.on('playerLeft', (data) => this.onPlayerLeft(data));
      this.network.on('playerMoved', (data) => this.onPlayerMoved(data));
      this.network.on('interactionResult', (data) => this.onInteractionResult(data));
      this.network.on('playerEscaped', (data) => this.onPlayerEscaped(data));
      this.network.on('gameUpdate', (data) => this.onGameUpdate(data));
      this.network.on('mazeUpdated', (data) => this.onMazeUpdated(data));
      this.network.on('gameOver', (data) => this.onGameOver(data));
      this.network.on('playerDamaged', (data) => this.onPlayerDamaged(data));
      this.network.on('itemSpawned', (data) => this.onItemSpawned(data));
      this.network.on('itemCollected', (data) => this.onItemCollected(data));
    }
    
    // Player input
    document.addEventListener('keydown', (e) => {
      if (this.isRunning) {
        if (e.code === 'KeyE') {
          if (this.network) this.network.emit('playerInteract');
        } else if (e.code === 'KeyF') {
          this.useEquippedItem();
        } else if (e.code === 'Escape') {
          // Toggle pointer lock on Escape key
          if (document.pointerLockElement === this.mazeRenderer.renderer.domElement) {
            document.exitPointerLock();
          } else {
            this.mazeRenderer.controls.lock();
          }
        }
      }
    });
    
    // Handle pointer lock errors
    document.addEventListener('pointerlockerror', (event) => {
      console.error('Pointer lock error:', event);
      this.ui.showMessage('Pointer lock failed. Try clicking again.', 'warning');
    });
    
    console.log('Event listeners set up successfully');
  }
  
  /**
   * Starts hosting a game.
   */
  hostGame() {
    console.log('Hosting game...');
    this.network.connect();
  }
  
  /**
   * Joins an existing game.
   */
  joinGame() {
    const roomCode = document.getElementById('room-code').value;
    if (roomCode) {
      console.log('Joining game with room code:', roomCode);
      this.network.connect(roomCode);
    } else {
      alert('Please enter a room code');
    }
  }
  
  /**
   * Shows the settings menu.
   */
  showSettings() {
    // To be implemented
    alert('Settings not implemented yet');
  }
  
  /**
   * Starts the game.
   */
  startGame() {
    console.log('Starting game...');
    
    this.isRunning = true;
    this.isGameOver = false;
    
    // Hide menu screen
    this.ui.hideMenuScreen();
    
    // Show game UI
    this.ui.showGameUI();
    
    // Start the game loop
    this.gameLoop();
    
    // Set initial objective
    this.ui.updateObjective('Find the exit and escape!');
    
    // Show welcome message
    this.ui.showMessage('Welcome to Labyrinth Survival!', 'info');
    this.ui.showMessage('Use WASD to move, mouse to look around', 'info');
    this.ui.showMessage('Press R to reset camera view if needed', 'info');
    
    // Initialize player health and stamina display
    this.ui.updateHealthBar(this.player.health, this.player.maxHealth);
    this.ui.updateStaminaBar(this.player.stamina, this.player.maxStamina);
    
    // Create a simple test maze if no maze data is received yet
    if (!this.mazeRenderer.maze) {
      this.createTestMaze();
    }
    
    console.log('Game started successfully');
  }
  
  /**
   * Creates a simple test maze for debugging.
   */
  createTestMaze() {
    console.log('Creating test maze...');
    
    // Check if mazeRenderer is available
    if (!this.mazeRenderer) {
      console.error('Cannot create test maze: maze renderer not initialized');
      return;
    }
    
    const width = Config.mazeWidth || 20;
    const height = Config.mazeHeight || 20;
    const cellSize = Config.cellSize || 2;
    
    const mazeData = {
      width: width,
      height: height,
      cellSize: cellSize,
      grid: Array(width).fill().map(() => Array(height).fill(false)),
      exit: { x: Math.floor(width * 0.75), z: Math.floor(height * 0.75) },
      start: { x: 1, z: Math.floor(height / 2) } // Position player at the entrance
    };
    
    // Add border walls
    for (let i = 0; i < mazeData.width; i++) {
      for (let j = 0; j < mazeData.height; j++) {
        // Create border walls
        if (i === 0 || i === mazeData.width - 1 || j === 0 || j === mazeData.height - 1) {
          mazeData.grid[i][j] = true;
        }
      }
    }
    
    // Create a clear entrance
    const entranceZ = Math.floor(height / 2);
    mazeData.grid[0][entranceZ] = false; // Open the wall at position (0, entranceZ)
    mazeData.grid[0][entranceZ - 1] = false;  // Make the entrance wider
    mazeData.grid[0][entranceZ + 1] = false; // Make the entrance wider
    
    // Make sure the path from entrance is clear
    mazeData.grid[1][entranceZ] = false;
    mazeData.grid[2][entranceZ] = false;
    mazeData.grid[3][entranceZ] = false;
    
    // Add some internal walls to create a maze
    for (let i = 5; i < width - 5; i += 2) {
      for (let j = 5; j < height - 5; j += 2) {
        mazeData.grid[i][j] = true;
      }
    }
    
    // Add some random walls
    for (let i = 0; i < width * height / 10; i++) {
      const x = Math.floor(Math.random() * (mazeData.width - 4)) + 2;
      const z = Math.floor(Math.random() * (mazeData.height - 4)) + 2;
      
      // Don't block the path from entrance to center
      if (!(x === 1 && z === entranceZ) && 
          !(x === 2 && z === entranceZ) && 
          !(x === 3 && z === entranceZ)) {
        mazeData.grid[x][z] = true;
      }
    }
    
    // Make sure the exit area is clear
    const exitX = mazeData.exit.x;
    const exitZ = mazeData.exit.z;
    mazeData.grid[exitX][exitZ] = false;
    mazeData.grid[exitX - 1][exitZ] = false;
    mazeData.grid[exitX][exitZ - 1] = false;
    mazeData.grid[exitX - 1][exitZ - 1] = false;
    
    // Create the maze
    try {
      this.mazeRenderer.createMaze(mazeData);
      console.log('Test maze created successfully');
    } catch (error) {
      console.error('Error creating test maze:', error);
      this.ui.showMessage('Error creating maze. Please refresh the page.', 'error');
    }
    
    // Position player outside the maze, facing the entrance
    if (this.player) {
      // Position just outside the entrance
      const startX = (mazeData.start.x - 1) * mazeData.cellSize + mazeData.cellSize / 2;
      const startZ = mazeData.start.z * mazeData.cellSize + mazeData.cellSize / 2;
      
      this.player.position.set(startX, 1.6, startZ);
      this.player.camera.position.copy(this.player.position);
      
      // Look into the maze
      const lookX = (mazeData.start.x + 3) * mazeData.cellSize;
      const lookZ = mazeData.start.z * mazeData.cellSize;
      this.player.camera.lookAt(lookX, 1.6, lookZ);
      
      console.log('Player positioned at entrance:', this.player.position.x, this.player.position.y, this.player.position.z);
    }
    
    // Spawn a test item
    this.onItemSpawned({
      id: 'test-item',
      name: 'Health Pack',
      type: 'health',
      position: { x: 6, y: 1, z: entranceZ },
      value: 20,
      consumable: true,
      color: 0xff0000
    });
    
    // Spawn a key item near the entrance
    this.onItemSpawned({
      id: 'key-item',
      name: 'Maze Key',
      type: 'key',
      position: { x: 3, y: 1, z: entranceZ },
      consumable: false,
      color: 0xffff00
    });
    
    console.log('Test maze created with clear entrance at position (0, ' + entranceZ + ')');
  }
  
  /**
   * Main game loop.
   */
  gameLoop() {
    try {
      if (!this.isRunning) return;
      
      // Update player
      if (this.player) {
        this.player.update();
      }
      
      // Send player position to server
      if (this.network && this.network.isConnected && this.player) {
        this.network.emit('playerMove', this.player.getPosition());
      }
      
      // Update monsters
      if (this.monsters && this.monsters.length > 0) {
        this.monsters.forEach(monster => {
          if (monster && typeof monster.update === 'function') {
            monster.update();
          }
        });
      }
      
      // Check for item collisions
      this.checkItemCollisions();
      
      // Render the scene
      if (this.mazeRenderer) {
        this.mazeRenderer.render();
      }
      
      // Continue the game loop
      if (this.isRunning) {
        requestAnimationFrame(() => this.gameLoop());
      }
    } catch (error) {
      console.error('Error in game loop:', error);
      
      // Try to recover
      if (this.ui) {
        this.ui.showMessage('Game recovered from an error', 'warning');
      }
      
      // Continue the game loop after a short delay
      setTimeout(() => {
        if (this.isRunning) {
          requestAnimationFrame(() => this.gameLoop());
        }
      }, 1000);
    }
  }
  
  /**
   * Checks for collisions between the player and items.
   */
  checkItemCollisions() {
    try {
      if (!this.player || this.player.hasEscaped || this.items.size === 0) return;
      
      const playerPosition = this.player.position;
      const collectionRadius = 1.5; // Distance at which items can be collected
      
      this.items.forEach((item, id) => {
        if (item && item.position) {
          const dx = playerPosition.x - item.position.x;
          const dz = playerPosition.z - item.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < collectionRadius) {
            // Collect the item
            this.collectItem(id);
          }
        }
      });
    } catch (error) {
      console.error('Error checking item collisions:', error);
    }
  }
  
  /**
   * Collects an item and adds it to the player's inventory.
   * @param {string} itemId - The ID of the item to collect
   */
  collectItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) return;
    
    // Add to player's inventory
    const added = this.player.addItem(item);
    
    if (added) {
      // Remove from scene
      if (item.mesh) {
        this.mazeRenderer.scene.remove(item.mesh);
      }
      
      // Remove from items map
      this.items.delete(itemId);
      
      // Show message
      this.ui.showMessage(`Collected: ${item.name}`, 'info');
      
      // Notify server
      this.network.emit('collectItem', { itemId });
    }
  }
  
  /**
   * Uses the player's currently equipped item.
   */
  useEquippedItem() {
    if (this.player) {
      const used = this.player.useEquippedItem();
      if (used) {
        // Notify server
        this.network.emit('useItem', { 
          itemIndex: this.player.equippedItemIndex 
        });
      }
    }
  }
  
  /**
   * Ends the game.
   */
  endGame(isVictory, message) {
    this.isRunning = false;
    this.isGameOver = true;
    
    // Show game over screen
    this.ui.showGameOver(isVictory, message);
    
    // Unlock pointer
    this.mazeRenderer.controls.unlock();
  }
  
  /**
   * Restarts the game.
   */
  restartGame() {
    // Reset game state
    this.network.emit('restartGame');
    
    // Hide game over screen
    this.ui.hideGameOver();
    
    // Start the game again
    this.startGame();
  }
  
  /**
   * Returns to the main menu.
   */
  returnToMenu() {
    // Disconnect from the server
    this.network.disconnect();
    
    // Hide game over screen
    this.ui.hideGameOver();
    
    // Show menu screen
    this.ui.showMenuScreen();
  }
  
  /**
   * Called when connected to the server.
   */
  onConnected() {
    console.log('Connected to server');
    this.startGame();
  }
  
  /**
   * Called when disconnected from the server.
   */
  onDisconnected() {
    console.log('Disconnected from server');
    this.isRunning = false;
    this.ui.showMenuScreen();
  }
  
  /**
   * Called when receiving the initial game state.
   */
  onGameState(data) {
    console.log('Received game state:', data);
    
    // Set game mode
    this.gameMode = data.gameMode;
    
    // Create maze
    this.mazeRenderer.createMaze(data.maze);
    
    // Create other players
    data.players.forEach(playerData => {
      if (playerData.id !== this.network.socket.id) {
        this.onPlayerJoined(playerData);
      }
    });
    
    // Create monsters
    data.monsters.forEach(monsterData => {
      this.createMonster(monsterData);
    });
    
    // Create items
    if (data.items) {
      data.items.forEach(itemData => {
        this.onItemSpawned(itemData);
      });
    }
    
    // Update UI
    this.ui.updateTimer(data.gameTimer);
    this.ui.updatePlayersEscaped(data.playersEscaped, data.players.length);
    
    // Update objective based on game mode
    if (this.gameMode === 'coop') {
      this.ui.updateObjective('Work together to find the exit and escape!');
    } else if (this.gameMode === 'betrayal') {
      this.ui.updateObjective('Find the exit, but only one player can escape!');
    } else if (this.gameMode === 'pvp') {
      this.ui.updateObjective('Find the exit and escape, or eliminate other players!');
    }
  }
  
  /**
   * Called when a player joins the game.
   */
  onPlayerJoined(playerData) {
    console.log('Player joined:', playerData);
    
    // Add remote player
    this.player.addRemotePlayer(playerData.id, playerData);
    
    // Show message
    this.ui.showMessage(`${playerData.name || 'A player'} joined the game`, 'info');
    
    // Update players escaped counter
    if (this.gameMode === 'coop') {
      const totalPlayers = this.player.getRemotePlayerCount() + 1;
      this.ui.updatePlayersEscaped(0, totalPlayers);
    }
  }
  
  /**
   * Called when a player leaves the game.
   */
  onPlayerLeft(playerId) {
    console.log('Player left:', playerId);
    
    // Get player name before removing
    const playerName = this.player.remotePlayers.get(playerId)?.name || 'A player';
    
    // Remove remote player
    this.player.removeRemotePlayer(playerId);
    
    // Show message
    this.ui.showMessage(`${playerName} left the game`, 'info');
  }
  
  /**
   * Called when a player moves.
   */
  onPlayerMoved(data) {
    // Update remote player position
    this.player.updateRemotePlayerPosition(data.id, data.position);
  }
  
  /**
   * Called when receiving an interaction result.
   */
  onInteractionResult(data) {
    console.log('Interaction result:', data);
    
    if (data.type === 'exit') {
      if (data.success) {
        // Player escaped
        this.player.setEscaped(true);
        this.ui.showMessage('You escaped the labyrinth!', 'info');
        
        // In co-op mode, wait for all players to escape
        if (this.gameMode === 'coop') {
          this.ui.updateObjective('Wait for all players to escape!');
        } else {
          // In other modes, end the game
          this.endGame(true, 'You escaped the labyrinth!');
        }
      } else {
        // Failed to escape
        this.ui.showMessage(data.message || 'You cannot escape yet!', 'warning');
      }
    } else if (data.type === 'door') {
      if (data.success) {
        this.ui.showMessage('Door unlocked!', 'info');
      } else {
        this.ui.showMessage(data.message || 'You need a key to unlock this door!', 'warning');
      }
    } else if (data.type === 'item') {
      if (data.success) {
        this.ui.showMessage(`Found: ${data.item.name}`, 'info');
      }
    }
  }
  
  /**
   * Called when a player escapes.
   */
  onPlayerEscaped(data) {
    console.log('Player escaped:', data);
    
    // Show message
    this.ui.showMessage(`${data.name || 'A player'} escaped the labyrinth!`, 'info');
    
    // Update players escaped counter
    this.ui.updatePlayersEscaped(data.playersEscaped, data.totalPlayers);
    
    // In betrayal mode, if another player escaped, you lose
    if (this.gameMode === 'betrayal' && data.id !== this.network.socket.id) {
      this.endGame(false, `${data.name || 'Another player'} escaped before you!`);
    }
    
    // In co-op mode, if all players escaped, everyone wins
    if (this.gameMode === 'coop' && data.playersEscaped === data.totalPlayers) {
      this.endGame(true, 'All players escaped the labyrinth!');
    }
  }
  
  /**
   * Called when receiving a game update.
   */
  onGameUpdate(data) {
    console.log('Game update:', data);
    
    // Update timer
    if (data.gameTimer !== undefined) {
      this.ui.updateTimer(data.gameTimer);
      
      // Show warning when time is running low
      if (data.gameTimer <= 60 && data.gameTimer % 10 === 0) {
        this.ui.showMessage(`Time is running out! ${Math.floor(data.gameTimer / 60)}:${(data.gameTimer % 60).toString().padStart(2, '0')} remaining!`, 'warning');
      }
    }
    
    // Update players escaped
    if (data.playersEscaped !== undefined) {
      this.ui.updatePlayersEscaped(data.playersEscaped, data.totalPlayers);
    }
  }
  
  /**
   * Called when the maze is updated.
   */
  onMazeUpdated(mazeData) {
    console.log('Maze updated');
    
    // Update the maze
    this.mazeRenderer.updateMaze(mazeData);
    
    // Show message
    this.ui.showMessage('The labyrinth is shifting!', 'warning');
  }
  
  /**
   * Called when the game is over.
   */
  onGameOver(data) {
    console.log('Game over:', data);
    
    // End the game
    this.endGame(data.victory, data.message);
  }
  
  /**
   * Called when the player takes damage.
   */
  onPlayerDamaged(data) {
    console.log('Player damaged:', data);
    
    // Apply damage to player
    if (data.id === this.network.socket.id) {
      this.player.takeDamage(data.amount, data.source);
    }
  }
  
  /**
   * Called when an item is spawned.
   */
  onItemSpawned(itemData) {
    console.log('Item spawned:', itemData);
    
    // Create item object
    const item = {
      id: itemData.id,
      name: itemData.name,
      type: itemData.type,
      position: itemData.position,
      value: itemData.value,
      consumable: itemData.consumable,
      color: itemData.color || this.getItemColor(itemData.type)
    };
    
    // Create item mesh
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = new THREE.MeshBasicMaterial({ color: item.color });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position the item
    mesh.position.set(item.position.x, item.position.y || 1, item.position.z);
    
    // Add rotation animation
    mesh.userData.rotationSpeed = 0.02;
    mesh.userData.floatSpeed = 0.01;
    mesh.userData.floatHeight = 0.2;
    mesh.userData.initialY = mesh.position.y;
    mesh.userData.update = function() {
      this.rotation.y += this.userData.rotationSpeed;
      this.position.y = this.userData.initialY + Math.sin(Date.now() * this.userData.floatSpeed) * this.userData.floatHeight;
    };
    
    // Add to scene
    this.mazeRenderer.scene.add(mesh);
    
    // Store item with mesh
    item.mesh = mesh;
    this.items.set(item.id, item);
  }
  
  /**
   * Called when an item is collected.
   */
  onItemCollected(data) {
    console.log('Item collected:', data);
    
    // Remove item from scene
    const item = this.items.get(data.itemId);
    if (item && item.mesh) {
      this.mazeRenderer.scene.remove(item.mesh);
      this.items.delete(data.itemId);
    }
    
    // Show message if another player collected it
    if (data.playerId !== this.network.socket.id) {
      const playerName = this.player.remotePlayers.get(data.playerId)?.name || 'Another player';
      this.ui.showMessage(`${playerName} collected an item`, 'info');
    }
  }
  
  /**
   * Gets the color for an item type.
   * @param {string} type - The item type
   * @returns {number} The color as a hex number
   */
  getItemColor(type) {
    if (Config.itemTypes && Config.itemTypes[type]) {
      return Config.itemTypes[type].color;
    }
    
    // Fallback colors
    switch (type) {
      case 'health':
        return 0xff0000;
      case 'key':
        return 0xffff00;
      case 'weapon':
        return 0x00ff00;
      case 'armor':
        return 0x0000ff;
      case 'special':
        return 0xff00ff;
      default:
        return 0xffffff;
    }
  }
  
  /**
   * Creates a monster.
   */
  createMonster(monsterData) {
    const monster = new Monster(this.mazeRenderer.scene, monsterData);
    this.monsters.push(monster);
  }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
  window.game = new Game();
}); 