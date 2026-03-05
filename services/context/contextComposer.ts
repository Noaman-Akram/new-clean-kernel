import { AIContextSettings, AppState, ContextSourceTrace } from '../../types';
import {
  CONTEXT_PACK_DEFINITIONS,
  getContextPackDefinition,
  normalizeContextPackConfigs,
} from './contextRegistry';
import { buildContextPack } from './packBuilders';
import { getCachedContextPack, setCachedContextPack } from './contextCache';

export interface ComposeContextInput {
  state: AppState;
  settings: AIContextSettings;
  chatHistoryLength: number;
  providerModel: string;
  now?: number;
}

export interface ComposeContextResult {
  contextBlockText: string;
  contextTrace: ContextSourceTrace[];
  targetTokens: number;
  usedTokens: number;
  selectedPacks: number;
  cacheHits: number;
  cacheMisses: number;
  generatedAt: number;
}

interface WorkingPack {
  packId: ContextSourceTrace['packId'];
  label: string;
  module: string;
  priority: number;
  asOf: number;
  lines: string[];
  cache: 'HIT' | 'MISS';
}

const estimateTokens = (value: string): number => Math.max(1, Math.ceil(value.length / 4));

const packSectionTokens = (pack: WorkingPack): number => {
  const header = `[SRC:${pack.packId}] module=${pack.module} as_of=${new Date(pack.asOf).toISOString()} items=${pack.lines.length}`;
  return estimateTokens([header, ...pack.lines.map((line) => `- ${line}`)].join('\n'));
};

const isSmallFastModel = (model: string): boolean => {
  const normalized = model.toLowerCase();
  return normalized.includes('gpt-5-nano') || normalized.includes('gemini-2.5-flash');
};

const sanitizeBudgetBounds = (settings: AIContextSettings): { minTokens: number; maxTokens: number } => {
  const minCandidate = Number.isFinite(settings.minTokens) ? Math.round(settings.minTokens) : 700;
  const maxCandidate = Number.isFinite(settings.maxTokens) ? Math.round(settings.maxTokens) : 1800;
  const minTokens = Math.max(300, Math.min(minCandidate, maxCandidate));
  const maxTokens = Math.max(minTokens, maxCandidate);
  return { minTokens, maxTokens };
};

const resolveTargetTokens = (
  settings: AIContextSettings,
  chatHistoryLength: number,
  providerModel: string
): number => {
  const { minTokens, maxTokens } = sanitizeBudgetBounds(settings);
  const clamp = (value: number) =>
    Math.max(minTokens, Math.min(value, maxTokens));

  if (settings.budgetMode === 'STRICT') {
    return clamp(800);
  }
  if (settings.budgetMode === 'RICH') {
    return clamp(Math.max(settings.targetTokens || 1500, 1800));
  }

  let target = settings.targetTokens || 1500;
  if (isSmallFastModel(providerModel)) {
    target = Math.min(target, 1100);
  }
  if (chatHistoryLength > 20) {
    target = Math.min(target, 900);
  }
  return clamp(target);
};

const trimToBudget = (packs: WorkingPack[], targetTokens: number): WorkingPack[] => {
  const baseHeaderTokens = estimateTokens('CONTEXT WINDOW');
  const active = packs.map((pack) => ({ ...pack, lines: [...pack.lines] }));

  const currentTotal = () => {
    return (
      baseHeaderTokens +
      active.filter((pack) => pack.lines.length > 0).reduce((sum, pack) => sum + packSectionTokens(pack), 0)
    );
  };

  const trimOrder = [...active].sort((a, b) => b.priority - a.priority);
  while (currentTotal() > targetTokens) {
    let changed = false;
    for (const pack of trimOrder) {
      if (currentTotal() <= targetTokens) break;
      if (pack.lines.length > 1) {
        pack.lines.pop();
        changed = true;
      }
    }
    if (!changed) break;
  }

  while (currentTotal() > targetTokens) {
    let removed = false;
    for (const pack of trimOrder) {
      if (currentTotal() <= targetTokens) break;
      if (pack.lines.length > 1) {
        pack.lines = pack.lines.slice(0, 1);
        removed = true;
      } else if (pack.lines.length === 1 && active.filter((item) => item.lines.length > 0).length > 1) {
        pack.lines = [];
        removed = true;
      }
    }
    if (!removed) break;
  }

  const remaining = active.filter((pack) => pack.lines.length > 0);
  if (!remaining.length && packs.length) {
    const first = [...packs].sort((a, b) => a.priority - b.priority)[0];
    if (first.lines.length) {
      return [{ ...first, lines: [first.lines[0]] }];
    }
  }
  return remaining;
};

