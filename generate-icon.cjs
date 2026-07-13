const sharp = require('sharp');
const path = require('path');

const size = 1024;

// Create SVG icon with tropical fruit theme
const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2E7D32"/>
      <stop offset="50%" style="stop-color:#43A047"/>
      <stop offset="100%" style="stop-color:#66BB6A"/>
    </linearGradient>
    <linearGradient id="fruit" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF8F00"/>
      <stop offset="50%" style="stop-color:#FFA000"/>
      <stop offset="100%" style="stop-color:#FFB300"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bg)"/>
  
  <!-- Mango shape (main fruit) -->
  <ellipse cx="${size/2}" cy="${size/2+20}" rx="280" ry="320" fill="url(#fruit)" filter="url(#shadow)" transform="rotate(-15 ${size/2} ${size/2+20})"/>
  
  <!-- Mango highlight -->
  <ellipse cx="${size/2-60}" cy="${size/2-40}" rx="120" ry="180" fill="#FFD54F" opacity="0.6" transform="rotate(-15 ${size/2} ${size/2+20})"/>
  
  <!-- Leaf -->
  <ellipse cx="${size/2+180}" cy="${size/2-200}" rx="80" ry="40" fill="#1B5E20" transform="rotate(30 ${size/2+180} ${size/2-200})"/>
  <ellipse cx="${size/2+140}" cy="${size/2-160}" rx="60" ry="30" fill="#2E7D32" transform="rotate(20 ${size/2+140} ${size/2-160})"/>
  
  <!-- Stem -->
  <path d="M${size/2+100} ${size/2-180} Q${size/2+60} ${size/2-120} ${size/2+40} ${size/2-80}" stroke="#5D4037" stroke-width="12" fill="none" stroke-linecap="round"/>
  
  <!-- Text -->
  <text x="${size/2}" y="${size/2+380}" text-anchor="middle" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" filter="url(#shadow)">热带水果</text>
</svg>`;

async function generateIcon() {
  try {
    const outputPath = path.join(__dirname, 'miniprogram', 'images', 'app-icon.png');
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Icon generated: ${outputPath}`);
    console.log(`Size: ${size}x${size}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateIcon();
