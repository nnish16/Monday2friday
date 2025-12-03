import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { parseDocument } from './utils/fileParsing';
import { AppState, ChatMessage, ResumeData, OptimizationFilter, RewriteOption, SummaryOptimization, SkillsOptimization, AgentPersona } from './types';
import { AGENT_CONFIG, OPTIMIZATION_OPTIONS } from './constants';
import { 
  CheckCircleIcon, AlertTriangleIcon, 
  SendIcon, SparklesIcon, ArrowRightIcon, FileTextIcon, TargetIcon,
  CopyIcon, MinimizeIcon, MessageCircleIcon, ChevronLeftIcon, ChevronRightIcon, SlidersIcon,
  RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, UploadIcon
} from './components/Icons';

// --- AUTHENTIC THEME SYSTEM ---
const THEME = {
    FRIDAY: {
      bg: 'bg-[#F2F4F7]',
      bgPattern: 'bg-grid-friday',
      text: 'text-[#0F172A]',
      subtext: 'text-[#64748B]',
      panel: 'bg-white/70',
      panelBorder: 'border-white/60',
      accent: 'text-[#007AFF]', // Electric Azure
      accentBorder: 'border-[#007AFF]',
      accentBg: 'bg-[#007AFF]',
      accentGradient: 'from-[#007AFF] to-[#00C6FF]',
      accentLightBg: 'bg-[#EFF6FF]',
      accentLightBorder: 'border-[#BFDBFE]',
      buttonPrimary: 'bg-[#007AFF] text-white hover:bg-[#0062CC]',
      highlightRing: 'ring-blue-400/30',
      shimmerBase: 'bg-slate-200',
    },
    MONDAY: {
      bg: 'bg-[#080808]',
      bgPattern: 'bg-grid-monday',
      text: 'text-[#EDEDED]',
      subtext: 'text-[#888888]',
      panel: 'bg-[#121212]/80', // Deep matte black
      panelBorder: 'border-white/5',
      accent: 'text-[#FF4500]', // International Orange
      accentBorder: 'border-[#FF4500]',
      accentBg: 'bg-[#FF4500]',
      accentGradient: 'from-[#FF4500] to-[#FF8C00]',
      accentLightBg: 'bg-[#2A0F05]',
      accentLightBorder: 'border-[#551A00]',
      buttonPrimary: 'bg-[#FF4500] text-white hover:bg-[#CC3700]',
      highlightRing: 'ring-orange-500/30',
      shimmerBase: 'bg-zinc-800',
    }
};

