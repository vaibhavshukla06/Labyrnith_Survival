/**
 * Represents the player character.
 */
class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Player state
    this.position = new THREE.Vector3(0, 0.9, 0);
    this.velocity = new THREE.Vector3();
    this.health = Config.playerHealth;
    this.maxHealth = Config.playerHealth;
    this.armor = 0;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.hasEscaped = false;
    this.inventory = [];
    this.maxInventorySize = Config.maxInventorySize || 8;
    this.equippedItemIndex = -1;
    this.stamina = Config.playerStamina || 100;
    this.maxStamina = Config.playerStamina || 100;
    this.staminaRegenRate = Config.staminaRegenRate || 1;
    this.isExhausted = false;
    
    // Movement controls
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
    this.canJump = true;
    this.speed = Config.playerSpeed;
    this.sprintMultiplier = Config.sprintMultiplier || 1.5;
    
    // Mouse controls
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseSensitivity = Config.mouseSensitivity;
    this.cameraRotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pointerLocked = false;
    
    // Collision detection
    this.collisionDetectionEnabled = true;
    this.collisionRadius = Config.playerCollisionRadius || 0.2; // Use the collision radius from Config
    
    // Remote players
    this.remotePlayers = new Map();
    
    // Create player model
    this.createPlayerModel();
    
    // Set up camera for third-person view
    this.setupThirdPersonCamera();
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Debug
    console.log('Player initialized');
  }
  
  /**
   * Creates a visible player model.
   */
  createPlayerModel() {
    // Create player mesh
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const material = new THREE.MeshLambertMaterial({ color: 0x00aaff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    
    // Adjust mesh position so it sits on the ground
    // The mesh origin is at the center, so we need to offset it up by half its height
    this.mesh.position.y = this.position.y;
    
    this.scene.add(this.mesh);
    
    // Add eyes to the player model (to show direction)
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.leftEye.position.set(0.2, 0.7, -0.3);
    this.mesh.add(this.leftEye);
    
    this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.rightEye.position.set(-0.2, 0.7, -0.3);
    this.mesh.add(this.rightEye);
    
    // Add direction indicator (arrow pointing forward)
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.4, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.directionArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.directionArrow.position.set(0, 0.9, -0.5);
    this.directionArrow.rotation.x = -Math.PI / 2; // Point forward
    this.mesh.add(this.directionArrow);
    
    console.log('Player model created');
  }
  
  /**
   * Sets up the camera for third-person view.
   */
  setupThirdPersonCamera() {
    // Set initial camera position behind and above the player
    this.cameraOffset = new THREE.Vector3(0, 2.5, 4); // Position camera behind and above player
    this.updateCameraPosition();
    
    // Add a toggle for first/third person view
    this.isThirdPerson = true;
    
    console.log('Third-person camera setup complete');
  }
  
  /**
   * Updates the camera position based on player position and current view mode.
   */
  updateCameraPosition() {
    if (this.isThirdPerson) {
      // Third-person view
      // Get the direction the player is facing based on the mesh rotation
      const playerDirection = new THREE.Vector3(0, 0, -1);
      playerDirection.applyQuaternion(this.mesh.quaternion);
      
      // Calculate camera position behind player
      const cameraPosition = new THREE.Vector3(
        this.position.x - playerDirection.x * this.cameraOffset.z,
        this.position.y + this.cameraOffset.y,
        this.position.z - playerDirection.z * this.cameraOffset.z
      );
      
      // Update camera position
      this.camera.position.copy(cameraPosition);
      
      // Make camera look at player
      this.camera.lookAt(
        this.position.x,
        this.position.y + 0.7, // Look at player's head
        this.position.z
      );
    } else {
      // First-person view - camera at player's eye level
      const eyeHeight = 0.7; // Height offset for eyes
      this.camera.position.set(
        this.position.x,
        this.position.y + eyeHeight,
        this.position.z
      );
    }
  }
  
  /**
   * Sets up keyboard and mouse input handlers.
   */
  setupInputHandlers() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      if (event.repeat) return; // Prevent key repeat
      
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = true;
          break;
        case 'Space':
          if (this.canJump) {
            this.velocity.y = Config.playerJumpForce;
            this.canJump = false;
          }
          break;
        case 'ShiftLeft':
          if (!this.isExhausted) {
            this.isSprinting = true;
          }
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
          // Select inventory slot (1-8)
          const slotIndex = parseInt(event.code.replace('Digit', '')) - 1;
          this.selectInventorySlot(slotIndex);
          break;
        case 'KeyQ':
          // Drop currently equipped item
          this.dropEquippedItem();
          break;
        case 'KeyR':
          // Reset camera view
          if (window.game && window.game.mazeRenderer) {
            // Reset camera to look forward
            this.camera.lookAt(
              this.position.x + 1, // Look slightly ahead
              this.position.y,
              this.position.z
            );
            
            if (window.game.ui) {
              window.game.ui.showMessage('Camera view reset', 'info');
            }
          }
          break;
        case 'KeyV':
          this.isThirdPerson = !this.isThirdPerson;
          console.log(`Switched to ${this.isThirdPerson ? 'third-person' : 'first-person'} view`);
          
          if (window.game && window.game.ui) {
            window.game.ui.showMessage(`Switched to ${this.isThirdPerson ? 'third-person' : 'first-person'} view`, 'info');
          }
          break;
        case 'KeyC':
          // Toggle collision detection
          this.collisionDetectionEnabled = !this.collisionDetectionEnabled;
          console.log('Collision detection:', this.collisionDetectionEnabled ? 'enabled' : 'disabled');
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.moveForward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.moveBackward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.moveLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.moveRight = false;
          break;
        case 'ShiftLeft':
          this.isSprinting = false;
          break;
      }
    });
    
    // Mouse controls for camera rotation
    const gameContainer = document.getElementById('game-container');
    
    // Set up pointer lock
    gameContainer.addEventListener('click', () => {
      if (!this.pointerLocked) {
        gameContainer.requestPointerLock = gameContainer.requestPointerLock || 
                                          gameContainer.mozRequestPointerLock || 
                                          gameContainer.webkitRequestPointerLock;
        gameContainer.requestPointerLock();
      }
    });
    
    // Auto-lock pointer when game starts
    if (window.game && window.game.mazeRenderer && window.game.mazeRenderer.renderer) {
      setTimeout(() => {
        if (!this.pointerLocked) {
          gameContainer.requestPointerLock();
        }
      }, 500); // Small delay to ensure everything is loaded
    }
    
    // Handle pointer lock change
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this));
    
    // Mouse movement handler
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Touch controls for mobile
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) {
        // Single touch - move forward
        this.moveForward = true;
      }
    });
    
    document.addEventListener('touchend', () => {
      this.moveForward = false;
    });
  }
  
  /**
   * Handles pointer lock change events.
   */
  onPointerLockChange() {
    if (document.pointerLockElement === document.getElementById('game-container') ||
        document.mozPointerLockElement === document.getElementById('game-container') ||
        document.webkitPointerLockElement === document.getElementById('game-container')) {
      // Pointer is locked
      this.pointerLocked = true;
      console.log('Pointer locked - camera control enabled');
      
      if (window.game && window.game.ui) {
        window.game.ui.showMessage('Mouse control enabled', 'info');
      }
    } else {
      // Pointer is unlocked
      this.pointerLocked = false;
      console.log('Pointer unlocked - camera control disabled');
    }
  }
  
  /**
   * Handles mouse movement for camera rotation.
   */
  onMouseMove(event) {
    if (!this.pointerLocked) return;
    
    // Get mouse movement
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
    // Update camera rotation
    this.cameraRotation.y -= movementX * this.mouseSensitivity;
    
    // Limit vertical rotation to prevent camera flipping
    this.cameraRotation.x -= movementY * this.mouseSensitivity;
    this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
    
    // Apply rotation to camera
    this.camera.rotation.copy(this.cameraRotation);
    
    // Always rotate the player model to match the camera's horizontal rotation
    if (this.mesh) {
      this.mesh.rotation.y = this.cameraRotation.y;
    }
  }
  
  /**
   * Updates the player's position and state.
   */
  update() {
    try {
      if (this.hasEscaped) return;
      
      // Update invulnerability timer
      if (this.isInvulnerable) {
        this.invulnerabilityTimer -= 1;
        if (this.invulnerabilityTimer <= 0) {
          this.isInvulnerable = false;
        }
      }
      
      // Update stamina
      if (this.isSprinting && (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight)) {
        this.stamina -= 2;
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.isExhausted = true;
          this.isSprinting = false;
        }
      } else {
        this.stamina += this.staminaRegenRate;
        if (this.stamina >= this.maxStamina) {
          this.stamina = this.maxStamina;
          this.isExhausted = false;
        }
      }
      
      // Calculate movement direction
      const direction = new THREE.Vector3();
      
      // Get the direction the player is facing (from the mesh rotation)
      const playerDirection = new THREE.Vector3(0, 0, -1); // Forward vector
      playerDirection.applyQuaternion(this.mesh.quaternion);
      playerDirection.y = 0; // Keep movement on the horizontal plane
      playerDirection.normalize();
      
      // Calculate the right vector (perpendicular to forward)
      const playerRight = new THREE.Vector3(
        playerDirection.z,
        0,
        -playerDirection.x
      ).normalize();
      
      // Apply movement inputs relative to player's facing direction
      if (this.moveForward) direction.add(playerDirection);
      if (this.moveBackward) direction.sub(playerDirection);
      if (this.moveLeft) direction.sub(playerRight);
      if (this.moveRight) direction.add(playerRight);
      
      // Normalize direction vector
      if (direction.length() > 0) {
        direction.normalize();
        
        // Apply speed (with sprint multiplier if sprinting)
        const currentSpeed = this.isSprinting ? this.speed * this.sprintMultiplier : this.speed;
        direction.multiplyScalar(currentSpeed * 0.1);
        
        // Update velocity
        this.velocity.x = direction.x;
        this.velocity.z = direction.z;
      } else {
        // Apply friction
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
      }
      
      // Apply gravity
      this.velocity.y -= 0.1; // Simple gravity
      
      // Limit maximum velocity to prevent getting stuck
      const maxVelocity = 1.0;
      this.velocity.x = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.x));
      this.velocity.y = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.y));
      this.velocity.z = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocity.z));
      
      // Calculate new position
      const newPosition = new THREE.Vector3(
        this.position.x + this.velocity.x,
        this.position.y + this.velocity.y,
        this.position.z + this.velocity.z
      );
      
      // Check for collisions if enabled
      if (this.collisionDetectionEnabled && window.game && window.game.mazeRenderer) {
        const maze = window.game.mazeRenderer.maze;
        if (maze) {
          const hasCollision = this.checkCollision(newPosition, maze);
          
          if (!hasCollision) {
            // No collision, update position
            this.position.copy(newPosition);
          } else {
            // Collision detected, only update Y position
            this.position.y = newPosition.y;
            
            // Reset horizontal velocity
            this.velocity.x *= 0.2;
            this.velocity.z *= 0.2;
            
            // Debug message for collision (only show occasionally to avoid spam)
            if (Math.random() < 0.01) {
              console.log('Collision detected at position:', newPosition.x, newPosition.y, newPosition.z);
              console.log('Current grid position:', Math.floor(newPosition.x / maze.cellSize), Math.floor(newPosition.z / maze.cellSize));
            }
          }
        } else {
          // No maze data yet, update position without collision check
          this.position.copy(newPosition);
        }
      } else {
        // Collision detection disabled, update position
        this.position.copy(newPosition);
      }
      
      // Simple collision detection with floor
      const floorHeight = 0.9; // Player height when standing on the floor
      if (this.position.y < floorHeight) {
        this.position.y = floorHeight;
        this.velocity.y = 0;
        this.canJump = true;
      }
      
      // Prevent getting stuck by ensuring the player is always at a valid height
      if (isNaN(this.position.y) || this.position.y > 100) {
        console.log('Correcting invalid player height');
        this.position.y = floorHeight;
        this.velocity.y = 0;
      }
      
      // Update player mesh position
      this.mesh.position.copy(this.position);
      
      // Update camera position based on current view mode
      this.updateCameraPosition();
      
      // Update UI if available
      if (window.game && window.game.ui) {
        window.game.ui.updateHealthBar(this.health, this.maxHealth);
        window.game.ui.updateStaminaBar(this.stamina, this.maxStamina);
      }
    } catch (error) {
      console.error('Error in player update:', error);
    }
  }
  
  /**
   * Checks for collisions with maze walls.
   * @param {THREE.Vector3} position - The position to check
   * @param {Object} maze - The maze data
   * @returns {boolean} True if there is a collision, false otherwise
   */
  checkCollision(position, maze) {
    try {
      // Validate inputs to prevent errors
      if (!position || !maze || !maze.grid || !maze.cellSize) {
        console.error('Invalid inputs to checkCollision');
        return false;
      }
      
      // Convert position to grid coordinates
      const gridX = Math.floor(position.x / maze.cellSize);
      const gridZ = Math.floor(position.z / maze.cellSize);
      
      // Log position occasionally for debugging
      if (Math.random() < 0.005) {
        console.log('Player position:', position.x, position.y, position.z);
        console.log('Grid position:', gridX, gridZ);
      }
      
      // Boundary check - prevent going outside the maze
      if (gridX < 0 || gridX >= maze.width || gridZ < 0 || gridZ >= maze.height) {
        return true; // Treat out-of-bounds as collision
      }
      
      // Check the current cell first - if it's a wall, definitely collision
      if (maze.grid[gridX][gridZ]) {
        return true;
      }
      
      // Check surrounding cells with improved collision detection
      const playerRadius = this.collisionRadius || 0.2;
      
      // Check all adjacent cells
      for (let x = Math.max(0, gridX - 1); x <= Math.min(maze.width - 1, gridX + 1); x++) {
        for (let z = Math.max(0, gridZ - 1); z <= Math.min(maze.height - 1, gridZ + 1); z++) {
          // Skip the current cell (already checked)
          if (x === gridX && z === gridZ) continue;
          
          // Check if this cell is a wall
          if (maze.grid[x][z]) {
            // Calculate wall boundaries
            const wallMinX = x * maze.cellSize;
            const wallMaxX = (x + 1) * maze.cellSize;
            const wallMinZ = z * maze.cellSize;
            const wallMaxZ = (z + 1) * maze.cellSize;
            
            // Calculate closest point on wall to player
            const closestX = Math.max(wallMinX, Math.min(position.x, wallMaxX));
            const closestZ = Math.max(wallMinZ, Math.min(position.z, wallMaxZ));
            
            // Calculate distance from player to closest point
            const dx = position.x - closestX;
            const dz = position.z - closestZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Check if player is colliding with wall
            if (distance < playerRadius) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error in collision detection:', error);
      return false; // Allow movement in case of error
    }
  }
  
  /**
   * Gets the player's position.
   * @returns {Object} The position as an object with x, y, z properties
   */
  getPosition() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z
    };
  }
  
  /**
   * Sets whether the player has escaped.
   * @param {boolean} escaped - Whether the player has escaped
   */
  setEscaped(escaped) {
    this.hasEscaped = escaped;
  }
  
  /**
   * Adds an item to the player's inventory.
   * @param {Object} item - The item to add
   * @returns {boolean} Whether the item was successfully added
   */
  addItem(item) {
    if (this.inventory.length >= this.maxInventorySize) {
      return false;
    }
    
    this.inventory.push(item);
    
    // Auto-equip if nothing is equipped
    if (this.equippedItemIndex === -1) {
      this.equippedItemIndex = this.inventory.length - 1;
    }
    
    // Update UI
    if (window.game && window.game.ui) {
      window.game.ui.updateInventory(this.inventory, this.equippedItemIndex);
    }
    
    return true;
  }
  
  /**
   * Removes an item from the player's inventory.
   * @param {number} index - The index of the item to remove
   * @returns {Object|null} The removed item, or null if the index is invalid
   */
  removeItem(index) {
    if (index < 0 || index >= this.inventory.length) {
      return null;
    }
    
    const item = this.inventory.splice(index, 1)[0];
    
    // Update equipped item index
    if (this.equippedItemIndex === index) {
      this.equippedItemIndex = this.inventory.length > 0 ? 0 : -1;
    } else if (this.equippedItemIndex > index) {
      this.equippedItemIndex--;
    }
    
    // Update UI
    if (window.game && window.game.ui) {
      window.game.ui.updateInventory(this.inventory, this.equippedItemIndex);
    }
    
    return item;
  }
  
  /**
   * Selects an inventory slot to equip.
   * @param {number} index - The index of the slot to select
   */
  selectInventorySlot(index) {
    if (index >= 0 && index < this.inventory.length) {
      this.equippedItemIndex = index;
      
      // Update UI
      if (window.game && window.game.ui) {
        window.game.ui.updateInventory(this.inventory, this.equippedItemIndex);
      }
      
      // Show message about equipped item
      const item = this.inventory[index];
      if (window.game && window.game.ui && item) {
        window.game.ui.showMessage(`Equipped: ${item.name}`);
      }
    }
  }
  
  /**
   * Drops the currently equipped item.
   */
  dropEquippedItem() {
    if (this.equippedItemIndex !== -1) {
      const item = this.removeItem(this.equippedItemIndex);
      if (item && window.game && window.game.ui) {
        window.game.ui.showMessage(`Dropped: ${item.name}`);
      }
    }
  }
  
  /**
   * Uses the currently equipped item.
   * @returns {boolean} Whether an item was used
   */
  useEquippedItem() {
    if (this.equippedItemIndex === -1) {
      return false;
    }
    
    const item = this.inventory[this.equippedItemIndex];
    
    // Apply item effect
    switch (item.type) {
      case 'health':
        this.heal(item.value || 20);
        break;
      case 'key':
        // Keys are used automatically when interacting with doors
        return false;
      case 'weapon':
        // Weapons are used automatically when attacking
        return false;
      case 'armor':
        this.equipArmor(item);
        break;
      case 'special':
        // Handle special items
        if (item.effect === 'invisibility') {
          this.applyInvisibility(item.duration || 10);
        } else if (item.effect === 'speed') {
          this.applySpeedBoost(item.value || 2, item.duration || 10);
        }
        break;
    }
    
    // Remove consumable items after use
    if (item.consumable) {
      this.removeItem(this.equippedItemIndex);
    }
    
    return true;
  }
  
  /**
   * Applies damage to the player.
   * @param {number} amount - The amount of damage to apply
   * @param {string} source - The source of the damage
   */
  takeDamage(amount, source) {
    // Check if player is invulnerable
    if (this.isInvulnerable) {
      return;
    }
    
    // Apply armor reduction if any
    const damageReduction = this.armor / 100;
    const actualDamage = Math.max(1, Math.floor(amount * (1 - damageReduction)));
    
    // Apply damage
    this.health -= actualDamage;
    
    // Make player briefly invulnerable
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 30; // 0.5 seconds at 60fps
    
    // Show damage message
    if (window.game && window.game.ui) {
      window.game.ui.showMessage(`Took ${actualDamage} damage from ${source}!`, 'damage');
    }
    
    // Check if player is dead
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
    
    // Update UI
    if (window.game && window.game.ui) {
      window.game.ui.updateHealthBar(this.health, this.maxHealth);
    }
  }
  
  /**
   * Heals the player.
   * @param {number} amount - The amount to heal
   */
  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    
    // Show heal message
    if (window.game && window.game.ui) {
      window.game.ui.showMessage(`Healed for ${amount} health!`, 'heal');
    }
    
    // Update UI
    if (window.game && window.game.ui) {
      window.game.ui.updateHealthBar(this.health, this.maxHealth);
    }
  }
  
  /**
   * Equips armor to the player.
   * @param {Object} armorItem - The armor item to equip
   */
  equipArmor(armorItem) {
    this.armor = armorItem.armorValue || 20;
    
    // Show armor message
    if (window.game && window.game.ui) {
      window.game.ui.showMessage(`Equipped armor: ${armorItem.name}`, 'info');
    }
  }
  
  /**
   * Applies invisibility effect to the player.
   * @param {number} duration - The duration in seconds
   */
  applyInvisibility(duration) {
    // Implementation would depend on how monsters detect players
    // For now, just show a message
    if (window.game && window.game.ui) {
      window.game.ui.showMessage(`Invisibility active for ${duration} seconds!`, 'buff');
    }
  }
  
  /**
   * Applies speed boost effect to the player.
   * @param {number} multiplier - The speed multiplier
   * @param {number} duration - The duration in seconds
   */
  applySpeedBoost(multiplier, duration) {
    const originalSpeed = this.speed;
    this.speed *= multiplier;
    
    // Show speed boost message
    if (window.game && window.game.ui) {
      window.game.ui.showMessage(`Speed boost active for ${duration} seconds!`, 'buff');
    }
    
    // Reset speed after duration
    setTimeout(() => {
      this.speed = originalSpeed;
      if (window.game && window.game.ui) {
        window.game.ui.showMessage('Speed boost ended', 'info');
      }
    }, duration * 1000);
  }
  
  /**
   * Handles player death.
   */
  die() {
    // Notify game of player death
    if (window.game) {
      window.game.endGame(false, 'You died!');
    }
  }
  
  /**
   * Adds a remote player to the scene.
   * @param {string} id - The ID of the remote player
   * @param {Object} player - The remote player data
   */
  addRemotePlayer(id, player) {
    if (!this.remotePlayers.has(id)) {
      const remotePlayer = new RemotePlayer(this.scene, id, player.position, player.name);
      this.remotePlayers.set(id, remotePlayer);
    }
  }
  
  /**
   * Removes a remote player from the scene.
   * @param {string} id - The ID of the remote player to remove
   */
  removeRemotePlayer(id) {
    if (this.remotePlayers.has(id)) {
      const remotePlayer = this.remotePlayers.get(id);
      remotePlayer.remove();
      this.remotePlayers.delete(id);
    }
  }
  
  /**
   * Updates a remote player's position.
   * @param {string} id - The ID of the remote player
   * @param {Object} position - The new position
   */
  updateRemotePlayerPosition(id, position) {
    if (this.remotePlayers.has(id)) {
      const remotePlayer = this.remotePlayers.get(id);
      remotePlayer.updatePosition(position);
    }
  }
  
  /**
   * Gets the number of remote players.
   * @returns {number} The number of remote players
   */
  getRemotePlayerCount() {
    return this.remotePlayers.size;
  }
}

/**
 * Represents a remote player in the game.
 */
class RemotePlayer {
  constructor(scene, id, position, name = 'Player') {
    this.scene = scene;
    this.id = id;
    
    // Create player mesh
    const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
    const material = new THREE.MeshBasicMaterial({ color: 0x00aaff });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, position.y, position.z);
    this.scene.add(this.mesh);
    
    // Create name label
    this.createNameLabel(name);
  }
  
  /**
   * Creates a floating name label above the player.
   * @param {string} name - The player's name
   */
  createNameLabel(name) {
    // Create canvas for the name label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(name, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({ map: texture });
    
    // Create sprite
    this.nameSprite = new THREE.Sprite(material);
    this.nameSprite.scale.set(2, 0.5, 1);
    this.nameSprite.position.set(0, 1.5, 0);
    
    // Add sprite to mesh
    this.mesh.add(this.nameSprite);
  }
  
  /**
   * Updates the player's position.
   * @param {Object} position - The new position
   */
  updatePosition(position) {
    this.mesh.position.set(position.x, position.y, position.z);
  }
  
  /**
   * Removes the player from the scene.
   */
  remove() {
    this.scene.remove(this.mesh);
  }
} 