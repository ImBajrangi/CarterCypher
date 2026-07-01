import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse WebP dimensions from binary header
function getWebpSize(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Not a valid WebP file: ' + filePath);
  }

  const type = buf.toString('ascii', 12, 16);
  if (type === 'VP8 ') {
    const width = buf.readUInt16LE(26);
    const height = buf.readUInt16LE(28);
    return { width, height };
  } else if (type === 'VP8L') {
    const n = buf.readUInt32LE(21);
    const width = (n & 0x3FFF) + 1;
    const height = ((n >> 14) & 0x3FFF) + 1;
    return { width, height };
  } else if (type === 'VP8X') {
    // 24-bit width & height at offset 24 and 27
    const width = (buf.readUInt32LE(24) & 0xFFFFFF) + 1;
    const height = ((buf.readUInt32LE(26) >> 8) & 0xFFFFFF) + 1;
    return { width, height };
  }
  
  // Fallback to sips if parsing header fails
  return null;
}

const portfolioPath = path.join(__dirname, 'portfolio.json');
const original = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));

console.log('Rebuilding portfolio.json with team pictures...');

const updated = {
  about: {
    name: "CarterCypher",
    subtitle: "(Creators Team)",
    description: "A passionate group of visual creators, designers, and storytellers based in Tokyo, Japan. Active in Fashion, Portrait, Life style, Food, and Corporate Advertising.",
    email: "creators[at]cartercypher[dot]com",
    instagram: "carter_cypher",
    facebook: "carter_cypher",
    mainImage: {
      src: "/images/team/about_main.webp",
      srcset: "/images/team/about_main.webp 2048w",
      width: 2048,
      height: 2560,
      colors: original.about.mainImage.colors
    },
    backgroundImage: {
      src: "/images/team/about_bg.webp",
      srcset: "/images/team/about_bg.webp 2048w",
      width: 2048,
      height: 2560,
      colors: original.about.backgroundImage.colors
    }
  }
};

// 1. Overview
updated.overview = {
  items: [
    {
      id: "work",
      slug: "work",
      title: "Work",
      colors: original.overview.items[0].colors,
      thumbnailSrc: "/images/team/work_cover_thumb.webp",
      homeImage: {
        src: "/images/team/work_cover.webp",
        alt: "Work",
        width: 2560,
        height: 1714
      }
    },
    {
      id: "fashion",
      slug: "fashion",
      title: "Fashion",
      colors: original.overview.items[1].colors,
      thumbnailSrc: "/images/team/fashion_cover_thumb.webp",
      homeImage: {
        src: "/images/team/fashion_cover.webp",
        alt: "Fashion",
        width: 2560,
        height: 1770
      }
    },
    {
      id: "journey",
      slug: "journey",
      title: "Journey",
      colors: original.overview.items[2].colors,
      thumbnailSrc: "/images/team/journey_cover_thumb.webp",
      homeImage: {
        src: "/images/team/journey_cover.webp",
        alt: "Journey",
        width: 2560,
        height: 1708
      }
    }
  ]
};

// 2. Details
const categories = ['work', 'fashion', 'journey'];
categories.forEach(cat => {
  const catItems = [];
  for (let i = 1; i <= 8; i++) {
    const filename = `${cat}_${i}.webp`;
    const fullPath = path.join(__dirname, 'images', 'team', filename);
    
    let size = { width: 2560, height: 1700 }; // default fallback
    try {
      const parsedSize = getWebpSize(fullPath);
      if (parsedSize) {
        size = parsedSize;
      }
    } catch (err) {
      console.warn(`Could not parse size for ${filename}:`, err.message);
    }
    
    // Copy the original color palette for item index to maintain premium colors
    const originalItem = original[cat].items[i - 1] || original[cat].items[0];
    
    catItems.push({
      id: `${cat}-${i}`,
      colors: originalItem.colors,
      image: {
        src: `/images/team/${cat}_${i}.webp`,
        thumbnailSrc: `/images/team/${cat}_${i}_thumb.webp`,
        width: size.width,
        height: size.height
      }
    });
  }
  
  updated[cat] = {
    slug: cat,
    title: cat.charAt(0).toUpperCase() + cat.slice(1),
    description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} creators portfolio detail`,
    items: catItems
  };
});

fs.writeFileSync(portfolioPath, JSON.stringify(updated, null, 2), 'utf-8');
console.log('Successfully updated portfolio.json with team pictures.');
