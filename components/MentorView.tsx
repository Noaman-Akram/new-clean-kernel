import React, { useEffect, useRef, useState } from 'react';
import { AppState, ChatMessage, TaskStatus } from '../types';
import {
  Bell,
  BellOff,
  Bot,
  ChevronDown,
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
  Volume2,
  VolumeX,
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
import { DEFAULT_TIME_ZONE, getDateKeyInTimeZone } from '../utils/dateTime';

interface Props {
  state: AppState;
  onChatUpdate: (history: ChatMessage[]) => void;
  onAddGoal: (title: string) => void;
  onUpdateGoal: (id: string, updates: Partial<any>) => void;
  onSystemNotice?: (notice: {
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
    text: string;
  }) => void;
}

type AgentType = 'EXECUTION' | 'GENERAL' | 'CONCIERGE';

interface AgentConfig {
  name: string;
  systemPrompt: (context: Record<string, unknown>) => string;
}

const AUTO_SPEAK_KEY = 'mentor_auto_speak';
const DESKTOP_ALERTS_KEY = 'mentor_desktop_alerts';
const PROVIDER_MODE_KEY = 'mentor_provider_mode';
const PROVIDER_SETTINGS_KEY = 'mentor_provider_settings';
const AUTO_ROUTE_KEY = 'mentor_auto_route_order';
const STT_MODE_KEY = 'mentor_stt_mode';
const STT_SETTINGS_KEY = 'mentor_stt_provider_settings';
const STT_AUTO_ROUTE_KEY = 'mentor_stt_auto_route_order';

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

const AGENTS: Record<AgentType, AgentConfig> = {
  EXECUTION: {
    name: 'Execution Mentor',
    systemPrompt: (context) => `
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

CURRENT CONTEXT JSON: ${JSON.stringify(context)}
    `,
  },
  GENERAL: {
    name: 'Strategist',
    systemPrompt: (context) => `
You are a pragmatic general assistant for Noeman.

Rules:
1. Prioritize clarity and correctness.
2. Give structured outputs with explicit tradeoffs.
3. Prefer concise answers, but expand when the task is complex.
4. Use the live app context when it materially improves the answer.

CURRENT CONTEXT JSON: ${JSON.stringify(context)}
    `,
  },
  CONCIERGE: {
    name: 'Experience Concierge',
    systemPrompt: (context) => `
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

CURRENT CONTEXT JSON: ${JSON.stringify(context)}
    `,
  },
};

const MentorView: React.FC<Props> = ({ state, onChatUpdate, onSystemNotice }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>('EXECUTION');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showRoutingConfig, setShowRoutingConfig] = useState(false);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

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

  const appendTranscriptToInput = (transcript: string) => {
    const cleaned = transcript.trim();
    if (!cleaned) return;
    setInput((current) => (current.trim() ? `${current.trimEnd()} ${cleaned}` : cleaned));
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

      appendTranscriptToInput(result.text);
      setSttLastProvider(result.provider);
      setSttLastAttemptChain(result.attemptedProviders);
      pushSttLog(`Transcript received (${result.text.length} chars).`);

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
          publishNotice('SUCCESS', 'Recording captured. Review/play the clip, then tap Transcribe clip.');
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
    publishNotice('INFO', 'Audio file loaded. Review/play it, then tap Transcribe clip.');
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
    setIsThinking(true);

    try {
      const timeZone = state.userPreferences?.timeZone || DEFAULT_TIME_ZONE;
      const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
      const context = {
        identity: 'Noeman',
        current_time: new Date().toLocaleString(),
        timezone: timeZone,
        tasks_pending: state.tasks
          .filter((task) => task.status !== TaskStatus.DONE)
          .map((task) => ({
            title: task.title,
            category: task.category,
            impact: task.impact,
            deadline: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None',
            is_overdue: task.deadline ? task.deadline < Date.now() : false,
          })),
        metrics: state.metrics,
        prayers_logged: Object.keys(state.prayerLog).filter((key) => key.includes(todayKey)),
        planner_focus: state.dayMeta?.[todayKey]?.focus || '',
        active_challenge: state.activeChallenge
          ? {
              name: state.activeChallenge.name,
              status: state.activeChallenge.status,
              today: state.activeChallenge.history[todayKey] || null,
            }
          : null,
        protocol_progress_today: state.dailyProtocolState?.[todayKey] || {},
      };

      const recentHistory = newHistory.slice(-10);
      const olderHistory = newHistory.slice(0, -10);
      const memorySummary = summarizeEarlierHistory(olderHistory);
      const agent = AGENTS[activeAgent];
      const systemPrompt = `${agent.systemPrompt(context)}${
        memorySummary
          ? `\n\nEARLIER THREAD MEMORY (compressed to save tokens, but from the same conversation):\n${memorySummary}\nTreat that as trusted prior context unless the latest messages clearly override it.`
          : ''
      }`;

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
      };

      setLastProvider(response.provider);
      setLastAttemptChain(response.attemptedProviders);
      onChatUpdate([...newHistory, modelMsg]);
      speakReply(response.text);
      notifyDesktop(`${agent.name} replied`, response.text);

      const chainText =
        response.attemptedProviders.length > 1
          ? ` after trying ${response.attemptedProviders.map((provider) => PROVIDER_LABELS[provider]).join(' -> ')}`
          : '';

      publishNotice(
        response.provider === 'PUTER' ? 'SUCCESS' : 'INFO',
        `${agent.name} replied via ${PROVIDER_LABELS[response.provider]}${chainText}.`
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
      <div className="h-auto min-h-12 border-b border-border bg-surface px-4 py-3 shrink-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-zinc-300 text-sm font-mono">
            <Zap size={14} className={activeAgent === 'EXECUTION' ? 'text-amber-500' : 'text-blue-500'} />
            <div className="relative">
              <button
                onClick={() => setShowAgentMenu(!showAgentMenu)}
                className="flex items-center gap-2 hover:text-white transition-colors uppercase tracking-wider"
              >
                {AGENTS[activeAgent].name}
                <ChevronDown size={12} />
              </button>

              {showAgentMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border rounded-md shadow-xl z-50 py-1">
                  {(Object.keys(AGENTS) as AgentType[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveAgent(key);
                        setShowAgentMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-mono hover:bg-zinc-800 transition-colors ${
                        activeAgent === key ? 'text-white bg-zinc-800' : 'text-zinc-400'
                      }`}
                    >
                      {AGENTS[key].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              {(['AUTO', 'PUTER', 'OPENROUTER', 'GEMINI'] as AIProviderPreference[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setProviderPreference(mode)}
                  className={`px-2.5 py-1 transition-colors ${
                    providerPreference === mode
                      ? 'bg-zinc-100 text-black'
                      : 'bg-transparent text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRoutingConfig((value) => !value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                showRoutingConfig
                  ? 'border-zinc-500 text-zinc-200'
                  : 'border-border text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <SlidersHorizontal size={12} />
              Routing
            </button>

            <button
              onClick={() => setAutoSpeak((value) => !value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                autoSpeak
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                  : 'border-border text-zinc-500 hover:text-zinc-200'
              }`}
              title={autoSpeak ? 'Disable spoken replies' : 'Enable spoken replies'}
            >
              {autoSpeak ? <Volume2 size={12} /> : <VolumeX size={12} />}
              Voice
            </button>

            <button
              onClick={() => void handleDesktopAlertsToggle()}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                desktopAlerts
                  ? 'border-sky-500/30 text-sky-400 bg-sky-950/20'
                  : 'border-border text-zinc-500 hover:text-zinc-200'
              }`}
              title={desktopAlerts ? 'Disable desktop alerts' : 'Enable desktop alerts'}
            >
              {desktopAlerts ? <Bell size={12} /> : <BellOff size={12} />}
              Alerts
            </button>

            {puterAvailable && (
              puterSignedIn ? (
                <button
                  onClick={() => void handlePuterSignOut()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-zinc-400 hover:text-zinc-200 transition-colors"
                  title={puterIdentity ? `Signed in as ${puterIdentity}` : 'Disconnect Puter'}
                >
                  <LogOut size={12} />
                  {puterIdentity || 'Puter'}
                </button>
              ) : (
                <button
                  onClick={() => void handlePuterSignIn()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 transition-colors"
                  title="Use Puter.js on this device"
                >
                  <LogIn size={12} />
                  Sign in Puter
                </button>
              )
            )}

            <div className="text-zinc-500 flex items-center gap-2">
              <span>
                {lastProvider
                  ? `LIVE: ${PROVIDER_LABELS[lastProvider]} / ${providerSettings[lastProvider].model}`
                  : 'LIVE: IDLE'}
              </span>
              <span>
                STT: {sttProviderPreference === 'AUTO'
                  ? `AUTO (${sttAutoRouteOrder.map((provider) => STT_PROVIDER_LABELS[provider]).join(' -> ')})`
                  : STT_PROVIDER_LABELS[sttProviderPreference]}
              </span>
              {isThinking && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </div>
          </div>
        </div>

        {showRoutingConfig && (
          <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="border border-border rounded-xl p-3 bg-background/60">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                AI Auto Route Order
              </div>
              <div className="space-y-2">
                {autoRouteOrder.map((provider, index) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface"
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
                        className="px-2 py-1 rounded border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveRouteProvider(index, 1)}
                        disabled={index === autoRouteOrder.length - 1}
                        className="px-2 py-1 rounded border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                In AI `AUTO`, the first provider is your main route. If it fails, the app tries the next one in order.
              </div>
            </div>

            <div className="border border-border rounded-xl p-3 bg-background/60">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                AI Provider Settings
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((provider) => (
                  <div key={provider} className="rounded-lg border border-border bg-surface p-3 space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      {PROVIDER_LABELS[provider]}
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Model</label>
                      <input
                        value={providerSettings[provider].model}
                        onChange={(e) => updateProviderSetting(provider, 'model', e.target.value)}
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
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
                          className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                          placeholder={provider === 'OPENROUTER' ? 'sk-or-...' : 'AIza...'}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-xl p-3 bg-background/60">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  STT Mode
                </div>
                <div className="flex items-center rounded-md border border-border overflow-hidden">
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
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface"
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
                        className="px-2 py-1 rounded border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => moveSTTRouteProvider(index, 1)}
                        disabled={index === sttAutoRouteOrder.length - 1}
                        className="px-2 py-1 rounded border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-xl p-3 bg-background/60">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
                STT Provider Settings
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(Object.keys(STT_PROVIDER_LABELS) as STTProvider[]).map((provider) => (
                  <div key={provider} className="rounded-lg border border-border bg-surface p-3 space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      {STT_PROVIDER_LABELS[provider]}
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Model</label>
                      <input
                        value={sttProviderSettings[provider].model}
                        onChange={(e) => updateSTTProviderSetting(provider, 'model', e.target.value)}
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
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
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
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
                        className="mt-1 w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600"
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
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border bg-zinc-900 border-zinc-800 text-emerald-500 animate-pulse">
              <Bot size={16} />
            </div>
            <div className="flex items-center text-xs font-mono text-zinc-600">
              {AGENTS[activeAgent].name} computing...
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

        {(pendingAudioUrl || sttDebugLog.length > 0) && (
          <div className="border border-border rounded-lg p-3 bg-surface/40 space-y-3">
            {pendingAudioUrl ? (
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-zinc-400">
                  Audio clip ready: {pendingAudioName || 'recording'}
                </div>
                <audio controls src={pendingAudioUrl} className="w-full h-10" />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void handleTranscribeAudio()}
                    disabled={isTranscribing}
                    className="px-3 py-1.5 rounded-md text-xs font-mono border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
                  >
                    {isTranscribing ? 'Transcribing...' : 'Transcribe clip'}
                  </button>
                  <button
                    onClick={clearPendingAudio}
                    disabled={isTranscribing}
                    className="px-3 py-1.5 rounded-md text-xs font-mono border border-border text-zinc-400 hover:text-zinc-200 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Clear clip
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-zinc-500">
                Record or upload a clip to inspect and transcribe.
              </div>
            )}

            {sttDebugLog.length > 0 && (
              <div className="border border-border rounded-md bg-background/60 p-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">STT Debug Trace</div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] font-mono text-zinc-400">
                  {sttDebugLog.map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 bg-background border-t border-border shrink-0">
        <div className="relative max-w-4xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            className="hidden"
            onChange={(e) => void handleAudioFileSelected(e)}
          />
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
            placeholder={`Message ${AGENTS[activeAgent].name}...`}
            className="w-full resize-none bg-surface border border-border rounded-md py-3 pl-24 pr-14 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 outline-none transition-colors font-mono"
            disabled={isThinking || isTranscribing}
          />
          <div className="absolute left-2 bottom-2 flex items-center gap-1">
            <button
              onClick={() => void toggleRecording()}
              disabled={isThinking || isTranscribing}
              className={`p-2 rounded-md transition-colors ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'text-zinc-500 hover:text-zinc-200 border border-border'
              } disabled:opacity-50`}
              title={isRecording ? 'Stop recording' : 'Record voice and transcribe'}
            >
              {isRecording ? <Square size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isThinking || isTranscribing || isRecording}
              className="p-2 rounded-md text-zinc-500 hover:text-zinc-200 border border-border transition-colors disabled:opacity-50"
              title="Upload audio file and transcribe"
            >
              <Upload size={14} />
            </button>
          </div>
          <button
            onClick={() => void handleSend()}
            disabled={isThinking || isTranscribing || !input.trim()}
            className="absolute right-2 bottom-2 p-2 text-zinc-500 hover:text-zinc-200 disabled:opacity-50 transition-colors"
          >
            {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorView;
