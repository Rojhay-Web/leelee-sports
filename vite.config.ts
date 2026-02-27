import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Optional: if you want to maintain CRA's default build output directory
  },
  css: {
    preprocessorOptions: {
      less: {
        // Add any Less.js options here
        // For example, to include paths for @import statements:
        paths: ['./src/styles/app.less'],
        javascriptEnabled: true, // Enable JavaScript in LESS if needed
      },
    },
  },
});