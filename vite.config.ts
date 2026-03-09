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
 * Chrome content script'leri ES module olarak yüklenmez, bu yüzden
 * Rollup'ın ürettiği import ifadelerini çözümleyip inline eder.
 */
function iifeWrapPlugin() {
  const targets = [
    'content-scripts/page-interceptors.js',
    'content-scripts/recorder.js',
    'content-scripts/snapshot.js',
  ];
  return {
    name: 'iife-wrap',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      for (const file of targets) {
        const filePath = resolve(distDir, file);
        if (!existsSync(filePath)) continue;
        let code = readFileSync(filePath, 'utf-8');

        // ES module import'larını çözümle — content script'ler module değil
        code = inlineImports(code, filePath);

        writeFileSync(filePath, `(function(){\n${code}\n})();\n`, 'utf-8');
        console.log(`[iife-wrap] ${file} wrapped ✓`);
      }
    },
  };
}

/**
 * Content script'teki import ifadelerini çözümler:
 * 1. Chunk dosyasını okur, export mapping'ini parse eder
 * 2. Chunk kodunu kendi scope'unda çalıştırıp, sadece gereken değerleri döndüren bir IIFE üretir
 * 3. Import binding'lerini bu IIFE'nin dönüş değerine bağlar
 *
 * Bu yaklaşım isim çakışmalarını önler — chunk kodu kendi scope'unda kalır.
 */
function inlineImports(code: string, filePath: string): string {
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*"([^"]+)"\s*;?/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const bindingsStr = match[1];
    const relPath = match[2];
    const chunkPath = resolve(dirname(filePath), relPath);
    if (!existsSync(chunkPath)) continue;

    let chunkCode = readFileSync(chunkPath, 'utf-8');

    // Chunk'taki export mapping'ini parse et: export{a as M, b as Q, R}
    const exportMap = new Map<string, string>(); // exportName → internalName
    chunkCode = chunkCode.replace(/export\s*\{([^}]+)\}\s*;?/g, (_m, exportsStr: string) => {
      for (const part of exportsStr.split(',')) {
        const trimmed = part.trim();
        const asMatch = trimmed.match(/^(\S+)\s+as\s+(\S+)$/);
        if (asMatch) {
          exportMap.set(asMatch[2], asMatch[1]);
        } else {
          exportMap.set(trimmed, trimmed);
        }
      }
      return '';
    });

    // Import binding'lerini parse et
    const bindings: Array<{ exportName: string; localName: string }> = [];
    for (const part of bindingsStr.split(',')) {
      const trimmed = part.trim();
      const asMatch = trimmed.match(/^(\S+)\s+as\s+(\S+)$/);
      bindings.push({
        exportName: asMatch ? asMatch[1] : trimmed,
        localName: asMatch ? asMatch[2] : trimmed,
      });
    }

    // Chunk kodunu kendi scope'unda çalıştırıp gereken export'ları döndüren IIFE üret
    const returnObj = bindings
      .map((b) => `${b.exportName}:${exportMap.get(b.exportName) ?? b.exportName}`)
      .join(',');
    const wrappedChunk = `var __chunk__=(function(){${chunkCode.trim()};return{${returnObj}}})();`;
    const localVars = bindings.map((b) => `var ${b.localName}=__chunk__.${b.exportName};`).join('');

    code = code.replace(match[0], wrappedChunk + localVars);
    importRegex.lastIndex = 0;
  }
  return code;
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
        'page-interceptors': resolve(__dirname, 'src/content-scripts/page-interceptors.js'),
        recorder: resolve(__dirname, 'src/content-scripts/recorder.ts'),
        snapshot: resolve(__dirname, 'src/content-scripts/snapshot.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/index.js';
          if (chunkInfo.name === 'page-interceptors') return 'content-scripts/page-interceptors.js';
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