export const composeMentorContext = ({
  state,
  settings,
  chatHistoryLength,
  providerModel,
  now = Date.now(),
}: ComposeContextInput): ComposeContextResult => {
  const targetTokens = resolveTargetTokens(settings, chatHistoryLength, providerModel);
  const budgetBucket = String(Math.round(targetTokens / 100) * 100);
  const normalizedPacks = normalizeContextPackConfigs(settings.packs);
  const enabledPacks = normalizedPacks
    .filter((pack) => pack.enabled)
    .sort((a, b) => a.priority - b.priority);

  let cacheHits = 0;
  let cacheMisses = 0;
  const built: WorkingPack[] = enabledPacks.map((packConfig) => {
    const definition = getContextPackDefinition(packConfig.id);
    const builtPack = buildContextPack(packConfig.id, {
      state,
      maxItems: packConfig.maxItems,
      now,
      timeZone: state.userPreferences?.timeZone,
    });

    const cached = getCachedContextPack(
      packConfig.id,
      builtPack.signature,
      budgetBucket,
      packConfig.maxItems,
      now
    );

    if (cached) {
      cacheHits += 1;
      return {
        packId: packConfig.id,
        label: definition.label,
        module: definition.module,
        priority: packConfig.priority,
        asOf: cached.asOf,
        lines: cached.lines.slice(0, packConfig.maxItems),
        cache: 'HIT',
      };
    }

    cacheMisses += 1;
    const lines = builtPack.lines.slice(0, Math.max(1, packConfig.maxItems));
    setCachedContextPack(
      packConfig.id,
      builtPack.signature,
      budgetBucket,
      packConfig.maxItems,
      { asOf: builtPack.asOf, lines },
      now
    );
    return {
      packId: packConfig.id,
      label: definition.label,
      module: definition.module,
      priority: packConfig.priority,
      asOf: builtPack.asOf,
      lines,
      cache: 'MISS',
    };
  });

  const trimmed = trimToBudget(built, targetTokens);
  const sortedTrimmed = [...trimmed].sort((a, b) => a.priority - b.priority);

  const usedTokens = estimateTokens(
    sortedTrimmed
      .map((pack) => {
        const header = `[SRC:${pack.packId}] module=${pack.module} as_of=${new Date(pack.asOf).toISOString()} items=${pack.lines.length} tokens=${packSectionTokens(pack)}`;
        return [header, ...pack.lines.map((line) => `- ${line}`)].join('\n');
      })
      .join('\n\n')
  );

  const blockSections = sortedTrimmed.map((pack) => {
    const sectionTokens = packSectionTokens(pack);
    const header = `[SRC:${pack.packId}] module=${pack.module} as_of=${new Date(pack.asOf).toISOString()} items=${pack.lines.length} tokens=${sectionTokens}`;
    return [header, ...pack.lines.map((line) => `- ${line}`)].join('\n');
  });

  const contextBlockText = [
    `CONTEXT WINDOW (generated_at=${new Date(now).toISOString()}, mode=MANUAL_ONLY, budget=${usedTokens}/${targetTokens})`,
    ...blockSections,
  ].join('\n\n');

  const contextTrace: ContextSourceTrace[] = sortedTrimmed.map((pack) => ({
    packId: pack.packId,
    label: pack.label,
    module: pack.module,
    asOf: pack.asOf,
    itemsUsed: pack.lines.length,
    tokensUsed: packSectionTokens(pack),
    cache: pack.cache,
  }));

  return {
    contextBlockText,
    contextTrace,
    targetTokens,
    usedTokens,
    selectedPacks: enabledPacks.length,
    cacheHits,
    cacheMisses,
    generatedAt: now,
  };
};

export const getContextPackCount = (): number => CONTEXT_PACK_DEFINITIONS.length;
