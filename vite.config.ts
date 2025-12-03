import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // We map process.env.API_KEY in the code to either API_KEY or GOOGLE_API_KEY from the environment
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GOOGLE_API_KEY)
    }
  };
});