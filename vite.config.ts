import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We explicitly check process.cwd() and cast to any to avoid TS errors
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // OpenRouter or Google Key
  const apiKey = env.OPENROUTER_API_KEY || env.GOOGLE_API_KEY || env.API_KEY || 
                 (process.env as any).OPENROUTER_API_KEY || (process.env as any).GOOGLE_API_KEY || (process.env as any).API_KEY;

  return {
    plugins: [react()],
    define: {
      // We map process.env.API_KEY in the code to our resolved key
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});