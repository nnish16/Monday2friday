import { GoogleGenAI, Type } from "@google/genai";
import { AGENT_CONFIG, OPTIMIZATION_OPTIONS, PM_SUMMARY_TEMPLATE } from "../constants";
import { ResumeData, OptimizationFilter, SummaryOptimization, SkillsOptimization, AgentPersona } from "../types";

// --- API CONFIGURATION ---
const API_KEY = (process.env as any).API_KEY || "";

// Detect Provider based on Key Format
// Google Keys always start with 'AIza'
// OpenRouter keys usually start with 'sk-or-' or similar
const IS_GOOGLE_KEY = API_KEY.startsWith("AIza");
const PROVIDER_NAME = IS_GOOGLE_KEY ? "GOOGLE_NATIVE" : "OPENROUTER";

console.log(`[System] Initializing AI Service. Provider Detected: ${PROVIDER_NAME}`);

// Initialize Google SDK (Only used if IS_GOOGLE_KEY is true)
let googleAI: GoogleGenAI | null = null;
if (IS_GOOGLE_KEY) {
  googleAI = new GoogleGenAI({ apiKey: API_KEY });
}

// --- OPENROUTER MODEL MAPPING ---
// Using stable models to ensure reliability
const OPENROUTER_MODELS = {
    FRIDAY: "google/gemini-2.0-flash-001", 
    MONDAY: "google/gemini-2.0-flash-001" // Using Flash for both on OpenRouter for maximum stability, differenced by System Prompt
};

// --- SCHEMAS (Shared) ---
const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    healthScore: { type: Type.NUMBER, description: "Score from 1-10 based on PM best practices" },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of critical resume issues" },
    topPriorities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 most important fixes needed" },
    summary: { type: Type.STRING, description: "The existing professional summary text found in the resume" },
    roles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          company: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

const optimizationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    avcr_analysis: {
      type: Type.OBJECT,
      properties: {
        action_verb: { 
            type: Type.OBJECT, 
            properties: { 
                current: { type: Type.STRING }, 
                strength: { type: Type.STRING, enum: ["STRONG", "WEAK", "MISSING"] }, 
                feedback: { type: Type.STRING } 
            } 
        },
        context: { 
            type: Type.OBJECT, 
            properties: { 
                current: { type: Type.STRING }, 
                clarity: { type: Type.STRING, enum: ["CLEAR", "VAGUE", "MISSING"] }, 
                feedback: { type: Type.STRING } 
            } 
        },
        result: { 
            type: Type.OBJECT, 
            properties: { 
                current: { type: Type.STRING }, 
                specificity: { type: Type.STRING, enum: ["SPECIFIC", "VAGUE", "MISSING"] }, 
                feedback: { type: Type.STRING } 
            } 
        },
        metric: { 
            type: Type.OBJECT, 
            properties: { 
                current: { type: Type.STRING }, 
                quantified: { type: Type.BOOLEAN }, 
                feedback: { type: Type.STRING } 
            } 
        }
      }
    },
    rewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          rationale: { type: Type.STRING },
          label: { type: Type.STRING },
          isRecommended: { type: Type.BOOLEAN }
        }
      }
    }
  }
};

const summaryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    rewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          rationale: { type: Type.STRING },
          label: { type: Type.STRING },
          isRecommended: { type: Type.BOOLEAN }
        }
      }
    }
  }
};

const skillsResponseSchema = {
  type: Type.OBJECT,
  properties: {
    categorized: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    missing_critical: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
  }
};

export class GeminiService {
  private currentPersona: AgentPersona = 'FRIDAY';

  setPersona(persona: AgentPersona) {
    this.currentPersona = persona;
    console.log(`[System] Persona switched to: ${persona}`);
  }

  private getSystemInstruction() {
      return AGENT_CONFIG[this.currentPersona].systemInstruction;
  }

  /**
   * Unified Generation Method
   * Decides which provider to use based on the API Key format.
   */
  private async generate(prompt: string, schema?: any, isChat = false): Promise<any> {
      if (!API_KEY) {
          throw new Error("API Key is missing. Please check your Vercel Environment Variables (OPENROUTER_API_KEY or GOOGLE_API_KEY).");
      }

      if (IS_GOOGLE_KEY) {
          return this.callGoogleNative(prompt, schema);
      } else {
          return this.callOpenRouter(prompt, schema);
      }
  }

  /**
   * Google Native Implementation (Uses @google/genai SDK)
   * Best for reliability if using a Google Key.
   */
  private async callGoogleNative(prompt: string, schema?: any) {
      if (!googleAI) throw new Error("Google AI SDK not initialized");
      
      const config = AGENT_CONFIG[this.currentPersona].modelConfig;
      
      try {
          const response = await googleAI.models.generateContent({
              model: config.model,
              contents: prompt,
              config: {
                  systemInstruction: this.getSystemInstruction(),
                  responseMimeType: schema ? "application/json" : "text/plain",
                  responseSchema: schema,
                  ...config.config
              }
          });

          if (schema) {
              const text = response.text || "{}";
              try {
                return JSON.parse(text);
              } catch (e) {
                console.error("JSON Parse Error (Google):", text);
                throw new Error("Failed to parse JSON from Google Native API");
              }
          }
          return response.text;
      } catch (error: any) {
          console.error("Google Native API Error:", error);
          throw error;
      }
  }

