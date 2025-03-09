/**
 * Game configuration settings.
 */
const Config = {
  // Game settings
  gameTimeLimit: 600, // 10 minutes in seconds
  
  // Player settings
  playerSpeed: 2, // Increased for better movement
  playerJumpForce: 3, // Reduced from 10 for smaller jumps
  playerHealth: 100,
  playerStamina: 100,
  staminaRegenRate: 0.5,
  sprintMultiplier: 1.5,
  maxInventorySize: 8,
  mouseSensitivity: 0.002, // Adjusted for better camera control
  playerCollisionRadius: 0.3, // Increased for better wall collision detection
  
  // Monster settings
  monsterSpeed: 3,
  monsterDetectionRadius: 10,
  monsterAttackRange: 1.5,
  monsterDamage: 10,
  
  // Maze settings
  mazeWidth: 20, // Reduced from 40 for testing
  mazeHeight: 20, // Reduced from 40 for testing
  cellSize: 2,
  wallHeight: 3,
  shiftInterval: 60, // Time in seconds between maze shifts
  
  // Network settings
  serverUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin,
  offlineMode: true, // Set to true to play without a server connection
  
  // Graphics settings
  fogColor: 0xffefd5, // Papaya whip - sandy fog color
  fogDensity: 0.005, // Reduced fog density for better visibility
  wallColor: 0xd2b48c, // Tan color for walls (fallback)
  floorColor: 0xd2b48c, // Sandy color for floor
  exitColor: 0xffcc00, // Golden yellow for exit
  skyColor: 0xffefd5, // Papaya whip - sandy sky color
  
  // Item settings
  itemTypes: {
    health: { name: 'Health Pack', color: 0xff0000, consumable: true },
    key: { name: 'Key', color: 0xffff00, consumable: false },
    weapon: { name: 'Weapon', color: 0x00ff00, consumable: false },
    armor: { name: 'Armor', color: 0x0000ff, consumable: false },
    special: { name: 'Special Item', color: 0xff00ff, consumable: true }
  }
}; 