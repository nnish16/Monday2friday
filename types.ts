
export interface AVCRAnalysis {
  action_verb: { current: string; strength: 'STRONG' | 'WEAK' | 'MISSING'; feedback: string };
  context: { current: string; clarity: 'CLEAR' | 'VAGUE' | 'MISSING'; feedback: string };
  result: { current: string; specificity: 'SPECIFIC' | 'VAGUE' | 'MISSING'; feedback: string };
  metric: { current: string; quantified: boolean; feedback: string };
}

export interface RewriteOption {
  text: string;
  rationale: string;
  label: string;
  isRecommended?: boolean; // Indicates if this is the AI's top choice
}

export interface BulletPoint {
  id: string;
  original: string;
  revised?: string; // The currently selected revision
  rewrites?: RewriteOption[]; // List of alternatives provided by AI
  analysis?: AVCRAnalysis;
  rationale?: string;
  status: 'PENDING' | 'ANALYZING' | 'REVIEW' | 'APPROVED';
}

export interface WorkRole {
  id: string;
  title: string;
  company: string;
  bullets: BulletPoint[];
}

export interface ResumeData {
  summary: string;
  roles: WorkRole[];
  skills: string[];
  healthScore: number;
  redFlags: string[];
  topPriorities: string[];
}

export interface SummaryOptimization {
  rewrites: RewriteOption[];
}

export interface SkillsOptimization {
  categorized: { category: string; skills: string[] }[];
  missing_critical: string[];
  recommendations: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export enum AppState {
  INTAKE = 'INTAKE',
  ANALYZING = 'ANALYZING',
  DASHBOARD = 'DASHBOARD',
  OPTIMIZER = 'OPTIMIZER',
}

export type OptimizationFilter = 
  | 'maximize_metrics' 
  | 'ats_keywords' 
  | 'concise' 
  | 'detailed' 
  | 'readability' 
  | 'result_first' 
  | 'context_first' 
  | 'executive' 
  | 'technical';

export type DashboardSection = 'SUMMARY' | 'WORK_EXPERIENCE' | 'SKILLS';

export type AgentPersona = 'FRIDAY' | 'MONDAY';
