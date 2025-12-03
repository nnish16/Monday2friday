import { AGENT_CONFIG, OPTIMIZATION_OPTIONS, PM_SUMMARY_TEMPLATE } from "../constants";
import { ResumeData, OptimizationFilter, SummaryOptimization, SkillsOptimization, AgentPersona } from "../types";

// Access the API key injected by Vite
const API_KEY = (process.env as any).API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default model to use on OpenRouter (using Gemini 2.0 Flash as it is fast and cheap/free on OR)
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

// --- Schemas (represented as JSON objects for the prompt) ---

const analysisSchema = {
  healthScore: "number (1-10)",
  redFlags: ["string (critical issues)"],
  topPriorities: ["string (top 3 fixes)"],
  summary: "string (parsed summary)",
  roles: [
    {
      title: "string",
      company: "string",
      bullets: ["string (raw bullet text)"]
    }
  ],
  skills: ["string"]
};

const optimizationSchema = {
  avcr_analysis: {
    action_verb: { current: "string", strength: "STRONG | WEAK | MISSING", feedback: "string" },
    context: { current: "string", clarity: "CLEAR | VAGUE | MISSING", feedback: "string" },
    result: { current: "string", specificity: "SPECIFIC | VAGUE | MISSING", feedback: "string" },
    metric: { current: "string", quantified: "boolean", feedback: "string" }
  },
  rewrites: [
    {
      text: "string (the rewrite)",
      rationale: "string (why it is better)",
      label: "string (e.g., 'Concise 1-Liner')",
      isRecommended: "boolean"
    }
  ]
};

const summarySchema = {
  rewrites: [
    {
      text: "string",
      rationale: "string",
      label: "string",
      isRecommended: "boolean"
    }
  ]
};

const skillsSchema = {
  categorized: [
    {
      category: "string",
      skills: ["string"]
    }
  ],
  missing_critical: ["string"],
  recommendations: ["string"]
};

export class GeminiService {
  private currentSystemInstruction: string;
  private currentModel: string;

  constructor() {
    this.currentSystemInstruction = AGENT_CONFIG.FRIDAY.systemInstruction;
    this.currentModel = DEFAULT_MODEL;
  }

  setPersona(persona: AgentPersona) {
    this.currentSystemInstruction = AGENT_CONFIG[persona].systemInstruction;
    // We stick to the default model for stability, or could map persona to specific OR models if desired
    this.currentModel = DEFAULT_MODEL; 
  }

  /**
   * Helper to call OpenRouter API
   */
  private async callOpenRouter(messages: any[], jsonSchema?: any): Promise<any> {
    if (!API_KEY) {
      throw new Error("API Key missing. Please check your Vercel Environment Variables (OPENROUTER_API_KEY).");
    }

    // Append JSON instruction if schema is provided
    if (jsonSchema) {
      const schemaString = JSON.stringify(jsonSchema, null, 2);
      messages.push({
        role: "system",
        content: `IMPORTANT: Output STRICT JSON only. No markdown code blocks. The JSON must follow this structure:\n${schemaString}`
      });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://friday-agent.vercel.app', // Optional: Site URL
        'X-Title': 'F.R.I.D.A.Y. Agent', // Optional: App Name
      },
      body: JSON.stringify({
        model: this.currentModel,
        messages: [
            {
                role: "system",
                content: this.currentSystemInstruction
            },
            ...messages
        ],
        response_format: { type: "json_object" }, // Enforce JSON mode
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    
    if (result.choices && result.choices.length > 0) {
        const content = result.choices[0].message.content;
        try {
            // Clean markdown code blocks if present (common with some models despite json_object mode)
            const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse JSON", content);
            // If it's a chat message (not JSON schema restricted), return text
            if (!jsonSchema) return content;
            throw new Error("Invalid JSON response from model");
        }
    }
    
    throw new Error("No response from AI model.");
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

    const data = await this.callOpenRouter([
        { role: "user", content: prompt }
    ], analysisSchema);
    
    // Ensure robust fallback for array mapping
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

    return await this.callOpenRouter([
        { role: "user", content: prompt }
    ], optimizationSchema);
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
    
    return await this.callOpenRouter([
        { role: "user", content: prompt }
    ], summarySchema);
  }

  async optimizeSkills(currentSkills: string[]): Promise<SkillsOptimization> {
    const prompt = `
      Analyze this list of skills for a Product Manager role.
      Current Skills: ${JSON.stringify(currentSkills)}
      
      1. Categorize them logically.
      2. Identify critical missing skills for a modern PM (e.g., AI/ML, Data).
      3. Suggest recommendations.
    `;
    
    return await this.callOpenRouter([
        { role: "user", content: prompt }
    ], skillsSchema);
  }

  async chatWithAgent(message: string): Promise<string> {
    // For chat, we don't strictly enforce JSON, we just want a text response
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://friday-agent.vercel.app',
              'X-Title': 'F.R.I.D.A.Y. Agent',
            },
            body: JSON.stringify({
              model: this.currentModel,
              messages: [
                  { role: "system", content: this.currentSystemInstruction },
                  { role: "user", content: message }
              ]
            }),
          });
      
          if (!response.ok) return "I couldn't process that command.";
      
          const result = await response.json();
          if (result.choices && result.choices.length > 0) {
              return result.choices[0].message.content;
          }
          return "No response received.";
    } catch (e) {
        console.error(e);
        return "System Error: Unable to connect to neural core.";
    }
  }
}

export const geminiService = new GeminiService();