  /**
   * OpenRouter Implementation (Uses fetch)
   * Works with OpenRouter keys to access Google models.
   */
  private async callOpenRouter(prompt: string, schema?: any) {
      const modelId = OPENROUTER_MODELS[this.currentPersona];
      
      // Prepare System Message
      // We manually inject the schema into the system prompt because 
      // not all OpenRouter models/gateways support 'response_format' correctly.
      let systemContent = this.getSystemInstruction();
      
      if (schema) {
          systemContent += `\n\n[CRITICAL INSTRUCTION]\nYou must output your response as valid, strictly parsable JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\n\nDo not include markdown code blocks (like \`\`\`json). Just return the raw JSON string.`;
      }

      const messages = [
          { role: "system", content: systemContent },
          { role: "user", content: prompt }
      ];

      try {
          console.log(`[OpenRouter] Requesting ${modelId}...`);
          
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${API_KEY}`,
                  "HTTP-Referer": "https://monday2friday.vercel.app",
                  "X-Title": "Monday2Friday Agent",
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({
                  model: modelId,
                  messages: messages,
                  // We DO NOT send response_format: { type: "json_object" } 
                  // to avoid 400 errors from providers that don't support it strictly.
                  // We rely on the system prompt instruction above.
              })
          });

          if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              console.error(`OpenRouter Error (${response.status}):`, err);
              throw new Error(`OpenRouter API Error (${response.status}): ${err.error?.message || 'Unknown Error'}`);
          }

          const result = await response.json();
          const content = result.choices?.[0]?.message?.content;

          if (!content) throw new Error("No content received from OpenRouter");

          if (schema) {
              // Robust JSON cleaning
              const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
              try {
                  return JSON.parse(cleanJson);
              } catch (e) {
                  console.error("JSON Parse Error (OpenRouter):", cleanJson);
                  throw new Error("AI returned invalid JSON. Please try again.");
              }
          }

          return content;
      } catch (error: any) {
          console.error("OpenRouter Request Failed:", error);
          throw error;
      }
  }

  // --- PUBLIC METHODS ---

  async analyzeResume(text: string): Promise<ResumeData> {
    const prompt = `
    Analyze the following resume text. 
    Parse it into structured data. 
    Calculate a health score (1-10) based on PM best practices (Metrics, Action Verbs, AVCR format).
    Identify red flags.
    
    IMPORTANT CONTEXT: Assume the current date is December 2025. Treat dates like "Sept 2025" or "September 2025" as past events.
    
    Resume Text:
    ${text}
    `;

    try {
        const data = await this.generate(prompt, analysisResponseSchema);
        
        return {
            healthScore: data.healthScore || 5,
            redFlags: data.redFlags || [],
            topPriorities: data.topPriorities || [],
            summary: data.summary || "",
            skills: data.skills || [],
            roles: (data.roles || []).map((r: any, rIdx: number) => ({
                id: `role-${rIdx}`,
                title: r.title || "Untitled Role",
                company: r.company || "Unknown Company",
                bullets: (r.bullets || []).map((b: string, bIdx: number) => ({
                    id: `bullet-${rIdx}-${bIdx}`,
                    original: b,
                    status: 'PENDING'
                }))
            }))
        };
    } catch (error: any) {
        console.error("Resume Analysis Failed:", error);
        throw error;
    }
  }

  async optimizeBullet(bullet: string, context: string, filters: OptimizationFilter[] = []): Promise<any> {
    let styleInstruction = "";
    
    if (filters.length === 0) {
        styleInstruction = `
        Requirements for Rewrites (Provide exactly 3 DISTINCT options):
        1. OPTION 1 (Label: "Concise 1-Liner"): STRICTLY 1 LINE. High-impact, punchy, under 140 chars. 
        2. OPTION 2 (Label: "High Impact"): Focus heavily on metrics, results, and numbers.
        3. OPTION 3 (Label: "Executive/Balanced"): The best overall balance of context, result, and metric.
        
        Mark the strongest option as isRecommended: true.
        `;
    } else {
        const activeLabels = filters.map(f => OPTIMIZATION_OPTIONS.find(o => o.id === f)?.label || f).join(', ');
        styleInstruction = `
        Requirements for Rewrites (Provide exactly 3 options):
        Filters applied: [${activeLabels}].
        All 3 options must adhere strictly to these filters.
        Mark the best option as isRecommended: true.
        `;
    }

    const prompt = `
    Analyze this specific resume bullet point using the AVCR framework.
    Role Context: ${context}
    Bullet: "${bullet}"
    
    Context: Assume current date is December 2025.
    
    ${styleInstruction}
    `;

    return await this.generate(prompt, optimizationResponseSchema);
  }

  async optimizeSummary(currentSummary: string, resumeContext: string): Promise<SummaryOptimization> {
    const prompt = `
      Analyze the current Professional Summary and the full Resume Context.
      Current Summary: "${currentSummary}"
      Resume Context: "${resumeContext}"
      
      Requirements:
      Provide exactly 3 rewrite options.
      
      1. OPTION 1 (Label: "Standard Template"): MUST STRICTLY FOLLOW THIS TEMPLATE:
         "${PM_SUMMARY_TEMPLATE}"
         
         Extract the required fields from the Resume Context to fill the template.
      
      2. OPTION 2 (Label: "Executive/Strategic"): Focus on leadership.
      3. OPTION 3 (Label: "Growth/Impact"): Focus on metrics and immediate value.
      
      Highlight the best option as recommended.
    `;
    
    return await this.generate(prompt, summaryResponseSchema);
  }

  async optimizeSkills(currentSkills: string[]): Promise<SkillsOptimization> {
    const prompt = `
      Analyze this list of skills for a Product Manager role.
      Current Skills: ${JSON.stringify(currentSkills)}
      
      1. Categorize them logically.
      2. Identify critical missing skills for a modern PM (e.g., AI/ML, Data).
      3. Suggest recommendations.
    `;
    
    return await this.generate(prompt, skillsResponseSchema);
  }

  async chatWithAgent(message: string): Promise<string> {
    return await this.generate(message, undefined, true);
  }
}

export const geminiService = new GeminiService();