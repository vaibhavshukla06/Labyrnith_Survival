# Labyrinth Survival - Web Version

A multiplayer survival escape game with a Minecraft-style aesthetic. Players must explore a procedurally generated, shifting voxel-based maze, find clues, collect items, and survive against AI-controlled monsters while working together or potentially betraying each other.

## Overview

This is a web-based version of the Labyrinth Survival game, using Three.js for 3D rendering and Socket.io for real-time multiplayer functionality.

## Features

- **Procedural Maze Generation**: Dynamic, shifting mazes that change over time using a hybrid Prim's Algorithm and Wave Function Collapse approach
- **Enhanced Multiplayer**: Create and join game rooms with different settings
- **Player Systems**: Health, stamina, inventory, and damage mechanics
- **AI Monsters**: Different monster types with unique behaviors that hunt players
- **Multiple Game Modes**: Co-op, Betrayal, and PvP modes with different win conditions
- **Voxel-Style Graphics**: Minecraft-inspired aesthetic with custom models
- **Interactive UI**: Health bars, stamina indicators, inventory management, and game messages

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Modern web browser with WebGL support

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd labyrinth-survival
   ```

2. Install server dependencies:
   ```
   cd server
   npm install
   ```

## Running the Game

1. Start the server:
   ```
   cd server
   npm start
   ```

2. Open a web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Game Controls

- **W, A, S, D**: Move
- **Mouse**: Look around
- **E**: Interact with objects/exit
- **Space**: Jump
- **Shift**: Sprint (uses stamina)
- **Tab or I**: Open inventory
- **1-8**: Quick select inventory items

## Multiplayer Features

- **Create Room**: Create a custom game room with specific settings
- **Join Room**: Join an existing room using a room code
- **Public Rooms**: Browse and join public game rooms
- **Room Settings**: Customize game mode, player limit, maze size, and time limit

## Game Modes

- **Co-op Mode**: All players work together to escape the maze
- **Betrayal Mode**: Only one player can escape, others must prevent it
- **PvP Mode**: Players compete against each other to be the first to escape

## Player Systems

- **Health**: Players have health that decreases when damaged by monsters or other players
- **Stamina**: Used for sprinting, regenerates over time
- **Inventory**: Collect and use items throughout the maze
- **Armor**: Reduces damage taken from attacks
- **Invulnerability**: Brief period of invulnerability after taking damage

## Item Types

- **Health Pack**: Restores player health
- **Key**: Required to unlock the exit in some game modes
- **Weapon**: Increases damage dealt to monsters and other players
- **Armor**: Reduces damage taken
- **Special**: Various special effects (speed boost, monster repellent, etc.)

## Development

### Project Structure

- **server/**: Server-side code
  - **index.js**: Main server file
  - **game/**: Game logic modules
    - **RoomManager.js**: Manages game rooms and player connections
    - **MazeGenerator.js**: Procedural maze generation
    - **GameManager.js**: Game state and flow management
    - **MonsterManager.js**: Monster AI and behavior

- **public/**: Client-side code
  - **index.html**: Main HTML file
  - **css/**: Stylesheets
  - **js/**: JavaScript files
    - **game.js**: Main game controller
    - **network.js**: Network communication
    - **maze-renderer.js**: Three.js maze rendering
    - **player.js**: Player controls and state
    - **monster.js**: Monster rendering and animation
    - **ui.js**: User interface management
    - **config.js**: Game configuration settings

### Adding New Features

1. **New Items**: Add new item types in the GameManager.js file
2. **New Monsters**: Create new monster types in MonsterManager.js
3. **New Game Modes**: Implement new game modes in GameManager.js
4. **Custom Rooms**: Extend RoomManager.js for additional room features

## Next Steps

- **Enhanced Maze Generation**: Further refinement of the hybrid Prim's Algorithm and Wave Function Collapse
- **Additional Monster Types**: More diverse enemies with unique behaviors
- **Advanced Item System**: Crafting and combining items
- **Visual Enhancements**: Improved lighting, particle effects, and animations
- **Sound Effects**: Ambient sounds, footsteps, and interactive audio

## License

[MIT License](LICENSE)

## Credits

- Original concept by [Your Name]
- Three.js for 3D rendering
- Socket.io for real-time networking 