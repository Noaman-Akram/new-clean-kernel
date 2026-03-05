import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIContextSettings, AppState, ChatMessage, ContextPackId } from '../types';
import {
  Bell,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Mic,
  Square,
  Send,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  AIProvider,
  AIProviderPreference,
  AIProviderUsed,
  getDefaultProviderSettings,
  getPuterUser,
  isPuterAvailable,
  isPuterSignedIn,
  ProviderSettings,
  sendMessageToAI,
  signInToPuter,
  signOutFromPuter,
} from '../services/aiService';
import {
  getDefaultSTTProviderSettings,
  STTProgressEvent,
  STTProvider,
  STTProviderPreference,
  STTProviderSettings,
  transcribeAudioWithFallback,
} from '../services/sttService';
import { getDefaultAIContextSettings } from '../defaultPreferences';
import { composeMentorContext } from '../services/context/contextComposer';
import {
  CONTEXT_PACK_DEFINITIONS,
  getCoreOnlyContextPackConfigs,
  normalizeContextPackConfigs,
} from '../services/context/contextRegistry';

interface Props {
  state: AppState;
  onChatUpdate: (history: ChatMessage[]) => void;
  onAddGoal: (title: string) => void;
  onUpdateGoal: (id: string, updates: Partial<any>) => void;
  onPreferencesUpdate: (preferences: AppState['userPreferences']) => void;
  onSystemNotice?: (notice: {
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
    text: string;
  }) => void;
}

type AgentIconKey = 'ZAP' | 'BOT' | 'USER' | 'MIC' | 'BELL' | 'SEND';

interface AgentProfile {
  id: string;
  name: string;
  icon: AgentIconKey;
  systemPrompt: string;
  includeContext: boolean;
  isRaw?: boolean;
  isCustom?: boolean;
}

const AUTO_SPEAK_KEY = 'mentor_auto_speak';
const DESKTOP_ALERTS_KEY = 'mentor_desktop_alerts';
const PROVIDER_MODE_KEY = 'mentor_provider_mode';
const PROVIDER_SETTINGS_KEY = 'mentor_provider_settings';
const AUTO_ROUTE_KEY = 'mentor_auto_route_order';
const STT_MODE_KEY = 'mentor_stt_mode';
const STT_SETTINGS_KEY = 'mentor_stt_provider_settings';
const STT_AUTO_ROUTE_KEY = 'mentor_stt_auto_route_order';
const CUSTOM_AGENTS_KEY = 'mentor_custom_agents';
const ACTIVE_AGENT_KEY = 'mentor_active_agent';
const ARTIFACT_PANEL_OPEN_KEY = 'mentor_artifact_open';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  PUTER: 'Puter',
  OPENROUTER: 'OpenRouter',
  GEMINI: 'Gemini',
};

const STT_PROVIDER_LABELS: Record<STTProvider, string> = {
  GROQ: 'Groq Whisper',
  ELEVENLABS: 'ElevenLabs',
};

const PROMPT_PRESETS = [
  {
    label: 'Friday in New Cairo',
    prompt:
      'Build me a minute-by-minute Friday itinerary in New Cairo from breakfast until 10:00 PM. Keep it unique, do not include restaurants, use only specific real places, add direct map links, avoid repeating recommendations, and explain why each stop fits the flow of the day.',
  },
  {
    label: 'Daily accountability',
    prompt:
      'Act as my execution mentor. Review my pending work, call out the biggest avoidance pattern, and give me a strict plan for the next 90 minutes with exact checkpoints.',
  },
  {
    label: 'Focus reset',
    prompt:
      'I got distracted. Give me a no-fluff reset: what to stop, what to do next, and how to report back in 30 minutes.',
  },
];

const readBooleanFlag = (key: string): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) === 'true';
};

const readArtifactPanelOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ARTIFACT_PANEL_OPEN_KEY) !== 'false';
};

const BASE_AGENTS: AgentProfile[] = [
  {
    id: 'EXECUTION',
    name: 'Execution Mentor',
    icon: 'ZAP',
    includeContext: true,
    systemPrompt: `
You are Noeman's execution mentor.

Operating rules:
1. Be direct, specific, and slightly demanding.
2. Focus on action, accountability, and deadlines.
3. Challenge avoidance, over-planning, and context switching.
4. Convert requests into concrete next steps, short check-ins, and measurable outputs.
5. If the user sounds distracted, immediately reset them into the next 15-90 minute block.
6. Keep responses structured and useful, not motivational.

If the user asks for a schedule, produce a precise timeline.
If information is missing, ask one blocking question instead of inventing details.
    `.trim(),
  },
  {
    id: 'GENERAL',
    name: 'Strategist',
    icon: 'BOT',
    includeContext: true,
    systemPrompt: `
You are a pragmatic general assistant for Noeman.

Rules:
1. Prioritize clarity and correctness.
2. Give structured outputs with explicit tradeoffs.
3. Prefer concise answers, but expand when the task is complex.
4. Use the live app context when it materially improves the answer.
    `.trim(),
  },
  {
    id: 'CONCIERGE',
    name: 'Experience Concierge',
    icon: 'BELL',
    includeContext: true,
    systemPrompt: `
You are a highly structured experience planner.

Rules:
1. When asked for an itinerary, produce a strict time-by-time schedule.
2. Keep the layout polished, visually scannable, and icon-led.
3. Do not repeat recommendations.
4. Use specific place names only. Never use vague placeholders.
5. Do not include restaurants unless the user explicitly asks for them.
6. Explain the reasoning behind each stop in a compact but concrete way.
7. If you cannot confidently verify a real location or link, do not invent it. State that location verification is required.
8. Do not add out-of-context filler.

The user's home base is New Cairo unless they specify otherwise.
    `.trim(),
  },
  {
    id: 'RAW',
    name: 'Raw API',
    icon: 'SEND',
    includeContext: false,
    isRaw: true,
    systemPrompt: '',
  },
];

const AGENT_ICON_OPTIONS: { value: AgentIconKey; label: string }[] = [
  { value: 'ZAP', label: 'Zap' },
  { value: 'BOT', label: 'Bot' },
  { value: 'USER', label: 'User' },
  { value: 'MIC', label: 'Mic' },
  { value: 'BELL', label: 'Bell' },
  { value: 'SEND', label: 'Send' },
];

const readCustomAgents = (): AgentProfile[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CUSTOM_AGENTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<AgentProfile>>;
    return parsed
      .filter((agent) => !!agent.id && !!agent.name)
      .map((agent) => ({
        id: String(agent.id),
        name: String(agent.name),
        icon: AGENT_ICON_OPTIONS.some((option) => option.value === agent.icon)
          ? (agent.icon as AgentIconKey)
          : 'BOT',
        systemPrompt: String(agent.systemPrompt || ''),
        includeContext: agent.includeContext !== false,
        isCustom: true,
        isRaw: false,
      }));
  } catch (error) {
    console.warn('Failed to parse custom agents:', error);
    return [];
  }
};

const readActiveAgentId = (): string => {
  if (typeof window === 'undefined') return 'EXECUTION';
  return localStorage.getItem(ACTIVE_AGENT_KEY) || 'EXECUTION';
};

const readProviderMode = (): AIProviderPreference => {
  if (typeof window === 'undefined') return 'AUTO';
  const value = localStorage.getItem(PROVIDER_MODE_KEY);
  if (value === 'PUTER' || value === 'OPENROUTER' || value === 'GEMINI' || value === 'AUTO') {
    return value;
  }
  return 'AUTO';
};

const readProviderSettings = (): Record<AIProvider, ProviderSettings> => {
  const defaults = getDefaultProviderSettings();
  if (typeof window === 'undefined') return defaults;

  const raw = localStorage.getItem(PROVIDER_SETTINGS_KEY);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<AIProvider, ProviderSettings>>;
    return {
      PUTER: {
        model: parsed.PUTER?.model?.trim() || defaults.PUTER.model,
      },
      OPENROUTER: {
        model: parsed.OPENROUTER?.model?.trim() || defaults.OPENROUTER.model,
        apiKey: parsed.OPENROUTER?.apiKey || '',
      },
      GEMINI: {
        model: parsed.GEMINI?.model?.trim() || defaults.GEMINI.model,
        apiKey: parsed.GEMINI?.apiKey || '',
      },
    };
  } catch (error) {
    console.warn('Failed to parse saved provider settings:', error);
    return defaults;
  }
};

