import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { copyFileSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';

/**
 * Manifest copy plugin — src/manifest.json → dist/manifest.json
 */
function manifestCopyPlugin() {
  return {
    name: 'manifest-copy',
    closeBundle() {
      const src = resolve(__dirname, 'src/manifest.json');
      const dest = resolve(__dirname, 'dist/manifest.json');
      mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
      copyFileSync(src, dest);
      console.log('[manifest-copy] manifest.json → dist/manifest.json ✓');
    },
  };
}

/**
 * Rebase HTML plugin — moves dist/src/popup/index.html → dist/popup/index.html
 * Vite preserves directory structure relative to project root; this corrects it.
 * Also rewrites relative asset paths: ../../assets/ → ../assets/ (one level less depth).
 */
function rebaseHtmlPlugin() {
  return {
    name: 'rebase-html',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const moves: [string, string][] = [
        ['src/popup/index.html', 'popup/index.html'],
        ['src/options/index.html', 'options/index.html'],
      ];
      for (const [src, dest] of moves) {
        const srcPath = resolve(distDir, src);
        const destPath = resolve(distDir, dest);
        if (!existsSync(srcPath)) continue;
        mkdirSync(dirname(destPath), { recursive: true });
        // Read HTML content and fix relative asset paths
        let html = readFileSync(srcPath, 'utf-8');
        html = html.replace(/\.\.\/\.\.\/assets\//g, '../assets/');
        writeFileSync(destPath, html, 'utf-8');
        rmSync(srcPath);
        console.log(`[rebase-html] ${src} → ${dest} (paths fixed) ✓`);
      }
      // Clean up empty src/ dir in dist if it exists
      try {
        rmSync(resolve(distDir, 'src'), { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };
}

/**
 * IIFE wrapper plugin — content script çıktılarını IIFE ile sarar.
 * Chrome content script'leri global scope'u kirletmemeli.
 */
function iifeWrapPlugin() {
  const targets = ['content-scripts/recorder.js', 'content-scripts/snapshot.js'];
  return {
    name: 'iife-wrap',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      for (const file of targets) {
        const filePath = resolve(distDir, file);
        if (!existsSync(filePath)) continue;
        const code = readFileSync(filePath, 'utf-8');
        writeFileSync(filePath, `(function(){\n${code}\n})();\n`, 'utf-8');
        console.log(`[iife-wrap] ${file} wrapped ✓`);
      }
    },
  };
}

export default defineConfig(() => ({
  plugins: [preact(), tailwindcss(), manifestCopyPlugin(), rebaseHtmlPlugin(), iifeWrapPlugin()],

  // Chrome extension: use relative paths so assets load from extension root
  base: './',

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        recorder: resolve(__dirname, 'src/content-scripts/recorder.ts'),
        snapshot: resolve(__dirname, 'src/content-scripts/snapshot.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/index.js';
          if (chunkInfo.name === 'recorder') return 'content-scripts/recorder.js';
          if (chunkInfo.name === 'snapshot') return 'content-scripts/snapshot.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
