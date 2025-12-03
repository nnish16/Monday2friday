import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Robust Key Loading Logic
  // 1. Check OpenRouter (Vercel System -> .env)
  // 2. Check Google (Vercel System -> .env)
  // 3. Check Generic (Vercel System -> .env)
  const rawKey = 
    (process.env as any).OPENROUTER_API_KEY || env.OPENROUTER_API_KEY ||
    (process.env as any).GOOGLE_API_KEY || env.GOOGLE_API_KEY || 
    (process.env as any).API_KEY || env.API_KEY ||
    "";

  const apiKey = rawKey.trim();

  if (apiKey) {
      console.log(`[Vite] API Key loaded. Length: ${apiKey.length} chars. Starts with: ${apiKey.substring(0, 4)}...`);
  } else {
      console.warn("[Vite] WARNING: No API Key found in environment variables.");
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});