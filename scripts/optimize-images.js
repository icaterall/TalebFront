// scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../src/assets');
const OUTPUT_DIR = path.join(__dirname, '../src/assets/optimized');

const IMAGE_FORMATS = {
  jpg: { quality: 85, progressive: true },
  png: { quality: 90, compressionLevel: 9 },
  webp: { quality: 85 }
};

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err);
  }
}

async function getImageFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const imageFiles = [];
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      imageFiles.push(...await getImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png|gif|svg)$/i.test(file.name)) {
      imageFiles.push(fullPath);
    }
  }
  
  return imageFiles;
}

async function optimizeImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const name = path.basename(inputPath, ext);
  const relativePath = path.relative(ASSETS_DIR, inputPath);
  const outputDir = path.join(OUTPUT_DIR, path.dirname(relativePath));
  
  await ensureDir(outputDir);
  
  if (ext === '.svg') {
    // Copy SVG files as-is (already optimized)
    await fs.copyFile(inputPath, path.join(outputDir, path.basename(inputPath)));
    console.log(`Copied: ${relativePath}`);
    return;
  }
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Generate different sizes for responsive images
    const sizes = [
      { width: 320, suffix: '-320w' },
      { width: 640, suffix: '-640w' },
      { width: 1280, suffix: '-1280w' },
      { width: 1920, suffix: '-1920w' }
    ];
    
    for (const size of sizes) {
      if (metadata.width >= size.width) {
        // JPEG version
        await image
          .resize(size.width)
          .jpeg(IMAGE_FORMATS.jpg)
          .toFile(path.join(outputDir, `${name}${size.suffix}.jpg`));
        
        // WebP version
        await image
          .resize(size.width)
          .webp(IMAGE_FORMATS.webp)
          .toFile(path.join(outputDir, `${name}${size.suffix}.webp`));
      }
    }
    
    // Original optimized version
    if (ext === '.png') {
      await image
        .png(IMAGE_FORMATS.png)
        .toFile(path.join(outputDir, `${name}.png`));
    } else {
      await image
        .jpeg(IMAGE_FORMATS.jpg)
        .toFile(path.join(outputDir, `${name}.jpg`));
    }
    
    // Always create WebP version
    await image
      .webp(IMAGE_FORMATS.webp)
      .toFile(path.join(outputDir, `${name}.webp`));
    
    console.log(`Optimized: ${relativePath}`);
  } catch (err) {
    console.error(`Error optimizing ${inputPath}:`, err);
  }
}

async function generateIconSizes() {
  const logoPath = path.join(ASSETS_DIR, 'logo.png');
  const iconsDir = path.join(ASSETS_DIR, 'icons');
  
  await ensureDir(iconsDir);
  
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of sizes) {
    try {
      await sharp(logoPath)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
      
      console.log(`Generated icon: ${size}x${size}`);
    } catch (err) {
      console.error(`Error generating ${size}x${size} icon:`, err);
    }
  }
  
  // Generate favicon
  await sharp(logoPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon-32x32.png'));
  
  await sharp(logoPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon-16x16.png'));
  
  // Generate Apple touch icon
  await sharp(logoPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(ASSETS_DIR, 'apple-touch-icon.png'));
  
  console.log('Generated favicons and touch icons');
}

async function main() {
  console.log('Starting image optimization...');
  
  // Optimize all images
  const imageFiles = await getImageFiles(ASSETS_DIR);
  
  for (const file of imageFiles) {
    if (!file.includes('/optimized/') && !file.includes('/icons/')) {
      await optimizeImage(file);
    }
  }
  
  // Generate PWA icons
  if (await fs.access(path.join(ASSETS_DIR, 'logo.png')).then(() => true).catch(() => false)) {
    await generateIconSizes();
  }
  
  console.log('Image optimization complete!');
  
  // Generate picture elements helper
  const pictureHelper = `
<!-- Usage example for optimized images -->
<picture>
  <source type="image/webp" 
          srcset="/assets/optimized/hero-320w.webp 320w,
                  /assets/optimized/hero-640w.webp 640w,
                  /assets/optimized/hero-1280w.webp 1280w,
                  /assets/optimized/hero-1920w.webp 1920w"
          sizes="(max-width: 640px) 100vw, 
                 (max-width: 1280px) 50vw, 
                 33vw">
  <img src="/assets/optimized/hero-1280w.jpg" 
       alt="Description"
       loading="lazy"
       decoding="async">
</picture>`;
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'picture-usage.html'),
    pictureHelper,
    'utf8'
  );
  
  console.log('Generated picture element usage guide');
}

main().catch(console.error);