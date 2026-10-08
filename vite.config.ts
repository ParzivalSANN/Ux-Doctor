import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function chromeExtensionManifestPlugin(): PluginOption {
  return {
    name: 'chrome-extension-manifest-copier',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      const manifestSource = path.resolve(__dirname, 'manifest.json');
      if (fs.existsSync(manifestSource)) {
        const manifest = JSON.parse(fs.readFileSync(manifestSource, 'utf-8'));
        
        manifest.background = {
          service_worker: 'service-worker.js',
          type: 'module'
        };
        manifest.side_panel = {
          default_path: 'index.html'
        };
        manifest.content_scripts = [
          {
            matches: ['<all_urls>'],
            js: ['content-script.js'],
            run_at: 'document_idle'
          }
        ];

        fs.writeFileSync(
          path.resolve(distDir, 'manifest.json'),
          JSON.stringify(manifest, null, 2),
          'utf-8'
        );
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    chromeExtensionManifestPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: {
        panel: path.resolve(__dirname, 'index.html'),
        sw: path.resolve(__dirname, 'src/background/service-worker.ts'),
        content: path.resolve(__dirname, 'src/content/content-script.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'sw') {
            return 'service-worker.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content-script.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
