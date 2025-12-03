import { AGENT_CONFIG, OPTIMIZATION_OPTIONS, PM_SUMMARY_TEMPLATE } from "../constants";
import { ResumeData, OptimizationFilter, SummaryOptimization, SkillsOptimization, AgentPersona } from "../types";

// --- API CONFIGURATION ---
// STRICTLY load the API key from the injected process.env.API_KEY
// We do not check other variables here because Vite defines this specific one.
const API_KEY = (process.env as any).API_KEY;

if (!API_KEY) {
    console.error("[System] CRITICAL ERROR: No API Key found in environment variables.");
}

// --- SCHEMAS (JSON Structure Definitions) ---
const ANALYSIS_SCHEMA = {
    healthScore: "number (1-10)",
    redFlags: ["string", "string"],
    topPriorities: ["string", "string"],
    summary: "string (extracted from resume)",
    roles: [
        {
            title: "string",
            company: "string",
            bullets: ["string", "string"]
        }
    ],
    skills: ["string", "string"]
};

const OPTIMIZATION_SCHEMA = {
    avcr_analysis: {
        action_verb: { current: "string", strength: "STRONG | WEAK | MISSING", feedback: "string" },
        context: { current: "string", clarity: "CLEAR | VAGUE | MISSING", feedback: "string" },
        result: { current: "string", specificity: "SPECIFIC | VAGUE | MISSING", feedback: "string" },
        metric: { current: "string", quantified: "boolean", feedback: "string" }
    },
    rewrites: [
        {
            text: "string",
            rationale: "string",
            label: "string",
            isRecommended: "boolean"
        }
    ]
};

const SUMMARY_SCHEMA = {
    rewrites: [
        {
            text: "string",
            rationale: "string",
            label: "string",
            isRecommended: "boolean"
        }
    ]
};

const SKILLS_SCHEMA = {
    categorized: [
        { category: "string", skills: ["string"] }
    ],
    missing_critical: ["string"],
    recommendations: ["string"]
};

export class GeminiService {
  private currentPersona: AgentPersona = 'FRIDAY';

  setPersona(persona: AgentPersona) {
    this.currentPersona = persona;
    console.log(`[System] Persona switched to: ${persona}`);
  }

  /**
   * PURE OPENROUTER CALL
   */
  private async callOpenRouter(prompt: string, schema?: any, isChat = false): Promise<any> {
      if (!API_KEY) {
          throw new Error("Missing API Key. Please check Vercel settings.");
      }

      const config = AGENT_CONFIG[this.currentPersona];
      const modelId = config.modelId;

      // 1. Prepare System Instruction
      let systemContent = config.systemInstruction;
      
      // 2. Inject Schema Constraint if needed
      if (schema) {
          systemContent += `\n\n[CRITICAL JSON INSTRUCTION]\nYou are a JSON Generation Machine. You must output VALID, PARSABLE JSON.\nDo not include markdown code blocks. Do not include introductory text.\n\nYour output structure must strictly match:\n${JSON.stringify(schema, null, 2)}`;
      }

      // 3. Construct Payload
      const messages = [
          { role: "system", content: systemContent },
          { role: "user", content: prompt }
      ];

      try {
          // Log (masked) for debugging
          console.log(`[OpenRouter] Sending request to ${modelId} with key starting: ${API_KEY.substring(0, 8)}...`);

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
                  temperature: 0.7, // Balanced creativity
              })
          });

          if (!response.ok) {
              const errorText = await response.text();
              console.error(`[OpenRouter] HTTP Error ${response.status}:`, errorText);
              throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
          }

          const result = await response.json();
          let content = result.choices?.[0]?.message?.content;

          if (!content) throw new Error("No content received from AI Provider");

          // 4. Parse Response
          if (schema) {
              // Clean any markdown formatting that models sometimes add despite instructions
              content = content.replace(/```json/g, "").replace(/```/g, "").trim();
              
              try {
                  return JSON.parse(content);
              } catch (e) {
                  console.error("[System] JSON Parse Error. Raw content:", content);
                  throw new Error("AI returned invalid JSON. Please try again.");
              }
          }

          return content; // Plain text for chat
      } catch (error: any) {
          console.error("[System] OpenRouter Request Failed:", error);
          throw error;
      }
  }

  // --- PUBLIC METHODS ---

  async analyzeResume(text: string): Promise<ResumeData> {
    const prompt = `
    Analyze this resume text. Assume current date is Dec 2025.
    Calculate health score (1-10) based on PM best practices.
    Identify red flags.
    Extract summary, roles, and skills.
    
    Resume Text:
    ${text}
    `;

    const data = await this.callOpenRouter(prompt, ANALYSIS_SCHEMA);
    
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
        styleInstruction = "Provide 3 options: Concise (1-Liner), High Impact (Metrics), Executive (Balanced). Mark best as isRecommended.";
    } else {
        const activeLabels = filters.map(f => OPTIMIZATION_OPTIONS.find(o => o.id === f)?.label || f).join(', ');
        styleInstruction = `Strictly follow these filters: [${activeLabels}]. Provide 3 distinct options.`;
    }

    const prompt = `
    Analyze/Rewrite this resume bullet using AVCR framework.
    Role Context: ${context}
    Bullet: "${bullet}"
    Instructions: ${styleInstruction}
    `;

    return await this.callOpenRouter(prompt, OPTIMIZATION_SCHEMA);
  }

  async optimizeSummary(currentSummary: string, resumeContext: string): Promise<SummaryOptimization> {
    const prompt = `
      Analyze current Summary and full Resume Context.
      Current Summary: "${currentSummary}"
      Resume Context: "${resumeContext}"
      
      Provide 3 rewrites:
      1. Standard Template: "${PM_SUMMARY_TEMPLATE}"
      2. Executive/Strategic
      3. Growth/Impact
    `;
    
    return await this.callOpenRouter(prompt, SUMMARY_SCHEMA);
  }

  async optimizeSkills(currentSkills: string[]): Promise<SkillsOptimization> {
    const prompt = `
      Analyze this skill list for a Product Manager.
      Current Skills: ${JSON.stringify(currentSkills)}
      Categorize, find missing critical skills, and suggest recommendations.
    `;
    
    return await this.callOpenRouter(prompt, SKILLS_SCHEMA);
  }

  async chatWithAgent(message: string): Promise<string> {
    return await this.callOpenRouter(message, undefined, true);
  }
}

export const geminiService = new GeminiService();