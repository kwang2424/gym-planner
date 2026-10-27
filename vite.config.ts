import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages (served from /<repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
});
