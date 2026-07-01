import fs from 'fs';
import pathLib from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathLib.dirname(__filename);

// 1. Read portfolio.json config
const configPath = pathLib.join(__dirname, 'portfolio.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: portfolio.json not found! Run with portfolio.json present.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('Compiling portfolio.json into dist/ folder...');

// Extract custom name and subtitle
const fullName = (data.about.name || "Carter Cypher").trim();
const subtitle = (data.about.subtitle || "(Creators Team)").trim();
const nameWords = fullName.split(/\s+/);
const firstName = nameWords[0] || "Carter";
const lastName = nameWords.slice(1).join(" ") || "Cypher";

console.log(`Using custom identity: FullName="${fullName}", FirstName="${firstName}", LastName="${lastName}", Subtitle="${subtitle}"`);

// Save current dist/index.html content if it exists before wiping dist
const distPath = pathLib.join(__dirname, 'dist');
const distIndexPath = pathLib.join(distPath, 'index.html');
let savedDistIndexContent = null;
if (fs.existsSync(distIndexPath)) {
  savedDistIndexContent = fs.readFileSync(distIndexPath, 'utf-8');
}

// Create dist/ folder
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
}
fs.mkdirSync(distPath, { recursive: true });

// Helper to recursively copy directories
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = pathLib.join(src, entry.name);
    const destPath = pathLib.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static folders to dist
const foldersToCopy = ['assets', 'images'];
foldersToCopy.forEach(folder => {
  const src = pathLib.join(__dirname, folder);
  if (fs.existsSync(src)) {
    copyDirSync(src, pathLib.join(distPath, folder));
  }
});

// Copy individual static files to dist
const filesToCopy = ['manifest.webmanifest', 'sw.js', 'workbox-9c191d2f.js'];
filesToCopy.forEach(file => {
  const src = pathLib.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, pathLib.join(distPath, file));
  }
});

// 2. Nuxt Payload Serializer
function serializePayload(data) {
  const refs = [];
  const cache = new Map();

  function getRef(v) {
    if (v === null) return null;
    if (typeof v === 'undefined') return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v;
    
    if (cache.has(v)) {
      return cache.get(v);
    }
    
    const idx = refs.length;
    cache.set(v, idx);
    
    if (Array.isArray(v)) {
      const arr = [];
      refs.push(arr);
      for (const item of v) {
        arr.push(getRef(item));
      }
    } else if (typeof v === 'object') {
      const obj = {};
      refs.push(obj);
      for (const [k, val] of Object.entries(v)) {
        obj[k] = getRef(val);
      }
    } else if (typeof v === 'string') {
      refs.push(v);
    }
    return idx;
  }

  const rootMeta = { data: 1, prerenderedAt: Date.now() };
  refs.push(rootMeta);
  refs.push(null);
  refs.push(null);

  const stateObj = {
    "wp:portfolio:overview": getRef(data.overview),
    "wp:portfolio:about": getRef(data.about),
    "wp:portfolio:detail:work": getRef(data.work),
    "wp:portfolio:detail:fashion": getRef(data.fashion),
    "wp:portfolio:detail:journey": getRef(data.journey)
  };

  refs[2] = stateObj;
  refs[1] = ["ShallowReactive", 2];

  return refs;
}

const payloadData = serializePayload(data);
const payloadStr = JSON.stringify(payloadData);

// Write _payload.json files to dist
const payloadDirs = ['', 'about', 'work', 'fashion', 'journey', '404'];
payloadDirs.forEach(dir => {
  const dirPath = pathLib.join(distPath, dir);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(pathLib.join(dirPath, '_payload.json'), payloadStr, 'utf-8');
});
console.log('Generated payload JSON files in dist/.');

// Helper to escape HTML special characters
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to update NUXT_DATA script tags
function updateNuxtData(htmlContent) {
  const regex = /(<script type="application\/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/;
  return htmlContent.replace(regex, `$1${payloadStr}$3`);
}

// Helper to update overview floating navigation images and styles
function updateFloatingNav(htmlContent) {
  let updated = htmlContent;
  data.overview.items.forEach((item, index) => {
    const classNum = index + 1;
    const styleRegex = new RegExp(`(class="--${classNum} g-float-nav__home-image"\\s+style=")([^"]*)(")`);
    const newStyle = `--color-a:${item.colors[0]};--color-b:${item.colors[1]};--color-c:${item.colors[2]};--color-d:${item.colors[3]};--nav-image-src:url(&quot;${item.thumbnailSrc}&quot;);`;
    updated = updated.replace(styleRegex, `$1${newStyle}$3`);
  });
  return updated;
}

// Helper to dynamically update hardcoded name/subtitle strings in HTML
function updateNamesAndSubtitle(content) {
  let updated = content;
  
  // Replace the loading screen and header text
  updated = updated.replace(/Kenichi Aikawa/g, fullName);
  updated = updated.replace(/Kenichi/g, firstName);
  updated = updated.replace(/Aikawa/g, lastName);
  updated = updated.replace(/\(Photographer\)/g, subtitle);
  
  return updated;
}
// 4. Restore dist/index.html to its exact pre-build state
if (savedDistIndexContent !== null) {
  fs.writeFileSync(distIndexPath, savedDistIndexContent, 'utf-8');
  console.log('Restored dist/index.html to its exact pre-build state.');
} else {
  // Fallback: if it didn't exist, copy from root
  const indexPath = pathLib.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, distIndexPath);
    console.log('Copied original index.html to dist/index.html as fallback.');
  }
}


