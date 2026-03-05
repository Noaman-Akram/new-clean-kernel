import { ContextPackId } from '../../types';

const CACHE_KEY = 'mentor_context_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 240;

interface CachedPackPayload {
  packId: ContextPackId;
  signature: string;
  budgetBucket: string;
  maxItems: number;
  asOf: number;
  lines: string[];
  expiresAt: number;
  updatedAt: number;
}

type CachedPackRecord = Record<string, CachedPackPayload>;

const buildEntryKey = (
  packId: ContextPackId,
  signature: string,
  budgetBucket: string,
  maxItems: number
): string => `${packId}::${signature}::${budgetBucket}::${maxItems}`;

const readCache = (): CachedPackRecord => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CachedPackRecord;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse context cache:', error);
    return {};
  }
};

const writeCache = (cache: CachedPackRecord) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to persist context cache:', error);
  }
};

const pruneCache = (cache: CachedPackRecord, now: number): CachedPackRecord => {
  const entries = Object.entries(cache).filter(([, value]) => value.expiresAt > now);
  entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  return Object.fromEntries(entries.slice(0, CACHE_MAX_ENTRIES));
};

export const getCachedContextPack = (
  packId: ContextPackId,
  signature: string,
  budgetBucket: string,
  maxItems: number,
  now: number
): { asOf: number; lines: string[] } | null => {
  const key = buildEntryKey(packId, signature, budgetBucket, maxItems);
  const cache = readCache();
  const hit = cache[key];
  if (!hit || hit.expiresAt <= now) {
    return null;
  }
  return {
    asOf: hit.asOf,
    lines: hit.lines,
  };
};

export const setCachedContextPack = (
  packId: ContextPackId,
  signature: string,
  budgetBucket: string,
  maxItems: number,
  payload: { asOf: number; lines: string[] },
  now: number
) => {
  const key = buildEntryKey(packId, signature, budgetBucket, maxItems);
  const cache = pruneCache(readCache(), now);
  cache[key] = {
    packId,
    signature,
    budgetBucket,
    maxItems,
    asOf: payload.asOf,
    lines: payload.lines,
    expiresAt: now + CACHE_TTL_MS,
    updatedAt: now,
  };
  writeCache(cache);
};

export const clearContextCache = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
};