// --- AICoreSwitch Component (UPDATED: Responsive Width) ---
const AICoreSwitch: React.FC<{ persona: AgentPersona; onToggle: () => void }> = ({ persona, onToggle }) => {
  return (
    <div 
      onClick={onToggle}
      className={`relative w-full md:w-80 h-14 rounded-full p-1.5 cursor-pointer transition-all duration-500 shadow-2xl border overflow-hidden group select-none shrink-0
        ${persona === 'FRIDAY' 
            ? 'bg-white/60 border-white/60 hover:border-blue-300/50 backdrop-blur-md' 
            : 'bg-[#0A0A0A]/80 border-white/10 hover:border-orange-500/30 backdrop-blur-md'}
      `}
    >
        {/* Labels - Perfectly centered 50/50 split matching the padding of the parent */}
        <div className="absolute inset-0 z-20 pointer-events-none flex p-1.5">
             <div className="flex-1 flex items-center justify-center">
                 <span className={`text-[9px] sm:text-[11px] font-black tracking-[0.25em] transition-colors duration-500 ${persona === 'FRIDAY' ? 'text-white' : 'text-gray-500/60'}`}>F.R.I.D.A.Y.</span>
             </div>
             <div className="flex-1 flex items-center justify-center">
                 <span className={`text-[9px] sm:text-[11px] font-black tracking-[0.25em] transition-colors duration-500 ${persona === 'MONDAY' ? 'text-white' : 'text-gray-500/60'}`}>M.O.N.D.A.Y.</span>
             </div>
        </div>

        {/* Sliding Core Indicator */}
        <div 
          className={`relative z-10 h-full w-[50%] rounded-full shadow-lg transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex items-center justify-center overflow-hidden
            ${persona === 'FRIDAY' ? 'translate-x-0 bg-[#007AFF]' : 'translate-x-[100%] bg-[#FF4500]'}
          `}
        >
             {/* IMAGE RESTORED & BLENDED & ANIMATED */}
             <div className="absolute inset-0 w-full h-full opacity-80 mix-blend-overlay">
                 <img 
                    src="https://www.insidequantumtechnology.com/wp-content/uploads/2024/10/unnamed-1024x1024.png" 
                    alt="Core Texture" 
                    className={`w-full h-full object-cover filter transition-all duration-700
                        ${persona === 'FRIDAY' 
                            ? 'hue-rotate-180 brightness-110 saturate-150 animate-pulse-fast' 
                            : 'hue-rotate-0 brightness-75 contrast-125 animate-breathe-deep'}
                    `}
                 />
             </div>

             {/* Abstract Core Texture Overlay */}
            <div className={`absolute inset-0 opacity-40 mix-blend-overlay bg-gradient-to-br from-white via-transparent to-black`}></div>
            <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20`}></div>
        </div>
    </div>
  );
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INTAKE);
  const [agentPersona, setAgentPersona] = useState<AgentPersona>('FRIDAY');
  const [resumeText, setResumeText] = useState('');
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dashboard State - Independent Sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      SUMMARY: true,
      WORK_EXPERIENCE: true,
      SKILLS: true
  });
  
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [optimizingBulletId, setOptimizingBulletId] = useState<string | null>(null);
  
  // Optimization State
  const [summaryOptions, setSummaryOptions] = useState<SummaryOptimization | null>(null);
  const [skillsAnalysis, setSkillsAnalysis] = useState<SkillsOptimization | null>(null);
  const [isOptimizingSummary, setIsOptimizingSummary] = useState(false);
  const [isOptimizingSkills, setIsOptimizingSkills] = useState(false);

  // New Filter State
  const [activeFilters, setActiveFilters] = useState<OptimizationFilter[]>([]);
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false);
  
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const theme = THEME[agentPersona];

  // Logic to auto-collapse sections on mobile/tablets
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setExpandedSections({
        SUMMARY: false,
        WORK_EXPERIENCE: false,
        SKILLS: false
      });
      setIsChatOpen(false); // Default to closed chat on mobile
    }
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatOpen]);

  // Handle Persona Change
  const togglePersona = () => {
    const newPersona = agentPersona === 'FRIDAY' ? 'MONDAY' : 'FRIDAY';
    setAgentPersona(newPersona);
    geminiService.setPersona(newPersona);
    
    // Only log switchover if system is active (Dashboard mode)
    if (appState === AppState.DASHBOARD && resumeData) {
        setChatHistory(prev => [
            ...prev, 
            { id: Date.now().toString(), role: 'model', text: `[SYSTEM SWITCHOVER] ${AGENT_CONFIG[newPersona].greeting}`, timestamp: new Date() }
        ]);
    }
  };

  // Independent Section Toggle
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
    }));
  };

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const text = await parseDocument(file);
      setResumeText(text);
      // Optional: Auto-submit after upload
      // handleResumeSubmit(); 
    } catch (error: any) {
      alert(`Error reading file: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleResumeSubmit = async () => {
    if (!resumeText.trim()) return;
    
    setAppState(AppState.ANALYZING);
    setIsProcessing(true);
    
    try {
      const data = await geminiService.analyzeResume(resumeText);
      setResumeData(data);
      setAppState(AppState.DASHBOARD);
      
      // Initialize Chat Log only after successful analysis
      const greetingMsg: ChatMessage = { 
          id: 'init', 
          role: 'model', 
          text: AGENT_CONFIG[agentPersona].greeting, 
          timestamp: new Date() 
      };
      
      const summaryMsg: ChatMessage = { 
          id: 'analysis-summary', 
          role: 'model', 
          text: `Analysis Complete. Health Score: ${data.healthScore}/10. ${data.redFlags.length} vectors identified.`, 
          timestamp: new Date() 
      };
      
      setChatHistory([greetingMsg, summaryMsg]);
      
    } catch (error: any) {
      console.error("Analysis failed", error);
      setAppState(AppState.INTAKE);
      
      let errorMessage = "Analysis failed. Please try again.";
      
      if (error.message) {
          if (error.message.includes("API key")) {
              errorMessage = "API Key Invalid or Missing. Please check your Vercel Environment Variables.";
          } else if (error.message.includes("404")) {
              errorMessage = "AI Model Not Found. The selected model might be unavailable.";
          } else if (error.message.includes("503")) {
              errorMessage = "Service Temporarily Unavailable. Please try again in a moment.";
          }
      }
      
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsProcessing(true);

    try {
      const response = await geminiService.chatWithAgent(chatInput);
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response, timestamp: new Date() };
      setChatHistory(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChatHistory = () => {
      setChatHistory([]);
  };

  const toggleFilter = (filterId: OptimizationFilter) => {
    setActiveFilters(prev => {
        const isSelected = prev.includes(filterId);
        if (isSelected) {
            return prev.filter(f => f !== filterId);
        } else {
            const option = OPTIMIZATION_OPTIONS.find(o => o.id === filterId);
            let newFilters = [...prev];
            if (option?.conflictsWith) {
                newFilters = newFilters.filter(f => !option.conflictsWith?.includes(f as any));
            }
            return [...newFilters, filterId];
        }
    });
  };

  const handleOptimizeSummary = async () => {
    if (!resumeData) return;
    setIsOptimizingSummary(true);
    try {
        const result = await geminiService.optimizeSummary(resumeData.summary, resumeText);
        setSummaryOptions(result);
    } catch (e) {
        console.error("Summary optimization failed", e);
    } finally {
        setIsOptimizingSummary(false);
    }
  };

  const handleAcceptSummary = (text: string) => {
      if (!resumeData) return;
      setResumeData({ ...resumeData, summary: text });
      setSummaryOptions(null);
  };

  const handleOptimizeSkills = async () => {
    if (!resumeData) return;
    setIsOptimizingSkills(true);
    try {
        const result = await geminiService.optimizeSkills(resumeData.skills);
        setSkillsAnalysis(result);
    } catch (e) {
        console.error("Skills optimization failed", e);
    } finally {
        setIsOptimizingSkills(false);
    }
  };

  const handleAddSkill = (skill: string) => {
      if (!resumeData) return;
      if (!resumeData.skills.includes(skill)) {
          setResumeData({ ...resumeData, skills: [...resumeData.skills, skill] });
      }
  };

  const handleOptimizeBullet = async (roleIndex: number, bulletIndex: number, bulletId: string) => {
    if (!resumeData) return;
    
    setOptimizingBulletId(bulletId);
    const newRoles = [...resumeData.roles];
    newRoles[roleIndex].bullets[bulletIndex].status = 'ANALYZING';
    setResumeData({ ...resumeData, roles: newRoles });

    try {
      const bullet = newRoles[roleIndex].bullets[bulletIndex].original;
      const context = `${newRoles[roleIndex].title} at ${newRoles[roleIndex].company}`;
      
      const analysis = await geminiService.optimizeBullet(bullet, context, activeFilters);
      
      newRoles[roleIndex].bullets[bulletIndex] = {
        ...newRoles[roleIndex].bullets[bulletIndex],
        rewrites: analysis.rewrites,
        rationale: analysis.rationale || (analysis.rewrites && analysis.rewrites[0]?.rationale),
        analysis: analysis.avcr_analysis,
        status: 'REVIEW'
      };
      setResumeData({ ...resumeData, roles: newRoles });
    } catch (error) {
      console.error("Optimization failed", error);
      newRoles[roleIndex].bullets[bulletIndex].status = 'PENDING';
      setResumeData({ ...resumeData, roles: newRoles });
    } finally {
      setOptimizingBulletId(null);
    }
  };

  const handleRegenerateBullet = async (roleIndex: number, bulletIndex: number, bulletId: string) => {
     await handleOptimizeBullet(roleIndex, bulletIndex, bulletId);
  };

  const handleAcceptRewrite = (roleIndex: number, bulletIndex: number, rewrite: RewriteOption) => {
    if (!resumeData) return;
    const newRoles = [...resumeData.roles];
    const bullet = newRoles[roleIndex].bullets[bulletIndex];
    
    bullet.revised = rewrite.text;
    bullet.original = rewrite.text;
    bullet.rationale = rewrite.rationale;
    bullet.status = 'APPROVED';
    
    const newScore = Math.min(10, resumeData.healthScore + 0.5);
    setResumeData({ ...resumeData, roles: newRoles, healthScore: newScore });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setJustCopiedId(id);
    setTimeout(() => setJustCopiedId(null), 2000);
  };

  const nextRole = () => {
    if (resumeData && selectedRoleIndex < resumeData.roles.length - 1) {
      setSelectedRoleIndex(prev => prev + 1);
    }
  };

  const prevRole = () => {
    if (selectedRoleIndex > 0) {
      setSelectedRoleIndex(prev => prev - 1);
    }
  };

  // --- Renderers ---

  const renderIntake = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 md:px-6 max-w-4xl mx-auto relative z-10 w-full">
      <div className="text-center mb-8 md:mb-12 animate-fade-in relative z-20 w-full">
        <h1 className={`text-5xl md:text-8xl font-black tracking-tighter mb-4 drop-shadow-sm ${theme.text} leading-none`}>
            {AGENT_CONFIG[agentPersona].name}
        </h1>
        <div className={`h-1.5 w-24 md:w-32 mx-auto rounded-full bg-gradient-to-r ${theme.accentGradient} mb-6 md:mb-8 shadow-[0_0_20px_rgba(0,0,0,0.3)]`}></div>
        <p className={`text-[10px] md:text-sm font-bold uppercase tracking-[0.3em] max-w-2xl mx-auto ${theme.subtext}`}>
            {AGENT_CONFIG[agentPersona].acronym}
        </p>
      </div>
      
      <div 
        className={`w-full p-2 rounded-[2rem] shadow-2xl animate-fade-in transition-all bg-gradient-to-br ${agentPersona === 'FRIDAY' ? 'from-white/80 to-blue-50/50' : 'from-[#1A1A1A] to-black'} border ${theme.panelBorder} backdrop-blur-xl relative group ${dragActive ? `scale-[1.02] ring-2 ${theme.highlightRing}` : ''}`} 
        style={{animationDelay: '0.1s'}}
        onDragEnter={handleDrag}
      >
        {/* Glow effect behind panel */}
        <div className={`absolute -inset-1 rounded-[2rem] bg-gradient-to-r ${theme.accentGradient} opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-1000`}></div>
        
        {/* Drag Overlay */}
        {dragActive && (
          <div className="absolute inset-0 z-50 rounded-[2rem] bg-black/50 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-white/50" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <div className="text-center pointer-events-none">
              <UploadIcon className="w-16 h-16 mx-auto text-white mb-4 animate-bounce" />
              <p className="text-xl font-bold text-white tracking-widest uppercase">Drop Protocol File Here</p>
            </div>
          </div>
        )}

        <div className={`relative rounded-[1.5rem] p-4 md:p-8 ${agentPersona === 'FRIDAY' ? 'bg-white/90' : 'bg-[#0F0F0F]'}`}>
            
            {/* File Upload Header */}
            <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${theme.subtext}`}>Input Stream</span>
                <div className="flex space-x-2">
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${agentPersona === 'FRIDAY' ? 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-blue-500' : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                   >
                      <UploadIcon className="w-3 h-3" />
                      <span>{isUploading ? 'Parsing...' : 'Upload PDF / DOCX'}</span>
                   </button>
                </div>
            </div>

            <textarea
              className={`w-full h-64 md:h-80 p-4 md:p-6 rounded-xl resize-none text-base md:text-lg leading-relaxed font-light outline-none transition-all
                  ${agentPersona === 'FRIDAY' 
                  ? 'bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100' 
                  : 'bg-black/40 text-gray-200 placeholder-gray-700 focus:bg-black/60 focus:ring-1 focus:ring-orange-500/20'}
              `}
              placeholder={isUploading ? "Extracting data from document..." : "Initialize protocol. Paste career data or Drop PDF/DOCX here..."}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              disabled={isUploading}
            />
            
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                <div className={`text-[10px] font-bold tracking-widest uppercase ${theme.subtext} flex items-center`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${resumeText.length > 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-400'}`}></div>
                    {resumeText.length > 0 ? `${resumeText.length} BYTES` : 'AWAITING INPUT'}
                </div>
                <button
                    onClick={handleResumeSubmit}
                    disabled={!resumeText.trim() || isProcessing}
                    className={`w-full sm:w-auto flex items-center justify-center px-10 py-4 rounded-xl font-bold text-xs tracking-[0.15em] uppercase transition-all transform hover:translate-y-[-2px] shadow-lg
                    ${!resumeText.trim() 
                        ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
                        : theme.buttonPrimary}`}
                >
                    {isProcessing ? 'Processing...' : 'Initialize Optimization'}
                    {!isProcessing && <ArrowRightIcon className="ml-3 w-4 h-4" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardHeader = () => {
    if (!resumeData) return null;
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        <div className={`${theme.panel} p-3 md:p-6 rounded-3xl shadow-lg border ${theme.panelBorder} flex flex-col justify-between h-28 md:h-48 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 col-span-1`}>
            <div className={`absolute -right-6 -top-6 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${theme.accent} rounded-full border-4 border-current`}></div>
            <span className={`${theme.subtext} text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]`}>Protocol Health</span>
            <div className="flex items-baseline mt-auto relative z-10">
                <span className={`text-4xl md:text-7xl font-thin tracking-tighter ${resumeData.healthScore > 8 ? 'text-emerald-500' : resumeData.healthScore > 5 ? 'text-amber-500' : 'text-rose-500'} drop-shadow-md`}>
                    {resumeData.healthScore}
                </span>
                <span className={`ml-1 md:ml-3 text-xs md:text-lg font-light opacity-50 ${theme.text}`}>/ 10</span>
            </div>
        </div>
        
        <div className={`${theme.panel} p-3 md:p-6 rounded-3xl shadow-lg border ${theme.panelBorder} flex flex-col justify-between h-28 md:h-48 relative overflow-hidden hover:scale-[1.02] transition-transform duration-300 col-span-1`}>
            <span className={`${theme.subtext} text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]`}>Critical Vectors</span>
            <div className="flex items-center mt-auto">
                <div className="bg-rose-500/10 p-2 md:p-3 rounded-xl mr-2 md:mr-4 border border-rose-500/20">
                    <AlertTriangleIcon className="text-rose-500 w-4 h-4 md:w-8 md:h-8" />
                </div>
                <span className={`text-3xl md:text-5xl font-light ${theme.text}`}>{resumeData.redFlags.length}</span>
            </div>
        </div>

        <div 
          key={agentPersona}
          className={`${theme.panel} p-6 rounded-3xl shadow-lg border ${theme.panelBorder} col-span-2 lg:col-span-2 ${agentPersona === 'FRIDAY' ? 'animate-flash-friday' : 'animate-flash-monday'} h-auto min-h-[8rem] md:h-48 flex flex-col relative overflow-hidden`}
        >
            <div className="flex items-center mb-4 shrink-0 justify-between relative z-10">
                <span className={`${theme.subtext} text-[10px] font-bold uppercase tracking-[0.2em]`}>Primary Objective</span>
                <span className={`px-2 py-1 ${agentPersona === 'MONDAY' ? 'bg-rose-900/50 text-rose-200 border-rose-800' : 'bg-rose-100 text-rose-600 border-rose-200'} border text-[9px] rounded-md shadow-sm font-bold tracking-wide uppercase`}>Action Required</span>
            </div>
            {/* STRICT OVERFLOW HANDLING */}
            <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10 pr-2 min-h-0">
                <p className={`text-sm md:text-lg font-light leading-snug break-words whitespace-pre-wrap ${theme.text}`}>
                    {resumeData.topPriorities[0] || "General Optimization Protocol Initiated."}
                </p>
            </div>
        </div>
      </div>
    );
  };

  const renderSummarySection = () => {
      if (!resumeData) return null;
      const isOpen = expandedSections['SUMMARY'];

      return (
          <div className={`${theme.panel} rounded-3xl shadow-sm border ${theme.panelBorder} overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg backdrop-blur-md`}>
              <button 
                  onClick={() => toggleSection('SUMMARY')}
                  className={`w-full flex justify-between items-center p-6 transition-colors ${agentPersona === 'FRIDAY' ? 'hover:bg-white' : 'hover:bg-white/5'}`}
              >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 transition-colors shadow-sm shrink-0 ${isOpen ? theme.accentBg : (agentPersona === 'FRIDAY' ? 'bg-white border border-gray-100' : 'bg-white/5 border border-white/5')}`}>
                        <FileTextIcon className={`w-6 h-6 ${isOpen ? 'text-white' : theme.subtext}`} />
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-xl tracking-tight ${theme.text}`}>Professional Summary</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.subtext} mt-1`}>Executive Narrative</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180 bg-black/5' : 'bg-transparent'}`}>
                    <ChevronDownIcon className={`w-5 h-5 ${theme.subtext}`}/>
                  </div>
              </button>

              {isOpen && (
                  <div className={`p-6 md:p-8 border-t animate-fade-in ${theme.panelBorder}`}>
                      {isOptimizingSummary && !summaryOptions ? (
                        <div className="space-y-4">
                           <div className={`h-4 w-3/4 rounded ${theme.shimmerBase} animate-pulse`}></div>
                           <div className={`h-4 w-full rounded ${theme.shimmerBase} animate-pulse`}></div>
                        </div>
                      ) : !summaryOptions ? (
                          <div className="space-y-6">
                              <p className={`p-6 md:p-8 rounded-3xl border text-base md:text-lg font-light leading-loose ${agentPersona === 'FRIDAY' ? 'bg-white border-gray-100 text-gray-600 shadow-sm' : 'bg-black/40 border-white/5 text-gray-300'}`}>
                                  "{resumeData.summary || "No summary found."}"
                              </p>
                              <div className="flex items-center justify-end">
                                <button 
                                    onClick={handleOptimizeSummary}
                                    disabled={isOptimizingSummary}
                                    className={`flex items-center px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 ${theme.buttonPrimary}`}
                                >
                                    {isOptimizingSummary ? <RefreshCwIcon className="animate-spin mr-2"/> : <SparklesIcon className="mr-2"/>}
                                    Generate Narratives
                                </button>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-8">
                              <div className="flex items-center justify-between border-b pb-4 mb-4 ${theme.panelBorder}">
                                 <h4 className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.subtext}`}>Narrative Options</h4>
                                 <button onClick={() => setSummaryOptions(null)} className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-wider">Discard</button>
                              </div>
                              <div className="grid gap-6">
                                  {summaryOptions.rewrites.map((opt, idx) => (
                                      <div key={idx} className={`p-6 rounded-2xl border transition-all relative group
                                          ${opt.isRecommended 
                                            ? `${theme.accentLightBg} ${theme.accentLightBorder} shadow-md ring-1 ${theme.highlightRing}` 
                                            : (agentPersona === 'FRIDAY' ? 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md' : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40')}
                                      `}>
                                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                                              <span className={`text-[9px] font-bold px-3 py-1.5 rounded-md uppercase tracking-widest border
                                                  ${opt.isRecommended 
                                                    ? `${theme.accent} bg-white border-transparent shadow-sm`
                                                    : (agentPersona === 'FRIDAY' ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white/5 text-gray-400 border-white/5')}
                                              `}>
                                                  {opt.label}
                                              </span>
                                              <div className="flex gap-2">
                                                  <button
                                                      onClick={() => handleCopy(opt.text, `summary-opt-${idx}`)}
                                                      className={`${theme.subtext} hover:${theme.text} p-2 rounded-lg bg-transparent hover:bg-black/5 transition-colors flex items-center text-[10px] font-bold uppercase tracking-wider`}
                                                  >
                                                      {justCopiedId === `summary-opt-${idx}` ? <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500"/> : <CopyIcon className="w-4 h-4 mr-1"/>}
                                                      Copy
                                                  </button>
                                              </div>
                                          </div>
                                          <p className={`text-base leading-loose ${theme.text}`}>{opt.text}</p>
                                          
                                          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end pt-4 border-t border-dashed border-gray-200/20 gap-4 sm:gap-0">
                                             <p className="text-xs opacity-60 font-medium max-w-full sm:max-w-[80%] italic">{opt.rationale}</p>
                                             <button 
                                                onClick={() => handleAcceptSummary(opt.text)} 
                                                className={`${theme.accent} border ${theme.accentBorder} px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-opacity-10 hover:bg-black transition-colors self-end`}
                                             >
                                                Select
                                             </button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  const renderWorkExperienceSection = () => {
      if (!resumeData || !resumeData.roles.length) return null;
      const isOpen = expandedSections['WORK_EXPERIENCE'];
      const role = resumeData.roles[selectedRoleIndex];
      const categories = Array.from(new Set(OPTIMIZATION_OPTIONS.map(o => o.category || 'Other')));

      return (
        <div className={`${theme.panel} rounded-3xl shadow-sm border ${theme.panelBorder} overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg backdrop-blur-md`}>
             <button 
                  onClick={() => toggleSection('WORK_EXPERIENCE')} 
                  className={`w-full flex justify-between items-center p-6 transition-colors ${agentPersona === 'FRIDAY' ? 'hover:bg-white' : 'hover:bg-white/5'}`}
              >
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 transition-colors shadow-sm shrink-0 ${isOpen ? theme.accentBg : (agentPersona === 'FRIDAY' ? 'bg-white border border-gray-100' : 'bg-white/5 border border-white/5')}`}>
                        <TargetIcon className={`w-6 h-6 ${isOpen ? 'text-white' : theme.subtext}`} />
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-xl tracking-tight ${theme.text}`}>Work Experience</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.subtext} mt-1`}>Bullet Optimization</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180 bg-black/5' : 'bg-transparent'}`}>
                    <ChevronDownIcon className={`w-5 h-5 ${theme.subtext}`}/>
                  </div>
              </button>

            {isOpen && (
                <div className={`animate-fade-in border-t ${theme.panelBorder}`}>
                    {/* Role Navigation */}
                    <div className={`p-4 md:p-6 border-b ${theme.panelBorder} flex justify-between items-center relative overflow-hidden bg-gradient-to-r ${agentPersona === 'FRIDAY' ? 'from-gray-50/50 to-white' : 'from-black/40 to-black/10'}`}>
                         
                        <button 
                            onClick={prevRole} 
                            disabled={selectedRoleIndex === 0}
                            className={`p-3 rounded-full transition-all relative z-10 ${selectedRoleIndex === 0 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/5 hover:scale-110'} ${theme.text}`}
                        >
                            <ChevronLeftIcon />
                        </button>
                        
                        <div className="text-center relative z-10 max-w-[60%]">
                            <h3 className={`text-lg md:text-xl font-bold tracking-tight ${theme.text} truncate`}>{role.title}</h3>
                            <p className={`text-xs md:text-sm mt-1 font-mono uppercase tracking-wide opacity-70 ${theme.subtext} truncate`}>{role.company}</p>
                            <div className="flex space-x-2 justify-center mt-4">
                                {resumeData.roles.map((r, idx) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedRoleIndex(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === selectedRoleIndex ? `${theme.accentBg} w-8` : 'bg-gray-300/50 w-2 hover:w-4'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={nextRole}
                            disabled={selectedRoleIndex === resumeData.roles.length - 1}
                            className={`p-3 rounded-full transition-all relative z-10 ${selectedRoleIndex === resumeData.roles.length - 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-black/5 hover:scale-110'} ${theme.text}`}
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>

                    {/* Collapsible Settings Panel */}
                    <div className={`border-b ${theme.panelBorder} ${agentPersona === 'FRIDAY' ? 'bg-gray-50/80' : 'bg-[#0A0A0A]'}`}>
                        <button 
                            onClick={() => setIsStyleSettingsOpen(!isStyleSettingsOpen)}
                            className={`w-full flex items-center justify-between px-6 md:px-8 py-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${theme.subtext} hover:opacity-80`}
                        >
                            <div className="flex items-center space-x-3">
                                <SlidersIcon className={`w-4 h-4 ${theme.text}`} />
                                <span>Refinement Parameters</span>
                                {activeFilters.length > 0 && (
                                    <span className={`ml-2 px-2 py-0.5 rounded text-[9px] ${theme.accentBg} text-white`}>
                                        {activeFilters.length} ACTIVE
                                    </span>
                                )}
                            </div>
                            {isStyleSettingsOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                        </button>
                        
                        {isStyleSettingsOpen && (
                            <div className="px-6 md:px-8 pb-8 pt-2 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-4">
                                    {categories.map(category => (
                                        <div key={category} className="flex flex-col space-y-3">
                                            <h4 className={`text-[9px] font-bold uppercase tracking-[0.2em] border-b pb-2 mb-1 ${theme.subtext} ${theme.panelBorder} opacity-50`}>{category}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {OPTIMIZATION_OPTIONS.filter(opt => opt.category === category).map(opt => {
                                                    const isActive = activeFilters.includes(opt.id as OptimizationFilter);
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => toggleFilter(opt.id as OptimizationFilter)}
                                                            className={`
                                                                px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-200
                                                                ${isActive 
                                                                    ? `${theme.buttonPrimary} border-transparent shadow-md scale-105` 
                                                                    : `bg-transparent border-gray-400/20 ${theme.subtext} hover:border-gray-400/50 hover:${theme.text}`}
                                                            `}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-8 space-y-8 max-h-[800px] overflow-y-auto custom-scrollbar">
                        {role.bullets.map((bullet, idx) => (
                            <div key={bullet.id} className={`group relative border-b last:border-0 pb-8 last:pb-0 ${theme.panelBorder}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <span className={`text-[10px] font-mono mr-4 opacity-30 ${theme.text} border border-current px-1.5 py-0.5 rounded`}>
                                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                                        </span>
                                        {bullet.status === 'APPROVED' && (
                                            <span className="text-emerald-500 text-[10px] uppercase font-bold flex items-center bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                <CheckCircleIcon className="w-3 h-3 mr-1.5"/> Optimized
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-3 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* EXPLICIT COPY BUTTON FOR ORIGINAL */}
                                        <button
                                            onClick={() => handleCopy(bullet.original, bullet.id)}
                                            className={`text-[10px] uppercase font-bold tracking-wider flex items-center px-2 py-1 rounded hover:bg-black/5 transition-colors ${theme.subtext}`}
                                        >
                                            {justCopiedId === bullet.id ? <CheckCircleIcon className="w-3.5 h-3.5 mr-1.5 text-green-500"/> : <CopyIcon className="w-3.5 h-3.5 mr-1.5"/>}
                                            <span className="hidden sm:inline">Copy</span>
                                        </button>
                                        
                                        {bullet.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleOptimizeBullet(selectedRoleIndex, idx, bullet.id)}
                                                disabled={!!optimizingBulletId}
                                                className={`hover:bg-blue-50 text-[10px] font-bold uppercase tracking-wider flex items-center transition-colors px-3 py-1 rounded border border-transparent hover:border-blue-100 ${theme.accent}`}
                                            >
                                                <SparklesIcon className="w-3.5 h-3.5 mr-1.5" />
                                                Refine
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className={`relative pl-4 md:pl-6 border-l-[2px] transition-colors ${bullet.status === 'APPROVED' ? 'border-emerald-500' : 'border-gray-300/20'}`}>
                                    {bullet.status === 'ANALYZING' ? (
                                        <div className="space-y-3 py-2">
                                             <div className={`h-4 w-3/4 rounded ${theme.shimmerBase} animate-pulse`}></div>
                                             <div className={`h-4 w-1/2 rounded ${theme.shimmerBase} animate-pulse`}></div>
                                        </div>
                                    ) : (
                                        <p className={`text-sm md:text-base leading-relaxed ${bullet.status === 'APPROVED' ? `font-medium ${theme.text}` : `font-light ${theme.subtext}`}`}>
                                            {bullet.original}
                                        </p>
                                    )}
                                </div>

                                {bullet.status === 'REVIEW' && bullet.rewrites && (
                                    <div className={`mt-6 ml-2 md:ml-6 space-y-4 animate-fade-in p-4 md:p-6 rounded-[1.5rem] border ${theme.panelBorder} ${agentPersona === 'FRIDAY' ? 'bg-white shadow-sm' : 'bg-black/30'}`}>
                                        <div className={`flex justify-between items-center border-b pb-3 mb-2 ${theme.panelBorder}`}>
                                            <h4 className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.subtext}`}>
                                                Optimized Variants
                                            </h4>
                                            <button
                                                onClick={() => handleRegenerateBullet(selectedRoleIndex, idx, bullet.id)}
                                                className={`text-[10px] font-bold uppercase tracking-wider flex items-center text-gray-400 hover:${theme.accent} transition-colors`}
                                                disabled={!!optimizingBulletId}
                                            >
                                                <RefreshCwIcon className={`w-3.5 h-3.5 mr-1.5 ${optimizingBulletId === bullet.id ? 'animate-spin' : ''}`} />
                                                Retry
                                            </button>
                                        </div>
                                        
                                        <div className="grid gap-4">
                                            {bullet.rewrites.map((option, optIdx) => (
                                                <div 
                                                    key={optIdx} 
                                                    className={`
                                                        rounded-xl border transition-all p-4 md:p-5 relative group hover:scale-[1.01] duration-300
                                                        ${option.isRecommended 
                                                            ? `${theme.panel} ${theme.accentLightBorder} shadow-lg ring-1 ${theme.highlightRing}`
                                                            : (agentPersona === 'FRIDAY' ? 'bg-gray-50 border-gray-100 hover:border-blue-200' : 'bg-white/5 border-white/5 hover:border-white/10')}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                                                                ${option.isRecommended 
                                                                    ? `${theme.accentLightBg} ${theme.accent}` 
                                                                    : (agentPersona === 'FRIDAY' ? 'bg-white border text-gray-400' : 'bg-black/20 text-gray-500')}
                                                            `}>
                                                                {option.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleCopy(option.text, `opt-${bullet.id}-${optIdx}`)}
                                                                className={`p-1.5 rounded-md hover:bg-black/5 transition-colors ${theme.subtext}`}
                                                                title="Copy Text"
                                                            >
                                                                 {justCopiedId === `opt-${bullet.id}-${optIdx}` ? <CheckCircleIcon className="w-4 h-4 text-green-500"/> : <CopyIcon className="w-4 h-4"/>}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAcceptRewrite(selectedRoleIndex, idx, option)}
                                                                className={`${theme.accent} hover:opacity-80 p-1.5 rounded-md hover:bg-black/5`}
                                                                title="Select this version"
                                                            >
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-medium leading-relaxed ${theme.text}`}>{option.text}</p>
                                                    <p className="text-[10px] opacity-50 mt-3 font-medium italic">{option.rationale}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      );
  };

  const renderSkillsSection = () => {
    if (!resumeData) return null;
    const isOpen = expandedSections['SKILLS'];

    return (
        <div className={`${theme.panel} rounded-3xl shadow-sm border ${theme.panelBorder} overflow-hidden mb-6 transition-all duration-300 hover:shadow-lg backdrop-blur-md`}>
            <button 
                onClick={() => toggleSection('SKILLS')} 
                className={`w-full flex justify-between items-center p-6 transition-colors ${agentPersona === 'FRIDAY' ? 'hover:bg-white' : 'hover:bg-white/5'}`}
            >
                <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 transition-colors shadow-sm shrink-0 ${isOpen ? theme.accentBg : (agentPersona === 'FRIDAY' ? 'bg-white border border-gray-100' : 'bg-white/5 border border-white/5')}`}>
                        <CheckCircleIcon className={`w-6 h-6 ${isOpen ? 'text-white' : theme.subtext}`} />
                    </div>
                    <div className="text-left">
                        <h3 className={`font-bold text-xl tracking-tight ${theme.text}`}>Skills Matrix</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.subtext} mt-1`}>Gap Analysis & Targeting</p>
                    </div>
                </div>
                <div className={`p-3 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180 bg-black/5' : 'bg-transparent'}`}>
                    <ChevronDownIcon className={`w-5 h-5 ${theme.subtext}`}/>
                </div>
            </button>

            {isOpen && (
                <div className={`p-6 md:p-8 border-t animate-fade-in ${theme.panelBorder}`}>
                    <div className="mb-8 flex flex-wrap gap-2">
                        {resumeData.skills.map((skill, idx) => (
                            <span key={idx} className={`border px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide ${agentPersona === 'FRIDAY' ? 'bg-white border-gray-200 text-gray-600' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                {skill}
                            </span>
                        ))}
                    </div>

                    {!skillsAnalysis ? (
                        isOptimizingSkills ? (
                            <div className="flex flex-wrap gap-4 animate-pulse">
                                {[1,2,3,4].map(i => <div key={i} className={`h-32 w-48 rounded-xl ${theme.shimmerBase}`}></div>)}
                            </div>
                        ) : (
                            <button 
                                onClick={handleOptimizeSkills}
                                disabled={isOptimizingSkills}
                                className={`flex items-center px-8 py-3 border rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm transition-all hover:shadow-md ${agentPersona === 'FRIDAY' ? 'bg-white border-gray-200 hover:border-blue-400 text-gray-900' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                            >
                                {isOptimizingSkills ? <RefreshCwIcon className="animate-spin mr-2"/> : <SparklesIcon className="mr-2"/>}
                                Detect Skill Gaps
                            </button>
                        )
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {skillsAnalysis.categorized.map((cat, idx) => (
                                    <div key={idx} className={`border rounded-2xl p-6 ${agentPersona === 'FRIDAY' ? 'border-gray-200 bg-gray-50/50' : 'border-white/10 bg-black/20'}`}>
                                        <h5 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${theme.subtext}`}>{cat.category}</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {cat.skills.map((s, i) => (
                                                <span key={i} className={`border px-2.5 py-1 rounded text-[11px] font-medium ${agentPersona === 'FRIDAY' ? 'bg-white border-gray-200 text-gray-700' : 'bg-black/40 border-white/10 text-gray-300'}`}>
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {skillsAnalysis.recommendations.length > 0 && (
                                <div className={`rounded-2xl p-6 md:p-8 border ${theme.accentLightBg} ${theme.accentLightBorder}`}>
                                    <h5 className={`text-xs font-bold ${theme.accent} uppercase tracking-widest mb-6 flex items-center`}>
                                        <SparklesIcon className="w-4 h-4 mr-2"/> Recommended Additions
                                    </h5>
                                    <div className="flex flex-wrap gap-3">
                                        {skillsAnalysis.recommendations.map((rec, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleAddSkill(rec)}
                                                className={`border px-4 py-2 rounded-lg text-xs font-bold tracking-wide flex items-center transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${agentPersona === 'FRIDAY' ? 'bg-white text-gray-700 border-gray-200 hover:border-blue-400' : 'bg-black/40 hover:bg-white/10 text-gray-200 border-white/10'}`}
                                            >
                                                + {rec}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <button onClick={() => setSkillsAnalysis(null)} className="text-gray-400 text-xs font-bold uppercase tracking-wide hover:text-gray-500">Close Matrix</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  };

  const renderChat = () => {
    if (!isChatOpen) {
        return (
            <button 
                onClick={() => setIsChatOpen(true)}
                className={`fixed bottom-8 right-8 p-5 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center border ${theme.buttonPrimary} group`}
                aria-label="Open Interface"
            >
                <MessageCircleIcon className="w-6 h-6" />
                <span className="absolute right-full mr-4 px-3 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">System Log</span>
            </button>
        );
    }

    return (
        <div className={`
            shadow-2xl flex flex-col transition-all duration-500 z-40
            ${appState === AppState.DASHBOARD ? 'fixed bottom-0 right-0 w-full h-full md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] md:rounded-[2rem]' : 'h-full rounded-2xl'}
            ${theme.panel} backdrop-blur-xl border ${theme.panelBorder}
        `}>
            <div className={`p-5 border-b flex justify-between items-center rounded-t-[2rem] ${theme.panelBorder}`}>
                <h3 className={`font-bold flex items-center text-[10px] uppercase tracking-[0.2em] ${theme.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-3 animate-pulse ${agentPersona === 'FRIDAY' ? 'bg-blue-500' : 'bg-orange-500'} `}></span>
                    System Log
                </h3>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={clearChatHistory} 
                        className={`${theme.subtext} hover:text-red-500 transition-colors p-2`}
                        title="Wipe History"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    {appState === AppState.DASHBOARD && (
                        <button onClick={() => setIsChatOpen(false)} className={`${theme.subtext} hover:${theme.text} transition-colors p-2`}>
                            <MinimizeIcon />
                        </button>
                    )}
                </div>
            </div>
            
            <div className={`flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar ${agentPersona === 'FRIDAY' ? 'bg-gray-50/50' : 'bg-black/30'}`}>
                {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <MessageCircleIcon className={`w-12 h-12 mb-4 ${theme.subtext}`} />
                        <p className={`text-xs uppercase tracking-widest ${theme.subtext}`}>Log Empty</p>
                    </div>
                ) : (
                    chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? `${theme.buttonPrimary} rounded-br-none` 
                                : `${agentPersona === 'FRIDAY' ? 'bg-white text-gray-700 border border-gray-200' : 'bg-[#151515] text-gray-300 border border-white/10'} rounded-bl-none`
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className={`p-5 border-t ${theme.panelBorder} rounded-b-[2rem]`}>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                        placeholder="Input command..."
                        className={`flex-1 border rounded-full px-5 py-3 focus:ring-2 focus:outline-none text-sm transition-all shadow-inner ${agentPersona === 'FRIDAY' ? 'bg-white border-gray-200 focus:ring-blue-100 text-gray-800' : 'bg-black/50 border-white/10 text-white focus:ring-orange-900/30'}`}
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={handleChatSend}
                        disabled={!chatInput.trim() || isProcessing}
                        className={`p-3 rounded-full disabled:opacity-50 transition-all shadow-md active:scale-95 hover:brightness-110 ${theme.buttonPrimary}`}
                    >
                        <SendIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const renderMainApp = () => (
    <div className={`max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 md:h-screen min-h-screen flex flex-col relative font-sans z-10`}>
      {/* Background blobs for abstract feel */}
      <div className={`fixed top-[-10%] left-[-5%] w-[800px] h-[800px] rounded-full blur-[120px] opacity-[0.08] pointer-events-none ${agentPersona === 'FRIDAY' ? 'bg-blue-600' : 'bg-orange-600'} abstract-shape`}></div>
      <div className={`fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[100px] opacity-[0.05] pointer-events-none ${agentPersona === 'FRIDAY' ? 'bg-purple-500' : 'bg-red-800'} abstract-shape`} style={{animationDelay: '2s'}}></div>

      <header className={`flex flex-col md:flex-row justify-between items-center mb-8 p-4 rounded-3xl md:rounded-full md:sticky md:top-4 relative z-30 ${theme.panel} shadow-xl border ${theme.panelBorder} backdrop-blur-2xl space-y-4 md:space-y-0`}>
        <div className="flex items-center pl-0 md:pl-4">
            <div className={`w-10 h-10 rounded-full mr-5 overflow-hidden shadow-md flex items-center justify-center relative group bg-gradient-to-br ${agentPersona === 'FRIDAY' ? 'from-white to-gray-200' : 'from-gray-800 to-black'}`}>
                 <img 
                  src="https://www.insidequantumtechnology.com/wp-content/uploads/2024/10/unnamed-1024x1024.png" 
                  alt="App Icon"
                  className={`w-full h-full object-cover transform scale-125 transition-transform duration-700 group-hover:scale-110
                    ${agentPersona === 'FRIDAY' ? 'filter hue-rotate-[190deg] brightness-125 saturate-150' : 'filter brightness-90 contrast-125'}
                  `}
                 />
            </div>
            <div>
                <h1 className={`text-sm font-black tracking-tight ${theme.text}`}>{AGENT_CONFIG[agentPersona].name}</h1>
                <div className="flex items-center mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${agentPersona === 'FRIDAY' ? 'bg-emerald-500' : 'bg-orange-500'} animate-pulse mr-2`}></span>
                    <p className={`text-[9px] font-bold tracking-[0.2em] uppercase ${theme.subtext}`}>Online</p>
                </div>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8 pr-0 md:pr-4 w-full md:w-auto">
             <AICoreSwitch persona={agentPersona} onToggle={togglePersona} />

            <div className={`hidden sm:block h-8 w-px ${agentPersona === 'FRIDAY' ? 'bg-gray-200' : 'bg-white/10'}`}></div>

            <button 
                onClick={() => {
                    setAppState(AppState.INTAKE);
                    setResumeText('');
                    setResumeData(null);
                    setChatHistory([]);
                }} 
                className={`text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-full transition-all border ${agentPersona === 'FRIDAY' ? 'border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100' : 'border-white/5 text-gray-400 hover:bg-white/5 hover:text-red-400 hover:border-white/10'}`}
            >
                Reset System
            </button>
        </div>
      </header>

      {renderDashboardHeader()}

      <div className="flex-1 flex flex-col gap-8 min-h-0 pb-4 relative z-10">
        <div className="md:flex-1 md:h-full md:min-h-[500px] md:overflow-y-auto md:pr-2 pb-20 custom-scrollbar h-auto overflow-visible">
            {renderSummarySection()}
            {renderWorkExperienceSection()}
            {renderSkillsSection()}
        </div>
      </div>
      
      {renderChat()}
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${theme.bg} relative overflow-x-hidden`}>
      {/* Global Background Pattern Layer - Fixed to cover full screen */}
      <div className={`fixed inset-0 w-full h-full z-0 ${theme.bgPattern} pointer-events-none bg-fixed transition-opacity duration-1000 ${appState === AppState.INTAKE || appState === AppState.ANALYZING ? 'opacity-50' : 'opacity-100'}`}></div>

      {appState === AppState.INTAKE || appState === AppState.ANALYZING ? (
        <div className="pt-24 pb-12 overflow-hidden relative min-h-screen flex flex-col z-10">
            <div className={`fixed top-[-20%] left-[-10%] w-[1000px] h-[1000px] rounded-full blur-[150px] opacity-[0.1] pointer-events-none ${agentPersona === 'FRIDAY' ? 'bg-blue-400' : 'bg-orange-700'}`}></div>
            
            {/* Header for Intake */}
            <div className="absolute top-8 right-0 left-0 flex justify-center md:justify-end md:right-8 z-50 px-4">
                {appState === AppState.INTAKE && (
                     <AICoreSwitch persona={agentPersona} onToggle={togglePersona} />
                )}
            </div>

            {isProcessing && appState === AppState.ANALYZING ? (
                 <div className="flex flex-col items-center justify-center h-[70vh] animate-fade-in z-20 px-4">
                    <div className="relative mb-12">
                        <div className={`w-32 h-32 border-t-2 border-b-2 rounded-full animate-spin ${agentPersona === 'FRIDAY' ? 'border-blue-500' : 'border-orange-500'}`}></div>
                        <div className={`absolute inset-0 w-20 h-20 m-auto border-r-2 border-l-2 rounded-full animate-spin-reverse ${agentPersona === 'FRIDAY' ? 'border-purple-400' : 'border-red-500'}`}></div>
                        <div className={`absolute inset-0 w-4 h-4 m-auto rounded-full animate-pulse ${agentPersona === 'FRIDAY' ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                    </div>
                    <h2 className={`text-4xl md:text-5xl font-thin tracking-tighter ${theme.text} text-center`}>Decrypting Career Data</h2>
                    <p className={`mt-6 font-mono text-xs uppercase tracking-[0.4em] ${theme.subtext}`}>Running Neural Analysis...</p>
                 </div>
            ) : renderIntake()}
        </div>
      ) : (
        renderMainApp()
      )}
    </div>
  );
};

export default App;