// 5. Update and write about/index.html to dist/
const aboutPath = pathLib.join(__dirname, 'about', 'index.html');
if (fs.existsSync(aboutPath)) {
  let content = fs.readFileSync(aboutPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);
  content = updateNamesAndSubtitle(content);

  // Update profile email text
  content = content.replace(/(data-cc=")([^"]*)(")/g, `$1${data.about.email}$3`);
  content = content.replace(/(href="mailto:)([^"]*)(")/g, `$1${data.about.email}$3`);
  content = content.replace(/(<span data-cc-state-default[^>]*>)([\s\S]*?)(<\/span>)/g, `$1${data.about.email}$3`);

  // Update bio description
  content = content.replace(/(<p class="about-profile__description"[^>]*>)([\s\S]*?)(<\/p>)/, `$1${escapeHtml(data.about.description)}$3`);

  // Update instagram link text and href
  content = content.replace(/(href="https:\/\/www\.instagram\.com\/)([^"]*)(")/g, `$1${data.about.instagram}$3`);
  content = content.replace(/(class="about-profile__info-link-text-child --front"[^>]*>)([\s\S]*?)(<\/span>)/g, `$1${data.about.instagram}$3`);
  content = content.replace(/(class="about-profile__info-link-text-child --back"[^>]*>)([\s\S]*?)(<\/span>)/g, `$1${data.about.instagram}$3`);

  // Update facebook link text and href
  content = content.replace(/(href="https:\/\/www\.facebook\.com\/)([^"]*)(")/g, `$1${data.about.facebook}$3`);
  content = content.replace(/(class="about-profile__info-link-text-child --front" data-v-63d412c1>)([\s\S]*?)(<\/span>)/g, `$1${data.about.facebook}$3`);
  content = content.replace(/(class="about-profile__info-link-text-child --back" data-v-63d412c1>)([\s\S]*?)(<\/span>)/g, `$1${data.about.facebook}$3`);

  // Update main about image
  const mainImageRegex = /(<div class="gl-item gl-image"[^>]*data-gl-id="19"[^>]*style=")([^"]*)("[^>]*data-gl-src=")([^"]*)("[^>]*data-gl-src-x2=")([^"]*)("[^>]*data-gl-colors=")([^"]*)("[^>]*data-gl-width=")([^"]*)("[^>]*data-gl-height=")([^"]*)("[^>]*>)/;
  content = content.replace(mainImageRegex, (match, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13) => {
    const width = data.about.mainImage.width;
    const height = data.about.mainImage.height;
    const src = data.about.mainImage.src;
    const colors = data.about.mainImage.colors.join('|');
    return `${p1}--gl-ratio:${width} / ${height};${p3}${src}${p5}${src}${p7}${colors}${p9}${width}${p11}${height}${p13}`;
  });

  // Update background image colors & src
  const bgImageContainerRegex = /(<div class="about-background"\s+style=")([^"]*)(")/;
  const newBgStyles = `--color-a:${data.about.backgroundImage.colors[0]};--color-b:${data.about.backgroundImage.colors[1]};--color-c:${data.about.backgroundImage.colors[2]};--color-d:${data.about.backgroundImage.colors[3]};`;
  content = content.replace(bgImageContainerRegex, `$1${newBgStyles}$3`);

  const bgImageSrcRegex = /(<img class="about-background__image"\s+data-src=")([^"]*)("\s+data-src-set=")([^"]*)("\s+data-src-sizes="[^"]*"\s+width=")([^"]*)("\s+height=")([^"]*)(")/;
  content = content.replace(bgImageSrcRegex, (match, p1, p2, p3, p4, p5, p6, p7, p8, p9) => {
    const src = data.about.backgroundImage.src;
    const srcset = data.about.backgroundImage.srcset || src;
    const width = data.about.backgroundImage.width;
    const height = data.about.backgroundImage.height;
    return `${p1}${src}${p3}${srcset}${p5}${width}${p7}${height}${p9}`;
  });

  const aboutDirPath = pathLib.join(distPath, 'about');
  fs.mkdirSync(aboutDirPath, { recursive: true });
  fs.writeFileSync(pathLib.join(aboutDirPath, 'index.html'), content, 'utf-8');
  console.log('Updated and wrote dist/about/index.html');
}

// 6. Update and write work, fashion, journey HTML files to dist/
const categories = ['work', 'fashion', 'journey'];

categories.forEach(category => {
  const catPath = pathLib.join(__dirname, category, 'index.html');
  if (!fs.existsSync(catPath)) return;

  let content = fs.readFileSync(catPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);
  content = updateNamesAndSubtitle(content);

  const items = data[category].items;

  // Re-generate details-vertical items
  let verticalItemsHtml = '';
  items.forEach((item, index) => {
    verticalItemsHtml += `<div class="details-vertical__item | gl-item gl-image" style="--gl-ratio:${item.image.width} / ${item.image.height};" data-gl-dom="" data-gl-id="${item.id}" data-gl-index="${index + 1}" data-gl-src="${item.image.src}" data-gl-src-x2="${item.image.src}" data-gl-thumbnail-src="${item.image.thumbnailSrc || item.image.src}" data-gl-ratio="${item.image.width}:${item.image.height}" data-gl-colors="${item.colors.join('|')}" data-gl-width="${item.image.width}" data-gl-height="${item.image.height}" data-v-42edfcbc></div>`;
  });

  const verticalRegex = /(<div class="details-vertical__body" data-v-42edfcbc><!--\[-->)([\s\S]*?)(<!--\]-->)/;
  content = content.replace(verticalRegex, `$1${verticalItemsHtml}$3`);

  // Re-generate details-horizontal items
  let horizontalItemsHtml = '';
  items.forEach((item) => {
    horizontalItemsHtml += `<div class="details-horizontal__item" style="--gl-ratio:${item.image.width} / ${item.image.height};" data-gl-target-id="${item.id}" data-gl-colors="${item.colors.join('|')}" data-gl-width="${item.image.width}" data-gl-height="${item.image.height}" data-v-42edfcbc></div>`;
  });

  const horizontalRegex = /(<div class="details-horizontal__slider" data-v-42edfcbc>\s*<div class="details-horizontal__rect" data-v-42edfcbc><!--\[-->)([\s\S]*?)(<!--\]-->)/;
  content = content.replace(horizontalRegex, `$1${horizontalItemsHtml}$3`);

  const catDirPath = pathLib.join(distPath, category);
  fs.mkdirSync(catDirPath, { recursive: true });
  fs.writeFileSync(pathLib.join(catDirPath, 'index.html'), content, 'utf-8');
  console.log(`Updated and wrote dist/${category}/index.html`);
});

// 7. Update and copy 404/index.html to dist/
const errorPath = pathLib.join(__dirname, '404', 'index.html');
if (fs.existsSync(errorPath)) {
  let content = fs.readFileSync(errorPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);
  content = updateNamesAndSubtitle(content);
  const errDirPath = pathLib.join(distPath, '404');
  fs.mkdirSync(errDirPath, { recursive: true });
  fs.writeFileSync(pathLib.join(errDirPath, 'index.html'), content, 'utf-8');
  console.log('Updated and wrote dist/404/index.html');
}

// 8. Dynamic Name & SW Replacement in Compiled Client-side JS Assets
const scriptsPath = pathLib.join(distPath, 'assets', 'scripts');
if (fs.existsSync(scriptsPath)) {
  const jsFiles = fs.readdirSync(scriptsPath).filter(f => f.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const fullPath = pathLib.join(scriptsPath, file);
    let jsContent = fs.readFileSync(fullPath, 'utf-8');
    let hasChanged = false;
    
    // Name & Subtitle replacements with domain protection to prevent breaking image assets
    if (jsContent.includes('Kenichi') || jsContent.includes('Aikawa') || jsContent.includes('Photographer')) {
      // Protect assets domain and main site domain from replacements
      jsContent = jsContent.replace(/aikawakenichi-v2\.storage\.googleapis\.com/g, 'GCS_DOMAIN_PLACEHOLDER');
      jsContent = jsContent.replace(/aikawakenichi\.com/g, 'MAIN_DOMAIN_PLACEHOLDER');
      
      // Order of replacement is important (most specific to least specific)
      jsContent = jsContent.replace(/Kenichi Aikawa/g, fullName);
      jsContent = jsContent.replace(/Kenichi/g, firstName);
      jsContent = jsContent.replace(/Aikawa/g, lastName);
      jsContent = jsContent.replace(/\(Photographer\)/g, subtitle);
      jsContent = jsContent.replace(/Photographer/g, subtitle.replace(/[()]/g, ''));
      
      // Restore protected domains
      jsContent = jsContent.replace(/GCS_DOMAIN_PLACEHOLDER/g, 'aikawakenichi-v2.storage.googleapis.com');
      jsContent = jsContent.replace(/MAIN_DOMAIN_PLACEHOLDER/g, 'aikawakenichi.com');
      hasChanged = true;
    }
    
    if (hasChanged) {
      fs.writeFileSync(fullPath, jsContent, 'utf-8');
      console.log(`Hydration Fixed: Updated names & SW bypass inside dist/assets/scripts/${file}`);
    }
  });
}

console.log('Build completed! All assets compiled into dist/.');
