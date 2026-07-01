# Aikawa Portfolio Clone Source Project

This repository contains the editable source project for Kenichi Aikawa's WebGL photographer portfolio. It compiles to a high-performance static website that can be hosted on Vercel, GitHub Pages, or any web hosting provider.

## 🚀 Getting Started

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local server:
   ```bash
   npm run dev
   ```
3. Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## ✍️ How to Customize the Portfolio

You can change any text, images, and configuration by editing the **`portfolio.json`** file in the root directory.

### Configurable Sections:
- **`about`**: Replaces the bio description, email contact address, Instagram/Facebook social handles, and the about/background images.
- **`work`**: Set of images, titles, and layout colors for the **Work** page.
- **`fashion`**: Set of images, titles, and layout colors for the **Fashion** page.
- **`journey`**: Set of images, titles, and layout colors for the **Journey** page.

### Compile Changes:
Whenever you make changes to `portfolio.json`, compile the project by running:
```bash
npm run build
```
This automatically updates all HTML page files, meta tags, DOM layouts, and state payload (`_payload.json`) files.

---

## ☁️ Deploying to Vercel

This repository is optimized for one-click deployment on **Vercel**:

1. Push your repository to **GitHub**.
2. Connect your repository to **Vercel**.
3. In the Vercel dashboard:
   - Under **Framework Preset**, select **Other** (do NOT use Nuxt as it is a custom compiler).
   - Under **Build & Development Settings**:
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
# CarterCypher