const readAutoRouteOrder = (): AIProvider[] => {
  if (typeof window === 'undefined') return ['PUTER', 'OPENROUTER', 'GEMINI'];
  const raw = localStorage.getItem(AUTO_ROUTE_KEY);
  if (!raw) return ['PUTER', 'OPENROUTER', 'GEMINI'];

  try {
    const parsed = JSON.parse(raw) as string[];
    const cleaned = parsed.filter(
      (item): item is AIProvider => item === 'PUTER' || item === 'OPENROUTER' || item === 'GEMINI'
    );

    const missing = (['PUTER', 'OPENROUTER', 'GEMINI'] as AIProvider[]).filter(
      (provider) => !cleaned.includes(provider)
    );

    return [...cleaned, ...missing];
  } catch (error) {
    console.warn('Failed to parse saved route order:', error);
    return ['PUTER', 'OPENROUTER', 'GEMINI'];
  }
};

const readSTTMode = (): STTProviderPreference => {
  if (typeof window === 'undefined') return 'AUTO';
  const value = localStorage.getItem(STT_MODE_KEY);
  if (value === 'AUTO' || value === 'GROQ' || value === 'ELEVENLABS') {
    return value;
  }
  return 'AUTO';
};

const readSTTProviderSettings = (): Record<STTProvider, STTProviderSettings> => {
  const defaults = getDefaultSTTProviderSettings();
  if (typeof window === 'undefined') return defaults;

  const raw = localStorage.getItem(STT_SETTINGS_KEY);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<STTProvider, STTProviderSettings>>;
    return {
      GROQ: {
        model: parsed.GROQ?.model?.trim() || defaults.GROQ.model,
        apiKey: parsed.GROQ?.apiKey || '',
        language: parsed.GROQ?.language || '',
      },
      ELEVENLABS: {
        model: parsed.ELEVENLABS?.model?.trim() || defaults.ELEVENLABS.model,
        apiKey: parsed.ELEVENLABS?.apiKey || '',
        language: parsed.ELEVENLABS?.language || '',
      },
    };
  } catch (error) {
    console.warn('Failed to parse saved STT provider settings:', error);
    return defaults;
  }
};

const readSTTAutoRouteOrder = (): STTProvider[] => {
  if (typeof window === 'undefined') return ['GROQ', 'ELEVENLABS'];
  const raw = localStorage.getItem(STT_AUTO_ROUTE_KEY);
  if (!raw) return ['GROQ', 'ELEVENLABS'];

  try {
    const parsed = JSON.parse(raw) as string[];
    const cleaned = parsed.filter(
      (item): item is STTProvider => item === 'GROQ' || item === 'ELEVENLABS'
    );
    const missing = (['GROQ', 'ELEVENLABS'] as STTProvider[]).filter(
      (provider) => !cleaned.includes(provider)
    );
    return [...cleaned, ...missing];
  } catch (error) {
    console.warn('Failed to parse saved STT route order:', error);
    return ['GROQ', 'ELEVENLABS'];
  }
};

const truncate = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
};

const summarizeEarlierHistory = (messages: ChatMessage[]): string => {
  if (!messages.length) return '';

  const sampleLimit = Math.min(8, messages.length);
  const step = Math.max(1, Math.ceil(messages.length / sampleLimit));
  const sampled: ChatMessage[] = [];

  for (let index = 0; index < messages.length; index += step) {
    sampled.push(messages[index]);
  }

  const lastMessage = messages[messages.length - 1];
  if (sampled[sampled.length - 1] !== lastMessage) {
    sampled.push(lastMessage);
  }

  return sampled
    .slice(-8)
    .map(
      (message) =>
        `- ${message.role === 'model' ? 'Assistant' : 'User'}: ${truncate(
          message.text.replace(/\s+/g, ' ').trim(),
          180
        )}`
    )
    .join('\n');
};

type ArtifactKind = 'CODE' | 'MARKDOWN' | 'DOCUMENT';
type ArtifactViewMode = 'PREVIEW' | 'RAW';

interface ParsedCodeBlock {
  language: string;
  body: string;
}

interface ConversationArtifact {
  kind: ArtifactKind;
  title: string;
  content: string;
  language?: string;
  sourceTimestamp: number;
  sourceRole: ChatMessage['role'];
}

const parseCodeBlocks = (text: string): ParsedCodeBlock[] => {
  const blocks: ParsedCodeBlock[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match) {
    blocks.push({
      language: match[1]?.trim().toLowerCase() || 'text',
      body: match[2]?.trim() || '',
    });
    match = regex.exec(text);
  }

  return blocks;
};

const looksLikeMarkdown = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  return (
    /^#{1,6}\s+/m.test(trimmed) ||
    /^(\-|\*|\+)\s+/m.test(trimmed) ||
    /^\d+\.\s+/m.test(trimmed) ||
    /^>\s+/m.test(trimmed) ||
    /\[[^\]]+\]\([^)]+\)/.test(trimmed) ||
    /\*\*[^*]+\*\*/.test(trimmed) ||
    /`[^`]+`/.test(trimmed)
  );
};

const buildConversationArtifact = (messages: ChatMessage[]): ConversationArtifact | null => {
  if (!messages.length) return null;

  const latestModelMessage = [...messages].reverse().find((message) => message.role === 'model');
  const sourceMessage = latestModelMessage || messages[messages.length - 1];
  const text = sourceMessage.text.trim();

  if (!text) return null;

  const codeBlocks = parseCodeBlocks(text);
  if (codeBlocks.length) {
    const primaryBlock = [...codeBlocks].sort((a, b) => b.body.length - a.body.length)[0];
    const langLabel = primaryBlock.language === 'text' ? 'Code' : `${primaryBlock.language.toUpperCase()} Code`;

    return {
      kind: 'CODE',
      title: `${langLabel} Artifact`,
      content: primaryBlock.body,
      language: primaryBlock.language,
      sourceTimestamp: sourceMessage.timestamp,
      sourceRole: sourceMessage.role,
    };
  }

  if (looksLikeMarkdown(text)) {
    return {
      kind: 'MARKDOWN',
      title: 'Markdown Artifact',
      content: text,
      sourceTimestamp: sourceMessage.timestamp,
      sourceRole: sourceMessage.role,
    };
  }

  return {
    kind: 'DOCUMENT',
    title: 'Live Document Artifact',
    content: text,
    sourceTimestamp: sourceMessage.timestamp,
    sourceRole: sourceMessage.role,
  };
};

const renderMarkdownLines = (content: string): React.ReactNode[] => {
  const lines = content.split('\n');
  const output: React.ReactNode[] = [];

  let index = 0;
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeBuffer: string[] = [];

  const flushCodeBuffer = () => {
    if (!codeBuffer.length) return;
    output.push(
      <div
        key={`code-${output.length}`}
        className="my-3 rounded-md border border-border bg-background/70 overflow-hidden"
      >
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-border">
          {codeLanguage || 'code'}
        </div>
        <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed font-mono text-zinc-200 whitespace-pre">
          {codeBuffer.join('\n')}
        </pre>
      </div>
    );
    codeBuffer = [];
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.replace('```', '').trim().toLowerCase();
      } else {
        inCodeBlock = false;
        flushCodeBuffer();
      }
      index += 1;
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      index += 1;
      continue;
    }

    if (!line.trim()) {
      output.push(<div key={`spacer-${output.length}`} className="h-2" />);
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2];
      const headingClass =
        depth === 1
          ? 'text-lg'
          : depth === 2
            ? 'text-base'
            : depth === 3
              ? 'text-sm'
              : 'text-[13px]';

      output.push(
        <div key={`heading-${output.length}`} className={`${headingClass} font-medium text-zinc-100 tracking-tight`}>
          {text}
        </div>
      );
      index += 1;
      continue;
    }

    const bulletMatch = line.match(/^(\-|\*|\+)\s+(.+)$/);
    if (bulletMatch) {
      output.push(
        <div key={`bullet-${output.length}`} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" />
          <span>{bulletMatch[2]}</span>
        </div>
      );
      index += 1;
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      output.push(
        <div key={`ordered-${output.length}`} className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
          <span className="text-zinc-500 font-mono text-[11px] shrink-0 pt-0.5">{orderedMatch[1]}.</span>
          <span>{orderedMatch[2]}</span>
        </div>
      );
      index += 1;
      continue;
    }

    const quoteMatch = line.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      output.push(
        <div
          key={`quote-${output.length}`}
          className="border-l border-zinc-600 pl-3 text-sm leading-relaxed text-zinc-400"
        >
          {quoteMatch[1]}
        </div>
      );
      index += 1;
      continue;
    }

    output.push(
      <p key={`paragraph-${output.length}`} className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
        {line}
      </p>
    );
    index += 1;
  }

  if (codeBuffer.length) {
    flushCodeBuffer();
  }

  return output;
};

