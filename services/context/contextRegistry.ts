import { ContextPackConfig, ContextPackId } from '../../types';

export interface ContextPackDefinition {
  id: ContextPackId;
  label: string;
  module: string;
  defaultPriority: number;
  defaultMaxItems: number;
  core: boolean;
}

export const CONTEXT_PACK_DEFINITIONS: ContextPackDefinition[] = [
  { id: 'TASKS', label: 'Tasks', module: 'WEEKLY', defaultPriority: 1, defaultMaxItems: 8, core: true },
  { id: 'DAY_META', label: 'Day Meta', module: 'DAY', defaultPriority: 2, defaultMaxItems: 6, core: true },
  { id: 'PROTOCOLS', label: 'Protocols', module: 'DAY', defaultPriority: 3, defaultMaxItems: 6, core: true },
  { id: 'FOCUS', label: 'Focus', module: 'FOCUS', defaultPriority: 4, defaultMaxItems: 6, core: true },
  { id: 'CHALLENGE', label: 'Challenge', module: 'COCKPIT', defaultPriority: 5, defaultMaxItems: 5, core: true },
  { id: 'LEDGER', label: 'Ledger', module: 'LEDGER', defaultPriority: 6, defaultMaxItems: 6, core: false },
  { id: 'CRM', label: 'CRM', module: 'CRM', defaultPriority: 7, defaultMaxItems: 6, core: false },
  { id: 'NETWORK', label: 'Network', module: 'NETWORK', defaultPriority: 8, defaultMaxItems: 6, core: false },
  { id: 'NOTES', label: 'Notes', module: 'INTEL', defaultPriority: 9, defaultMaxItems: 6, core: false },
  { id: 'RESOURCES', label: 'Resources', module: 'ARSENAL', defaultPriority: 10, defaultMaxItems: 5, core: false },
  { id: 'MARKETING', label: 'Marketing', module: 'MARKETING', defaultPriority: 11, defaultMaxItems: 5, core: false },
  { id: 'ACTIVITIES', label: 'Activities', module: 'ACTIVITIES', defaultPriority: 12, defaultMaxItems: 5, core: false },
  { id: 'GYM', label: 'Gym', module: 'GYM', defaultPriority: 13, defaultMaxItems: 5, core: false },
  { id: 'SUPPLICATIONS', label: 'Supplications', module: 'SANCTUARY', defaultPriority: 14, defaultMaxItems: 5, core: false },
];

const DEFINITION_MAP = new Map<ContextPackId, ContextPackDefinition>(
  CONTEXT_PACK_DEFINITIONS.map((pack) => [pack.id, pack])
);

export const getContextPackDefinition = (packId: ContextPackId): ContextPackDefinition => {
  const definition = DEFINITION_MAP.get(packId);
  if (!definition) {
    throw new Error(`Unknown context pack: ${packId}`);
  }
  return definition;
};

export const getDefaultContextPackConfigs = (): ContextPackConfig[] =>
  CONTEXT_PACK_DEFINITIONS.map((pack) => ({
    id: pack.id,
    enabled: true,
    priority: pack.defaultPriority,
    maxItems: pack.defaultMaxItems,
  }));

export const getCoreOnlyContextPackConfigs = (): ContextPackConfig[] =>
  CONTEXT_PACK_DEFINITIONS.map((pack) => ({
    id: pack.id,
    enabled: pack.core,
    priority: pack.defaultPriority,
    maxItems: pack.defaultMaxItems,
  }));

export const normalizeContextPackConfigs = (
  packs: ContextPackConfig[] | undefined | null
): ContextPackConfig[] => {
  const fallback = getDefaultContextPackConfigs();
  if (!packs?.length) return fallback;

  const byId = new Map<ContextPackId, ContextPackConfig>();
  for (const pack of packs) {
    if (!DEFINITION_MAP.has(pack.id)) continue;
    byId.set(pack.id, {
      id: pack.id,
      enabled: Boolean(pack.enabled),
      priority: Number.isFinite(pack.priority) ? Math.max(1, Math.round(pack.priority)) : getContextPackDefinition(pack.id).defaultPriority,
      maxItems: Number.isFinite(pack.maxItems) ? Math.max(1, Math.round(pack.maxItems)) : getContextPackDefinition(pack.id).defaultMaxItems,
    });
  }

  return CONTEXT_PACK_DEFINITIONS.map((definition) => {
    const existing = byId.get(definition.id);
    return (
      existing || {
        id: definition.id,
        enabled: true,
        priority: definition.defaultPriority,
        maxItems: definition.defaultMaxItems,
      }
    );
  });
};
