import { AppState, ContextPackId } from '../../types';
import { DEFAULT_TIME_ZONE, getDateKeyInTimeZone } from '../../utils/dateTime';

export interface PackBuildInput {
  state: AppState;
  maxItems: number;
  now: number;
  timeZone?: string;
}

export interface PackBuildResult {
  packId: ContextPackId;
  asOf: number;
  lines: string[];
  signature: string;
}

interface ContextPackBuilder {
  getSignature: (input: PackBuildInput) => string;
  build: (input: PackBuildInput) => Omit<PackBuildResult, 'packId' | 'signature'>;
}

const clampMaxItems = (maxItems: number): number => Math.max(1, Math.floor(maxItems || 1));

const clean = (value: string): string => value.replace(/\s+/g, ' ').trim();

const hashString = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
};

const hashEntries = (entries: string[], sampleLimit = 48): string =>
  hashString(entries.slice(0, sampleLimit).join('||'));

const safeSnippet = (value: string | undefined | null, fallback: string): string => {
  const normalized = clean(value || '');
  return normalized || fallback;
};

const toShortDate = (timestamp: number, timeZone: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
};

const toShortTime = (timestamp: number, timeZone: string): string => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
};

const maxTimestamp = (values: number[]): number => values.reduce((max, value) => (value > max ? value : max), 0);

const resolveAsOf = (timestamps: number[], fallback: number): number => {
  const maxValue = maxTimestamp(timestamps);
  return maxValue > 0 ? maxValue : fallback;
};

const buildTasks: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const maxCreated = maxTimestamp(state.tasks.map((task) => task.createdAt || 0));
    const maxDeadline = maxTimestamp(state.tasks.map((task) => task.deadline || 0));
    const pending = state.tasks
      .filter((task) => task.status !== 'DONE')
      .sort((a, b) => a.id.localeCompare(b.id));
    const pendingCount = pending.length;
    const pendingFingerprint = hashEntries(
      pending.map((task) =>
        [
          task.id,
          task.status,
          task.impact,
          String(task.deadline || 0),
          safeSnippet(task.title, '').slice(0, 40),
        ].join(':')
      )
    );
    return `${state.tasks.length}:${pendingCount}:${maxCreated}:${maxDeadline}:${pendingFingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const pending = state.tasks.filter((task) => task.status !== 'DONE');
    const prioritized = [...pending].sort((a, b) => {
      if ((a.deadline || 0) && (b.deadline || 0) && a.deadline !== b.deadline) {
        return (a.deadline || 0) - (b.deadline || 0);
      }
      if (a.impact !== b.impact) {
        const score = { HIGH: 3, MED: 2, LOW: 1 } as const;
        return score[b.impact] - score[a.impact];
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const capped = prioritized.slice(0, clampMaxItems(maxItems));
    const lines = [
      `Pending tasks: ${pending.length}`,
      ...capped.map((task) => {
        const due = task.deadline ? `${toShortDate(task.deadline, timeZone)} ${toShortTime(task.deadline, timeZone)}` : 'No deadline';
        const overdue = task.deadline && task.deadline < now ? 'OVERDUE' : '';
        return `[${task.status}] ${safeSnippet(task.title, 'Untitled task')} | impact=${task.impact} | due=${due}${overdue ? ` | ${overdue}` : ''}`;
      }),
    ];

    return {
      asOf: resolveAsOf(
        [...state.tasks.map((task) => task.createdAt || 0), ...state.tasks.map((task) => task.deadline || 0)],
        now
      ),
      lines,
    };
  },
};

const buildDayMeta: ContextPackBuilder = {
  getSignature: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const focus = state.dayMeta?.[todayKey]?.focus || '';
    const sticky = state.stickyNotes?.[todayKey] || '';
    const blocks = state.timeBlocks?.[todayKey] || [];
    const blockFingerprint = hashEntries(
      blocks.map((block) =>
        [
          block.id,
          String(block.startHour),
          String(block.startMinute),
          String(block.duration),
          block.type,
          safeSnippet(block.title, '').slice(0, 40),
        ].join(':')
      )
    );
    return `${todayKey}:${focus.length}:${sticky.length}:${blocks.length}:${hashString(
      `${safeSnippet(focus, '').slice(0, 80)}|${safeSnippet(sticky, '').slice(0, 80)}|${blockFingerprint}`
    )}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const focus = safeSnippet(state.dayMeta?.[todayKey]?.focus, 'No focus set');
    const sticky = safeSnippet(state.stickyNotes?.[todayKey], 'No sticky note');
    const blocks = state.timeBlocks?.[todayKey] || [];
    const lines = [
      `Date key: ${todayKey}`,
      `Focus: ${focus}`,
      `Sticky: ${sticky}`,
      `Time blocks: ${blocks.length}`,
      ...blocks.slice(0, clampMaxItems(maxItems)).map((block) => {
        const start = `${String(block.startHour).padStart(2, '0')}:${String(block.startMinute).padStart(2, '0')}`;
        return `${start} ${safeSnippet(block.title, 'Untitled block')} (${block.duration}m, ${block.type})`;
      }),
    ];

    return {
      asOf: now,
      lines: lines.slice(0, clampMaxItems(maxItems) + 3),
    };
  },
};

