export type STTProvider = 'GROQ' | 'ELEVENLABS';
export type STTProviderPreference = 'AUTO' | STTProvider;

export interface STTProviderSettings {
  model: string;
  apiKey?: string;
  language?: string;
}

export interface STTAutoRouteEntry {
  provider: STTProvider;
  model: string;
  apiKey?: string;
}

export interface STTProgressEvent {
  provider?: STTProvider;
  stage:
    | 'route-start'
    | 'provider-attempt'
    | 'provider-retry'
    | 'provider-success'
    | 'provider-fail'
    | 'route-fail';
  message: string;
}

export interface STTRequestOptions {
  provider?: STTProviderPreference;
  providerSettings?: Partial<Record<STTProvider, STTProviderSettings>>;
  autoRoute?: STTAutoRouteEntry[];
  timeoutMs?: number;
  maxRetriesPerProvider?: number;
  onProgress?: (event: STTProgressEvent) => void;
}

export interface STTResponse {
  text: string;
  provider: STTProvider;
  attemptedProviders: STTProvider[];
}

const GROQ_TRANSCRIPT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const ELEVEN_TRANSCRIPT_URL = 'https://api.elevenlabs.io/v1/speech-to-text?enable_logging=true';

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_MAX_RETRIES = 1;

const DEFAULT_STT_SETTINGS: Record<STTProvider, STTProviderSettings> = {
  GROQ: {
    model: 'whisper-large-v3-turbo',
  },
  ELEVENLABS: {
    model: 'scribe_v1',
  },
};

const resolveSettings = (
  provider: STTProvider,
  providerSettings?: Partial<Record<STTProvider, STTProviderSettings>>
): STTProviderSettings => {
  const defaults = DEFAULT_STT_SETTINGS[provider];
  const overrides = providerSettings?.[provider];

  return {
    model: overrides?.model?.trim() || defaults.model,
    apiKey: overrides?.apiKey?.trim() || defaults.apiKey,
    language: overrides?.language?.trim() || defaults.language,
  };
};

const getDefaultAutoRoute = (
  providerSettings?: Partial<Record<STTProvider, STTProviderSettings>>
): STTAutoRouteEntry[] => {
  return (['GROQ', 'ELEVENLABS'] as STTProvider[]).map((provider) => {
    const settings = resolveSettings(provider, providerSettings);
    return {
      provider,
      model: settings.model,
      apiKey: settings.apiKey,
    };
  });
};

const extractTranscript = (payload: any): string => {
  if (typeof payload?.text === 'string' && payload.text.trim()) return payload.text.trim();

  if (Array.isArray(payload?.transcripts)) {
    const merged = payload.transcripts
      .map((item: any) => (typeof item?.text === 'string' ? item.text.trim() : ''))
      .filter(Boolean)
      .join('\n');

    if (merged) return merged;
  }

  throw new Error('Transcription response did not include text.');
};

