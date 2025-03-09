/**
 * Manages monster spawning, AI behavior, and interactions.
 */
class MonsterManager {
  /**
   * Creates a new monster manager.
   */
  constructor() {
    // Monster settings
    this.monstersPerPlayer = 2;
    this.spawnInterval = 60; // Seconds between monster spawns
    this.nextSpawnTime = this.spawnInterval;
    
    // Monster state
    this.monsters = [];
    
    // AI settings
    this.detectionRadius = 10;
    this.attackRange = 1.5;
    this.patrolSpeed = 2;
    this.chaseSpeed = 4;
    this.attackCooldown = 2;
    this.attackDamage = 10;
  }
  
  /**
   * Updates all monsters.
   * @param {Array} players - Array of player objects
   * @param {number} deltaTime - Time since last update in milliseconds
   */
  updateMonsters(players, deltaTime) {
    // Update spawn timer
    this.nextSpawnTime -= deltaTime / 1000; // Convert to seconds
    
    // Spawn monsters if needed
    if (this.nextSpawnTime <= 0 && players.length > 0) {
      this.spawnMonsters(players);
      this.nextSpawnTime = this.spawnInterval;
    }
    
    // Update each monster
    this.monsters.forEach(monster => {
      this.updateMonsterAI(monster, players, deltaTime / 1000);
    });
  }
  
  /**
   * Spawns monsters based on the number of players.
   * @param {Array} players - Array of player objects
   */
  spawnMonsters(players) {
    const monstersToSpawn = players.length * this.monstersPerPlayer - this.monsters.length;
    
    for (let i = 0; i < monstersToSpawn; i++) {
      // Create a new monster
      const monster = {
        id: `monster_${Date.now()}_${i}`,
        position: this.getRandomSpawnPosition(players),
        state: 'idle', // idle, patrol, chase, attack
        target: null,
        patrolDestination: null,
        speed: this.patrolSpeed,
        attackTimer: 0,
        stateTimer: Math.random() * 3 + 1 // 1-4 seconds
      };
      
      this.monsters.push(monster);
    }
  }
  
  /**
   * Gets a random spawn position for a monster.
   * @param {Array} players - Array of player objects
   * @returns {Object} A position object with x, y, z coordinates
   */
  getRandomSpawnPosition(players) {
    // Spawn monsters away from players
    let position;
    let validPosition = false;
    
    // Try up to 10 times to find a valid position
    for (let attempt = 0; attempt < 10; attempt++) {
      // Random position in a large area
      position = {
        x: (Math.random() - 0.5) * 100,
        y: 0, // Ground level
        z: (Math.random() - 0.5) * 100
      };
      
      // Check if position is far enough from all players
      validPosition = true;
      for (const player of players) {
        const distance = Math.sqrt(
          Math.pow(position.x - player.position.x, 2) +
          Math.pow(position.z - player.position.z, 2)
        );
        
        if (distance < 20) { // Minimum 20 units away from any player
          validPosition = false;
          break;
        }
      }
      
      if (validPosition) break;
    }
    
    return position;
  }
  
  /**
   * Updates a monster's AI behavior.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   * @param {number} deltaTime - Time since last update in seconds
   */
  updateMonsterAI(monster, players, deltaTime) {
    // Update timers
    monster.stateTimer -= deltaTime;
    if (monster.attackTimer > 0) {
      monster.attackTimer -= deltaTime;
    }
    
    // State machine
    switch (monster.state) {
      case 'idle':
        this.updateIdleState(monster, players);
        break;
      case 'patrol':
        this.updatePatrolState(monster, players);
        break;
      case 'chase':
        this.updateChaseState(monster, players);
        break;
      case 'attack':
        this.updateAttackState(monster, players);
        break;
    }
  }
  
  /**
   * Updates a monster in the idle state.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   */
  updateIdleState(monster, players) {
    // Look for targets
    const target = this.findNearestTarget(monster, players);
    if (target) {
      // Found a target, switch to chase state
      monster.target = target.id;
      this.changeState(monster, 'chase');
      return;
    }
    
    // Transition to patrol state after timer expires
    if (monster.stateTimer <= 0) {
      this.changeState(monster, 'patrol');
    }
  }
  
  /**
   * Updates a monster in the patrol state.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   */
  updatePatrolState(monster, players) {
    // Check if we need a patrol destination
    if (!monster.patrolDestination) {
      this.findPatrolDestination(monster);
    }
    
    // Move towards patrol destination
    if (monster.patrolDestination) {
      const dx = monster.patrolDestination.x - monster.position.x;
      const dz = monster.patrolDestination.z - monster.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > 0.5) {
        // Move towards destination
        const speed = this.patrolSpeed;
        monster.position.x += (dx / distance) * speed * 0.1;
        monster.position.z += (dz / distance) * speed * 0.1;
      } else {
        // Reached destination, wait then find a new one
        monster.patrolDestination = null;
        monster.stateTimer = Math.random() * 2 + 1; // 1-3 seconds
      }
    }
    
