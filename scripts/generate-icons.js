const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const png2icons = require('png2icons');

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
    
    // Create ICNS file
    const pngBuffer = fs.readFileSync(tempPngPath);
    const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
    const icnsPath = path.join(iconOutputDir, 'icon.icns');
    fs.writeFileSync(icnsPath, icnsBuffer);
    console.log('Generated ICNS:', icnsPath);
    
    // Create ICO file
    const icoBuffer = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, false);
    const icoPath = path.join(iconOutputDir, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Generated ICO:', icoPath);
    
    console.log('\nIcon generation completed successfully!');
    console.log('Generated files:');
    console.log(`- macOS: ${icnsPath}`);
    console.log(`- Windows: ${icoPath}`);
    console.log(`- PNG sizes: 16, 32, 64, 128, 256, 512, 1024`);
  })
  .catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
  });