const toFile = (input: File | Blob): File => {
  if (input instanceof File) return input;
  const mime = input.type || 'audio/webm';
  const extension = mime.includes('mp4')
    ? 'm4a'
    : mime.includes('wav')
      ? 'wav'
      : mime.includes('mpeg')
        ? 'mp3'
        : mime.includes('ogg')
          ? 'ogg'
          : 'webm';
  return new File([input], `recording.${extension}`, { type: mime });
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const parseErrorResponse = async (response: Response): Promise<string> => {
  let details = response.statusText;
  try {
    const errorJson = await response.json();
    details =
      errorJson?.error?.message ||
      errorJson?.detail?.message ||
      errorJson?.message ||
      JSON.stringify(errorJson);
  } catch {
    details = await response.text();
  }
  return `${response.status} ${details}`;
};

const transcribeOpenAICompatible = async (
  url: string,
  file: File,
  model: string,
  apiKey: string,
  language: string | undefined,
  timeoutMs: number
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', model);
  if (language) formData.append('language', language);

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const payload = await response.json();
  return extractTranscript(payload);
};

const transcribeWithElevenLabs = async (
  file: File,
  model: string,
  apiKey: string,
  language: string | undefined,
  timeoutMs: number
): Promise<string> => {
  const formData = new FormData();
  formData.append('model_id', model);
  formData.append('file', file);
  if (language) formData.append('language_code', language);

  const response = await fetchWithTimeout(
    ELEVEN_TRANSCRIPT_URL,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: formData,
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const payload = await response.json();
  return extractTranscript(payload);
};

const shouldRetry = (message: string): boolean => {
  const lower = message.toLowerCase();
  if (lower.includes('api key is missing')) return false;
  if (lower.includes('401') || lower.includes('403')) return false;
  if (lower.includes('quota') || lower.includes('insufficient') || lower.includes('credit')) return false;
  return (
    lower.includes('timed out') ||
    lower.includes('429') ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('network') ||
    lower.includes('failed to fetch')
  );
};

const transcribeWithProvider = async (
  provider: STTProvider,
  input: File | Blob,
  settings: STTProviderSettings,
  timeoutMs: number
): Promise<string> => {
  const file = toFile(input);
  const key =
    settings.apiKey ||
    (provider === 'GROQ' ? import.meta.env.VITE_GROQ_API_KEY : import.meta.env.VITE_ELEVENLABS_API_KEY);

  if (!key) {
    throw new Error(`${provider} API key is missing.`);
  }

  if (provider === 'GROQ') {
    return transcribeOpenAICompatible(
      GROQ_TRANSCRIPT_URL,
      file,
      settings.model,
      key,
      settings.language,
      timeoutMs
    );
  }

  return transcribeWithElevenLabs(file, settings.model, key, settings.language, timeoutMs);
};

export const getDefaultSTTProviderSettings = (): Record<STTProvider, STTProviderSettings> => ({
  GROQ: { ...DEFAULT_STT_SETTINGS.GROQ },
  ELEVENLABS: { ...DEFAULT_STT_SETTINGS.ELEVENLABS },
});

export const transcribeAudioWithFallback = async (
  input: File | Blob,
  {
    provider = 'AUTO',
    providerSettings,
    autoRoute,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetriesPerProvider = DEFAULT_MAX_RETRIES,
    onProgress,
  }: STTRequestOptions = {}
): Promise<STTResponse> => {
  onProgress?.({
    stage: 'route-start',
    message: provider === 'AUTO' ? 'Starting STT auto fallback route.' : `Starting STT with ${provider}.`,
  });

  const route =
    provider !== 'AUTO'
      ? [
          {
            provider,
            model: resolveSettings(provider, providerSettings).model,
            apiKey: resolveSettings(provider, providerSettings).apiKey,
          },
        ]
      : autoRoute?.length
        ? autoRoute.map((entry) => ({
            provider: entry.provider,
            model: entry.model?.trim() || resolveSettings(entry.provider, providerSettings).model,
            apiKey: entry.apiKey?.trim() || resolveSettings(entry.provider, providerSettings).apiKey,
          }))
        : getDefaultAutoRoute(providerSettings);

  const attemptedProviders: STTProvider[] = [];
  const errors: string[] = [];

  for (const entry of route) {
    attemptedProviders.push(entry.provider);
    const settings = {
      model: entry.model,
      apiKey: entry.apiKey,
      language: resolveSettings(entry.provider, providerSettings).language,
    };

    onProgress?.({
      provider: entry.provider,
      stage: 'provider-attempt',
      message: `Trying ${entry.provider} (${entry.model})...`,
    });

    let attempt = 0;
    for (;;) {
      try {
        const text = await transcribeWithProvider(entry.provider, input, settings, timeoutMs);
        onProgress?.({
          provider: entry.provider,
          stage: 'provider-success',
          message: `${entry.provider} succeeded.`,
        });
        return {
          text,
          provider: entry.provider,
          attemptedProviders,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const canRetry = attempt < maxRetriesPerProvider && shouldRetry(message);
        if (canRetry) {
          attempt += 1;
          onProgress?.({
            provider: entry.provider,
            stage: 'provider-retry',
            message: `${entry.provider} temporary issue. Retrying (${attempt}/${maxRetriesPerProvider})...`,
          });
          await sleep(1200 * attempt);
          continue;
        }
        errors.push(`${entry.provider}: ${message}`);
        onProgress?.({
          provider: entry.provider,
          stage: 'provider-fail',
          message: `${entry.provider} failed: ${message}`,
        });
        break;
      }
    }
  }

  onProgress?.({
    stage: 'route-fail',
    message: 'All STT providers failed.',
  });
  throw new Error(`All STT providers failed. ${errors.join(' | ')}`);
};