const buildProtocols: ContextPackBuilder = {
  getSignature: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const todayChecks = state.dailyProtocolState?.[todayKey] || {};
    const totalItems = state.protocolContexts.reduce((sum, context) => sum + context.items.length, 0);
    const checked = Object.values(todayChecks).filter(Boolean).length;
    const contextFingerprint = hashEntries(
      state.protocolContexts
        .map((context) => {
          const itemsFingerprint = hashEntries(
            context.items.map((item) => `${item.id}:${safeSnippet(item.text, '').slice(0, 40)}`),
            32
          );
          return `${context.id}:${safeSnippet(context.name, '').slice(0, 40)}:${context.items.length}:${itemsFingerprint}`;
        })
        .sort()
    );
    const checksFingerprint = hashEntries(
      Object.entries(todayChecks)
        .filter(([, value]) => !!value)
        .map(([id]) => id)
        .sort()
    );
    return `${state.protocolContexts.length}:${totalItems}:${checked}:${todayKey}:${contextFingerprint}:${checksFingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const todayChecks = state.dailyProtocolState?.[todayKey] || {};
    const lines = [
      `Protocol contexts: ${state.protocolContexts.length}`,
      ...state.protocolContexts.slice(0, clampMaxItems(maxItems)).map((context) => {
        const checked = context.items.filter((item) => !!todayChecks[item.id]).length;
        return `${safeSnippet(context.name, 'Protocol')} ${checked}/${context.items.length} checked`;
      }),
    ];
    return { asOf: now, lines };
  },
};

const buildFocus: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const maxSession = maxTimestamp(
      state.focusSessions.map((session) => session.endTime || session.startTime || 0)
    );
    const maxDistraction = maxTimestamp(state.distractions.map((item) => item.timestamp || 0));
    const unresolved = state.distractions.filter((item) => !item.resolved).length;
    const sessionsFingerprint = hashEntries(
      state.focusSessions
        .map((session) =>
          `${session.id}:${session.taskId}:${session.startTime || 0}:${session.endTime || 0}:${session.completed ? 1 : 0}`
        )
        .sort()
    );
    const distractionsFingerprint = hashEntries(
      state.distractions
        .map(
          (item) =>
            `${item.id}:${item.timestamp || 0}:${item.resolved ? 1 : 0}:${safeSnippet(item.content, '').slice(0, 30)}`
        )
        .sort()
    );
    return `${state.activeSession.taskId || 'none'}:${state.activeSession.startTime || 0}:${state.focusSessions.length}:${maxSession}:${state.distractions.length}:${unresolved}:${maxDistraction}:${sessionsFingerprint}:${distractionsFingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const unresolved = state.distractions.filter((item) => !item.resolved);
    const recentSessions = [...state.focusSessions]
      .sort((a, b) => (b.endTime || b.startTime) - (a.endTime || a.startTime))
      .slice(0, clampMaxItems(maxItems));
    const lines = [
      `Active session: ${state.activeSession.taskId ? `task=${state.activeSession.taskId}` : 'none'}`,
      `Unresolved distractions: ${unresolved.length}`,
      ...recentSessions.map((session) => {
        const started = toShortTime(session.startTime, timeZone);
        const minutes = Math.round((session.duration || 0) / 60);
        return `Session ${session.taskId} | start=${started} | duration=${minutes}m | completed=${session.completed ? 'yes' : 'no'}`;
      }),
    ];
    return {
      asOf: resolveAsOf(
        [
          ...state.focusSessions.map((session) => session.endTime || session.startTime || 0),
          ...state.distractions.map((item) => item.timestamp || 0),
        ],
        now
      ),
      lines,
    };
  },
};

