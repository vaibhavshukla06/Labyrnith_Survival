/**
 * Manages the user interface.
 */
class UI {
  constructor() {
    // Debug flag
    this.debug = true;
    
    try {
      // UI elements
      this.loadingScreen = document.getElementById('loading-screen');
      this.menuScreen = document.getElementById('menu-screen');
      this.gameUI = document.getElementById('game-ui');
      this.gameOverScreen = document.getElementById('game-over-screen');
      this.interactionPrompt = document.getElementById('interaction-prompt');
      
      // UI components
      this.progressBar = document.getElementById('progress-bar');
      this.loadingText = document.getElementById('loading-text');
      this.healthBar = document.getElementById('health-bar');
      this.objective = document.getElementById('objective');
      this.timer = document.getElementById('timer');
      this.playersEscaped = document.getElementById('players-escaped');
      this.gameOverTitle = document.getElementById('game-over-title');
      this.gameOverMessage = document.getElementById('game-over-message');
      this.interactionText = document.getElementById('interaction-text');
      
      // Join form
      this.joinForm = document.getElementById('join-form');
      
      // Create stamina bar
      this.createStaminaBar();
      
      // Create inventory display
      this.createInventoryDisplay();
      
      if (this.debug) console.log('UI initialized successfully');
    } catch (error) {
      console.error('Error initializing UI:', error);
    }
  }
  
