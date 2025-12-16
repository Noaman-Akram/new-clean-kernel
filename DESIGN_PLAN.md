# Noeman Kernel — Design + Implementation Playbook

## Visual Philosophy
- **Influences**: Grey.co minimalism, Linear’s system rigor, Nexo dashboard composure.
- **Palette**: Deep charcoal bases (`#050505–#111`), neutral greys for structure, emerald accent for live state.
- **Shapes**: Sharp corners (`rounded-sm`), single-pixel borders (`border-neutral-200/opacity`), dense but breathable spacing.
- **Typography**: Sans-display (e.g. Söhne/Neue Montreal) for titles, monospaced meta (IBM Plex Mono) with +2% tracking for labels.
- **Motion**: Ease-out curves (`cubic-bezier(0.16, 1, 0.3, 1)`), 120–240 ms durations, fade+slide for surfaces, opacity-only for busy lists.

## Design Tokens & Primitives
| Token | Purpose |
| --- | --- |
| `--space-1..6` (4px grid) | Vertical rhythm |
| `--surface-0/1/2` | Background layers |
| `--border-muted` | Dividers, cards, tables |
| `--accent` | Positive/active states |
| `--font-primary` / `--font-mono` | Type pairing |

**Layout primitives**: `Stack`, `Cluster`, `Rail`, `MetricCard`, `CommandBar`, `DataList`, `Badge`. Every screen should be composed from these blocks to stay visually consistent.

## Experience Principles
1. **Single-glance clarity** – every module opens with a summary rail before diving into data.
2. **Fast insertion** – inline creation or command bars in every context; no modal dependency for routine inputs.
3. **Context persistence** – filters/tabs remember last choices and share state with Mentor prompts.
4. **Self before others** – copy, metrics, and rituals emphasize self-governance before managing teams or clients.

## Module Roadmap
1. **Cockpit**: Ritual engine + focus lane + timeline.
2. **Grid**: Today/Week/Month planner with drag/drop between horizons.
3. **Network** *(current work)*: Personal circle + Nemo CRM with follow-up tracking.
4. **Ledger**: Cash runway meter, quick income/expense capture.
5. **Marketing**: Platform columns grouped by persona (Personal vs Agency).
6. **Mentor**: Richer context (ritual streaks, runway, reflections).

## Implementation Notes
- Align schema changes in `types.ts`, and add storage migrations when altering saved structure.
- Firebase remains optional; any feature must gracefully drop to local storage.
- Favor typography and spacing for hierarchy—icons and color should be minimal.
- Provide skeleton states for new components to keep load transitions soft.
- Reuse the same spacing/border tokens even when building bespoke layouts to avoid drift.

Treat this doc as the single reference for design vocabulary, so every new feature or refactor stays coherent.