const buildChallenge: ContextPackBuilder = {
  getSignature: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const challenge = state.activeChallenge;
    if (!challenge) return `none:${todayKey}`;
    const today = challenge.history?.[todayKey];
    const historyFingerprint = hashEntries(
      Object.values(challenge.history || {})
        .map((day) => `${day.date}:${day.status}:${(day.completedRules || []).length}`)
        .sort()
    );
    const rulesFingerprint = hashEntries(
      (challenge.rules || []).map((rule) => `${rule.id}:${safeSnippet(rule.text, '').slice(0, 60)}`).sort()
    );
    return `${challenge.id}:${challenge.status}:${challenge.startedAt}:${challenge.durationDays}:${today?.status || 'none'}:${historyFingerprint}:${rulesFingerprint}`;
  },
  build: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const challenge = state.activeChallenge;
    if (!challenge) {
      return { asOf: now, lines: ['No active challenge.'] };
    }
    const today = challenge.history?.[todayKey];
    return {
      asOf: resolveAsOf(
        [challenge.startedAt || 0, challenge.startDate || 0],
        now
      ),
      lines: [
        `Name: ${safeSnippet(challenge.name, 'Challenge')}`,
        `Status: ${challenge.status}`,
        `Duration: ${challenge.durationDays} days`,
        `Today: ${today ? today.status : 'PENDING'}`,
      ],
    };
  },
};

const buildLedger: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const maxTx = maxTimestamp(state.transactions.map((transaction) => transaction.date || 0));
    const txFingerprint = hashEntries(
      state.transactions
        .map((transaction) =>
          [
            transaction.id,
            String(transaction.date || 0),
            String(transaction.amount || 0),
            transaction.type,
            safeSnippet(transaction.category, '').slice(0, 30),
            safeSnippet(transaction.description, '').slice(0, 40),
          ].join(':')
        )
        .sort()
    );
    const accountFingerprint = hashEntries(
      state.accounts.map((account) => `${account.id}:${account.type}:${account.currency}:${safeSnippet(account.name, '').slice(0, 30)}`).sort()
    );
    return `${state.accounts.length}:${state.transactions.length}:${maxTx}:${txFingerprint}:${accountFingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const recent = [...state.transactions].sort((a, b) => b.date - a.date).slice(0, clampMaxItems(maxItems));
    const balance = state.transactions.reduce((sum, transaction) => {
      return transaction.type === 'INCOME' ? sum + Math.abs(transaction.amount) : sum - Math.abs(transaction.amount);
    }, 0);
    const lines = [
      `Accounts: ${state.accounts.length}`,
      `Transactions: ${state.transactions.length}`,
      `Net balance (derived): ${balance.toFixed(2)}`,
      ...recent.map((transaction) => {
        const sign = transaction.type === 'INCOME' ? '+' : '-';
        return `${toShortDate(transaction.date, timeZone)} ${sign}${Math.abs(transaction.amount)} ${transaction.category} | ${safeSnippet(transaction.description, 'No description')}`;
      }),
    ];
    return { asOf: resolveAsOf(state.transactions.map((tx) => tx.date || 0), now), lines };
  },
};

const buildCRM: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const crm = state.clients.filter((client) => client.context === 'NEMO');
    const latest = maxTimestamp(crm.map((client) => client.lastInteraction || 0));
    const fingerprint = hashEntries(
      crm
        .map((client) =>
          `${client.id}:${client.lastInteraction || 0}:${client.stage || client.status}:${safeSnippet(client.nextAction, '').slice(0, 40)}`
        )
        .sort()
    );
    return `${crm.length}:${latest}:${fingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const crm = state.clients
      .filter((client) => client.context === 'NEMO')
      .sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0));
    const lines = [
      `NEMO entities: ${crm.length}`,
      ...crm.slice(0, clampMaxItems(maxItems)).map((client) => {
        return `${safeSnippet(client.name, 'Unknown')} | stage=${client.stage || client.status || 'n/a'} | next=${safeSnippet(client.nextAction, 'none')} | last=${toShortDate(client.lastInteraction || now, timeZone)}`;
      }),
    ];
    return { asOf: resolveAsOf(crm.map((client) => client.lastInteraction || 0), now), lines };
  },
};

