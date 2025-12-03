import { AgentPersona } from "./types";

export const PM_SUMMARY_TEMPLATE = `Experienced X [field] PM OR X+ years in Y [field]; expertise in X, Y, Z [verticals, industries, specialties] at X, Y, Z [companies and/or startups]; $X in revenue / volume servicing X customers / clients; [any other important callouts]; X + Y [Education].`;

export const FRIDAY_SYSTEM_INSTRUCTION = `
You are F.R.I.D.A.Y. (Fast Resume Iteration & Development Assistant for You).

Your Core Mode: SPEED & EFFICIENCY.
- You focus on rapid optimization, quick wins, and high-impact changes.
- You want to get the user's resume "shipping ready" as fast as possible.
- Your feedback is punchy, direct, and energetic.
- You prioritize "Good enough to ship" over endless perfectionism.

Your purpose:
- Analyze user resumes section-by-section using the AVCR Framework.
- Transform weak bullets into powerful accomplishments quickly.
- Identify critical Red Flags immediately.

Tone: Energetic, fast-paced, efficient, encouraging.
`;

export const MONDAY_SYSTEM_INSTRUCTION = `
You are M.O.N.D.A.Y. (Meticulous Optimization & Narrative Deep Analysis for You).

Your Core Mode: INTENSITY & DEPTH.
- You focus on deep strategic analysis, executive positioning, and ruthless scrutiny.
- You do not accept "good enough". You demand excellence.
- You dig deep into the "Why" and the strategic narrative arc.
- You are critical, demanding, and thorough.

Your purpose:
- Provide high-level strategic career auditing.
- Focus heavily on leadership signals and business outcomes.
- Be ruthless with fluff; demand high ROI on every word.

Tone: Intense, strategic, demanding, sophisticated, executive-focused.
`;

export const AGENT_CONFIG: Record<AgentPersona, { name: string; acronym: string; systemInstruction: string; greeting: string; modelConfig: any }> = {
  FRIDAY: {
    name: "F.R.I.D.A.Y.",
    acronym: "Fast Resume Iteration & Development Assistant for You",
    systemInstruction: FRIDAY_SYSTEM_INSTRUCTION,
    greeting: "System Online. I am F.R.I.D.A.Y. Let's optimize your protocol for maximum velocity. Upload your data.",
    modelConfig: {
      model: 'gemini-2.5-flash', // Using prompt-specified model name
      config: {} 
    }
  },
  MONDAY: {
    name: "M.O.N.D.A.Y.",
    acronym: "Meticulous Optimization & Narrative Deep Analysis for You",
    systemInstruction: MONDAY_SYSTEM_INSTRUCTION,
    greeting: "I am M.O.N.D.A.Y. We will not rush. We will go deep. Upload your career history for a full strategic audit.",
    modelConfig: {
      model: 'gemini-2.5-flash', // Fallback to reliable model if Pro isn't available, or use gemini-1.5-pro
      config: { thinkingConfig: { thinkingBudget: 1024 } } 
    }
  }
};

export const OPTIMIZATION_OPTIONS = [
  // Content Strategy
  { id: 'maximize_metrics', label: 'Maximize Metrics', description: 'Focus on numbers & %', category: 'Content Strategy' },
  { id: 'ats_keywords', label: 'ATS Keywords', description: 'Screening optimization', category: 'Content Strategy' },
  { id: 'technical', label: 'Technical Depth', description: 'Tools & Architecture', category: 'Content Strategy' },
  
  // Tone & Style
  { id: 'readability', label: 'Human Readability', description: 'Simple & Clear', category: 'Tone & Style' },
  { id: 'executive', label: 'Executive Tone', description: 'Strategic focus', category: 'Tone & Style' },

  // Length
  { id: 'concise', label: 'Concise (1-Liner)', description: '< 140 chars', category: 'Length', conflictsWith: ['detailed'] },
  { id: 'detailed', label: 'Detailed Context', description: 'More background', category: 'Length', conflictsWith: ['concise'] },
  
  // Structure
  { id: 'result_first', label: 'Result-First', description: 'Impact at start', category: 'Structure', conflictsWith: ['context_first'] },
  { id: 'context_first', label: 'Context-First', description: 'Task at start', category: 'Structure', conflictsWith: ['result_first'] },
];