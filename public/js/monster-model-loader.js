/**
 * Handles loading the monster 3D model and textures.
 */
class MonsterModelLoader {
  constructor() {
    this.objLoader = null;
    this.textureLoader = null;
    this.monsterModel = null;
    this.monsterMaterials = {
      basic: null,
      fast: null,
      tank: null,
      boss: null
    };
    this.isLoaded = false;
    this.loadingPromise = null;
    
    // Add debug flag
    this.debug = true;
  }
  
  /**
   * Initializes the loaders.
   */
  async init() {
    console.log('[MonsterModelLoader] Initializing...');
    
    try {
      // Wait for THREE to be available
      await this.waitForThreeJs();
      
      // Create loaders
      this.objLoader = new THREE.OBJLoader();
      this.textureLoader = new THREE.TextureLoader();
      
      if (this.debug) console.log('[MonsterModelLoader] Loaders created successfully');
      
      // Start loading the model and textures
      this.loadingPromise = this.loadModelAndTextures();
      
      return this;
    } catch (error) {
      console.error('[MonsterModelLoader] Initialization error:', error);
      // Continue without monster models
      this.isLoaded = false;
      return this;
    }
  }
  
  /**
   * Waits for Three.js to be loaded.
   */
  waitForThreeJs() {
    return new Promise((resolve, reject) => {
      if (this.debug) console.log('[MonsterModelLoader] Checking for THREE and OBJLoader...');
      
      if (window.THREE && window.THREE.OBJLoader) {
        console.log('[MonsterModelLoader] THREE and OBJLoader already available');
        resolve();
        return;
      }
      
      console.log('[MonsterModelLoader] Waiting for THREE and OBJLoader to be available');
      
      // Set a timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        console.error('[MonsterModelLoader] Timeout waiting for THREE.js');
        // Resolve anyway to continue without monster models
        resolve();
      }, 10000); // 10 seconds timeout
      
      // Load OBJLoader if not already loaded
      if (window.THREE && !window.THREE.OBJLoader) {
        if (this.debug) console.log('[MonsterModelLoader] THREE available but OBJLoader missing, loading it now');
        
        try {
          // Try to use the already imported OBJLoader
          if (typeof OBJLoader !== 'undefined') {
            window.THREE.OBJLoader = OBJLoader;
            console.log('[MonsterModelLoader] Using globally available OBJLoader');
            clearTimeout(timeout);
            resolve();
            return;
          }
          
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js';
          script.onload = () => {
            try {
              window.THREE.OBJLoader = window.THREE.examples.jsm.loaders.OBJLoader;
              console.log('[MonsterModelLoader] OBJLoader loaded');
              clearTimeout(timeout);
              resolve();
            } catch (error) {
              console.error('[MonsterModelLoader] Error setting up OBJLoader:', error);
              clearTimeout(timeout);
              // Resolve anyway to continue without monster models
              resolve();
            }
          };
          script.onerror = (error) => {
            console.error('[MonsterModelLoader] Error loading OBJLoader script:', error);
            clearTimeout(timeout);
            // Resolve anyway to continue without monster models
            resolve();
          };
          document.head.appendChild(script);
        } catch (error) {
          console.error('[MonsterModelLoader] Error loading OBJLoader:', error);
          clearTimeout(timeout);
          // Resolve anyway to continue without monster models
          resolve();
        }
      } else {
        // Wait for THREE to be loaded first
        if (this.debug) console.log('[MonsterModelLoader] THREE not available yet, waiting...');
        
        let checkCount = 0;
        const maxChecks = 100; // Prevent infinite checking
        
        const checkInterval = setInterval(() => {
          checkCount++;
          
          if (window.THREE) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            
            if (this.debug) console.log('[MonsterModelLoader] THREE is now available, checking for OBJLoader');
            
            // Check if OBJLoader is already available
            if (window.THREE.OBJLoader) {
              console.log('[MonsterModelLoader] OBJLoader is already available');
              resolve();
              return;
            }
            
            // Try to use the already imported OBJLoader
            try {
              if (typeof OBJLoader !== 'undefined') {
                window.THREE.OBJLoader = OBJLoader;
                console.log('[MonsterModelLoader] Using globally available OBJLoader');
                resolve();
                return;
              }
            } catch (error) {
              console.error('[MonsterModelLoader] Error checking for global OBJLoader:', error);
            }
            
            // Now load OBJLoader
            try {
              const script = document.createElement('script');
              script.src = 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/OBJLoader.js';
              script.onload = () => {
                try {
                  window.THREE.OBJLoader = window.THREE.examples.jsm.loaders.OBJLoader;
                  console.log('[MonsterModelLoader] OBJLoader loaded');
                  resolve();
                } catch (error) {
                  console.error('[MonsterModelLoader] Error setting up OBJLoader:', error);
                  // Resolve anyway to continue without monster models
                  resolve();
                }
              };
              script.onerror = (error) => {
                console.error('[MonsterModelLoader] Error loading OBJLoader script:', error);
                // Resolve anyway to continue without monster models
                resolve();
              };
              document.head.appendChild(script);
            } catch (error) {
              console.error('[MonsterModelLoader] Error loading OBJLoader:', error);
              // Resolve anyway to continue without monster models
              resolve();
            }
          } else if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            console.error('[MonsterModelLoader] Exceeded maximum checks for THREE.js');
            // Resolve anyway to continue without monster models
            resolve();
          }
        }, 100);
      }
    });
  }
  
  /**
   * Loads the monster model and textures.
   */
  async loadModelAndTextures() {
    if (this.debug) console.log('[MonsterModelLoader] Starting to load model and textures');
    
    try {
      // Create a basic fallback material in case texture loading fails
      const fallbackMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.7,
        metalness: 0.3
      });
      
      this.monsterMaterials.basic = fallbackMaterial;
      this.monsterMaterials.fast = fallbackMaterial;
      this.monsterMaterials.tank = fallbackMaterial;
      this.monsterMaterials.boss = fallbackMaterial;
      
      // Try to load textures
      try {
        // Load textures
        if (this.debug) console.log('[MonsterModelLoader] Loading textures...');
        
        const diffuseTexture = await this.loadTexture('/assets/monsters/texture_diffuse.png');
        const normalTexture = await this.loadTexture('/assets/monsters/texture_normal.png');
        const roughnessTexture = await this.loadTexture('/assets/monsters/texture_roughness.png');
        const metallicTexture = await this.loadTexture('/assets/monsters/texture_metallic.png');
        
        if (this.debug) console.log('[MonsterModelLoader] Textures loaded successfully');
        
        // Create materials for different monster types
        this.monsterMaterials.basic = this.createMonsterMaterial(
          diffuseTexture, normalTexture, roughnessTexture, metallicTexture,
          0xff0000 // Red tint for basic monsters
        );
        
        this.monsterMaterials.fast = this.createMonsterMaterial(
          diffuseTexture, normalTexture, roughnessTexture, metallicTexture,
          0xff6600 // Orange tint for fast monsters
        );
        
        this.monsterMaterials.tank = this.createMonsterMaterial(
          diffuseTexture, normalTexture, roughnessTexture, metallicTexture,
          0x660000 // Dark red tint for tank monsters
        );
        
        this.monsterMaterials.boss = this.createMonsterMaterial(
          diffuseTexture, normalTexture, roughnessTexture, metallicTexture,
          0x990099 // Purple tint for boss monsters
        );
      } catch (error) {
        console.error('[MonsterModelLoader] Error loading textures:', error);
        // Continue with fallback materials
      }
      
      // Load the model
      try {
        if (this.debug) console.log('[MonsterModelLoader] Loading model...');
        this.monsterModel = await this.loadModel('/assets/monsters/base.obj');
        if (this.debug) console.log('[MonsterModelLoader] Model loaded successfully');
      } catch (error) {
        console.error('[MonsterModelLoader] Error loading model:', error);
        // Create a fallback model (cube)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Create a group to hold the mesh
        this.monsterModel = new THREE.Group();
        this.monsterModel.add(mesh);
        
        console.log('[MonsterModelLoader] Using fallback cube model');
      }
      
      // Set the model as loaded
      this.isLoaded = true;
      console.log('[MonsterModelLoader] Model and textures loaded successfully');
      
      return true;
    } catch (error) {
      console.error('[MonsterModelLoader] Error in loadModelAndTextures:', error);
      this.isLoaded = false;
      return false;
    }
  }
  
  /**
   * Loads a texture from the given URL.
   * @param {string} url - The URL of the texture
   * @returns {Promise<THREE.Texture>} The loaded texture
   */
  loadTexture(url) {
    if (this.debug) console.log(`[MonsterModelLoader] Loading texture: ${url}`);
    
    return new Promise((resolve, reject) => {
      if (!this.textureLoader) {
        console.error('[MonsterModelLoader] TextureLoader not initialized');
        reject(new Error('TextureLoader not initialized'));
        return;
      }
      
      this.textureLoader.load(
        url,
        (texture) => {
          texture.flipY = false; // OBJ models typically don't need Y-flipped textures
          if (this.debug) console.log(`[MonsterModelLoader] Texture loaded: ${url}`);
          resolve(texture);
        },
        (progressEvent) => {
          // Progress callback
          if (this.debug && progressEvent.lengthComputable) {
            const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            console.log(`[MonsterModelLoader] Texture loading progress: ${percentComplete}%`);
          }
        },
        (error) => {
          console.error(`[MonsterModelLoader] Error loading texture ${url}:`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Loads a model from the given URL.
   * @param {string} url - The URL of the model
   * @returns {Promise<THREE.Object3D>} The loaded model
   */
  loadModel(url) {
    if (this.debug) console.log(`[MonsterModelLoader] Loading model: ${url}`);
    
    return new Promise((resolve, reject) => {
      if (!this.objLoader) {
        console.error('[MonsterModelLoader] OBJLoader not initialized');
        reject(new Error('OBJLoader not initialized'));
        return;
      }
      
      this.objLoader.load(
        url,
        (object) => {
          if (this.debug) console.log(`[MonsterModelLoader] Model loaded: ${url}`);
          resolve(object);
        },
        (progressEvent) => {
          // Progress callback
          if (this.debug && progressEvent.lengthComputable) {
            const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            console.log(`[MonsterModelLoader] Model loading progress: ${percentComplete}%`);
          }
        },
        (error) => {
          console.error(`[MonsterModelLoader] Error loading model ${url}:`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Creates a material for a monster type.
   * @param {THREE.Texture} diffuseTexture - The diffuse texture
   * @param {THREE.Texture} normalTexture - The normal map texture
   * @param {THREE.Texture} roughnessTexture - The roughness map texture
   * @param {THREE.Texture} metallicTexture - The metallic map texture
   * @param {number} tintColor - The color to tint the monster
   * @returns {THREE.MeshStandardMaterial} The created material
   */
  createMonsterMaterial(diffuseTexture, normalTexture, roughnessTexture, metallicTexture, tintColor) {
    if (this.debug) console.log(`[MonsterModelLoader] Creating monster material with tint: ${tintColor.toString(16)}`);
    
    const material = new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      normalMap: normalTexture,
      roughnessMap: roughnessTexture,
      metalnessMap: metallicTexture,
      color: new THREE.Color(tintColor),
      roughness: 0.7,
      metalness: 0.3
    });
    
    return material;
  }
  
  /**
   * Gets a clone of the monster model with the appropriate material.
   * @param {string} type - The type of monster
   * @returns {THREE.Object3D} A clone of the monster model
   */
  getMonsterModel(type = 'basic') {
    if (!this.isLoaded || !this.monsterModel) {
      console.error('[MonsterModelLoader] Monster model not loaded yet');
      return null;
    }
    
    if (this.debug) console.log(`[MonsterModelLoader] Getting monster model of type: ${type}`);
    
    try {
      // Clone the model
      const model = this.monsterModel.clone();
      
      // Apply the appropriate material
      const material = this.monsterMaterials[type] || this.monsterMaterials.basic;
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      return model;
    } catch (error) {
      console.error('[MonsterModelLoader] Error cloning monster model:', error);
      return null;
    }
  }
  
  /**
   * Checks if the model is loaded.
   * @returns {boolean} True if the model is loaded
   */
  isModelLoaded() {
    return this.isLoaded;
  }
  
  /**
   * Waits for the model to be loaded.
   * @returns {Promise<boolean>} A promise that resolves when the model is loaded
   */
  async waitForModelToLoad() {
    if (this.isLoaded) {
      return true;
    }
    
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    return false;
  }
} 