  /**
   * Creates the stamina bar element.
   */
  createStaminaBar() {
    try {
      // Create container
      this.staminaBarContainer = document.createElement('div');
      this.staminaBarContainer.id = 'stamina-bar-container';
      
      // Create stamina bar
      this.staminaBar = document.createElement('div');
      this.staminaBar.id = 'stamina-bar';
      
      // Add to container
      this.staminaBarContainer.appendChild(this.staminaBar);
      
      // Add to game UI
      if (this.gameUI) {
        this.gameUI.appendChild(this.staminaBarContainer);
      } else {
        console.error('Game UI element not found');
        return;
      }
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        #stamina-bar-container {
          position: absolute;
          bottom: 30px;
          left: 20px;
          width: 200px;
          height: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 5px;
        }
        
        #stamina-bar {
          height: 100%;
          width: 100%;
          background-color: #3498db;
          border-radius: 5px;
          transition: width 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    } catch (error) {
      console.error('Error creating stamina bar:', error);
    }
  }
  
  /**
   * Creates the inventory display.
   */
  createInventoryDisplay() {
    // Create inventory container
    this.inventoryContainer = document.createElement('div');
    this.inventoryContainer.id = 'inventory-container';
    
    // Create inventory slots
    this.inventorySlots = [];
    for (let i = 0; i < (Config.maxInventorySize || 8); i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.index = i;
      
      // Add slot number
      const slotNumber = document.createElement('div');
      slotNumber.className = 'slot-number';
      slotNumber.textContent = i + 1;
      slot.appendChild(slotNumber);
      
      this.inventoryContainer.appendChild(slot);
      this.inventorySlots.push(slot);
    }
    
    // Add to game UI
    this.gameUI.appendChild(this.inventoryContainer);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #inventory-container {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 5px;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px;
        border-radius: 5px;
      }
      
      .inventory-slot {
        width: 50px;
        height: 50px;
        background-color: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 5px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
      }
      
      .inventory-slot.active {
        border-color: #f39c12;
        box-shadow: 0 0 10px #f39c12;
      }
      
      .inventory-slot .item {
        width: 40px;
        height: 40px;
        border-radius: 3px;
      }
      
      .slot-number {
        position: absolute;
        top: 2px;
        left: 2px;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
      }
      
      .item-name {
        position: absolute;
        bottom: -20px;
        left: 0;
        width: 100%;
        text-align: center;
        font-size: 10px;
        color: white;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 2px;
        border-radius: 3px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .inventory-slot:hover .item-name {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Shows the loading screen.
   */
  showLoadingScreen() {
    try {
      this.hideAllScreens();
      if (this.loadingScreen) {
        this.loadingScreen.classList.remove('hidden');
        this.updateLoadingProgress(0);
        if (this.debug) console.log('Loading screen shown');
      } else {
        console.error('Loading screen element not found');
      }
    } catch (error) {
      console.error('Error showing loading screen:', error);
    }
  }
  
  /**
   * Hides the loading screen.
   */
  hideLoadingScreen() {
    try {
      if (this.loadingScreen) {
        this.loadingScreen.classList.add('hidden');
        if (this.debug) console.log('Loading screen hidden');
      } else {
        console.error('Loading screen element not found');
        // Try direct DOM access as a fallback
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.classList.add('hidden');
          console.log('Loading screen hidden via direct DOM access');
        }
      }
    } catch (error) {
      console.error('Error hiding loading screen:', error);
      // Last resort fallback
      try {
        document.getElementById('loading-screen').style.display = 'none';
        console.log('Loading screen hidden via style.display');
      } catch (e) {
        console.error('All attempts to hide loading screen failed:', e);
      }
    }
  }
  
  /**
   * Updates the loading progress.
   * @param {number} progress - The progress value (0-100)
   * @param {string} text - Optional loading text
   */
  updateLoadingProgress(progress, text) {
    try {
      if (this.progressBar) {
        this.progressBar.style.width = `${progress}%`;
      }
      
      if (text && this.loadingText) {
        this.loadingText.textContent = text;
      }
    } catch (error) {
      console.error('Error updating loading progress:', error);
    }
  }
  
  /**
   * Shows the menu screen.
   */
  showMenuScreen() {
    try {
      this.hideAllScreens();
      if (this.menuScreen) {
        this.menuScreen.classList.remove('hidden');
        if (this.debug) console.log('Menu screen shown');
      } else {
        console.error('Menu screen element not found');
        // Try direct DOM access as a fallback
        const menuScreen = document.getElementById('menu-screen');
        if (menuScreen) {
          menuScreen.classList.remove('hidden');
          console.log('Menu screen shown via direct DOM access');
        }
      }
    } catch (error) {
      console.error('Error showing menu screen:', error);
    }
  }
  
  /**
   * Hides the menu screen.
   */
  hideMenuScreen() {
    try {
      if (this.menuScreen) {
        this.menuScreen.classList.add('hidden');
      } else {
        console.error('Menu screen element not found');
      }
    } catch (error) {
      console.error('Error hiding menu screen:', error);
    }
  }
  
  /**
   * Toggles the join form visibility.
   */
  toggleJoinForm() {
    try {
      if (this.joinForm) {
        this.joinForm.classList.toggle('hidden');
      } else {
        console.error('Join form element not found');
      }
    } catch (error) {
      console.error('Error toggling join form:', error);
    }
  }
  
  /**
   * Shows the game UI.
   */
  showGameUI() {
    try {
      if (this.gameUI) {
        this.gameUI.classList.remove('hidden');
      } else {
        console.error('Game UI element not found');
      }
    } catch (error) {
      console.error('Error showing game UI:', error);
    }
  }
  
  /**
   * Hides the game UI.
   */
  hideGameUI() {
    try {
      if (this.gameUI) {
        this.gameUI.classList.add('hidden');
      } else {
        console.error('Game UI element not found');
      }
    } catch (error) {
      console.error('Error hiding game UI:', error);
    }
  }
  
  /**
   * Shows the game over screen.
   * @param {boolean} isVictory - Whether the player won
   * @param {string} message - The game over message
   */
  showGameOver(isVictory, message) {
    this.hideAllScreens();
    this.gameOverScreen.classList.remove('hidden');
    
    this.gameOverTitle.textContent = isVictory ? 'Victory!' : 'Game Over';
    this.gameOverTitle.style.color = isVictory ? '#4CAF50' : '#f44336';
    this.gameOverMessage.textContent = message || '';
  }
  
  /**
   * Hides the game over screen.
   */
  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
  }
  
  /**
   * Shows an interaction prompt.
   * @param {string} text - The prompt text
   */
  showInteractionPrompt(text) {
    this.interactionPrompt.classList.remove('hidden');
    this.interactionText.textContent = text;
    
    // Hide after 3 seconds
    setTimeout(() => {
      this.hideInteractionPrompt();
    }, 3000);
  }
  
  /**
   * Hides the interaction prompt.
   */
  hideInteractionPrompt() {
    this.interactionPrompt.classList.add('hidden');
  }
  
  /**
   * Shows a message to the player.
   * @param {string} message - The message to show
   * @param {string} type - The message type (info, damage, heal, buff, warning)
   */
  showMessage(message, type = 'info') {
    // Create a temporary message element
    const messageElement = document.createElement('div');
    messageElement.className = `game-message ${type}`;
    messageElement.textContent = message;
    
    // Add to the game UI
    this.gameUI.appendChild(messageElement);
    
    // Remove after 3 seconds
    setTimeout(() => {
      messageElement.classList.add('fade-out');
      setTimeout(() => {
        if (messageElement.parentNode === this.gameUI) {
          this.gameUI.removeChild(messageElement);
        }
      }, 500);
    }, 3000);
  }
  
  /**
   * Updates the health bar.
   * @param {number} health - The current health value
   * @param {number} maxHealth - The maximum health value
   */
  updateHealthBar(health, maxHealth) {
    const percentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    this.healthBar.style.width = `${percentage}%`;
    
    // Change color based on health
    if (percentage > 60) {
      this.healthBar.style.backgroundColor = '#4CAF50'; // Green
    } else if (percentage > 30) {
      this.healthBar.style.backgroundColor = '#FFC107'; // Yellow
    } else {
      this.healthBar.style.backgroundColor = '#F44336'; // Red
    }
  }
  
  /**
   * Updates the stamina bar.
   * @param {number} stamina - The current stamina value
   * @param {number} maxStamina - The maximum stamina value
   */
  updateStaminaBar(stamina, maxStamina) {
    const percentage = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
    this.staminaBar.style.width = `${percentage}%`;
    
    // Change color based on stamina
    if (percentage > 60) {
      this.staminaBar.style.backgroundColor = '#3498db'; // Blue
    } else if (percentage > 30) {
      this.staminaBar.style.backgroundColor = '#9b59b6'; // Purple
    } else {
      this.staminaBar.style.backgroundColor = '#e74c3c'; // Red
    }
  }
  
  /**
   * Updates the inventory display.
   * @param {Array} inventory - The player's inventory
   * @param {number} equippedIndex - The index of the equipped item
   */
  updateInventory(inventory, equippedIndex) {
    // Clear all slots
    this.inventorySlots.forEach(slot => {
      // Remove any existing item
      const existingItem = slot.querySelector('.item');
      if (existingItem) {
        slot.removeChild(existingItem);
      }
      
      // Remove any existing item name
      const existingName = slot.querySelector('.item-name');
      if (existingName) {
        slot.removeChild(existingName);
      }
      
      // Remove active class
      slot.classList.remove('active');
    });
    
    // Add items to slots
    inventory.forEach((item, index) => {
      if (index < this.inventorySlots.length) {
        const slot = this.inventorySlots[index];
        
        // Create item element
        const itemElement = document.createElement('div');
        itemElement.className = 'item';
        itemElement.style.backgroundColor = this.getItemColor(item);
        
        // Create item name element
        const nameElement = document.createElement('div');
        nameElement.className = 'item-name';
        nameElement.textContent = item.name;
        
        // Add to slot
        slot.appendChild(itemElement);
        slot.appendChild(nameElement);
        
        // Mark as active if equipped
        if (index === equippedIndex) {
          slot.classList.add('active');
        }
      }
    });
  }
  
  /**
   * Gets the color for an item based on its type.
   * @param {Object} item - The item
   * @returns {string} The CSS color
   */
  getItemColor(item) {
    if (item.color) {
      return `#${item.color.toString(16).padStart(6, '0')}`;
    }
    
    // Use default colors from config if available
    if (Config.itemTypes && Config.itemTypes[item.type]) {
      const color = Config.itemTypes[item.type].color;
      return `#${color.toString(16).padStart(6, '0')}`;
    }
    
    // Fallback colors
    switch (item.type) {
      case 'health':
        return '#ff0000';
      case 'key':
        return '#ffff00';
      case 'weapon':
        return '#00ff00';
      case 'armor':
        return '#0000ff';
      case 'special':
        return '#ff00ff';
      default:
        return '#ffffff';
    }
  }
  
  /**
   * Updates the objective text.
   * @param {string} text - The new objective text
   */
  updateObjective(text) {
    this.objective.textContent = text;
  }
  
  /**
   * Updates the timer display.
   * @param {number} seconds - The time in seconds
   */
  updateTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Updates the players escaped counter.
   * @param {number} escaped - The number of players who have escaped
   * @param {number} total - The total number of players
   */
  updatePlayersEscaped(escaped, total) {
    // Handle undefined values
    escaped = escaped || 0;
    total = total || 0;
    
    this.playersEscaped.textContent = `Players Escaped: ${escaped}/${total}`;
  }
  
  /**
   * Shows an interaction message.
   * @param {string} message - The message to show
   */
  showInteractionMessage(message) {
    this.showMessage(message, 'interaction');
  }
  
  /**
   * Hides all screens.
   */
  hideAllScreens() {
    try {
      // Try to hide each screen individually to prevent one failure from affecting others
      try {
        if (this.loadingScreen) this.loadingScreen.classList.add('hidden');
      } catch (e) {
        console.error('Error hiding loading screen:', e);
      }
      
      try {
        if (this.menuScreen) this.menuScreen.classList.add('hidden');
      } catch (e) {
        console.error('Error hiding menu screen:', e);
      }
      
      try {
        if (this.gameUI) this.gameUI.classList.add('hidden');
      } catch (e) {
        console.error('Error hiding game UI:', e);
      }
      
      try {
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
      } catch (e) {
        console.error('Error hiding game over screen:', e);
      }
      
      if (this.debug) console.log('All screens hidden');
    } catch (error) {
      console.error('Error hiding all screens:', error);
      
      // Last resort fallback using direct DOM access
      try {
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('menu-screen')?.classList.add('hidden');
        document.getElementById('game-ui')?.classList.add('hidden');
        document.getElementById('game-over-screen')?.classList.add('hidden');
        console.log('Screens hidden via direct DOM access');
      } catch (e) {
        console.error('All attempts to hide screens failed:', e);
      }
    }
  }
} 