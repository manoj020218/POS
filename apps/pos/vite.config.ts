import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Lets the running app show which build it actually is (displayed on the
    // login screen) -- otherwise there's no way to tell a stale install
    // apart from the latest one while iterating on release builds quickly.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173
  }
});
