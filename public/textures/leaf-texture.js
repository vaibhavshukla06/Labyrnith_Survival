/**
 * Generates a leaf texture pattern for use in the game.
 * This creates a canvas with a leaf pattern that can be used as a texture.
 */
function generateLeafTexture() {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas with solid black background
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw random leaf-like shapes
  const leafCount = 80; // Reduced number of leaves for better visibility
  
  for (let i = 0; i < leafCount; i++) {
    // Random position
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    
    // Random size
    const size = Math.random() * 30 + 10; // Larger leaves
    
    // Random rotation
    const rotation = Math.random() * Math.PI * 2;
    
    // Random green color
    const green = Math.floor(Math.random() * 100) + 155; // 155-255
    const color = `rgba(0, ${green}, 0, 0.9)`; // More opaque green
    
    // Draw leaf
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Draw a simple leaf shape
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(0, -size/2);
    ctx.bezierCurveTo(size/4, -size/2, size/2, -size/4, size/2, 0);
    ctx.bezierCurveTo(size/2, size/4, size/4, size/2, 0, size/2);
    ctx.bezierCurveTo(-size/4, size/2, -size/2, size/4, -size/2, 0);
    ctx.bezierCurveTo(-size/2, -size/4, -size/4, -size/2, 0, -size/2);
    ctx.fill();
    
    // Draw leaf vein
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, ${green-50}, 0, 1.0)`;
    ctx.lineWidth = 2; // Thicker vein
    ctx.moveTo(0, -size/2);
    ctx.lineTo(0, size/2);
    ctx.stroke();
    
    ctx.restore();
  }
  
  return canvas;
} 