const renderAgentIcon = (icon: AgentIconKey, size = 14) => {
  if (icon === 'ZAP') return <Zap size={size} />;
  if (icon === 'USER') return <User size={size} />;
  if (icon === 'MIC') return <Mic size={size} />;
  if (icon === 'BELL') return <Bell size={size} />;
  if (icon === 'SEND') return <Send size={size} />;
  return <Bot size={size} />;
};

const MentorView: React.FC<Props> = ({ state, onChatUpdate, onPreferencesUpdate, onSystemNotice }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string>(() => readActiveAgentId());
  const [customAgents, setCustomAgents] = useState<AgentProfile[]>(() => readCustomAgents());
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentIcon, setNewAgentIcon] = useState<AgentIconKey>('BOT');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentIncludeContext, setNewAgentIncludeContext] = useState(true);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState<boolean>(() => readArtifactPanelOpen());
  const [providerPreference, setProviderPreference] = useState<AIProviderPreference>(() => readProviderMode());
  const [providerSettings, setProviderSettings] = useState<Record<AIProvider, ProviderSettings>>(() =>
    readProviderSettings()
  );
  const [autoRouteOrder, setAutoRouteOrder] = useState<AIProvider[]>(() => readAutoRouteOrder());
  const [lastProvider, setLastProvider] = useState<AIProviderUsed | null>(null);
  const [lastAttemptChain, setLastAttemptChain] = useState<AIProvider[]>([]);
  const [sttProviderPreference, setSttProviderPreference] = useState<STTProviderPreference>(() => readSTTMode());
  const [sttProviderSettings, setSttProviderSettings] = useState<Record<STTProvider, STTProviderSettings>>(() =>
    readSTTProviderSettings()
  );
  const [sttAutoRouteOrder, setSttAutoRouteOrder] = useState<STTProvider[]>(() => readSTTAutoRouteOrder());
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttLastProvider, setSttLastProvider] = useState<STTProvider | null>(null);
  const [sttLastAttemptChain, setSttLastAttemptChain] = useState<STTProvider[]>([]);
  const [sttDebugLog, setSttDebugLog] = useState<string[]>([]);
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);
  const [pendingAudioName, setPendingAudioName] = useState<string>('');
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [puterAvailable, setPuterAvailable] = useState(false);
  const [puterSignedIn, setPuterSignedIn] = useState(false);
  const [puterIdentity, setPuterIdentity] = useState('');
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => readBooleanFlag(AUTO_SPEAK_KEY));
  const [desktopAlerts, setDesktopAlerts] = useState<boolean>(() => readBooleanFlag(DESKTOP_ALERTS_KEY));
  const [artifactViewMode, setArtifactViewMode] = useState<ArtifactViewMode>('PREVIEW');
  const [artifactCopied, setArtifactCopied] = useState(false);
  const [lastTranscriptPreview, setLastTranscriptPreview] = useState('');
  const [showContextQuickPicker, setShowContextQuickPicker] = useState(false);
  const [nextContextOverrides, setNextContextOverrides] = useState<Partial<Record<ContextPackId, boolean>>>({});
  const [lastContextStats, setLastContextStats] = useState<{
    usedTokens: number;
    targetTokens: number;
    selectedPacks: number;
    cacheHits: number;
    cacheMisses: number;
    generatedAt: number;
  } | null>(null);
  const [activeTraceKey, setActiveTraceKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const contextQuickPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const agents = useMemo(() => [...BASE_AGENTS, ...customAgents], [customAgents]);
  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) || BASE_AGENTS[0],
    [agents, activeAgentId]
  );
  const artifact = useMemo(() => buildConversationArtifact(state.chatHistory), [state.chatHistory]);
  const contextDefaults = useMemo(() => getDefaultAIContextSettings(), []);
  const aiContextSettings = useMemo<AIContextSettings>(() => {
    const incoming = state.userPreferences?.aiContext;
    return {
      ...contextDefaults,
      ...(incoming || {}),
      mode: 'MANUAL_ONLY',
      sourceUx: 'CHIPS',
      packs: normalizeContextPackConfigs(incoming?.packs || contextDefaults.packs),
    };
  }, [contextDefaults, state.userPreferences?.aiContext]);
  const enabledContextPackCount = useMemo(
    () => aiContextSettings.packs.filter((pack) => pack.enabled).length,
    [aiContextSettings.packs]
  );
  const contextPackRows = useMemo(
    () =>
      CONTEXT_PACK_DEFINITIONS.map((definition) => ({
        ...definition,
        config:
          aiContextSettings.packs.find((pack) => pack.id === definition.id) || {
            id: definition.id,
            enabled: true,
            priority: definition.defaultPriority,
            maxItems: definition.defaultMaxItems,
          },
      })).sort((a, b) => a.config.priority - b.config.priority),
    [aiContextSettings.packs]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const publishNotice = (level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', text: string) => {
    onSystemNotice?.({ level, text });
  };

  const pushSttLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSttDebugLog((current) => {
      const next = [...current, `[${timestamp}] ${message}`];
      return next.slice(-12);
    });
  };

  const clearPendingAudio = () => {
    setPendingAudioBlob(null);
    setPendingAudioName('');
    setPendingAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const setPendingAudioClip = (blob: Blob, name: string) => {
    setPendingAudioBlob(blob);
    setPendingAudioName(name);
    setPendingAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
  };

  const syncPuterState = async () => {
    const available = isPuterAvailable();
    setPuterAvailable(available);

    if (!available) {
      setPuterSignedIn(false);
      setPuterIdentity('');
      return;
    }

    const signedIn = isPuterSignedIn();
    setPuterSignedIn(signedIn);

    if (!signedIn) {
      setPuterIdentity('');
      return;
    }

    const user = await getPuterUser();
    setPuterIdentity(user?.username || user?.email || 'connected');
  };

  const speakReply = (text: string) => {
    if (!autoSpeak || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const notifyDesktop = (title: string, body: string) => {
    if (!desktopAlerts || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body: body.length > 180 ? `${body.slice(0, 177)}...` : body,
    });
  };

  const copyArtifactToClipboard = async () => {
    if (!artifact?.content || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(artifact.content);
      setArtifactCopied(true);
      window.setTimeout(() => setArtifactCopied(false), 1400);
      publishNotice('SUCCESS', 'Artifact copied to clipboard.');
    } catch (error) {
      console.error(error);
      publishNotice('ERROR', 'Clipboard copy failed in this browser context.');
    }
  };

  const persistAIContextSettings = (next: AIContextSettings) => {
    onPreferencesUpdate({
      ...state.userPreferences,
      aiContext: {
        ...next,
        mode: 'MANUAL_ONLY',
        sourceUx: 'CHIPS',
        packs: normalizeContextPackConfigs(next.packs),
      },
    });
  };

  const updateContextPack = (packId: ContextPackId, updates: Partial<{ enabled: boolean; priority: number; maxItems: number }>) => {
    const nextPacks = aiContextSettings.packs.map((pack) =>
      pack.id === packId
        ? {
            ...pack,
            enabled: updates.enabled ?? pack.enabled,
            priority: updates.priority ?? pack.priority,
            maxItems: updates.maxItems ?? pack.maxItems,
          }
        : pack
    );

    persistAIContextSettings({
      ...aiContextSettings,
      packs: nextPacks,
    });
  };

  const applyContextPreset = (preset: 'ALL_ON' | 'CORE_ONLY' | 'ALL_OFF' | 'RESET') => {
    if (preset === 'RESET') {
      persistAIContextSettings(getDefaultAIContextSettings());
      return;
    }

    if (preset === 'CORE_ONLY') {
      persistAIContextSettings({
        ...aiContextSettings,
        packs: getCoreOnlyContextPackConfigs(),
      });
      return;
    }

    const nextPacks = aiContextSettings.packs.map((pack) => ({
      ...pack,
      enabled: preset === 'ALL_ON',
    }));
    persistAIContextSettings({
      ...aiContextSettings,
      packs: nextPacks,
    });
  };

  const effectiveContextSettings = useMemo<AIContextSettings>(() => {
    const hasOverrides = Object.keys(nextContextOverrides).length > 0;
    if (!hasOverrides) return aiContextSettings;

    return {
      ...aiContextSettings,
      packs: aiContextSettings.packs.map((pack) => {
        const override = nextContextOverrides[pack.id];
        if (typeof override !== 'boolean') return pack;
        return {
          ...pack,
          enabled: override,
        };
      }),
    };
  }, [aiContextSettings, nextContextOverrides]);
  const effectiveEnabledPackCount = useMemo(
    () => effectiveContextSettings.packs.filter((pack) => pack.enabled).length,
    [effectiveContextSettings.packs]
  );

  const isPackEnabledForNextMessage = (packId: ContextPackId): boolean => {
    const override = nextContextOverrides[packId];
    if (typeof override === 'boolean') return override;
    return aiContextSettings.packs.find((pack) => pack.id === packId)?.enabled ?? true;
  };

  const toggleNextContextOverride = (packId: ContextPackId) => {
    const baseline = aiContextSettings.packs.find((pack) => pack.id === packId)?.enabled ?? true;
    setNextContextOverrides((current) => {
      const currentValue = typeof current[packId] === 'boolean' ? (current[packId] as boolean) : baseline;
      const nextValue = !currentValue;
      if (nextValue === baseline) {
        const { [packId]: _removed, ...rest } = current;
        return rest;
      }
      return {
        ...current,
        [packId]: nextValue,
      };
    });
  };

  const handleCreateAgent = () => {
    const name = newAgentName.trim();
    const prompt = newAgentPrompt.trim();

    if (!name) {
      publishNotice('WARN', 'Agent name is required.');
      return;
    }

    const nextAgent: AgentProfile = {
      id: `CUSTOM_${Date.now()}`,
      name,
      icon: newAgentIcon,
      systemPrompt: prompt,
      includeContext: newAgentIncludeContext,
      isCustom: true,
      isRaw: false,
    };

    setCustomAgents((current) => [...current, nextAgent]);
    setActiveAgentId(nextAgent.id);
    setNewAgentName('');
    setNewAgentPrompt('');
    setNewAgentIcon('BOT');
    setNewAgentIncludeContext(true);
    publishNotice('SUCCESS', `${name} was added and set as active.`);
  };

  const handleDeleteCustomAgent = (agentId: string) => {
    setCustomAgents((current) => current.filter((agent) => agent.id !== agentId));
    if (activeAgentId === agentId) {
      setActiveAgentId(BASE_AGENTS[0].id);
    }
  };

  const updateProviderSetting = (
    provider: AIProvider,
    field: keyof ProviderSettings,
    value: string
  ) => {
    setProviderSettings((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        [field]: value,
      },
    }));
  };

  const moveRouteProvider = (index: number, direction: -1 | 1) => {
    setAutoRouteOrder((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const updateSTTProviderSetting = (
    provider: STTProvider,
    field: keyof STTProviderSettings,
    value: string
  ) => {
    setSttProviderSettings((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        [field]: value,
      },
    }));
  };

  const moveSTTRouteProvider = (index: number, direction: -1 | 1) => {
    setSttAutoRouteOrder((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatHistory, isThinking]);

  useEffect(() => {
    void syncPuterState();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_SPEAK_KEY, String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DESKTOP_ALERTS_KEY, String(desktopAlerts));
  }, [desktopAlerts]);

  useEffect(() => {
    if (!agents.some((agent) => agent.id === activeAgentId)) {
      setActiveAgentId(BASE_AGENTS[0].id);
    }
  }, [agents, activeAgentId]);

  useEffect(() => {
    if (activeAgent.includeContext) return;
    setShowContextQuickPicker(false);
    setNextContextOverrides({});
  }, [activeAgent.includeContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_AGENT_KEY, activeAgentId);
  }, [activeAgentId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(customAgents));
  }, [customAgents]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ARTIFACT_PANEL_OPEN_KEY, String(artifactOpen));
  }, [artifactOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROVIDER_MODE_KEY, providerPreference);
  }, [providerPreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(providerSettings));
  }, [providerSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_ROUTE_KEY, JSON.stringify(autoRouteOrder));
  }, [autoRouteOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STT_MODE_KEY, sttProviderPreference);
  }, [sttProviderPreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STT_SETTINGS_KEY, JSON.stringify(sttProviderSettings));
  }, [sttProviderSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STT_AUTO_ROUTE_KEY, JSON.stringify(sttAutoRouteOrder));
  }, [sttAutoRouteOrder]);

  useEffect(() => {
    if (!showSettingsPanel) return;

    const closeOnClickOutside = (event: MouseEvent) => {
      if (!settingsPanelRef.current) return;
      if (settingsPanelRef.current.contains(event.target as Node)) return;
      setShowSettingsPanel(false);
    };

    window.addEventListener('mousedown', closeOnClickOutside);
    return () => window.removeEventListener('mousedown', closeOnClickOutside);
  }, [showSettingsPanel]);

  useEffect(() => {
    if (!showContextQuickPicker) return;

    const closeOnClickOutside = (event: MouseEvent) => {
      if (!contextQuickPickerRef.current) return;
      if (contextQuickPickerRef.current.contains(event.target as Node)) return;
      setShowContextQuickPicker(false);
    };

    window.addEventListener('mousedown', closeOnClickOutside);
    return () => window.removeEventListener('mousedown', closeOnClickOutside);
  }, [showContextQuickPicker]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    };
  }, [pendingAudioUrl]);

  const handlePuterSignIn = async () => {
    try {
      const user = await signInToPuter();
      setPuterAvailable(true);
      setPuterSignedIn(true);
      setPuterIdentity(user?.username || user?.email || 'connected');
      publishNotice('SUCCESS', 'Puter is connected. Auto routing can now use it as the primary free provider.');
    } catch (error) {
      console.error(error);
      publishNotice('ERROR', 'Puter sign-in failed. Auto routing will skip it if it stays unavailable.');
    }
  };

  const handlePuterSignOut = async () => {
    try {
      await signOutFromPuter();
      setPuterSignedIn(false);
      setPuterIdentity('');
      publishNotice('INFO', 'Puter was disconnected for this browser session.');
    } catch (error) {
      console.error(error);
      publishNotice('ERROR', 'Puter sign-out failed.');
    }
  };

  const handleDesktopAlertsToggle = async () => {
    if (desktopAlerts) {
      setDesktopAlerts(false);
      publishNotice('INFO', 'Desktop alerts disabled.');
      return;
    }

    if (typeof Notification === 'undefined') {
      publishNotice('WARN', 'This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      setDesktopAlerts(true);
      publishNotice('SUCCESS', 'Desktop alerts enabled.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDesktopAlerts(true);
      publishNotice('SUCCESS', 'Desktop alerts enabled.');
      return;
    }

    publishNotice('WARN', 'Desktop notification permission was not granted.');
  };

  const appendTranscriptToInput = (transcript: string): string => {
    const cleaned = transcript.trim();
    if (!cleaned) return '';
    setInput((current) => (current.trim() ? `${current.trimEnd()} ${cleaned}` : cleaned));
    return cleaned;
  };

  const handleTranscribeAudio = async (audio?: File | Blob) => {
    const sourceAudio = audio || pendingAudioBlob;
    if (!sourceAudio) {
      publishNotice('WARN', 'No audio clip selected. Record or upload first.');
      return;
    }

    setIsTranscribing(true);
    setSttDebugLog([]);
    pushSttLog('STT started.');

    try {
      const onProgress = (event: STTProgressEvent) => {
        pushSttLog(event.message);
      };

      const result = await transcribeAudioWithFallback(sourceAudio, {
        provider: sttProviderPreference,
        providerSettings: sttProviderSettings,
        autoRoute: sttAutoRouteOrder.map((provider) => ({
          provider,
          model: sttProviderSettings[provider].model,
          apiKey: sttProviderSettings[provider].apiKey,
        })),
        timeoutMs: 90000,
        onProgress,
      });

      const transcript = appendTranscriptToInput(result.text);
      if (transcript) {
        setLastTranscriptPreview(truncate(transcript.replace(/\s+/g, ' '), 120));
      }
      setSttLastProvider(result.provider);
      setSttLastAttemptChain(result.attemptedProviders);
      pushSttLog(`Transcript received (${result.text.length} chars).`);
      clearPendingAudio();

      const chainText =
        result.attemptedProviders.length > 1
          ? ` after trying ${result.attemptedProviders.map((provider) => STT_PROVIDER_LABELS[provider]).join(' -> ')}`
          : '';

      publishNotice(
        'SUCCESS',
        `Transcription completed via ${STT_PROVIDER_LABELS[result.provider]}${chainText}.`
      );
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown STT failure.';
      pushSttLog(`STT failed: ${message}`);
      publishNotice('ERROR', `Transcription failed. ${message}`);
      if (message.includes('timed out')) {
        publishNotice(
          'WARN',
          'Provider timed out. The fallback chain can retry and then switch automatically.'
        );
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecordingSession = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startRecordingSession = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      publishNotice('ERROR', 'This browser does not support microphone capture.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('Recorder error:', event);
        publishNotice('ERROR', 'Microphone recording failed.');
        setIsRecording(false);
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        recordedChunksRef.current = [];
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (blob.size > 0) {
          const ext = (recorder.mimeType || '').includes('wav')
            ? 'wav'
            : (recorder.mimeType || '').includes('ogg')
              ? 'ogg'
              : (recorder.mimeType || '').includes('mpeg')
                ? 'mp3'
                : 'webm';
          setPendingAudioClip(blob, `recording.${ext}`);
          setSttDebugLog([]);
          pushSttLog(`Audio captured (${Math.round(blob.size / 1024)} KB).`);
          publishNotice('INFO', 'Recording complete. Processing transcription now.');
          void handleTranscribeAudio(blob);
        } else {
          publishNotice('WARN', 'No audio captured from microphone.');
        }
      };

      recorder.start();
      setIsRecording(true);
      publishNotice('INFO', 'Recording started. Tap stop when you finish speaking.');
    } catch (error) {
      console.error(error);
      publishNotice('ERROR', 'Could not access microphone permissions.');
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecordingSession();
      return;
    }
    await startRecordingSession();
  };

  const handleAudioFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPendingAudioClip(file, file.name);
    setSttDebugLog([]);
    pushSttLog(`Audio file selected: ${file.name} (${Math.round(file.size / 1024)} KB).`);
    publishNotice('INFO', 'Audio file loaded. Tap Process clip to append transcription to your draft.');
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    const newHistory = [...state.chatHistory, userMsg];
    onChatUpdate(newHistory);
    setInput('');
    setLastTranscriptPreview('');
    setIsThinking(true);

    try {
      const activeProviderModel =
        providerPreference === 'AUTO'
          ? providerSettings[autoRouteOrder[0]].model
          : providerSettings[providerPreference].model;

      const contextResult = activeAgent.includeContext
        ? composeMentorContext({
            state,
            settings: effectiveContextSettings,
            chatHistoryLength: newHistory.length,
            providerModel: activeProviderModel,
            now: Date.now(),
          })
        : null;

      if (contextResult) {
        setLastContextStats({
          usedTokens: contextResult.usedTokens,
          targetTokens: contextResult.targetTokens,
          selectedPacks: contextResult.selectedPacks,
          cacheHits: contextResult.cacheHits,
          cacheMisses: contextResult.cacheMisses,
          generatedAt: contextResult.generatedAt,
        });
      } else {
        setLastContextStats(null);
      }
      setNextContextOverrides({});
      setShowContextQuickPicker(false);

      const recentHistory = newHistory.slice(-10);
      const olderHistory = newHistory.slice(0, -10);
      const memorySummary = summarizeEarlierHistory(olderHistory);
      const contextBlock = contextResult?.contextBlockText
        ? `\n\n${contextResult.contextBlockText}`
        : '';
      const memoryBlock =
        !activeAgent.isRaw && aiContextSettings.includeThreadMemory && memorySummary
          ? `\n\nEARLIER THREAD MEMORY (compressed to save tokens, but from the same conversation):\n${memorySummary}\nTreat that as trusted prior context unless the latest messages clearly override it.`
          : '';
      const systemPrompt = `${activeAgent.systemPrompt}${memoryBlock}${contextBlock}`.trim();

      const response = await sendMessageToAI(recentHistory, {
        systemPrompt,
        provider: providerPreference,
        providerSettings,
        autoRoute: autoRouteOrder.map((provider) => ({
          provider,
          model: providerSettings[provider].model,
          apiKey: providerSettings[provider].apiKey,
        })),
      });

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        contextTrace: contextResult?.contextTrace,
      };

      setLastProvider(response.provider);
      setLastAttemptChain(response.attemptedProviders);
      onChatUpdate([...newHistory, modelMsg]);
      speakReply(response.text);
      notifyDesktop(`${activeAgent.name} replied`, response.text);

      const chainText =
        response.attemptedProviders.length > 1
          ? ` after trying ${response.attemptedProviders.map((provider) => PROVIDER_LABELS[provider]).join(' -> ')}`
          : '';

      publishNotice(
        response.provider === 'PUTER' ? 'SUCCESS' : 'INFO',
        `${activeAgent.name} replied via ${PROVIDER_LABELS[response.provider]}${chainText}.`
      );
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown AI failure.';
      const errorMsg: ChatMessage = {
        role: 'model',
        text: `AI request failed. ${message}`,
        timestamp: Date.now(),
      };
      onChatUpdate([...newHistory, errorMsg]);
      publishNotice('ERROR', `The AI request failed. ${message}`);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in relative">
      <div className="h-auto min-h-12 border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-3 shrink-0 sticky top-0 z-20 relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-mono relative">
            <button
              onClick={() => setShowAgentMenu((value) => !value)}
              className="flex items-center gap-2 hover:text-white transition-colors uppercase tracking-wider"
            >
              {renderAgentIcon(activeAgent.icon)}
              {activeAgent.name}
              <ChevronDown size={12} />
            </button>

            {showAgentMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-md shadow-xl z-50 py-1">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setActiveAgentId(agent.id);
                      setShowAgentMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center gap-2 ${
                      activeAgent.id === agent.id ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {renderAgentIcon(agent.icon, 12)}
                    <span className="truncate">{agent.name}</span>
                    {agent.isRaw && <span className="ml-auto text-[10px] text-zinc-500">RAW</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setArtifactOpen((value) => !value)}
              className="px-2.5 py-1 rounded-sm border border-border text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
            >
              {artifactOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
              {artifactOpen ? 'Hide Artifact' : 'Show Artifact'}
            </button>

            <button
              onClick={() => setShowSettingsPanel((value) => !value)}
              className={`p-2 rounded-sm border transition-colors ${
                showSettingsPanel
                  ? 'border-zinc-500 text-zinc-100'
                  : 'border-border text-zinc-500 hover:text-zinc-200'
              }`}
              title="Open workspace settings"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          <span>Live: {lastProvider ? PROVIDER_LABELS[lastProvider] : 'Idle'}</span>
          <span>•</span>
          <span>
            STT:{' '}
            {sttProviderPreference === 'AUTO'
              ? sttAutoRouteOrder.map((provider) => STT_PROVIDER_LABELS[provider]).join(' -> ')
              : STT_PROVIDER_LABELS[sttProviderPreference]}
          </span>
          <span>•</span>
          <span>
            Context:{' '}
            {activeAgent.includeContext
              ? `${enabledContextPackCount} packs${
                  lastContextStats
                    ? ` · ${lastContextStats.usedTokens}/${lastContextStats.targetTokens} · ${
                        lastContextStats.cacheMisses > 0 ? 'UPDATED' : 'CACHED'
                      }`
                    : ' · READY'
                }`
              : 'OFF (RAW AGENT)'}
          </span>
          {input.trim() && (
            <>
              <span>•</span>
              <span>Draft {input.trim().length} chars</span>
            </>
          )}
          {isRecording && (
            <>
              <span>•</span>
              <span className="text-red-400">Recording</span>
            </>
          )}
          {isTranscribing && (
            <>
              <span>•</span>
              <span className="text-emerald-400">Processing Voice</span>
            </>
          )}
          {isThinking && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        </div>

        {showSettingsPanel && (
          <div
            ref={settingsPanelRef}
            className="absolute right-4 top-[calc(100%-4px)] mt-2 w-[min(96vw,980px)] bg-background border border-border rounded-lg shadow-2xl z-50 overflow-hidden"
          >
            <div className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">Mentor Settings</div>
              <button
                onClick={() => setShowSettingsPanel(false)}
                className="p-1 rounded-sm text-zinc-500 hover:text-zinc-200"
                title="Close settings"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 max-h-[72vh] overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="border border-border rounded-sm p-3 bg-surface/60 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Experience</div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <button
                    onClick={() => setAutoSpeak((value) => !value)}
                    className={`px-2.5 py-1 rounded-sm border transition-colors ${
                      autoSpeak
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                        : 'border-border text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {autoSpeak ? 'Voice On' : 'Voice Off'}
                  </button>
                  <button
                    onClick={() => void handleDesktopAlertsToggle()}
                    className={`px-2.5 py-1 rounded-sm border transition-colors ${
                      desktopAlerts
                        ? 'border-sky-500/30 text-sky-400 bg-sky-950/20'
                        : 'border-border text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {desktopAlerts ? 'Alerts On' : 'Alerts Off'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Agent Library</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`rounded-sm border px-2.5 py-2 flex items-center gap-2 ${
                          activeAgent.id === agent.id ? 'border-zinc-500 bg-zinc-900/60' : 'border-border bg-background/50'
                        }`}
                      >
                        <button
                          onClick={() => setActiveAgentId(agent.id)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <span className="text-zinc-300">{renderAgentIcon(agent.icon, 12)}</span>
                          <span className="text-xs text-zinc-200 truncate">{agent.name}</span>
                          {agent.isRaw && <span className="text-[10px] font-mono text-zinc-500">RAW</span>}
                        </button>
                        {agent.isCustom && (
                          <button
                            onClick={() => handleDeleteCustomAgent(agent.id)}
                            className="p-1 text-zinc-500 hover:text-red-300"
                            title="Delete custom agent"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded-sm p-2.5 space-y-2 bg-background/60">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Create Agent</div>
                  <input
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                    placeholder="Agent name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newAgentIcon}
                      onChange={(e) => setNewAgentIcon(e.target.value as AgentIconKey)}
                      className="bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                    >
                      {AGENT_ICON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setNewAgentIncludeContext((value) => !value)}
                      className={`px-2 py-1.5 rounded-sm border text-xs transition-colors ${
                        newAgentIncludeContext
                          ? 'border-zinc-500 text-zinc-100'
                          : 'border-border text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {newAgentIncludeContext ? 'Context On' : 'Context Off'}
                    </button>
                  </div>
                  <textarea
                    value={newAgentPrompt}
                    onChange={(e) => setNewAgentPrompt(e.target.value)}
                    rows={5}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600 resize-none"
                    placeholder="Paste system prompt..."
                  />
                  <button
                    onClick={handleCreateAgent}
                    className="w-full px-3 py-1.5 rounded-sm border border-zinc-500 text-zinc-100 text-xs font-mono uppercase tracking-wider hover:bg-zinc-900/80 transition-colors"
                  >
                    Add Agent
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-surface/60 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Context Control</div>
                  <span className="px-2 py-1 rounded-sm border border-border text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                    Manual Only
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {(['ADAPTIVE', 'STRICT', 'RICH'] as AIContextSettings['budgetMode'][]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => persistAIContextSettings({ ...aiContextSettings, budgetMode: mode })}
                      className={`px-2.5 py-1 rounded-sm border transition-colors ${
                        aiContextSettings.budgetMode === mode
                          ? 'border-zinc-500 text-zinc-100'
                          : 'border-border text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      persistAIContextSettings({
                        ...aiContextSettings,
                        includeThreadMemory: !aiContextSettings.includeThreadMemory,
                      })
                    }
                    className={`px-2.5 py-1 rounded-sm border transition-colors ${
                      aiContextSettings.includeThreadMemory
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                        : 'border-border text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    Thread Memory {aiContextSettings.includeThreadMemory ? 'On' : 'Off'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-wider">
                  <button
                    onClick={() => applyContextPreset('ALL_ON')}
                    className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200"
                  >
                    All On
                  </button>
                  <button
                    onClick={() => applyContextPreset('CORE_ONLY')}
                    className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200"
                  >
                    Core Only
                  </button>
                  <button
                    onClick={() => applyContextPreset('ALL_OFF')}
                    className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200"
                  >
                    All Off
                  </button>
                  <button
                    onClick={() => applyContextPreset('RESET')}
                    className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200"
                  >
                    Reset
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500 font-mono">
                  Selected: {enabledContextPackCount}/{aiContextSettings.packs.length}
                  {lastContextStats && (
                    <span>
                      {' '}
                      · Last Budget: {lastContextStats.usedTokens}/{lastContextStats.targetTokens} · Cache{' '}
                      {lastContextStats.cacheHits}/{lastContextStats.cacheHits + lastContextStats.cacheMisses}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    <span>Budget Meter</span>
                    <span>
                      {lastContextStats
                        ? `${lastContextStats.usedTokens}/${lastContextStats.targetTokens}`
                        : `--/${aiContextSettings.targetTokens}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-sm bg-zinc-900 border border-border overflow-hidden">
                    <div
                      className="h-full bg-zinc-500/80 transition-all"
                      style={{
                        width: `${
                          Math.min(
                            100,
                            Math.round(
                              (((lastContextStats?.usedTokens || 0) / Math.max(1, lastContextStats?.targetTokens || aiContextSettings.targetTokens)) * 100)
                            )
                          )
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {contextPackRows.map((packRow) => (
                    <div key={packRow.id} className="rounded-sm border border-border p-2 bg-background/60">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateContextPack(packRow.id, { enabled: !packRow.config.enabled })}
                          className={`px-2 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                            packRow.config.enabled
                              ? 'border-zinc-500 text-zinc-100'
                              : 'border-border text-zinc-500 hover:text-zinc-200'
                          }`}
                        >
                          {packRow.config.enabled ? 'On' : 'Off'}
                        </button>
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-200">{packRow.label}</div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                            {packRow.module}
                          </div>
                        </div>
                        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          {packRow.core ? 'Core' : 'Optional'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          Priority
                          <input
                            type="number"
                            min={1}
                            value={packRow.config.priority}
                            onChange={(e) =>
                              updateContextPack(packRow.id, {
                                priority: Math.max(1, Number(e.target.value) || packRow.config.priority),
                              })
                            }
                            className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          />
                        </label>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          Max Items
                          <input
                            type="number"
                            min={1}
                            value={packRow.config.maxItems}
                            onChange={(e) =>
                              updateContextPack(packRow.id, {
                                maxItems: Math.max(1, Number(e.target.value) || packRow.config.maxItems),
                              })
                            }
                            className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-surface/60">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">AI Mode</div>
                <div className="flex items-center rounded-sm border border-border overflow-hidden">
                  {(['AUTO', 'PUTER', 'OPENROUTER', 'GEMINI'] as AIProviderPreference[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setProviderPreference(mode)}
                      className={`px-2.5 py-1 text-[10px] transition-colors ${
                        providerPreference === mode
                          ? 'bg-zinc-100 text-black'
                          : 'bg-transparent text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {autoRouteOrder.map((provider, index) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm border border-border bg-surface"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-zinc-200">
                          {index === 0 ? 'PRIMARY' : `FALLBACK ${index}`}
                        </div>
                        <div className="text-sm text-zinc-300 truncate">
                          {PROVIDER_LABELS[provider]} / {providerSettings[provider].model}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveRouteProvider(index, -1)}
                          disabled={index === 0}
                          className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveRouteProvider(index, 1)}
                          disabled={index === autoRouteOrder.length - 1}
                          className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-surface/60">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">AI Providers</div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => (
                    <div key={provider} className="rounded-sm border border-border bg-surface p-3 space-y-2">
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        {PROVIDER_LABELS[provider]}
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Model</label>
                        <input
                          value={providerSettings[provider].model}
                          onChange={(e) => updateProviderSetting(provider, 'model', e.target.value)}
                          className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          placeholder="Enter model id"
                        />
                      </div>
                      {provider !== 'PUTER' && (
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                            <KeyRound size={10} />
                            API Key
                          </label>
                          <input
                            type="password"
                            value={providerSettings[provider].apiKey || ''}
                            onChange={(e) => updateProviderSetting(provider, 'apiKey', e.target.value)}
                            className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                            placeholder={provider === 'OPENROUTER' ? 'sk-or-...' : 'AIza...'}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-surface/60">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">STT Mode</div>
                  <div className="flex items-center rounded-sm border border-border overflow-hidden">
                    {(['AUTO', 'GROQ', 'ELEVENLABS'] as STTProviderPreference[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSttProviderPreference(mode)}
                        className={`px-2 py-1 text-[10px] transition-colors ${
                          sttProviderPreference === mode
                            ? 'bg-zinc-100 text-black'
                            : 'bg-transparent text-zinc-500 hover:text-zinc-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {sttAutoRouteOrder.map((provider, index) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm border border-border bg-surface"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-zinc-200">
                          {index === 0 ? 'PRIMARY' : `FALLBACK ${index}`}
                        </div>
                        <div className="text-sm text-zinc-300 truncate">
                          {STT_PROVIDER_LABELS[provider]} / {sttProviderSettings[provider].model}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSTTRouteProvider(index, -1)}
                          disabled={index === 0}
                          className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveSTTRouteProvider(index, 1)}
                          disabled={index === sttAutoRouteOrder.length - 1}
                          className="px-2 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-sm p-3 bg-surface/60">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                  STT Providers
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {(Object.keys(STT_PROVIDER_LABELS) as STTProvider[]).map((provider) => (
                    <div key={provider} className="rounded-sm border border-border bg-surface p-3 space-y-2">
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        {STT_PROVIDER_LABELS[provider]}
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Model</label>
                        <input
                          value={sttProviderSettings[provider].model}
                          onChange={(e) => updateSTTProviderSetting(provider, 'model', e.target.value)}
                          className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          placeholder="Transcription model"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <KeyRound size={10} />
                          API Key
                        </label>
                        <input
                          type="password"
                          value={sttProviderSettings[provider].apiKey || ''}
                          onChange={(e) => updateSTTProviderSetting(provider, 'apiKey', e.target.value)}
                          className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          placeholder={provider === 'ELEVENLABS' ? 'sk_...' : 'gsk_...'}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          Language (optional)
                        </label>
                        <input
                          value={sttProviderSettings[provider].language || ''}
                          onChange={(e) => updateSTTProviderSetting(provider, 'language', e.target.value)}
                          className="mt-1 w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          placeholder="en or ar"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                  STT settings stay local in this browser. For production, move API keys to a backend and proxy requests.
                </div>
              </div>

              {puterAvailable && (
                <div className="border border-border rounded-sm p-3 bg-surface/60 xl:col-span-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                    Puter Connection
                  </div>
                  {puterSignedIn ? (
                    <button
                      onClick={() => void handlePuterSignOut()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-border text-zinc-400 hover:text-zinc-200 transition-colors"
                      title={puterIdentity ? `Signed in as ${puterIdentity}` : 'Disconnect Puter'}
                    >
                      <LogOut size={12} />
                      Disconnect {puterIdentity || 'Puter'}
                    </button>
                  ) : (
                    <button
                      onClick={() => void handlePuterSignIn()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 transition-colors"
                      title="Use Puter.js on this device"
                    >
                      <LogIn size={12} />
                      Sign in Puter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b border-border/70">
              <div className="flex flex-wrap gap-2">
                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setInput(preset.prompt)}
                    className="px-3 py-1.5 rounded-full border border-border text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {state.chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`
                    w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border
                    ${msg.role === 'model' ? 'bg-zinc-900 border-zinc-800 text-emerald-500' : 'bg-zinc-100 border-white text-black'}
                  `}
                >
                  {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
                </div>

                <div
                  className={`
                    max-w-[85%] text-sm leading-relaxed p-4 rounded-md border whitespace-pre-wrap
                    ${msg.role === 'model'
                      ? 'bg-surface border-border text-zinc-300 font-mono'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-200'}
                  `}
                >
                  {msg.text}
                  <div className="mt-2 text-[10px] opacity-30 font-mono uppercase">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {msg.role === 'model' && msg.contextTrace?.length ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {msg.contextTrace.map((trace, traceIndex) => {
                          const traceKey = `${idx}-${trace.packId}-${traceIndex}`;
                          const selected = activeTraceKey === traceKey;
                          return (
                            <button
                              key={traceKey}
                              onClick={() => setActiveTraceKey((current) => (current === traceKey ? null : traceKey))}
                              className={`px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                                selected
                                  ? 'border-zinc-500 text-zinc-100'
                                  : 'border-border text-zinc-500 hover:text-zinc-200'
                              }`}
                            >
                              {trace.packId} ·{' '}
                              {new Date(trace.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          );
                        })}
                      </div>
                      {msg.contextTrace.map((trace, traceIndex) => {
                        const traceKey = `${idx}-${trace.packId}-${traceIndex}`;
                        if (activeTraceKey !== traceKey) return null;
                        return (
                          <div key={`${traceKey}-panel`} className="rounded-sm border border-border bg-background/80 p-2 text-[10px] font-mono text-zinc-400">
                            <div className="uppercase tracking-wider text-zinc-500 mb-1">Context Source</div>
                            <div>Pack: {trace.label} ({trace.packId})</div>
                            <div>Module: {trace.module}</div>
                            <div>As of: {new Date(trace.asOf).toLocaleString()}</div>
                            <div>Items: {trace.itemsUsed}</div>
                            <div>Tokens: {trace.tokensUsed}</div>
                            <div>Cache: {trace.cache}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border bg-zinc-900 border-zinc-800 text-emerald-500 animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="flex items-center text-xs font-mono text-zinc-600">
                  {activeAgent.name} computing...
                </div>
              </div>
            )}

            {!state.chatHistory.length && !isThinking && (
              <div className="border border-dashed border-border rounded-xl p-5 bg-surface/40 text-sm text-zinc-400 leading-relaxed">
                <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">AI routing is configurable</div>
                You can now choose one fixed provider, or use `AUTO` with an ordered fallback chain. Switching models will
                still feel like the same thread because the latest turns are sent raw and older turns are passed in a compressed
                memory block to reduce token waste.
              </div>
            )}

            {lastAttemptChain.length > 1 && (
              <div className="text-[11px] font-mono text-zinc-500 border border-border rounded-lg px-3 py-2 bg-surface/40">
                Last fallback chain: {lastAttemptChain.map((provider) => PROVIDER_LABELS[provider]).join(' -> ')}
              </div>
            )}

            {(sttLastProvider || sttLastAttemptChain.length > 1 || isTranscribing || isRecording) && (
              <div className="text-[11px] font-mono text-zinc-500 border border-border rounded-lg px-3 py-2 bg-surface/40 flex flex-wrap gap-3">
                {sttLastProvider && (
                  <span>
                    STT: {STT_PROVIDER_LABELS[sttLastProvider]} / {sttProviderSettings[sttLastProvider].model}
                  </span>
                )}
                {sttLastAttemptChain.length > 1 && (
                  <span>
                    STT Fallback: {sttLastAttemptChain.map((provider) => STT_PROVIDER_LABELS[provider]).join(' -> ')}
                  </span>
                )}
                {isRecording && <span className="text-red-400">Recording...</span>}
                {isTranscribing && <span className="text-emerald-400">Transcribing...</span>}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-background/95 backdrop-blur border-t border-border shrink-0 sticky bottom-0 z-20">
            <div className="max-w-4xl mx-auto space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                className="hidden"
                onChange={(e) => void handleAudioFileSelected(e)}
              />

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                <span className="px-2 py-1 rounded-sm border border-border text-zinc-500">
                  {isRecording ? 'Recording...' : isTranscribing ? 'Processing voice...' : 'Ready'}
                </span>
                <span className="px-2 py-1 rounded-sm border border-border text-zinc-400">
                  {activeAgent.includeContext
                    ? `Context ${effectiveEnabledPackCount}/${effectiveContextSettings.packs.length}${
                        lastContextStats
                          ? ` · ${lastContextStats.usedTokens}/${lastContextStats.targetTokens} · ${
                              lastContextStats.cacheMisses > 0 ? 'Updated' : 'Cached'
                            }`
                          : ''
                      }`
                    : 'Context Off (Raw Agent)'}
                </span>
                {input.trim() && (
                  <span className="px-2 py-1 rounded-sm border border-border text-zinc-400">
                    Draft {input.trim().length} chars
                  </span>
                )}
                {lastTranscriptPreview && (
                  <span className="px-2 py-1 rounded-sm border border-border text-zinc-400 normal-case tracking-normal max-w-full truncate">
                    {lastTranscriptPreview}
                  </span>
                )}
                <button
                  onClick={() => setShowContextQuickPicker((value) => !value)}
                  disabled={!activeAgent.includeContext}
                  className={`px-2 py-1 rounded-sm border transition-colors ${
                    showContextQuickPicker
                      ? 'border-zinc-500 text-zinc-100'
                      : 'border-border text-zinc-500 hover:text-zinc-200'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Context
                </button>
                {activeAgent.includeContext && Object.keys(nextContextOverrides).length > 0 && (
                  <button
                    onClick={() => setNextContextOverrides({})}
                    className="px-2 py-1 rounded-sm border border-border text-zinc-500 hover:text-zinc-200"
                  >
                    Clear Overrides
                  </button>
                )}
              </div>

              {showContextQuickPicker && activeAgent.includeContext && (
                <div ref={contextQuickPickerRef} className="rounded-sm border border-border bg-surface/60 p-2.5 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Next Message Context Override
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                    {CONTEXT_PACK_DEFINITIONS.map((definition) => {
                      const enabled = isPackEnabledForNextMessage(definition.id);
                      return (
                        <button
                          key={definition.id}
                          onClick={() => toggleNextContextOverride(definition.id)}
                          className={`px-2 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                            enabled
                              ? 'border-zinc-500 text-zinc-100'
                              : 'border-border text-zinc-500 hover:text-zinc-200'
                          }`}
                        >
                          {definition.id}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    Overrides apply only to the next send, then reset automatically.
                  </div>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={3}
                  placeholder={`Message ${activeAgent.name}...`}
                  className="w-full resize-none bg-surface border border-border rounded-sm py-3 pl-36 pr-14 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 outline-none transition-colors font-mono"
                  disabled={isThinking || isTranscribing}
                />
                <div className="absolute left-2 bottom-2 flex items-center gap-1">
                  <button
                    onClick={() => void toggleRecording()}
                    disabled={isThinking || isTranscribing}
                    className={`px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                      isRecording
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'text-zinc-500 hover:text-zinc-200 border-border'
                    } disabled:opacity-50`}
                    title={isRecording ? 'Stop and process recording' : 'Record voice and auto-process'}
                  >
                    {isRecording ? (
                      <span className="flex items-center gap-1">
                        <Square size={12} />
                        Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Mic size={12} />
                        Record
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isThinking || isTranscribing || isRecording}
                    className="px-2.5 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-200 border border-border transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Upload audio file"
                  >
                    <Upload size={12} />
                    Upload
                  </button>
                </div>
                <button
                  onClick={() => void handleSend()}
                  disabled={isThinking || isTranscribing || !input.trim()}
                  className="absolute right-2 bottom-2 p-2 text-zinc-500 hover:text-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>

              {(pendingAudioUrl || sttDebugLog.length > 0) && (
                <div className="border border-border rounded-sm p-2.5 bg-surface/40 space-y-2">
                  {pendingAudioUrl && (
                    <div className="flex flex-wrap items-center gap-2">
                      <audio controls src={pendingAudioUrl} className="h-8" />
                      <button
                        onClick={() => void handleTranscribeAudio()}
                        disabled={isTranscribing}
                        className="px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                      >
                        Process Clip
                      </button>
                      <button
                        onClick={clearPendingAudio}
                        disabled={isTranscribing}
                        className="px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  {sttDebugLog.length > 0 && (
                    <div className="max-h-20 overflow-y-auto space-y-1 text-[10px] font-mono text-zinc-500">
                      {sttDebugLog.slice(-3).map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {artifactOpen && (
        <aside className="hidden lg:flex w-[360px] xl:w-[420px] shrink-0 border-l border-border bg-surface/20 flex-col">
          <div className="px-4 py-3 border-b border-border bg-surface/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Artifact Window</div>
                <div className="text-sm text-zinc-200">{artifact?.title || 'Live Artifact'}</div>
              </div>
              <button
                onClick={() => void copyArtifactToClipboard()}
                disabled={!artifact?.content}
                className="px-2.5 py-1 rounded-sm border border-border text-[10px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {artifactCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setArtifactViewMode('PREVIEW')}
                className={`px-2.5 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  artifactViewMode === 'PREVIEW'
                    ? 'border-zinc-500 text-zinc-100'
                    : 'border-border text-zinc-500 hover:text-zinc-200'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setArtifactViewMode('RAW')}
                className={`px-2.5 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  artifactViewMode === 'RAW'
                    ? 'border-zinc-500 text-zinc-100'
                    : 'border-border text-zinc-500 hover:text-zinc-200'
                }`}
              >
                Raw
              </button>
              {artifact && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  {artifact.kind}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!artifact && (
              <div className="h-full rounded-sm border border-dashed border-border bg-background/60 p-4 text-sm text-zinc-500 leading-relaxed">
                The artifact panel auto-updates from the latest assistant output. Ask for a plan, document, markdown, or code
                and it will appear here as a live working artifact.
              </div>
            )}

            {artifact && (
              <div className="h-full rounded-sm border border-border bg-background/70 p-4 flex flex-col">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-3">
                  Source: {artifact.sourceRole === 'model' ? 'Assistant' : 'User'} ·{' '}
                  {new Date(artifact.sourceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {artifact.kind === 'CODE' && artifact.language ? ` · ${artifact.language}` : ''}
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {artifactViewMode === 'RAW' || artifact.kind === 'CODE' ? (
                    <pre className="text-[12px] leading-relaxed font-mono text-zinc-200 whitespace-pre-wrap">
                      {artifact.content}
                    </pre>
                  ) : artifact.kind === 'MARKDOWN' ? (
                    <div className="space-y-1">{renderMarkdownLines(artifact.content)}</div>
                  ) : (
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{artifact.content}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
        )}
      </div>
    </div>
  );
};

export default MentorView;
