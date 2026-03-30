import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/Poo-Poo-Dog-V02-app/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      format: {
        comments: /^\**!|@preserve|@license|@cc_on|Copyright/i
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  optimizeDeps: {
    include: ['leaflet', 'chart.js', 'jspdf', 'jspdf-autotable', 'leaflet.markercluster']
  }
});
