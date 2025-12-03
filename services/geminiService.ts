import { GoogleGenAI, Chat, Type } from "@google/genai";
import { AGENT_CONFIG, OPTIMIZATION_OPTIONS, PM_SUMMARY_TEMPLATE } from "../constants";
import { ResumeData, OptimizationFilter, SummaryOptimization, SkillsOptimization, AgentPersona } from "../types";

// Initialize Gemini Client
// We cast process.env as any to avoid TS2580 since we've added @types/node but want to be explicit for the build system
const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

// Schema for initial resume analysis
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    healthScore: { type: Type.NUMBER, description: "Overall score 1-10" },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of critical issues found" },
    topPriorities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 things to fix" },
    summary: { type: Type.STRING, description: "The parsed summary/headline from the resume" },
    roles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          company: { type: Type.STRING },
          bullets: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of raw bullet points for this role"
          }
        }
      }
    },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["healthScore", "redFlags", "summary", "roles", "skills"]
};

// Schema for bullet optimization with multiple options
const optimizationSchema = {
  type: Type.OBJECT,
  properties: {
    avcr_analysis: {
      type: Type.OBJECT,
      properties: {
        action_verb: { type: Type.OBJECT, properties: { current: { type: Type.STRING }, strength: { type: Type.STRING }, feedback: { type: Type.STRING } } },
        context: { type: Type.OBJECT, properties: { current: { type: Type.STRING }, clarity: { type: Type.STRING }, feedback: { type: Type.STRING } } },
        result: { type: Type.OBJECT, properties: { current: { type: Type.STRING }, specificity: { type: Type.STRING }, feedback: { type: Type.STRING } } },
        metric: { type: Type.OBJECT, properties: { current: { type: Type.STRING }, quantified: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } }
      }
    },
    rewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "The rewrite text" },
          rationale: { type: Type.STRING, description: "Why this is good" },
          label: { type: Type.STRING, description: "Label like 'Concise 1-Liner' or 'High Impact'" },
          isRecommended: { type: Type.BOOLEAN, description: "True if this is the single best/recommended option" }
        }
      },
      description: "Provide exactly 3 distinct rewrite options"
    }
  }
};

const summarySchema = {
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

const skillsSchema = {
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
  private chat: Chat;
  private currentSystemInstruction: string;
  private currentModelConfig: any;

  constructor() {
    this.currentSystemInstruction = AGENT_CONFIG.FRIDAY.systemInstruction;
    this.currentModelConfig = AGENT_CONFIG.FRIDAY.modelConfig;
    
    this.chat = ai.chats.create({
      model: this.currentModelConfig.model,
      config: {
        systemInstruction: this.currentSystemInstruction,
        ...this.currentModelConfig.config
      }
    });
  }

  setPersona(persona: AgentPersona) {
    this.currentSystemInstruction = AGENT_CONFIG[persona].systemInstruction;
    this.currentModelConfig = AGENT_CONFIG[persona].modelConfig;
    
    // Re-initialize chat with new instruction and model config
    this.chat = ai.chats.create({
      model: this.currentModelConfig.model,
      config: {
        systemInstruction: this.currentSystemInstruction,
        ...this.currentModelConfig.config
      }
    });
  }

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

    const response = await ai.models.generateContent({
      model: this.currentModelConfig.model,
      contents: prompt,
      config: {
        systemInstruction: this.currentSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        ...this.currentModelConfig.config
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    return {
      healthScore: data.healthScore,
      redFlags: data.redFlags,
      topPriorities: data.topPriorities,
      summary: data.summary,
      skills: data.skills,
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
        Ensure options are structurally different.
        `;
    } else {
        const activeLabels = filters.map(f => OPTIMIZATION_OPTIONS.find(o => o.id === f)?.label || f).join(', ');
        const descriptions = filters.map(f => OPTIMIZATION_OPTIONS.find(o => o.id === f)?.description || '').join('; ');
        
        styleInstruction = `
        Requirements for Rewrites (Provide exactly 3 options):
        Filters: [${activeLabels}]. (${descriptions}).

        1. All 3 options must adhere strictly to the COMBINATION of these filters.
        2. Provide 3 variations in structure.
        3. If "Concise" is selected, ALL options must be short 1-liners.
        4. Mark the best option as isRecommended: true.
        `;
    }

    const prompt = `
    Analyze this specific resume bullet point using the AVCR framework.
    Role Context: ${context}
    Bullet: "${bullet}"
    
    Context: Assume current date is December 2025.
    
    ${styleInstruction}
    `;

    const response = await ai.models.generateContent({
      model: this.currentModelConfig.model,
      contents: prompt,
      config: {
        systemInstruction: this.currentSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: optimizationSchema,
        ...this.currentModelConfig.config
      }
    });

    return JSON.parse(response.text || "{}");
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
         
         Extract the required fields (Years, Field, Verticals, Company Types, Revenue/Volume, Education) from the Resume Context to fill the template.
      
      2. OPTION 2 (Label: "Executive/Strategic"): Focus on leadership.
      3. OPTION 3 (Label: "Growth/Impact"): Focus on metrics and immediate value.
      
      Highlight the best option as recommended.
    `;
    
    const response = await ai.models.generateContent({
      model: this.currentModelConfig.model,
      contents: prompt,
      config: {
        systemInstruction: this.currentSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: summarySchema,
        ...this.currentModelConfig.config
      }
    });

    return JSON.parse(response.text || "{}");
  }

  async optimizeSkills(currentSkills: string[]): Promise<SkillsOptimization> {
    const prompt = `
      Analyze this list of skills for a Product Manager role.
      Current Skills: ${JSON.stringify(currentSkills)}
      
      1. Categorize them logically.
      2. Identify critical missing skills for a modern PM (e.g., AI/ML, Data).
      3. Suggest recommendations.
    `;
    
    const response = await ai.models.generateContent({
      model: this.currentModelConfig.model,
      contents: prompt,
      config: {
        systemInstruction: this.currentSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: skillsSchema,
        ...this.currentModelConfig.config
      }
    });

    return JSON.parse(response.text || "{}");
  }

  async chatWithAgent(message: string): Promise<string> {
    const response = await this.chat.sendMessage({ message });
    return response.text || "I couldn't process that.";
  }
}

export const geminiService = new GeminiService();