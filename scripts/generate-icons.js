const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { execSync } = require('child_process');

// Ensure directories exist
const iconSourceDir = path.join(__dirname, '../electron/assets');
const iconOutputDir = path.join(__dirname, '../electron/assets/icons');
const tempPngPath = path.join(iconOutputDir, 'icon-1024.png');

if (!fs.existsSync(iconOutputDir)) {
  fs.mkdirSync(iconOutputDir, { recursive: true });
}

console.log('Converting SVG to PNG...');
console.log('Source SVG:', path.join(iconSourceDir, 'icon.svg'));
console.log('Output directory:', iconOutputDir);

// First convert SVG to PNG with sharp
sharp(path.join(iconSourceDir, 'icon.svg'))
  .resize(1024, 1024)
  .png()
  .toFile(tempPngPath)
  .then(() => {
    console.log('SVG converted to PNG successfully');
    
    // Generate multiple PNG sizes
    const sizes = [16, 32, 64, 128, 256, 512, 1024];
    const pngPromises = sizes.map(size => {
      const outputPath = path.join(iconOutputDir, `icon-${size}.png`);
      return sharp(path.join(iconSourceDir, 'icon.svg'))
        .resize(size, size)
        .png()
        .toFile(outputPath)
        .then(() => console.log(`Generated ${size}x${size} PNG`));
    });
    
    return Promise.all(pngPromises);
  })
  .then(() => {
    console.log('Generated all PNG sizes');
    
    // Create ICNS file using macOS iconutil (if available)
    const icnsPath = path.join(iconOutputDir, 'icon.icns');
    const icoPath = path.join(iconOutputDir, 'icon.ico');
    
    try {
      if (process.platform === 'darwin') {
        // Create iconset directory structure for macOS
        const iconsetDir = path.join(iconOutputDir, 'icon.iconset');
        if (!fs.existsSync(iconsetDir)) {
          fs.mkdirSync(iconsetDir, { recursive: true });
        }
        
        // Copy PNG files to iconset with proper naming
        const iconsetSizes = [
          { size: 16, name: 'icon_16x16.png' },
          { size: 32, name: 'icon_16x16@2x.png' },
          { size: 32, name: 'icon_32x32.png' },
          { size: 64, name: 'icon_32x32@2x.png' },
          { size: 128, name: 'icon_128x128.png' },
          { size: 256, name: 'icon_128x128@2x.png' },
          { size: 256, name: 'icon_256x256.png' },
          { size: 512, name: 'icon_256x256@2x.png' },
          { size: 512, name: 'icon_512x512.png' },
          { size: 1024, name: 'icon_512x512@2x.png' }
        ];
        
        for (const { size, name } of iconsetSizes) {
          const sourcePath = path.join(iconOutputDir, `icon-${size}.png`);
          const destPath = path.join(iconsetDir, name);
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
          }
        }
        
        // Generate ICNS using iconutil
        execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
        console.log('Generated ICNS:', icnsPath);
        
        // Clean up iconset directory
        fs.rmSync(iconsetDir, { recursive: true, force: true });
      } else {
        console.log('Skipping ICNS generation (not on macOS)');
      }
    } catch (err) {
      console.warn('Could not generate ICNS file:', err.message);
    }
    
    // Create a simple ICO file using Sharp (basic approach)
    try {
      // For ICO, we'll just copy the 256x256 PNG as a fallback
      const png256Path = path.join(iconOutputDir, 'icon-256.png');
      if (fs.existsSync(png256Path)) {
        fs.copyFileSync(png256Path, icoPath.replace('.ico', '.png'));
        console.log('Generated ICO (as PNG):', icoPath.replace('.ico', '.png'));
      }
    } catch (err) {
      console.warn('Could not generate ICO file:', err.message);
    }
    
    console.log('\nIcon generation completed successfully!');
    console.log('Generated files:');
    if (fs.existsSync(icnsPath)) console.log(`- macOS: ${icnsPath}`);
    console.log(`- PNG sizes: 16, 32, 64, 128, 256, 512, 1024`);
  })
  .catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
  });
