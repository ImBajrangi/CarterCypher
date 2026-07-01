import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = '/Users/sakhi/Downloads/Creators';
const destDir = path.join(__dirname, 'images', 'team');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Converting and resizing team pictures...');

// Helper to run cwebp command
function convertImage(inputPath, outputPath, resizeWidth = null) {
  let cmd = `cwebp -q 80`;
  if (resizeWidth) {
    cmd += ` -resize ${resizeWidth} 0`;
  }
  cmd += ` "${inputPath}" -o "${outputPath}"`;
  
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch (err) {
    console.error(`Failed to convert ${inputPath}:`, err.message);
  }
}

// 1. Process category cover / about images
const specialMappings = [
  { name: 'about_main.webp', src: 'a2.webp', thumb: true },
  { name: 'about_bg.webp', src: 'a3.webp', thumb: false },
  { name: 'work_cover.webp', src: 'bhushan.png', thumb: true },
  { name: 'fashion_cover.webp', src: 'image.png', thumb: true },
  { name: 'journey_cover.webp', src: 'r.webp', thumb: true }
];

specialMappings.forEach(mapping => {
  const input = path.join(srcDir, mapping.src);
  const output = path.join(destDir, mapping.name);
  if (fs.existsSync(input)) {
    convertImage(input, output);
    if (mapping.thumb) {
      const ext = path.extname(mapping.name);
      const base = path.basename(mapping.name, ext);
      const thumbOutput = path.join(destDir, `${base}_thumb.webp`);
      convertImage(input, thumbOutput, 256);
    }
  } else {
    console.warn(`Warning: source image ${mapping.src} not found.`);
  }
});

// 2. Process work (Bhushan) items (1 to 8)
for (let i = 1; i <= 8; i++) {
  const srcName = i === 1 ? 'bhushan.png' : `bhushan${i}.png`;
  const input = path.join(srcDir, srcName);
  const output = path.join(destDir, `work_${i}.webp`);
  const thumbOutput = path.join(destDir, `work_${i}_thumb.webp`);

  if (fs.existsSync(input)) {
    convertImage(input, output);
    convertImage(input, thumbOutput, 256);
    console.log(`Converted work item ${i}`);
  }
}

// 3. Process fashion (image) items (1 to 8)
for (let i = 1; i <= 8; i++) {
  const srcName = i === 1 ? 'image.png' : `image${i}.png`;
  const input = path.join(srcDir, srcName);
  const output = path.join(destDir, `fashion_${i}.webp`);
  const thumbOutput = path.join(destDir, `fashion_${i}_thumb.webp`);

  if (fs.existsSync(input)) {
    convertImage(input, output);
    convertImage(input, thumbOutput, 256);
    console.log(`Converted fashion item ${i}`);
  }
}

// 4. Process journey (r) items (1 to 8)
for (let i = 1; i <= 8; i++) {
  const ext = i === 8 ? '.png' : '.webp';
  const srcName = i === 1 ? 'r.webp' : `r${i}${ext}`;
  const input = path.join(srcDir, srcName);
  const output = path.join(destDir, `journey_${i}.webp`);
  const thumbOutput = path.join(destDir, `journey_${i}_thumb.webp`);

  if (fs.existsSync(input)) {
    convertImage(input, output);
    convertImage(input, thumbOutput, 256);
    console.log(`Converted journey item ${i}`);
  }
}

console.log('All image conversions completed.');
