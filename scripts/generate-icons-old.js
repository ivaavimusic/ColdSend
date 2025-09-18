const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Ensure directories exist
const iconSourceDir = path.join(__dirname, '../electron/assets');
const iconOutputDir = path.join(__dirname, '../electron/assets/icons');
const tempPngPath = path.join(iconOutputDir, 'icon-1024.png');

if (!fs.existsSync(iconOutputDir)) {
  fs.mkdirSync(iconOutputDir, { recursive: true });
}

console.log('Converting SVG to PNG...');
console.log('Source SVG:', path.join(iconSourceDir, 'icon.svg'));
console.log('Temp PNG:', tempPngPath);

// First convert SVG to PNG with sharp
sharp(path.join(iconSourceDir, 'icon.svg'))
  .resize(1024, 1024)
  .png()
  .toFile(tempPngPath)
  .then(() => {
    console.log('SVG converted to PNG successfully');
    console.log('Generating icons from PNG...');
    
    try {
      // Run electron-icon-builder with the PNG
      const command = `npx electron-icon-builder --input="${tempPngPath}" --output="${iconOutputDir}" --flatten`;
      console.log(`Executing: ${command}`);
      
      execSync(command, { stdio: 'inherit' });
      
      console.log('\nIcon generation completed successfully!');
      console.log('Generated files:');
      console.log(`- macOS: ${path.join(iconOutputDir, 'icons/mac/icon.icns')}`);
      console.log(`- Windows: ${path.join(iconOutputDir, 'icons/win/icon.ico')}`);
      console.log(`- Linux: ${path.join(iconOutputDir, 'icons/png')}`);
    } catch (error) {
      console.error('\nError generating icons:', error.message);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Error converting SVG to PNG:', err);
    process.exit(1);
  });
