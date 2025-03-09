/**
 * Handles rendering the maze using Three.js.
 */
class MazeRenderer {
  constructor() {
    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Maze components
    this.maze = null;
    this.wallObjects = new Map();
    this.floorObjects = [];
    this.exitObject = null;
    this.itemObjects = new Map();
    
    // Materials
    this.wallMaterial = null;
    this.floorMaterial = null;
    this.exitMaterial = null;
    this.leafTexture = null;
    this.wallTexture = null;
    
    // Animation properties
    this.isShifting = false;
    this.shiftStartTime = 0;
    this.shiftDuration = 2000; // 2 seconds
    this.oldMazeData = null;
    this.newMazeData = null;
    
    // Debug helpers
    this.debugMode = false;
  }
  
  /**
   * Initializes the Three.js scene.
   */
  async init() {
    try {
      console.log('Initializing MazeRenderer...');
      
      // Wait for THREE and PointerLockControls to be available
      await this.waitForThreeJs();
      
      // Create scene
      this.scene = new THREE.Scene();
      
      // Set background color
      const skyColor = Config.skyColor || 0xffefd5; // Default to papaya whip if not set
      this.scene.background = new THREE.Color(skyColor);
      console.log('Scene background color set to:', skyColor.toString(16));
      
      // Use sandy/golden fog color
      const fogColor = new THREE.Color(Config.fogColor || 0xffefd5);
      const fogDensity = Config.fogDensity || 0.005;
      this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
      console.log('Scene fog set with color:', fogColor.toString(16), 'and density:', fogDensity);
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
      );
      this.camera.position.set(20, 1.6, 20); // Start in the middle of the maze
      this.camera.lookAt(new THREE.Vector3(20, 1.6, 0)); // Look forward initially
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
      document.getElementById('game-container').appendChild(this.renderer.domElement);
      
      // Create controls
      this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
      
      // Add event listener for pointer lock changes
      document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
      
      // Setup auto-lock for pointer when clicking on the game container
      document.getElementById('game-container').addEventListener('click', () => {
        if (document.pointerLockElement !== this.renderer.domElement) {
          this.controls.lock();
        }
      });
      
      // Create lighting
      this.setupLighting();
      
      // Handle window resize
      window.addEventListener('resize', () => this.onWindowResize());
      
      // Generate textures
      await this.generateTextures();
      
      // Create materials
      this.createMaterials();
      
      // Initialize empty collections
      this.wallObjects = new Map();
      this.floorObjects = [];
      this.exitObject = null;
      
      // Start rendering
      this.startRendering();
      
      // Force an initial render
      this.render();
      
      // Log initialization
      console.log('MazeRenderer initialized successfully');
      
      return this;
    } catch (error) {
      console.error('Error initializing MazeRenderer:', error);
      throw error;
    }
  }
  
  /**
   * Handles pointer lock change events.
   */
  onPointerLockChange() {
    console.log('Pointer lock changed:', document.pointerLockElement === this.renderer.domElement ? 'locked' : 'unlocked');
    
    if (document.pointerLockElement === this.renderer.domElement) {
      // Pointer is locked
      
      // Start game if not already running
      if (window.game && !window.game.isRunning) {
        // Use setTimeout to ensure the game starts after the pointer lock is established
        setTimeout(() => {
          window.game.startGame();
        }, 100);
      }
    } else {
      // Pointer is unlocked
      // If game is paused, show a small notification
      if (window.game && window.game.isRunning && !window.game.isGameOver) {
        if (window.game.ui) {
          window.game.ui.showMessage('Click to resume game', 'info');
        }
      }
    }
  }
  
  /**
   * Sets up lighting for the scene.
   */
  setupLighting() {
    // Ambient light - warm tone for sandy/golden atmosphere
    const ambientLight = new THREE.AmbientLight(0xfff0d0, 0.7);
    this.scene.add(ambientLight);
    
    // Directional light (sun) - warm golden light
    const directionalLight = new THREE.DirectionalLight(0xffd580, 1.2);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    
    // Configure shadow properties for larger maze
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    
    // Set shadow camera frustum to cover the entire maze
    const shadowSize = 100;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    
    this.scene.add(directionalLight);
    
    // Add point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0xffcc77, 0.8, 50);
    pointLight1.position.set(20, 10, 20);
    pointLight1.castShadow = true;
    this.scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0xffaa44, 0.6, 30);
    pointLight2.position.set(40, 8, 40);
    pointLight2.castShadow = true;
    this.scene.add(pointLight2);
    
    // Add spotlight to highlight the maze
    const spotLight = new THREE.SpotLight(0xffffee, 0.8);
    spotLight.position.set(20, 40, 20);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.2;
    spotLight.decay = 1.5;
    spotLight.distance = 200;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    this.scene.add(spotLight);
  }
  
  /**
   * Generates textures for the maze elements.
   */
  async generateTextures() {
    try {
      // Generate leaf texture
      if (typeof window.generateLeafTexture === 'function') {
        const leafCanvas = window.generateLeafTexture();
        this.leafTexture = new THREE.CanvasTexture(leafCanvas);
        this.leafTexture.wrapS = THREE.RepeatWrapping;
        this.leafTexture.wrapT = THREE.RepeatWrapping;
        this.leafTexture.repeat.set(1, 1);
        console.log('Leaf texture generated successfully');
      } else {
        console.warn('generateLeafTexture function not found, using fallback');
        this.leafTexture = null;
      }
      
      // Generate wall texture
      if (typeof window.generateWallTexture === 'function') {
        const wallCanvas = window.generateWallTexture();
        this.wallTexture = new THREE.CanvasTexture(wallCanvas);
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.RepeatWrapping;
        this.wallTexture.repeat.set(1, 1);
        console.log('Wall texture generated successfully');
      } else {
        console.warn('generateWallTexture function not found, using fallback');
        // Create a simple fallback texture
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 256;
        wallCanvas.height = 256;
        const ctx = wallCanvas.getContext('2d');
        
        // Fill with base color
        ctx.fillStyle = '#d2b48c';
        ctx.fillRect(0, 0, 256, 256);
        
        // Draw brick pattern
        ctx.strokeStyle = '#a89a7c';
        ctx.lineWidth = 2;
        
        // Horizontal lines
        for (let i = 0; i < 256; i += 32) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(256, i);
          ctx.stroke();
        }
        
        // Vertical lines - offset every other row
        for (let j = 0; j < 256; j += 32) {
          for (let i = (j % 64 === 0) ? 0 : 16; i < 256; i += 32) {
            ctx.beginPath();
            ctx.moveTo(i, j);
            ctx.lineTo(i, j + 32);
            ctx.stroke();
          }
        }
        
        this.wallTexture = new THREE.CanvasTexture(wallCanvas);
        this.wallTexture.wrapS = THREE.RepeatWrapping;
        this.wallTexture.wrapT = THREE.RepeatWrapping;
        this.wallTexture.repeat.set(1, 1);
      }
    } catch (error) {
      console.error('Error generating textures:', error);
      // Create emergency fallback textures
      this.createFallbackTextures();
    }
  }
  
  /**
   * Creates fallback textures if texture generation fails.
   */
  createFallbackTextures() {
    console.log('Creating fallback textures');
    
    // Create a simple fallback wall texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 256;
    wallCanvas.height = 256;
    const wallCtx = wallCanvas.getContext('2d');
    
    // Fill with base color
    wallCtx.fillStyle = '#d2b48c';
    wallCtx.fillRect(0, 0, 256, 256);
    
    // Draw brick pattern
    wallCtx.strokeStyle = '#a89a7c';
    wallCtx.lineWidth = 2;
    
    // Horizontal lines
    for (let i = 0; i < 256; i += 32) {
      wallCtx.beginPath();
      wallCtx.moveTo(0, i);
      wallCtx.lineTo(256, i);
      wallCtx.stroke();
    }
    
    // Vertical lines
    for (let i = 0; i < 256; i += 32) {
      wallCtx.beginPath();
      wallCtx.moveTo(i, 0);
      wallCtx.lineTo(i, 256);
      wallCtx.stroke();
    }
    
    this.wallTexture = new THREE.CanvasTexture(wallCanvas);
    this.wallTexture.wrapS = THREE.RepeatWrapping;
    this.wallTexture.wrapT = THREE.RepeatWrapping;
    
    // Create a simple fallback leaf texture
    const leafCanvas = document.createElement('canvas');
    leafCanvas.width = 128;
    leafCanvas.height = 128;
    const leafCtx = leafCanvas.getContext('2d');
    
    // Fill with base color
    leafCtx.fillStyle = '#228B22';
    leafCtx.fillRect(0, 0, 128, 128);
    
    this.leafTexture = new THREE.CanvasTexture(leafCanvas);
    this.leafTexture.wrapS = THREE.RepeatWrapping;
    this.leafTexture.wrapT = THREE.RepeatWrapping;
  }
  
  /**
   * Creates materials for maze elements.
   */
  createMaterials() {
    // Wall material with stone texture
    if (this.wallTexture) {
      // Create a material with stone wall texture
      this.wallMaterial = new THREE.MeshStandardMaterial({
        map: this.wallTexture,
        bumpMap: this.wallTexture,
        bumpScale: 0.1,
        roughness: 0.8,
        metalness: 0.2
      });
    } else {
      // Fallback if texture loading failed
      this.wallMaterial = new THREE.MeshStandardMaterial({
        color: Config.wallColor,
        roughness: 0.7,
        metalness: 0.1
      });
    }
    
    // Floor material with grid pattern
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const floorCtx = floorCanvas.getContext('2d');
    
    // Fill with base color - sandy color to match the wall texture
    floorCtx.fillStyle = `#d2b48c`;
    floorCtx.fillRect(0, 0, 128, 128);
    
    // Draw grid pattern
    floorCtx.strokeStyle = '#a89a7c';
    floorCtx.lineWidth = 2;
    
    // Horizontal lines
    for (let i = 0; i < 128; i += 16) {
      floorCtx.beginPath();
      floorCtx.moveTo(0, i);
      floorCtx.lineTo(128, i);
      floorCtx.stroke();
    }
    
    // Vertical lines
    for (let i = 0; i < 128; i += 16) {
      floorCtx.beginPath();
      floorCtx.moveTo(i, 0);
      floorCtx.lineTo(i, 128);
      floorCtx.stroke();
    }
    
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(2, 2);
    
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2b48c, // Sandy color to match walls
      roughness: 0.9,
      metalness: 0.1,
      map: floorTexture
    });
    
    // Exit material
    this.exitMaterial = new THREE.MeshStandardMaterial({
      color: Config.exitColor,
      roughness: 0.3,
      metalness: 0.5,
      emissive: Config.exitColor,
      emissiveIntensity: 0.5
    });
  }
  
  /**
   * Waits for Three.js to be loaded.
   */
  waitForThreeJs() {
    return new Promise((resolve) => {
      if (window.THREE && window.PointerLockControls) {
        console.log('THREE and PointerLockControls already available');
        resolve();
        return;
      }
      
      console.log('Waiting for THREE and PointerLockControls to be available');
      
      const onThreeJsLoaded = () => {
        console.log('THREE and PointerLockControls loaded via event');
        document.removeEventListener('threeJsLoaded', onThreeJsLoaded);
        resolve();
      };
      
      document.addEventListener('threeJsLoaded', onThreeJsLoaded);
      
      const checkAvailability = () => {
        if (window.THREE && window.PointerLockControls) {
          console.log('THREE and PointerLockControls loaded via polling');
          document.removeEventListener('threeJsLoaded', onThreeJsLoaded);
          resolve();
        } else {
          console.log('Still waiting for THREE and PointerLockControls...');
          setTimeout(checkAvailability, 100);
        }
      };
      
      checkAvailability();
    });
  }
  
  /**
   * Creates the maze based on the provided data.
   * @param {Object} mazeData - The maze data
   */
  createMaze(mazeData) {
    try {
      console.log('Creating maze with dimensions:', mazeData.width, 'x', mazeData.height);
      
      // Clear existing maze
      this.clearMaze();
      
      // Store maze data
      this.maze = mazeData;
      
      // Ensure materials are created before creating maze elements
      if (!this.wallMaterial || !this.floorMaterial) {
        console.log('Materials not initialized, creating them now');
        this.createMaterials();
      }
      
      // Set background color
      if (this.scene) {
        this.scene.background = new THREE.Color(Config.skyColor || 0xffefd5);
        
        // Set fog
        const fogColor = new THREE.Color(Config.fogColor || 0xffefd5);
        this.scene.fog = new THREE.FogExp2(fogColor, Config.fogDensity || 0.005);
      }
      
      // Create walls and floors
      console.log('Creating walls and floors...');
      let wallCount = 0;
      let floorCount = 0;
      
      for (let x = 0; x < mazeData.width; x++) {
        for (let z = 0; z < mazeData.height; z++) {
          // Create walls where grid value is true
          if (mazeData.grid[x][z]) {
            this.createWall(x, z);
            wallCount++;
          }
          
          // Always create floor
          this.createFloor(x, z);
          floorCount++;
        }
      }
      
      console.log(`Created ${wallCount} walls and ${floorCount} floor tiles`);
      
      // Create exit
      if (mazeData.exit) {
        this.createExit(mazeData.exit.x, mazeData.exit.z);
        console.log('Exit created at:', mazeData.exit.x, mazeData.exit.z);
      }
      
      // Position camera
      this.positionCameraInMaze(mazeData);
      
      // Force a render to ensure everything is displayed
      this.render();
      
      console.log('Maze creation complete');
    } catch (error) {
      console.error('Error creating maze:', error);
    }
  }
  
  /**
   * Creates a wall at the specified position.
   * @param {number} x - The x coordinate
   * @param {number} z - The z coordinate
   */
  createWall(x, z) {
    try {
      if (!this.maze || !this.wallMaterial) {
        console.error('Cannot create wall: maze or wall material not initialized');
        return;
      }
      
      const cellSize = this.maze.cellSize;
      const wallHeight = Config.wallHeight || 3;
      
      // Create wall geometry - slightly larger than cell size for better visibility
      const geometry = new THREE.BoxGeometry(cellSize * 1.05, wallHeight, cellSize * 1.05);
      
      // Ensure wall material is properly created
      let material = this.wallMaterial;
      if (!material) {
        console.warn('Wall material not found, creating fallback material');
        material = new THREE.MeshStandardMaterial({
          color: 0xd2b48c, // Tan color
          roughness: 0.7,
          metalness: 0.1
        });
      }
      
      const wall = new THREE.Mesh(geometry, material);
      
      // Position wall
      wall.position.set(
        x * cellSize + cellSize / 2,
        wallHeight / 2,
        z * cellSize + cellSize / 2
      );
      
      // Enable shadows
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      // Add to scene
      this.scene.add(wall);
      
      // Store reference
      const key = `${x},${z}`;
      this.wallObjects.set(key, wall);
      
      // Debug log for first wall
      if (x === 0 && z === 0) {
        console.log('First wall created at position:', wall.position.x, wall.position.y, wall.position.z);
      }
    } catch (error) {
      console.error('Error creating wall:', error);
    }
  }
  
  /**
   * Creates a floor tile at the specified position.
   * @param {number} x - The x coordinate
   * @param {number} z - The z coordinate
   */
  createFloor(x, z) {
    try {
      if (!this.maze) {
        console.error('Cannot create floor: maze not initialized');
        return;
      }
      
      const cellSize = this.maze.cellSize;
      
      // Create floor geometry - slightly larger than cell size for better coverage
      const geometry = new THREE.PlaneGeometry(cellSize * 1.05, cellSize * 1.05);
      
      // Ensure floor material is properly created
      let material = this.floorMaterial;
      if (!material) {
        console.warn('Floor material not found, creating fallback material');
        
        // Create a simple floor texture
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 128;
        floorCanvas.height = 128;
        const floorCtx = floorCanvas.getContext('2d');
        
        // Fill with base color
        floorCtx.fillStyle = '#d2b48c';
        floorCtx.fillRect(0, 0, 128, 128);
        
        // Draw grid pattern
        floorCtx.strokeStyle = '#a89a7c';
        floorCtx.lineWidth = 2;
        
        // Horizontal lines
        for (let i = 0; i < 128; i += 16) {
          floorCtx.beginPath();
          floorCtx.moveTo(0, i);
          floorCtx.lineTo(128, i);
          floorCtx.stroke();
        }
        
        // Vertical lines
        for (let i = 0; i < 128; i += 16) {
          floorCtx.beginPath();
          floorCtx.moveTo(i, 0);
          floorCtx.lineTo(i, 128);
          floorCtx.stroke();
        }
        
        const floorTexture = new THREE.CanvasTexture(floorCanvas);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(2, 2);
        
        material = new THREE.MeshStandardMaterial({
          color: 0xd2b48c,
          roughness: 0.9,
          metalness: 0.1,
          map: floorTexture
        });
        
        // Save for future use
        this.floorMaterial = material;
      }
      
      const floor = new THREE.Mesh(geometry, material);
      
      // Position floor
      floor.position.set(
        x * cellSize + cellSize / 2,
        0,
        z * cellSize + cellSize / 2
      );
      floor.rotation.x = -Math.PI / 2;
      
      // Enable shadows
      floor.receiveShadow = true;
      
      // Add to scene
      this.scene.add(floor);
      
      // Store reference
      this.floorObjects.push(floor);
      
      // Debug log for first floor
      if (x === 0 && z === 0) {
        console.log('First floor created at position:', floor.position.x, floor.position.y, floor.position.z);
      }
    } catch (error) {
      console.error('Error creating floor:', error);
    }
  }
  
  /**
   * Creates the exit at the specified position.
   * @param {number} x - The x coordinate
   * @param {number} z - The z coordinate
   */
  createExit(x, z) {
    const cellSize = this.maze.cellSize;
    
    // Create exit geometry
    const geometry = new THREE.CylinderGeometry(cellSize / 3, cellSize / 3, 0.1, 16);
    const exit = new THREE.Mesh(geometry, this.exitMaterial);
    
    // Position exit
    exit.position.set(
      x * cellSize + cellSize / 2,
      0.05, // Slightly above floor
      z * cellSize + cellSize / 2
    );
    
    // Add glow effect
    const glowGeometry = new THREE.CylinderGeometry(cellSize / 2.5, cellSize / 2.5, 0.05, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: Config.exitColor,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.025;
    exit.add(glow);
    
    // Add animation
    exit.userData.animationTime = 0;
    exit.userData.update = function() {
      this.userData.animationTime += 0.02;
      this.position.y = 0.05 + Math.sin(this.userData.animationTime) * 0.05;
      this.rotation.y += 0.01;
      
      // Pulse glow
      const scale = 1 + Math.sin(this.userData.animationTime * 2) * 0.1;
      glow.scale.set(scale, 1, scale);
      glow.material.opacity = 0.3 + Math.sin(this.userData.animationTime * 2) * 0.1;
    };
    
    // Add to scene
    this.scene.add(exit);
    
    // Store reference
    this.exitObject = exit;
  }
  
  /**
   * Positions the camera in a valid starting position in the maze.
   * @param {Object} mazeData - The maze data
   */
  positionCameraInMaze(mazeData) {
    // If start position is provided, use it
    if (mazeData.start) {
      const cellSize = mazeData.cellSize;
      const startX = mazeData.start.x * cellSize + cellSize / 2;
      const startZ = mazeData.start.z * cellSize + cellSize / 2;
      
      this.camera.position.set(
        startX,
        1.6, // Eye level
        startZ
      );
      
      // Look toward the center of the maze
      const centerX = mazeData.width * cellSize / 2;
      const centerZ = mazeData.height * cellSize / 2;
      this.camera.lookAt(centerX, 1.6, centerZ);
      
      console.log('Camera positioned at start position:', startX, 1.6, startZ);
      return;
    }
    
    // Otherwise, find a random empty cell
    const cellSize = mazeData.cellSize;
    let startX, startZ;
    
    // Try to find an empty cell
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      startX = Math.floor(Math.random() * mazeData.width);
      startZ = Math.floor(Math.random() * mazeData.height);
      attempts++;
    } while (mazeData.grid[startX][startZ] && attempts < maxAttempts);
    
    // Position camera
    const posX = startX * cellSize + cellSize / 2;
    const posZ = startZ * cellSize + cellSize / 2;
    
    this.camera.position.set(
      posX,
      1.6, // Eye level
      posZ
    );
    
    // Look toward the center of the maze
    const centerX = mazeData.width * cellSize / 2;
    const centerZ = mazeData.height * cellSize / 2;
    this.camera.lookAt(centerX, 1.6, centerZ);
    
    console.log('Camera positioned at random position:', posX, 1.6, posZ);
  }
  
  /**
   * Updates the maze with new data.
   * @param {Object} mazeData - The new maze data
   */
  updateMaze(mazeData) {
    // If already shifting, ignore
    if (this.isShifting) return;
    
    // Store old and new maze data
    this.oldMazeData = this.maze;
    this.newMazeData = mazeData;
    
    // Start shifting animation
    this.isShifting = true;
    this.shiftStartTime = Date.now();
    
    // After animation completes, update the maze
    setTimeout(() => {
      this.finishMazeShift();
    }, this.shiftDuration);
  }
  
  /**
   * Finishes the maze shift animation and updates to the new maze.
   */
  finishMazeShift() {
    // Create the new maze
    this.createMaze(this.newMazeData);
    
    // Reset shifting state
    this.isShifting = false;
    this.oldMazeData = null;
    this.newMazeData = null;
  }
  
  /**
   * Updates the maze shift animation.
   */
  updateMazeShift() {
    if (!this.isShifting) return;
    
    const elapsed = Date.now() - this.shiftStartTime;
    const progress = Math.min(elapsed / this.shiftDuration, 1);
    
    // Animate walls sinking and rising
    this.wallObjects.forEach((wall, key) => {
      const [x, z] = key.split(',').map(Number);
      const oldIsWall = this.oldMazeData.grid[x][z];
      const newIsWall = this.newMazeData.grid[x][z];
      
      if (oldIsWall && !newIsWall) {
        // Wall is disappearing
        wall.position.y = Config.wallHeight / 2 * (1 - progress);
        wall.scale.y = 1 - progress;
      } else if (!oldIsWall && newIsWall) {
        // New wall is appearing (handled in finishMazeShift)
      } else {
        // Wall stays the same
      }
    });
    
    // Animate exit if it's moving
    if (this.exitObject && 
        this.oldMazeData.exit && 
        this.newMazeData.exit &&
        (this.oldMazeData.exit.x !== this.newMazeData.exit.x || 
         this.oldMazeData.exit.z !== this.newMazeData.exit.z)) {
      
      const cellSize = this.oldMazeData.cellSize;
      const oldX = this.oldMazeData.exit.x * cellSize + cellSize / 2;
      const oldZ = this.oldMazeData.exit.z * cellSize + cellSize / 2;
      const newX = this.newMazeData.exit.x * cellSize + cellSize / 2;
      const newZ = this.newMazeData.exit.z * cellSize + cellSize / 2;
      
      this.exitObject.position.x = oldX + (newX - oldX) * progress;
      this.exitObject.position.z = oldZ + (newZ - oldZ) * progress;
    }
  }
  
  /**
   * Clears the maze.
   */
  clearMaze() {
    // Remove walls
    this.wallObjects.forEach(wall => {
      this.scene.remove(wall);
    });
    this.wallObjects.clear();
    
    // Remove floor
    this.floorObjects.forEach(floor => {
      this.scene.remove(floor);
    });
    this.floorObjects = [];
    
    // Remove exit
    if (this.exitObject) {
      this.scene.remove(this.exitObject);
      this.exitObject = null;
    }
  }
  
  /**
   * Handles window resize.
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Starts the rendering loop.
   */
  startRendering() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Only render if we're not using the game loop
      if (!window.game || !window.game.isRunning) {
        this.render();
      }
    };
    
    animate();
  }
  
  /**
   * Renders the scene.
   */
  render() {
    // Update maze shift animation if active
    if (this.isShifting) {
      this.updateMazeShift();
    }
    
    // Update exit animation
    if (this.exitObject && this.exitObject.userData.update) {
      this.exitObject.userData.update.call(this.exitObject);
    }
    
    // Update item animations
    if (window.game) {
      window.game.items.forEach(item => {
        if (item.mesh && item.mesh.userData.update) {
          item.mesh.userData.update.call(item.mesh);
        }
      });
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
} 