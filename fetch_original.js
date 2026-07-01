import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalDir = path.join(__dirname, 'original');
if (!fs.existsSync(originalDir)) {
  fs.mkdirSync(originalDir, { recursive: true });
}

const urls = [
  { url: 'https://aikawakenichi.com/', file: 'index.html' },
  { url: 'https://aikawakenichi.com/about/', file: 'about/index.html' },
  { url: 'https://aikawakenichi.com/work/', file: 'work/index.html' },
  { url: 'https://aikawakenichi.com/fashion/', file: 'fashion/index.html' },
  { url: 'https://aikawakenichi.com/journey/', file: 'journey/index.html' },
  { url: 'https://aikawakenichi.com/_payload.json', file: '_payload.json' },
  { url: 'https://aikawakenichi.com/work/_payload.json', file: 'work/_payload.json' },
  { url: 'https://aikawakenichi.com/fashion/_payload.json', file: 'fashion/_payload.json' },
  { url: 'https://aikawakenichi.com/journey/_payload.json', file: 'journey/_payload.json' },
  { url: 'https://aikawakenichi.com/about/_payload.json', file: 'about/_payload.json' }
];

async function fetchFile({ url, file }) {
  const destPath = path.join(originalDir, file);
  const destDirPath = path.dirname(destPath);
  if (!fs.existsSync(destDirPath)) {
    fs.mkdirSync(destDirPath, { recursive: true });
  }

  console.log(`Fetching ${url} -> ${destPath}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(destPath, text, 'utf-8');
    console.log(`Saved ${file} successfully.`);
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
  }
}

async function run() {
  for (const urlObj of urls) {
    await fetchFile(urlObj);
  }
  console.log('Finished fetching original files.');
}

run();