    // Look for targets
    const target = this.findNearestTarget(monster, players);
    if (target) {
      // Found a target, switch to chase state
      monster.target = target.id;
      this.changeState(monster, 'chase');
    }
  }
  
  /**
   * Updates a monster in the chase state.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   */
  updateChaseState(monster, players) {
    // Find target player
    const target = players.find(p => p.id === monster.target);
    
    // If we don't have a target, go back to idle
    if (!target) {
      this.changeState(monster, 'idle');
      return;
    }
    
    // Move towards target
    const dx = target.position.x - monster.position.x;
    const dz = target.position.z - monster.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check if we're close enough to attack
    if (distance <= this.attackRange) {
      this.changeState(monster, 'attack');
      return;
    }
    
    // If target is too far away, go back to patrol
    if (distance > this.detectionRadius * 1.5) {
      this.changeState(monster, 'patrol');
      return;
    }
    
    // Move towards target
    const speed = this.chaseSpeed;
    monster.position.x += (dx / distance) * speed * 0.1;
    monster.position.z += (dz / distance) * speed * 0.1;
  }
  
  /**
   * Updates a monster in the attack state.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   */
  updateAttackState(monster, players) {
    // Find target player
    const target = players.find(p => p.id === monster.target);
    
    // If we don't have a target, go back to idle
    if (!target) {
      this.changeState(monster, 'idle');
      return;
    }
    
    // Calculate distance to target
    const dx = target.position.x - monster.position.x;
    const dz = target.position.z - monster.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Check if target is still in range
    if (distance > this.attackRange) {
      this.changeState(monster, 'chase');
      return;
    }
    
    // Attack if cooldown has expired
    if (monster.attackTimer <= 0) {
      // Perform attack
      this.attackPlayer(monster, target);
      monster.attackTimer = this.attackCooldown;
    }
  }
  
  /**
   * Changes a monster's state.
   * @param {Object} monster - The monster object
   * @param {string} newState - The new state
   */
  changeState(monster, newState) {
    monster.state = newState;
    
    // Set up state-specific properties
    switch (newState) {
      case 'idle':
        monster.speed = 0;
        monster.stateTimer = Math.random() * 3 + 1; // 1-4 seconds
        break;
      case 'patrol':
        monster.speed = this.patrolSpeed;
        monster.patrolDestination = null; // Will be set in updatePatrolState
        break;
      case 'chase':
        monster.speed = this.chaseSpeed;
        break;
      case 'attack':
        monster.speed = 0;
        break;
    }
  }
  
  /**
   * Finds a patrol destination for a monster.
   * @param {Object} monster - The monster object
   */
  findPatrolDestination(monster) {
    // Random point within patrol radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 15; // Patrol radius
    
    monster.patrolDestination = {
      x: monster.position.x + Math.cos(angle) * radius,
      y: 0,
      z: monster.position.z + Math.sin(angle) * radius
    };
  }
  
  /**
   * Finds the nearest player to a monster.
   * @param {Object} monster - The monster object
   * @param {Array} players - Array of player objects
   * @returns {Object|null} The nearest player or null if none in range
   */
  findNearestTarget(monster, players) {
    let nearestPlayer = null;
    let nearestDistance = this.detectionRadius;
    
    for (const player of players) {
      // Skip escaped or trapped players
      if (player.hasEscaped || player.isTrapped) continue;
      
      const dx = player.position.x - monster.position.x;
      const dz = player.position.z - monster.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < nearestDistance) {
        nearestPlayer = player;
        nearestDistance = distance;
      }
    }
    
    return nearestPlayer;
  }
  
  /**
   * Attacks a player.
   * @param {Object} monster - The monster object
   * @param {Object} player - The player object
   */
  attackPlayer(monster, player) {
    // This would call a method on the game manager to apply damage
    // For now, just log the attack
    console.log(`Monster ${monster.id} attacks player ${player.id}`);
    
    // In a real implementation, you would emit an event or call a method
    // on the game manager to apply damage to the player
  }
  
  /**
   * Gets all monsters.
   * @returns {Array} Array of monster objects
   */
  getMonsters() {
    return this.monsters;
  }
  
  /**
   * Removes all monsters.
   */
  clearMonsters() {
    this.monsters = [];
  }
}

module.exports = MonsterManager; 