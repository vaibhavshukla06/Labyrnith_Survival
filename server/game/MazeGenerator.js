/**
 * Handles the procedural generation of the maze using a hybrid approach
 * combining Prim's Algorithm and Wave Function Collapse.
 */
class MazeGenerator {
  /**
   * Creates a new maze generator.
   * @param {number} width - Width of the maze
   * @param {number} height - Height of the maze
   * @param {number} cellSize - Size of each cell in the maze
   */
  constructor(width, height, cellSize) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.wallHeight = 3;
    this.shiftInterval = 60; // Time in seconds between maze shifts
    this.shiftChance = 0.2; // Chance of a wall shifting during a shift event
    this.shiftDuration = 2; // How long it takes for a wall to move
    
    // Maze representation: true = wall, false = path
    this.mazeGrid = Array(width).fill().map(() => Array(height).fill(true));
    this.wallObjects = new Map(); // For tracking wall positions
    this.exitPosition = { x: 0, y: 0 };
    this.nextShiftTime = 0;
    
    // For Prim's algorithm
    this.frontiers = [];
    
    // Directions: Up, Right, Down, Left
    this.directions = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 }
    ];
    
    // Pattern generation
    this.usePatternedGeneration = true; // Enable patterned generation
    this.patternType = Math.floor(Math.random() * 3); // 0: Geometric, 1: Concentric, 2: Symmetric
  }
  
  /**
   * Generates a new maze.
   * @returns {Object} The generated maze data
   */
  generateMaze() {
    this.initializeMaze();
    
    if (this.usePatternedGeneration) {
      // Choose a pattern generation method based on patternType
      switch (this.patternType) {
        case 0:
          this.generateGeometricPattern();
          break;
        case 1:
          this.generateConcentricPattern();
          break;
        case 2:
          this.generateSymmetricPattern();
          break;
        default:
          this.runPrimsAlgorithm();
      }
    } else {
    this.runPrimsAlgorithm();
    }
    
    this.createExit();
    this.applyWaveFunctionCollapse();
    this.ensureMazeIsSolvable();
    
    return this.getMaze();
  }
  
  /**
   * Initializes the maze grid.
   */
  initializeMaze() {
    // Initialize the grid with all walls
    this.mazeGrid = Array(this.width).fill().map(() => Array(this.height).fill(true));
    this.wallObjects = new Map();
    this.nextShiftTime = this.shiftInterval;
  }
  
  /**
   * Runs Prim's algorithm to generate the basic maze structure.
   */
  runPrimsAlgorithm() {
    // Start with a random cell
    const startCell = {
      x: Math.floor(Math.random() * this.width),
      y: Math.floor(Math.random() * this.height)
    };
    this.mazeGrid[startCell.x][startCell.y] = false; // Mark as path
    
    // Add all neighboring cells to the frontier
    this.addFrontiers(startCell);
    
    // Continue until there are no more frontier cells
    while (this.frontiers.length > 0) {
      // Pick a random frontier cell
      const randomIndex = Math.floor(Math.random() * this.frontiers.length);
      const currentCell = this.frontiers[randomIndex];
      this.frontiers.splice(randomIndex, 1);
      
      // Find all neighboring cells that are already part of the maze
      const neighbors = this.getNeighborsInMaze(currentCell);
      
      if (neighbors.length > 0) {
        // Connect the frontier cell to a random neighbor
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.mazeGrid[currentCell.x][currentCell.y] = false; // Mark frontier as path
        
        // Connect the cells by removing the wall between them
        const wallX = Math.floor((currentCell.x + neighbor.x) / 2);
        const wallY = Math.floor((currentCell.y + neighbor.y) / 2);
        this.mazeGrid[wallX][wallY] = false;
        
        // Add new frontier cells
        this.addFrontiers(currentCell);
      }
    }
  }
  
  /**
   * Adds frontier cells to the list.
   * @param {Object} cell - The cell to add frontiers from
   */
  addFrontiers(cell) {
    this.directions.forEach(dir => {
      const frontier = { 
        x: cell.x + dir.x * 2, 
        y: cell.y + dir.y * 2 
      };
      
      // Check if the frontier is within bounds and not already a path
      if (this.isInBounds(frontier) && this.mazeGrid[frontier.x][frontier.y]) {
        // Check if this frontier is not already in the list
        if (!this.frontiers.some(f => f.x === frontier.x && f.y === frontier.y)) {
          this.frontiers.push(frontier);
        }
      }
    });
  }
  
  /**
   * Gets neighbors that are already part of the maze.
   * @param {Object} cell - The cell to get neighbors for
   * @returns {Array} List of neighboring cells that are paths
   */
  getNeighborsInMaze(cell) {
    const neighbors = [];
    
    this.directions.forEach(dir => {
      const neighbor = { 
        x: cell.x + dir.x * 2, 
        y: cell.y + dir.y * 2 
      };
      
      // Check if the neighbor is within bounds and already a path
      if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
        neighbors.push(neighbor);
      }
    });
    
    return neighbors;
  }
  
  /**
   * Checks if a cell is within the maze bounds.
   * @param {Object} cell - The cell to check
   * @returns {boolean} True if the cell is in bounds
   */
  isInBounds(cell) {
    return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
  }
  
  /**
   * Creates an exit in the maze.
   */
  createExit() {
    // Place exit at a random edge of the maze
    const side = Math.floor(Math.random() * 4);
    
    switch (side) {
      case 0: // Top
        this.exitPosition = { 
          x: Math.floor(Math.random() * this.width), 
          y: this.height - 1 
        };
        break;
      case 1: // Right
        this.exitPosition = { 
          x: this.width - 1, 
          y: Math.floor(Math.random() * this.height) 
        };
        break;
      case 2: // Bottom
        this.exitPosition = { 
          x: Math.floor(Math.random() * this.width), 
          y: 0 
        };
        break;
      case 3: // Left
        this.exitPosition = { 
          x: 0, 
          y: Math.floor(Math.random() * this.height) 
        };
        break;
    }
    
    // Ensure the exit and path to it are clear
    this.mazeGrid[this.exitPosition.x][this.exitPosition.y] = false;
    
    // Create a path to the exit
    let pathCell = { ...this.exitPosition };
    if (this.exitPosition.x === 0) pathCell.x += 1;
    else if (this.exitPosition.x === this.width - 1) pathCell.x -= 1;
    else if (this.exitPosition.y === 0) pathCell.y += 1;
    else if (this.exitPosition.y === this.height - 1) pathCell.y -= 1;
    
    this.mazeGrid[pathCell.x][pathCell.y] = false;
  }
  
  /**
   * Applies Wave Function Collapse to add organic variations.
   */
  applyWaveFunctionCollapse() {
    // Enhanced Wave Function Collapse to create more interesting patterns
    // This implementation adds architectural features like chambers, pillars, and corridors
    
    // First pass: Create some open chambers
    this.createChambers();
    
    // Second pass: Add pillars and architectural features
    this.addArchitecturalFeatures();
    
    // Third pass: Create some wider corridors
    this.createWiderCorridors();
    
    // Final pass: Add some random variations
    this.addRandomVariations();
  }
  
  /**
   * Creates open chambers in the maze.
   */
  createChambers() {
    // Create 2-4 chambers of varying sizes
    const chamberCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < chamberCount; i++) {
      // Random chamber position (away from edges)
      const centerX = 2 + Math.floor(Math.random() * (this.width - 4));
      const centerY = 2 + Math.floor(Math.random() * (this.height - 4));
      
      // Random chamber size
      const chamberWidth = 3 + Math.floor(Math.random() * 3);
      const chamberHeight = 3 + Math.floor(Math.random() * 3);
      
      // Don't place chambers too close to the exit
      const distance = Math.sqrt(
        Math.pow(centerX - this.exitPosition.x, 2) + 
        Math.pow(centerY - this.exitPosition.y, 2)
      );
      if (distance < 5) continue;
      
      // Create the chamber by clearing walls
      for (let x = centerX - Math.floor(chamberWidth/2); x <= centerX + Math.floor(chamberWidth/2); x++) {
        for (let y = centerY - Math.floor(chamberHeight/2); y <= centerY + Math.floor(chamberHeight/2); y++) {
          if (this.isInBounds({x, y})) {
            this.mazeGrid[x][y] = false; // Clear to make a path
          }
        }
      }
      
      // Add some pillars inside larger chambers
      if (chamberWidth >= 4 && chamberHeight >= 4) {
        const pillarCount = 1 + Math.floor(Math.random() * 2);
        for (let p = 0; p < pillarCount; p++) {
          const pillarX = centerX - 1 + Math.floor(Math.random() * 3);
          const pillarY = centerY - 1 + Math.floor(Math.random() * 3);
          
          if (this.isInBounds({x: pillarX, y: pillarY})) {
            this.mazeGrid[pillarX][pillarY] = true; // Add a pillar
          }
        }
      }
    }
  }
  
  /**
   * Adds architectural features like pillars, arches, and decorative elements.
   */
  addArchitecturalFeatures() {
    // Add some standalone pillars in open areas
    const pillarCount = Math.floor(this.width * this.height / 40);
    
    for (let i = 0; i < pillarCount; i++) {
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - 2));
      
      // Only place pillars in open areas with multiple paths around them
      let adjacentPaths = 0;
      this.directions.forEach(dir => {
        const neighbor = { x: x + dir.x, y: y + dir.y };
        if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
          adjacentPaths++;
        }
      });
      
      // Place a pillar if there are at least 3 adjacent paths
      if (!this.mazeGrid[x][y] && adjacentPaths >= 3) {
        this.mazeGrid[x][y] = true;
      }
    }
    
    // Add some archways (two pillars with a path between)
    const archCount = Math.floor(this.width * this.height / 60);
    
    for (let i = 0; i < archCount; i++) {
      const x = 2 + Math.floor(Math.random() * (this.width - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - 4));
      
      // Choose a random direction for the arch
      const dirIndex = Math.floor(Math.random() * 2); // 0 = horizontal, 1 = vertical
      
      if (dirIndex === 0) { // Horizontal arch
        if (!this.mazeGrid[x][y] && !this.mazeGrid[x+2][y]) {
          this.mazeGrid[x][y] = true; // First pillar
          this.mazeGrid[x+2][y] = true; // Second pillar
          this.mazeGrid[x+1][y] = false; // Path between
        }
      } else { // Vertical arch
        if (!this.mazeGrid[x][y] && !this.mazeGrid[x][y+2]) {
          this.mazeGrid[x][y] = true; // First pillar
          this.mazeGrid[x][y+2] = true; // Second pillar
          this.mazeGrid[x][y+1] = false; // Path between
        }
      }
    }
  }
  
  /**
   * Creates wider corridors in some areas of the maze.
   */
  createWiderCorridors() {
    // Find some paths to widen into corridors
    const corridorCount = Math.floor(this.width * this.height / 30);
    
    for (let i = 0; i < corridorCount; i++) {
      // Pick a random starting point
      const startX = 1 + Math.floor(Math.random() * (this.width - 2));
      const startY = 1 + Math.floor(Math.random() * (this.height - 2));
      
      if (!this.mazeGrid[startX][startY]) {
        // Choose a random direction
        const dir = this.directions[Math.floor(Math.random() * this.directions.length)];
        
        // Create a corridor of random length
        const length = 2 + Math.floor(Math.random() * 4);
        
        for (let j = 0; j < length; j++) {
          const x = startX + dir.x * j;
          const y = startY + dir.y * j;
          
          if (this.isInBounds({x, y})) {
            this.mazeGrid[x][y] = false; // Clear to make a path
            
            // Widen the corridor perpendicular to its direction
            if (dir.x === 0) { // Vertical corridor, widen horizontally
              if (this.isInBounds({x: x+1, y}) && Math.random() < 0.7) {
                this.mazeGrid[x+1][y] = false;
              }
              if (this.isInBounds({x: x-1, y}) && Math.random() < 0.7) {
                this.mazeGrid[x-1][y] = false;
              }
            } else { // Horizontal corridor, widen vertically
              if (this.isInBounds({x, y: y+1}) && Math.random() < 0.7) {
                this.mazeGrid[x][y+1] = false;
              }
              if (this.isInBounds({x, y: y-1}) && Math.random() < 0.7) {
                this.mazeGrid[x][y-1] = false;
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Adds random variations to the maze.
   */
  addRandomVariations() {
    for (let i = 0; i < Math.floor(this.width * this.height / 10); i++) {
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - 2)) + 1;
      
      // Don't modify the exit or cells adjacent to it
      const distance = Math.sqrt(
        Math.pow(x - this.exitPosition.x, 2) + 
        Math.pow(y - this.exitPosition.y, 2)
      );
      if (distance < 3) continue;
      
      // Count adjacent paths
      let adjacentPaths = 0;
      this.directions.forEach(dir => {
        const neighbor = { x: x + dir.x, y: y + dir.y };
        if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
          adjacentPaths++;
        }
      });
      
      // Apply rules based on adjacent paths
      if (this.mazeGrid[x][y] && adjacentPaths >= 3) {
        // If it's a wall with 3+ adjacent paths, make it a path
        this.mazeGrid[x][y] = false;
      } else if (!this.mazeGrid[x][y] && adjacentPaths <= 1) {
        // If it's a path with 0-1 adjacent paths, make it a wall
        // But ensure we don't create dead ends
        let createDeadEnd = true;
        
        this.directions.forEach(dir => {
          const neighbor = { x: x + dir.x, y: y + dir.y };
          if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
            // Check if this neighbor has other paths
            let neighborPaths = 0;
            this.directions.forEach(nDir => {
              const nNeighbor = { 
                x: neighbor.x + nDir.x, 
                y: neighbor.y + nDir.y 
              };
              if (this.isInBounds(nNeighbor) && 
                  !this.mazeGrid[nNeighbor.x][nNeighbor.y] && 
                  !(nNeighbor.x === x && nNeighbor.y === y)) {
                neighborPaths++;
              }
            });
            
            if (neighborPaths <= 1) {
              createDeadEnd = false; // Would create a dead end, so don't do it
            }
          }
        });
        
        if (createDeadEnd && Math.random() < 0.3) {
          this.mazeGrid[x][y] = true;
        }
      }
    }
  }
  
  /**
   * Ensures the maze is solvable by checking for a path from start to exit.
   */
  ensureMazeIsSolvable() {
    // Find a valid starting point (any path cell that's not the exit)
    let startCell = null;
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (!this.mazeGrid[x][y] && 
            (x !== this.exitPosition.x || y !== this.exitPosition.y)) {
          startCell = { x, y };
          break;
        }
      }
      if (startCell) break;
    }
    
    if (!startCell) return; // No valid start found
    
    // Use breadth-first search to find a path to the exit
    const visited = Array(this.width).fill().map(() => Array(this.height).fill(false));
    const queue = [startCell];
    visited[startCell.x][startCell.y] = true;
    
    let foundPath = false;
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      // Check if we've reached the exit
      if (current.x === this.exitPosition.x && current.y === this.exitPosition.y) {
        foundPath = true;
        break;
      }
      
      // Check all four directions
      this.directions.forEach(dir => {
        const next = { x: current.x + dir.x, y: current.y + dir.y };
        
        if (this.isInBounds(next) && !this.mazeGrid[next.x][next.y] && !visited[next.x][next.y]) {
          visited[next.x][next.y] = true;
          queue.push(next);
        }
      });
    }
    
    // If no path found, create one
    if (!foundPath) {
      this.createPathToExit(startCell);
    }
  }
  
  /**
   * Creates a direct path from start to exit.
   * @param {Object} startCell - The starting cell
   */
  createPathToExit(startCell) {
    // Simple implementation: create a straight line path
    const dx = this.exitPosition.x - startCell.x;
    const dy = this.exitPosition.y - startCell.y;
    
    // Move horizontally first
    let x = startCell.x;
    const stepX = dx > 0 ? 1 : -1;
    while (x !== this.exitPosition.x) {
      x += stepX;
      this.mazeGrid[x][startCell.y] = false;
    }
    
    // Then move vertically
    let y = startCell.y;
    const stepY = dy > 0 ? 1 : -1;
    while (y !== this.exitPosition.y) {
      y += stepY;
      this.mazeGrid[this.exitPosition.x][y] = false;
    }
  }
  
  /**
   * Updates the maze, potentially shifting walls.
   * @param {number} deltaTime - Time since last update in milliseconds
   * @returns {boolean} True if the maze was updated
   */
  updateMaze(deltaTime) {
    this.nextShiftTime -= deltaTime / 1000; // Convert to seconds
    
    if (this.nextShiftTime <= 0) {
      this.shiftMazeWalls();
      this.nextShiftTime = this.shiftInterval;
      return true;
    }
    
    return false;
  }
  
  /**
   * Shifts some walls in the maze.
   */
  shiftMazeWalls() {
    // Don't modify the exit or cells adjacent to it
    const wallsToShift = [];
    
    // Find walls that can be shifted
    for (let x = 1; x < this.width - 1; x++) {
      for (let y = 1; y < this.height - 1; y++) {
        // Skip cells near the exit
        const distance = Math.sqrt(
          Math.pow(x - this.exitPosition.x, 2) + 
          Math.pow(y - this.exitPosition.y, 2)
        );
        if (distance < 3) continue;
        
        // Randomly select walls to shift
        if (Math.random() < this.shiftChance) {
          if (this.mazeGrid[x][y]) {
            // This is a wall, check if it can become a path
            let adjacentPaths = 0;
            this.directions.forEach(dir => {
              const neighbor = { x: x + dir.x, y: y + dir.y };
              if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
                adjacentPaths++;
              }
            });
            
            // Only convert to path if it won't create a large open area
            if (adjacentPaths <= 2) {
              wallsToShift.push({ x, y, toWall: false });
            }
          } else {
            // This is a path, check if it can become a wall
            let adjacentPaths = 0;
            this.directions.forEach(dir => {
              const neighbor = { x: x + dir.x, y: y + dir.y };
              if (this.isInBounds(neighbor) && !this.mazeGrid[neighbor.x][neighbor.y]) {
                adjacentPaths++;
              }
            });
            
            // Only convert to wall if it won't create a dead end
            if (adjacentPaths >= 3) {
              wallsToShift.push({ x, y, toWall: true });
            }
          }
        }
      }
    }
    
    // Apply the shifts
    wallsToShift.forEach(wall => {
      this.mazeGrid[wall.x][wall.y] = wall.toWall;
    });
    
    // Ensure the maze is still solvable
    this.ensureMazeIsSolvable();
  }
  
  /**
   * Gets the current maze data.
   * @returns {Object} The maze data
   */
  getMaze() {
    return {
      grid: this.mazeGrid,
      width: this.width,
      height: this.height,
      cellSize: this.cellSize,
      exitPosition: this.exitPosition
    };
  }
  
  /**
   * Regenerates the maze.
   * @returns {Object} The new maze data
   */
  regenerateMaze() {
    return this.generateMaze();
  }
  
  /**
   * Generates a geometric pattern maze with regular grid-like structures.
   * This creates patterns similar to the reference image.
   */
  generateGeometricPattern() {
    // Start with all walls
    this.mazeGrid = Array(this.width).fill().map(() => Array(this.height).fill(true));
    
    // Create a grid pattern with regular spacing
    const gridSpacing = 3; // Space between main corridors
    
    // Create horizontal corridors
    for (let y = gridSpacing; y < this.height; y += gridSpacing) {
      for (let x = 0; x < this.width; x++) {
        this.mazeGrid[x][y] = false; // Create path
      }
    }
    
    // Create vertical corridors
    for (let x = gridSpacing; x < this.width; x += gridSpacing) {
      for (let y = 0; y < this.height; y++) {
        this.mazeGrid[x][y] = false; // Create path
      }
    }
    
    // Add some diagonal connections
    for (let i = 0; i < this.width / 3; i++) {
      const startX = gridSpacing + (i * gridSpacing * 2) % this.width;
      const startY = gridSpacing + (i * gridSpacing) % this.height;
      
      if (startX < this.width - gridSpacing && startY < this.height - gridSpacing) {
        // Create diagonal path
        for (let j = 0; j < gridSpacing; j++) {
          const x = startX + j;
          const y = startY + j;
          if (x < this.width && y < this.height) {
            this.mazeGrid[x][y] = false;
          }
        }
      }
    }
    
    // Add some zigzag patterns
    for (let i = 0; i < this.width / 4; i++) {
      const startX = gridSpacing * 2 + (i * gridSpacing * 3) % this.width;
      const startY = gridSpacing * 2 + (i * gridSpacing * 2) % this.height;
      
      if (startX < this.width - gridSpacing * 2 && startY < this.height - gridSpacing * 2) {
        // Create zigzag pattern
        for (let j = 0; j < gridSpacing; j++) {
          // Horizontal segment
          const x1 = startX + j;
          const y1 = startY;
          if (x1 < this.width) {
            this.mazeGrid[x1][y1] = false;
          }
          
          // Vertical segment
          const x2 = startX + gridSpacing;
          const y2 = startY + j;
          if (y2 < this.height) {
            this.mazeGrid[x2][y2] = false;
          }
          
          // Horizontal segment (opposite direction)
          const x3 = startX + gridSpacing - j;
          const y3 = startY + gridSpacing;
          if (x3 < this.width) {
            this.mazeGrid[x3][y3] = false;
          }
        }
      }
    }
    
    // Add some T-junctions and crossroads
    for (let y = gridSpacing; y < this.height; y += gridSpacing * 2) {
      for (let x = gridSpacing; x < this.width; x += gridSpacing * 2) {
        // Create a crossroad or T-junction with some randomness
        const junctionType = Math.floor(Math.random() * 4);
        
        // Clear the center
        if (this.isInBounds({x, y})) {
          this.mazeGrid[x][y] = false;
        }
        
        // Add arms based on junction type
        if (junctionType === 0 || junctionType === 3) { // North arm
          for (let i = 1; i <= gridSpacing; i++) {
            if (this.isInBounds({x, y: y + i})) {
              this.mazeGrid[x][y + i] = false;
            }
          }
        }
        
        if (junctionType === 1 || junctionType === 3) { // East arm
          for (let i = 1; i <= gridSpacing; i++) {
            if (this.isInBounds({x: x + i, y})) {
              this.mazeGrid[x + i][y] = false;
            }
          }
        }
        
        if (junctionType === 2 || junctionType === 3) { // South arm
          for (let i = 1; i <= gridSpacing; i++) {
            if (this.isInBounds({x, y: y - i})) {
              this.mazeGrid[x][y - i] = false;
            }
          }
        }
        
        if (junctionType === 0 || junctionType === 2) { // West arm
          for (let i = 1; i <= gridSpacing; i++) {
            if (this.isInBounds({x: x - i, y})) {
              this.mazeGrid[x - i][y] = false;
            }
          }
        }
      }
    }
  }
  
  /**
   * Generates a concentric pattern maze with rings and connecting paths.
   */
  generateConcentricPattern() {
    // Start with all walls
    this.mazeGrid = Array(this.width).fill().map(() => Array(this.height).fill(true));
    
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    const maxRadius = Math.min(centerX, centerY) - 1;
    
    // Create concentric rings
    for (let radius = 2; radius <= maxRadius; radius += 3) {
      this.createRing(centerX, centerY, radius);
    }
    
    // Create radial paths connecting the rings
    const numRadials = 8; // Number of radial paths
    for (let i = 0; i < numRadials; i++) {
      const angle = (i * 2 * Math.PI) / numRadials;
      this.createRadialPath(centerX, centerY, maxRadius, angle);
    }
    
    // Create some random connections between adjacent rings
    for (let radius = 3; radius < maxRadius; radius += 3) {
      const numConnections = 4 + Math.floor(Math.random() * 4); // 4-7 connections
      for (let i = 0; i < numConnections; i++) {
        const angle = (i * 2 * Math.PI) / numConnections + (Math.random() * Math.PI / 4);
        this.createRingConnection(centerX, centerY, radius, angle);
      }
    }
  }
  
  /**
   * Creates a ring at the specified center and radius.
   */
  createRing(centerX, centerY, radius) {
    // Create a circular path
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.1) {
      const x = Math.round(centerX + radius * Math.cos(angle));
      const y = Math.round(centerY + radius * Math.sin(angle));
      
      if (this.isInBounds({x, y})) {
        this.mazeGrid[x][y] = false; // Create path
      }
    }
  }
  
  /**
   * Creates a radial path from the center to the outer ring.
   */
  createRadialPath(centerX, centerY, maxRadius, angle) {
    for (let r = 0; r <= maxRadius; r++) {
      const x = Math.round(centerX + r * Math.cos(angle));
      const y = Math.round(centerY + r * Math.sin(angle));
      
      if (this.isInBounds({x, y})) {
        this.mazeGrid[x][y] = false; // Create path
      }
    }
  }
  
  /**
   * Creates a connection between adjacent rings.
   */
  createRingConnection(centerX, centerY, radius, angle) {
    // Connect this ring to the next ring out
    for (let r = radius; r <= radius + 3; r++) {
      const x = Math.round(centerX + r * Math.cos(angle));
      const y = Math.round(centerY + r * Math.sin(angle));
      
      if (this.isInBounds({x, y})) {
        this.mazeGrid[x][y] = false; // Create path
      }
    }
  }
  
  /**
   * Generates a symmetric pattern maze.
   */
  generateSymmetricPattern() {
    // Start with all walls
    this.mazeGrid = Array(this.width).fill().map(() => Array(this.height).fill(true));
    
    // Generate a pattern in one quadrant
    for (let x = 0; x < Math.floor(this.width / 2); x++) {
      for (let y = 0; y < Math.floor(this.height / 2); y++) {
        // Create some patterns in the first quadrant
        if ((x % 3 === 0 && y % 2 === 0) || 
            (x % 4 === 0 && y % 3 === 0) || 
            (x === y) || 
            (x === y + 2)) {
          this.mazeGrid[x][y] = false; // Create path
          
          // Mirror horizontally
          const mirrorX = this.width - 1 - x;
          if (this.isInBounds({x: mirrorX, y})) {
            this.mazeGrid[mirrorX][y] = false;
          }
          
          // Mirror vertically
          const mirrorY = this.height - 1 - y;
          if (this.isInBounds({x, y: mirrorY})) {
            this.mazeGrid[x][mirrorY] = false;
          }
          
          // Mirror diagonally
          if (this.isInBounds({x: mirrorX, y: mirrorY})) {
            this.mazeGrid[mirrorX][mirrorY] = false;
          }
        }
      }
    }
    
    // Add some connecting paths
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * (this.width / 2));
      const y = Math.floor(Math.random() * (this.height / 2));
      
      // Create a horizontal or vertical path
      if (Math.random() < 0.5) {
        // Horizontal path
        for (let j = 0; j < this.width; j++) {
          if (this.isInBounds({x: j, y})) {
            this.mazeGrid[j][y] = false;
          }
        }
      } else {
        // Vertical path
        for (let j = 0; j < this.height; j++) {
          if (this.isInBounds({x, y: j})) {
            this.mazeGrid[x][j] = false;
          }
        }
      }
    }
  }
}

module.exports = MazeGenerator; 