const buildNetwork: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const network = state.clients.filter((client) => client.context === 'PERSONAL');
    const latest = maxTimestamp(network.map((client) => client.lastInteraction || 0));
    const fingerprint = hashEntries(
      network
        .map((client) =>
          `${client.id}:${client.lastInteraction || 0}:${client.circle || 'NONE'}:${safeSnippet(client.nextAction, '').slice(0, 40)}`
        )
        .sort()
    );
    return `${network.length}:${latest}:${fingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const network = state.clients
      .filter((client) => client.context === 'PERSONAL')
      .sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0));
    const lines = [
      `Personal contacts: ${network.length}`,
      ...network.slice(0, clampMaxItems(maxItems)).map((client) => {
        return `${safeSnippet(client.name, 'Unknown')} | circle=${client.circle || 'NONE'} | next=${safeSnippet(client.nextAction, 'none')} | last=${toShortDate(client.lastInteraction || now, timeZone)}`;
      }),
    ];
    return { asOf: resolveAsOf(network.map((client) => client.lastInteraction || 0), now), lines };
  },
};

const buildNotes: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const latest = maxTimestamp(state.notes.map((note) => note.updatedAt || 0));
    const fingerprint = hashEntries(
      state.notes
        .map((note) => `${note.id}:${note.updatedAt || 0}:${note.tags.length}:${safeSnippet(note.title, '').slice(0, 40)}`)
        .sort()
    );
    return `${state.notes.length}:${latest}:${fingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const notes = [...state.notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const lines = [
      `Notes: ${notes.length}`,
      ...notes.slice(0, clampMaxItems(maxItems)).map((note) => {
        return `${safeSnippet(note.title, 'Untitled')} | tags=${note.tags.length} | updated=${toShortDate(note.updatedAt || now, timeZone)}`;
      }),
    ];
    return { asOf: resolveAsOf(notes.map((note) => note.updatedAt || 0), now), lines };
  },
};

const buildResources: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const fingerprint = hashEntries(
      state.resources
        .map(
          (resource) =>
            `${resource.id}:${safeSnippet(resource.title, '').slice(0, 40)}:${safeSnippet(resource.url, '').slice(0, 64)}:${resource.category}`
        )
        .sort()
    );
    return `${state.resources.length}:${fingerprint}`;
  },
  build: ({ state, maxItems, now }) => {
    const resources = [...state.resources].slice(0, clampMaxItems(maxItems));
    const lines = [
      `Resources: ${state.resources.length}`,
      ...resources.map((resource) => `${safeSnippet(resource.title, 'Untitled')} | category=${resource.category}`),
    ];
    return { asOf: now, lines };
  },
};

const buildMarketing: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const latest = maxTimestamp(
      state.marketing.map((item) => item.postedAt || item.createdAt || 0)
    );
    const fingerprint = hashEntries(
      state.marketing
        .map(
          (item) =>
            `${item.id}:${item.postedAt || 0}:${item.createdAt || 0}:${item.isPosted ? 1 : 0}:${item.platform}:${item.identity}`
        )
        .sort()
    );
    return `${state.marketing.length}:${latest}:${fingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const items = [...state.marketing].sort(
      (a, b) => (b.postedAt || b.createdAt || 0) - (a.postedAt || a.createdAt || 0)
    );
    const posted = items.filter((item) => item.isPosted).length;
    const lines = [
      `Marketing items: ${items.length} (posted=${posted}, draft=${items.length - posted})`,
      ...items.slice(0, clampMaxItems(maxItems)).map((item) => {
        const time = item.postedAt || item.createdAt || now;
        return `${item.platform}/${item.identity} | posted=${item.isPosted ? 'yes' : 'no'} | ${toShortDate(time, timeZone)}`;
      }),
    ];
    return {
      asOf: resolveAsOf(
        items.map((item) => item.postedAt || item.createdAt || 0),
        now
      ),
      lines,
    };
  },
};

const buildActivities: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const latest = maxTimestamp(state.activities.map((activity) => activity.lastVisited || 0));
    const fingerprint = hashEntries(
      state.activities
        .map(
          (activity) =>
            `${activity.id}:${activity.lastVisited || 0}:${activity.category}:${activity.vibe}:${safeSnippet(activity.title, '').slice(0, 40)}`
        )
        .sort()
    );
    return `${state.activities.length}:${latest}:${fingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const activities = [...state.activities].sort((a, b) => (b.lastVisited || 0) - (a.lastVisited || 0));
    const lines = [
      `Activities: ${activities.length}`,
      ...activities.slice(0, clampMaxItems(maxItems)).map((activity) => {
        const visited = activity.lastVisited ? toShortDate(activity.lastVisited, timeZone) : 'never';
        return `${safeSnippet(activity.title, 'Untitled')} | ${activity.category}/${activity.vibe} | last=${visited}`;
      }),
    ];
    return { asOf: resolveAsOf(activities.map((activity) => activity.lastVisited || 0), now), lines };
  },
};

