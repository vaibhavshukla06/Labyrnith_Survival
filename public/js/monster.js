/**
 * Represents a monster in the game.
 */
class Monster {
  constructor(scene, monsterData) {
    this.scene = scene;
    this.id = monsterData.id;
    this.state = monsterData.state || 'idle';
    this.type = monsterData.type || 'basic';
    this.damage = monsterData.damage || Config.monsterDamage;
    this.attackRange = monsterData.attackRange || Config.monsterAttackRange;
    this.detectionRadius = monsterData.detectionRadius || Config.monsterDetectionRadius;
    this.attackCooldown = 0;
    this.attackCooldownMax = 60; // 1 second at 60fps
    
    // Position for the monster
    this.position = {
      x: monsterData.position.x,
      y: monsterData.position.y || 0,
      z: monsterData.position.z
    };
    
    // Create monster model
    this.createMonsterModel();
    
    // Animation properties
    this.animationTime = 0;
    
    // Path finding
    this.path = [];
    this.pathIndex = 0;
    this.lastPosition = { ...monsterData.position };
  }
  
  /**
   * Creates the monster model.
   */
  createMonsterModel() {
    // Check if the model loader is available
    if (window.monsterModelLoader && window.monsterModelLoader.isModelLoaded()) {
      // Use the 3D model
      this.useCustomModel();
    } else {
      // Use a simple placeholder model
      this.usePlaceholderModel();
      
      // Try to load the custom model when it becomes available
      this.tryLoadCustomModelLater();
    }
  }
  
