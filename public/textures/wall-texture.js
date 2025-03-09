/**
 * Generates a stone/brick wall texture pattern for use in the game.
 * This creates a canvas with a stone wall pattern that can be used as a texture.
 */
function generateWallTexture() {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base color - sandy/beige
  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add stone texture
  createStonePattern(ctx, canvas.width, canvas.height);
  
  // Add cracks and details
  addCracksAndDetails(ctx, canvas.width, canvas.height);
  
  // Add some noise for texture
  addNoiseTexture(ctx, canvas.width, canvas.height);
  
  // Add slight vignette effect
  addVignette(ctx, canvas.width, canvas.height);
  
  return canvas;
}

/**
 * Creates a stone brick pattern
 */
function createStonePattern(ctx, width, height) {
  // Stone brick sizes (with some variation)
  const brickHeight = 32;
  const brickWidth = 64;
  
  // Draw horizontal lines (mortar between bricks)
  for (let y = 0; y < height; y += brickHeight) {
    // Vary the row height slightly
    const rowHeight = brickHeight + (Math.random() * 6 - 3);
    
    // Draw the horizontal mortar line
    ctx.fillStyle = '#a89a7c';
    ctx.fillRect(0, y, width, 4);
    
    // Draw bricks in this row with an offset every other row
    const offset = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
    
    for (let x = -offset; x < width; x += brickWidth) {
      // Vary the brick width slightly
      const currentBrickWidth = brickWidth + (Math.random() * 10 - 5);
      
      // Draw vertical mortar line
      ctx.fillStyle = '#a89a7c';
      ctx.fillRect(x, y, 4, rowHeight);
      
      // Draw the brick
      const brickColor = getBrickColor();
      ctx.fillStyle = brickColor;
      ctx.fillRect(x + 4, y + 4, currentBrickWidth - 4, rowHeight - 4);
      
      // Add some texture to the brick
      addBrickTexture(ctx, x + 4, y + 4, currentBrickWidth - 4, rowHeight - 4);
    }
  }
}

/**
 * Returns a random brick color in the sandy/beige palette
 */
function getBrickColor() {
  const colors = [
    '#d2b48c', // Tan
    '#c8b08e', // Lighter tan
    '#bea78a', // Darker tan
    '#d6bc9a', // Light sand
    '#c9b18b', // Medium sand
    '#b8a078'  // Dark sand
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Adds texture to an individual brick
 */
function addBrickTexture(ctx, x, y, width, height) {
  // Add some subtle shading
  ctx.save();
  ctx.globalAlpha = 0.1;
  
  // Top highlight
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, width, height / 4);
  
  // Bottom shadow
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y + height * 0.75, width, height / 4);
  
  // Left highlight
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, width / 4, height);
  
  // Right shadow
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + width * 0.75, y, width / 4, height);
  
  ctx.restore();
}

/**
 * Adds cracks and details to the wall
 */
function addCracksAndDetails(ctx, width, height) {
  // Add some cracks
  const crackCount = 20;
  
  ctx.save();
  ctx.strokeStyle = '#a89a7c';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < crackCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const length = 20 + Math.random() * 40;
    const segments = 3 + Math.floor(Math.random() * 3);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    let currentX = x;
    let currentY = y;
    
    for (let j = 0; j < segments; j++) {
      const angleVariation = Math.PI / 4;
      const angle = (Math.random() * angleVariation * 2) - angleVariation;
      const segmentLength = length / segments;
      
      currentX += Math.cos(angle) * segmentLength;
      currentY += Math.sin(angle) * segmentLength;
      
      ctx.lineTo(currentX, currentY);
    }
    
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Adds noise texture to the wall
 */
function addNoiseTexture(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  
  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 2, 2);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  
  ctx.restore();
}

/**
 * Adds a subtle vignette effect
 */
function addVignette(ctx, width, height) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width * 0.7
  );
  
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
} 