const buildGym: ContextPackBuilder = {
  getSignature: ({ state }) => {
    const latestSession = maxTimestamp(
      state.workoutSessions.map((session) => session.endTime || session.startTime || 0)
    );
    const sessionFingerprint = hashEntries(
      state.workoutSessions
        .map(
          (session) =>
            `${session.id}:${session.startTime || 0}:${session.endTime || 0}:${session.exercises.length}:${session.isActive ? 1 : 0}`
        )
        .sort()
    );
    const templateFingerprint = hashEntries(
      state.workoutTemplates
        .map((template) => `${template.id}:${template.lastUsed || 0}:${template.exercises.length}:${safeSnippet(template.name, '').slice(0, 40)}`)
        .sort()
    );
    return `${state.workoutTemplates.length}:${state.workoutSessions.length}:${latestSession}:${sessionFingerprint}:${templateFingerprint}`;
  },
  build: ({ state, maxItems, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const sessions = [...state.workoutSessions].sort(
      (a, b) => (b.endTime || b.startTime || 0) - (a.endTime || a.startTime || 0)
    );
    const lines = [
      `Templates: ${state.workoutTemplates.length}`,
      `Sessions: ${state.workoutSessions.length}`,
      ...sessions.slice(0, clampMaxItems(maxItems)).map((session) => {
        const time = session.endTime || session.startTime || now;
        return `${safeSnippet(session.templateName || session.id, 'Session')} | active=${session.isActive ? 'yes' : 'no'} | exercises=${session.exercises.length} | ${toShortDate(time, timeZone)}`;
      }),
    ];
    return { asOf: resolveAsOf(sessions.map((session) => session.endTime || session.startTime || 0), now), lines };
  },
};

const buildSupplications: ContextPackBuilder = {
  getSignature: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const prayersToday = Object.keys(state.prayerLog).filter((key) => key.includes(todayKey)).length;
    const adhkarToday = Object.keys(state.adhkarLog || {}).filter((key) => key.includes(todayKey)).length;
    const prayerKeys = Object.keys(state.prayerLog).sort();
    const adhkarKeys = Object.keys(state.adhkarLog || {}).sort();
    return `${todayKey}:${prayersToday}:${adhkarToday}:${prayerKeys.length}:${adhkarKeys.length}:${hashEntries(prayerKeys)}:${hashEntries(adhkarKeys)}`;
  },
  build: ({ state, now, timeZone = DEFAULT_TIME_ZONE }) => {
    const todayKey = getDateKeyInTimeZone(new Date(now), timeZone);
    const prayersToday = Object.keys(state.prayerLog).filter((key) => key.includes(todayKey)).length;
    const adhkarToday = Object.keys(state.adhkarLog || {}).filter((key) => key.includes(todayKey)).length;
    return {
      asOf: now,
      lines: [
        `Prayer logs today: ${prayersToday}`,
        `Adhkar logs today: ${adhkarToday}`,
        `Prayer records total: ${Object.keys(state.prayerLog).length}`,
        `Adhkar records total: ${Object.keys(state.adhkarLog || {}).length}`,
      ],
    };
  },
};

const BUILDERS: Record<ContextPackId, ContextPackBuilder> = {
  TASKS: buildTasks,
  DAY_META: buildDayMeta,
  PROTOCOLS: buildProtocols,
  FOCUS: buildFocus,
  CHALLENGE: buildChallenge,
  LEDGER: buildLedger,
  CRM: buildCRM,
  NETWORK: buildNetwork,
  NOTES: buildNotes,
  RESOURCES: buildResources,
  MARKETING: buildMarketing,
  ACTIVITIES: buildActivities,
  GYM: buildGym,
  SUPPLICATIONS: buildSupplications,
};

export const buildContextPack = (packId: ContextPackId, input: PackBuildInput): PackBuildResult => {
  const builder = BUILDERS[packId];
  const signature = builder.getSignature(input);
  const built = builder.build(input);
  return {
    packId,
    signature,
    asOf: built.asOf,
    lines: built.lines,
  };
};