  /**
   * Uses the custom 3D model for the monster.
   */
  useCustomModel() {
    // Get the model from the loader
    const model = window.monsterModelLoader.getMonsterModel(this.type);
    
    if (model) {
      // If we already had a placeholder, remove it
      if (this.mesh) {
        this.scene.remove(this.mesh);
        
        // Remove eyes if they exist
        if (this.leftEye) this.mesh.remove(this.leftEye);
        if (this.rightEye) this.mesh.remove(this.rightEye);
      }
      
      // Set the model as the mesh
      this.mesh = model;
      
      // Scale the model appropriately
      this.mesh.scale.set(0.2, 0.2, 0.2);
      
      // Position the model
      this.mesh.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      );
      
      // Add to scene
      this.scene.add(this.mesh);
      
      // Update the material based on state
      this.updateState(this.state);
      
      console.log(`Monster ${this.id} using custom 3D model`);
    } else {
      // Fallback to placeholder if model loading failed
      this.usePlaceholderModel();
    }
  }
  
  /**
   * Uses a simple placeholder model for the monster.
   */
  usePlaceholderModel() {
    const geometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
    const material = new THREE.MeshLambertMaterial({ color: this.getMonsterColor() });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(
      this.position.x, 
      this.position.y + 0.75, 
      this.position.z
    );
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Add eyes (for direction indication)
    const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.leftEye.position.set(0.2, 0.3, -0.3);
    this.mesh.add(this.leftEye);
    
    this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.rightEye.position.set(-0.2, 0.3, -0.3);
    this.mesh.add(this.rightEye);
    
    console.log(`Monster ${this.id} using placeholder model`);
  }
  
  /**
   * Tries to load the custom model later when it becomes available.
   */
  tryLoadCustomModelLater() {
    // Check if the model loader exists but the model isn't loaded yet
    if (window.monsterModelLoader && !window.monsterModelLoader.isModelLoaded()) {
      // Wait for the model to load
      window.monsterModelLoader.waitForModelToLoad().then((success) => {
        if (success) {
          // Replace the placeholder with the custom model
          this.useCustomModel();
        }
      });
    } else {
      // Check again in a second
      setTimeout(() => {
        if (window.monsterModelLoader) {
          this.tryLoadCustomModelLater();
        }
      }, 1000);
    }
  }
  
  /**
   * Updates the monster's animation and behavior.
   */
  update() {
    this.animationTime += 0.05;
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
    
    // Different animations based on state
    switch (this.state) {
      case 'idle':
        // Gentle bobbing
        if (this.isUsingPlaceholderModel()) {
          this.mesh.position.y = 0.75 + Math.sin(this.animationTime) * 0.05;
        } else {
          // For custom model, do a gentle rotation
          this.mesh.rotation.y = Math.sin(this.animationTime * 0.5) * 0.1;
        }
        break;
        
      case 'patrol':
        // Gentle bobbing with slight rotation
        if (this.isUsingPlaceholderModel()) {
          this.mesh.position.y = 0.75 + Math.sin(this.animationTime) * 0.05;
          this.mesh.rotation.y = Math.sin(this.animationTime * 0.5) * 0.2;
        } else {
          // For custom model, do a more pronounced rotation
          this.mesh.rotation.y = Math.sin(this.animationTime * 0.5) * 0.3;
        }
        this.patrolBehavior();
        break;
        
      case 'chase':
        // More aggressive bobbing
        if (this.isUsingPlaceholderModel()) {
          this.mesh.position.y = 0.75 + Math.sin(this.animationTime * 2) * 0.1;
        } else {
          // For custom model, do a slight up and down movement
          this.mesh.position.y = this.position.y + Math.sin(this.animationTime * 2) * 0.1;
        }
        this.chaseBehavior();
        break;
        
      case 'attack':
        // Attack animation
        if (Math.sin(this.animationTime * 5) > 0.9) {
          if (this.isUsingPlaceholderModel()) {
            this.mesh.scale.z = 1.2;
          } else {
            // For custom model, do a forward lunge
            this.mesh.position.z += 0.1;
            setTimeout(() => {
              if (this.mesh) this.mesh.position.z -= 0.1;
            }, 100);
          }
          this.attackBehavior();
        } else {
          if (this.isUsingPlaceholderModel()) {
            this.mesh.scale.z = 1;
          }
        }
        break;
    }
    
    // Check for player proximity if not already chasing or attacking
    if (this.state !== 'chase' && this.state !== 'attack') {
      this.checkPlayerProximity();
    }
  }
  
  /**
   * Checks if the monster is using the placeholder model.
   * @returns {boolean} True if using the placeholder model
   */
  isUsingPlaceholderModel() {
    return this.leftEye !== undefined;
  }
  
  /**
   * Patrol behavior - move along a predefined path or randomly.
   */
  patrolBehavior() {
    // Simple random movement for now
    // In a real implementation, this would follow a path
    if (Math.random() < 0.01) {
      const randomAngle = Math.random() * Math.PI * 2;
      this.mesh.rotation.y = randomAngle;
    }
  }
  
  /**
   * Chase behavior - move towards the player.
   */
  chaseBehavior() {
    if (!window.game || !window.game.player) return;
    
    const player = window.game.player;
    if (player.hasEscaped) return;
    
    // Calculate direction to player
    const dx = player.position.x - this.mesh.position.x;
    const dz = player.position.z - this.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Look at player
    this.mesh.rotation.y = Math.atan2(dx, dz);
    
    // If close enough, switch to attack state
    if (distance < this.attackRange) {
      this.updateState('attack');
    } else if (distance > this.detectionRadius * 1.5) {
      // If player is too far, go back to patrol
      this.updateState('patrol');
    }
  }
  
  /**
   * Attack behavior - damage the player.
   */
  attackBehavior() {
    if (!window.game || !window.game.player || this.attackCooldown > 0) return;
    
    const player = window.game.player;
    if (player.hasEscaped) return;
    
    // Calculate distance to player
    const dx = player.position.x - this.mesh.position.x;
    const dz = player.position.z - this.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // If in attack range, damage player
    if (distance < this.attackRange) {
      // Apply damage to player
      player.takeDamage(this.damage, `${this.getMonsterTypeName()} Monster`);
      
      // Reset attack cooldown
      this.attackCooldown = this.attackCooldownMax;
      
      // Notify server
      if (window.game.network) {
        window.game.network.emit('monsterAttack', {
          monsterId: this.id,
          damage: this.damage
        });
      }
    } else {
      // If player moved out of range, switch back to chase
      this.updateState('chase');
    }
  }
  
  /**
   * Checks if the player is within detection radius.
   */
  checkPlayerProximity() {
    if (!window.game || !window.game.player) return;
    
    const player = window.game.player;
    if (player.hasEscaped) return;
    
    // Calculate distance to player
    const dx = player.position.x - this.mesh.position.x;
    const dz = player.position.z - this.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // If player is within detection radius, start chasing
    if (distance < this.detectionRadius) {
      this.updateState('chase');
    }
  }
  
  /**
   * Updates the monster's position.
   * @param {Object} position - The new position
   */
  updatePosition(position) {
    // Update our position property
    this.position = { ...position };
    
    // Smoothly move towards the new position
    this.mesh.position.x = position.x;
    if (!this.isUsingPlaceholderModel()) {
      this.mesh.position.y = position.y;
    }
    this.mesh.position.z = position.z;
    
    // Look in the direction of movement
    if (this.lastPosition) {
      const dx = position.x - this.lastPosition.x;
      const dz = position.z - this.lastPosition.z;
      
      if (dx !== 0 || dz !== 0) {
        this.mesh.rotation.y = Math.atan2(dx, dz);
      }
    }
    
    this.lastPosition = { ...position };
  }
  
  /**
   * Updates the monster's state.
   * @param {string} state - The new state
   */
  updateState(state) {
    this.state = state;
    
    // Update appearance based on state
    if (this.isUsingPlaceholderModel()) {
      // For placeholder model, just change the color
      this.mesh.material.color.setHex(this.getMonsterColor());
    } else if (window.monsterModelLoader && window.monsterModelLoader.isModelLoaded()) {
      // For custom model, we could change the material or add effects
      // For now, we'll just update the tint color
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          // Adjust the emissive color based on state
          switch (state) {
            case 'idle':
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
              break;
            case 'patrol':
              child.material.emissive = new THREE.Color(0x222222);
              child.material.emissiveIntensity = 0.1;
              break;
            case 'chase':
              child.material.emissive = new THREE.Color(0xff0000);
              child.material.emissiveIntensity = 0.3;
              break;
            case 'attack':
              child.material.emissive = new THREE.Color(0xff0000);
              child.material.emissiveIntensity = 0.5;
              break;
          }
        }
      });
    }
  }
  
  /**
   * Gets the color for the monster based on its type and state.
   * @returns {number} The color as a hex number
   */
  getMonsterColor() {
    // Base color by type
    let baseColor;
    switch (this.type) {
      case 'basic':
        baseColor = 0xff0000; // Red
        break;
      case 'fast':
        baseColor = 0xff6600; // Orange
        break;
      case 'tank':
        baseColor = 0x660000; // Dark red
        break;
      case 'boss':
        baseColor = 0x990099; // Purple
        break;
      default:
        baseColor = 0xff0000; // Default red
    }
    
    // Modify based on state
    switch (this.state) {
      case 'idle':
        return baseColor;
      case 'patrol':
        return baseColor;
      case 'chase':
        // Brighter version of base color
        return this.brightenColor(baseColor, 0.3);
      case 'attack':
        // Even brighter version of base color
        return this.brightenColor(baseColor, 0.6);
      default:
        return baseColor;
    }
  }
  
  /**
   * Brightens a color by the specified amount.
   * @param {number} color - The color to brighten
   * @param {number} amount - The amount to brighten (0-1)
   * @returns {number} The brightened color
   */
  brightenColor(color, amount) {
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    
    const newR = Math.min(255, r + (255 - r) * amount);
    const newG = Math.min(255, g + (255 - g) * amount);
    const newB = Math.min(255, b + (255 - b) * amount);
    
    return (newR << 16) | (newG << 8) | newB;
  }
  
  /**
   * Gets the name of the monster type.
   * @returns {string} The monster type name
   */
  getMonsterTypeName() {
    switch (this.type) {
      case 'basic':
        return 'Basic';
      case 'fast':
        return 'Fast';
      case 'tank':
        return 'Tank';
      case 'boss':
        return 'Boss';
      default:
        return 'Unknown';
    }
  }
  
  /**
   * Removes the monster from the scene.
   */
  remove() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
    
    // Clean up any other resources
    this.leftEye = null;
    this.rightEye = null;
  }
} 