import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read portfolio.json config
const configPath = path.join(__dirname, 'portfolio.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: portfolio.json not found! Run with portfolio.json present.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

console.log('Compiling portfolio.json...');

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

// 3. Write _payload.json files
const pathsToPayloads = [
  path.join(__dirname, '_payload.json'),
  path.join(__dirname, 'work', '_payload.json'),
  path.join(__dirname, 'fashion', '_payload.json'),
  path.join(__dirname, 'journey', '_payload.json')
];

for (const p of pathsToPayloads) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, payloadStr, 'utf-8');
}
console.log('Generated payload JSON files successfully.');

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

// 4. Update index.html
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);
  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log('Updated index.html');
}

// 5. Update about/index.html
const aboutPath = path.join(__dirname, 'about', 'index.html');
if (fs.existsSync(aboutPath)) {
  let content = fs.readFileSync(aboutPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);

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

  fs.writeFileSync(aboutPath, content, 'utf-8');
  console.log('Updated about/index.html');
}

// 6. Update work, fashion, journey HTML files
const categories = ['work', 'fashion', 'journey'];

categories.forEach(category => {
  const catPath = path.join(__dirname, category, 'index.html');
  if (!fs.existsSync(catPath)) return;

  let content = fs.readFileSync(catPath, 'utf-8');
  content = updateNuxtData(content);
  content = updateFloatingNav(content);

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

  fs.writeFileSync(catPath, content, 'utf-8');
  console.log(`Updated ${category}/index.html`);
});

console.log('Build completed! Synced all configurations successfully.');
