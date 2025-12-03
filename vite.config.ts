import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Robust Key Loading Logic
  // Prioritize OPENROUTER_API_KEY as per user request
  const rawKey = 
    (process.env as any).OPENROUTER_API_KEY || env.OPENROUTER_API_KEY ||
    (process.env as any).GOOGLE_API_KEY || env.GOOGLE_API_KEY || 
    (process.env as any).API_KEY || env.API_KEY ||
    "";

  const apiKey = rawKey.trim();

  if (apiKey) {
      console.log(`[Vite] API Key loaded. Length: ${apiKey.length} chars.`);
  } else {
      console.warn("[Vite] WARNING: No API Key found in environment variables.");
  }

  return {
    plugins: [react()],
    define: {
      // Expose the resolved key strictly as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});