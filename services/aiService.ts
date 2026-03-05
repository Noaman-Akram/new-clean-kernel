import { ChatMessage } from '../types';
import { sendMessageToGemini } from './geminiService';
import { sendMessageToOpenRouter } from './openRouterService';

export type AIProvider = 'PUTER' | 'OPENROUTER' | 'GEMINI';
export type AIProviderPreference = 'AUTO' | AIProvider;
export type AIProviderUsed = AIProvider;

export interface ProviderSettings {
  model: string;
  apiKey?: string;
}

export interface AutoRouteEntry {
  provider: AIProvider;
  model: string;
  apiKey?: string;
}

export interface AIRequestOptions {
  systemPrompt: string;
  provider?: AIProviderPreference;
  providerSettings?: Partial<Record<AIProvider, ProviderSettings>>;
  autoRoute?: AutoRouteEntry[];
}

export interface AIResponse {
  text: string;
  provider: AIProviderUsed;
  attemptedProviders: AIProvider[];
}

export interface PuterUser {
  username?: string;
  email?: string;
  uuid?: string;
}

const DEFAULT_PROVIDER_SETTINGS: Record<AIProvider, ProviderSettings> = {
  PUTER: {
    model: 'gpt-5-nano',
  },
  OPENROUTER: {
    model: 'deepseek/deepseek-r1-0528:free',
  },
  GEMINI: {
    model: 'gemini-2.5-flash',
  },
};

const buildConversation = (messages: ChatMessage[], systemPrompt: string) => [
  { role: 'system' as const, content: systemPrompt },
  ...messages.map((msg) => ({
    role: msg.role === 'model' ? ('assistant' as const) : ('user' as const),
    content: msg.text,
  })),
];

const normalizePuterResponse = (
  response:
    | string
    | {
        text?: string;
        message?: {
          content?: string;
        };
      }
): string => {
  if (typeof response === 'string') return response;
  if (typeof response?.text === 'string' && response.text.trim()) return response.text;
  if (typeof response?.message?.content === 'string' && response.message.content.trim()) {
    return response.message.content;
  }
  return 'Puter returned an empty response.';
};

const resolveSettings = (
  provider: AIProvider,
  providerSettings?: Partial<Record<AIProvider, ProviderSettings>>
): ProviderSettings => {
  const defaults = DEFAULT_PROVIDER_SETTINGS[provider];
  const overrides = providerSettings?.[provider];

  return {
    model: overrides?.model?.trim() || defaults.model,
    apiKey: overrides?.apiKey?.trim() || defaults.apiKey,
  };
};

const getDefaultAutoRoute = (
  providerSettings?: Partial<Record<AIProvider, ProviderSettings>>
): AutoRouteEntry[] => {
  return (['PUTER', 'OPENROUTER', 'GEMINI'] as AIProvider[]).map((provider) => {
    const settings = resolveSettings(provider, providerSettings);
    return {
      provider,
      model: settings.model,
      apiKey: settings.apiKey,
    };
  });
};

const runProvider = async (
  provider: AIProvider,
  messages: ChatMessage[],
  systemPrompt: string,
  settings: ProviderSettings
): Promise<string> => {
  if (provider === 'PUTER') {
    if (!isPuterAvailable()) {
      throw new Error('Puter is not available in this browser session.');
    }

    const response = await window.puter!.ai!.chat!(buildConversation(messages, systemPrompt), {
      model: settings.model,
    });

    return normalizePuterResponse(response);
  }

  if (provider === 'OPENROUTER') {
    return sendMessageToOpenRouter(messages, settings.model, systemPrompt, settings.apiKey);
  }

  return sendMessageToGemini(messages, settings.model, systemPrompt, settings.apiKey);
};

export const getDefaultProviderSettings = (): Record<AIProvider, ProviderSettings> => {
  return {
    PUTER: { ...DEFAULT_PROVIDER_SETTINGS.PUTER },
    OPENROUTER: { ...DEFAULT_PROVIDER_SETTINGS.OPENROUTER },
    GEMINI: { ...DEFAULT_PROVIDER_SETTINGS.GEMINI },
  };
};

export const isPuterAvailable = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter?.ai?.chat;
};

export const isPuterSignedIn = (): boolean => {
  try {
    return window.puter?.auth?.isSignedIn?.() ?? false;
  } catch (error) {
    console.warn('Failed to check Puter auth state:', error);
    return false;
  }
};

export const getPuterUser = async (): Promise<PuterUser | null> => {
  if (!window.puter?.auth?.getUser) return null;

  try {
    const user = await window.puter.auth.getUser();
    return user ?? null;
  } catch (error) {
    console.warn('Failed to fetch Puter user:', error);
    return null;
  }
};

export const signInToPuter = async (): Promise<PuterUser | null> => {
  if (!window.puter?.auth?.signIn) {
    throw new Error('Puter is not available in this browser session.');
  }

  await window.puter.auth.signIn({
    attempt_temp_user_creation: true,
  });

  return getPuterUser();
};

export const signOutFromPuter = async (): Promise<void> => {
  await window.puter?.auth?.signOut?.();
};

export const sendMessageToAI = async (
  messages: ChatMessage[],
  {
    systemPrompt,
    provider = 'AUTO',
    providerSettings,
    autoRoute,
  }: AIRequestOptions
): Promise<AIResponse> => {
  if (provider !== 'AUTO') {
    const settings = resolveSettings(provider, providerSettings);
    const text = await runProvider(provider, messages, systemPrompt, settings);
    return {
      text,
      provider,
      attemptedProviders: [provider],
    };
  }

  const route = autoRoute?.length
    ? autoRoute.map((entry) => ({
        provider: entry.provider,
        model: entry.model?.trim() || resolveSettings(entry.provider, providerSettings).model,
        apiKey: entry.apiKey?.trim() || resolveSettings(entry.provider, providerSettings).apiKey,
      }))
    : getDefaultAutoRoute(providerSettings);

  const attemptedProviders: AIProvider[] = [];
  const errors: string[] = [];

  for (const entry of route) {
    attemptedProviders.push(entry.provider);

    try {
      const text = await runProvider(entry.provider, messages, systemPrompt, {
        model: entry.model,
        apiKey: entry.apiKey,
      });

      return {
        text,
        provider: entry.provider,
        attemptedProviders,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${entry.provider}: ${message}`);
      console.error(`AI route step failed for ${entry.provider}:`, error);
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
};
