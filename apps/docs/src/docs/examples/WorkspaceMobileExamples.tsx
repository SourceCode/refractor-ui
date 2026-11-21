import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  AtSign,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Film,
  Home,
  Inbox,
  Layers,
  MapPin,
  PieChart,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  User,
  Volume2,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  AudioWaveformPlayer,
  BadgeStatus,
  BeforeAfterSlider,
  BottomNavigationBar,
  CalendarHeatmap,
  type CalendarHeatmapEntry,
  ColorPicker,
  CombinedDateTimePicker,
  CustomVideoPlayer,
  DonutPieChart,
  type DonutSlice,
  GanttChart,
  type GanttTaskItem,
  InteractiveMapViewer,
  KanbanBoard,
  type KanbanCardItem,
  type KanbanColumnDef,
  type KanbanPriority,
  KpiMetricCard,
  LivePresenceIndicator,
  type MapPin as SpatialMapPin,
  type MapRoute,
  type MasterDetailItem,
  MasterDetailView,
  NotificationCenter,
  type NotificationItem,
  type PresenceUser,
  PrimaryButton,
  PrismTabs,
  PullToRefresh,
  RecurrenceBuilder,
  type RecurrenceRule,
  RotaryDial,
  ScrubbableNumberField,
  SecondaryButton,
  SignaturePad,
  type SignatureExportData,
  SparklineChart,
  SwipeableActionRow,
  TagChip,
  TimezoneSelector,
  type TriCheckboxState,
  TriStateCheckbox,
} from '@refractor-ui/core';
import { assetUrl } from '../assetUrl';
import type { ExampleScreenSpec } from './types';

/* -------------------------------------------------------------------------- */
/* 1. Project Kanban, Gantt & Velocity Hub                                    */
/* -------------------------------------------------------------------------- */

const SPRINT_PRESENCE_USERS: ReadonlyArray<PresenceUser> = [
  {
    id: 'u-elena',
    name: 'Elena Vance',
    role: 'Design Director',
    status: 'editing',
    activity: 'Auditing specular rim contrast',
  },
  {
    id: 'u-marcus',
    name: 'Marcus Chen',
    role: 'Staff Engineer',
    status: 'editing',
    activity: 'Tuning Kanban WIP limits',
  },
  {
    id: 'u-maya',
    name: 'Maya Lin',
    role: 'Core UI Lead',
    status: 'online',
    activity: 'Reviewing Gantt timeline tokens',
  },
  {
    id: 'u-devon',
    name: 'Devon Park',
    role: 'Release DX',
    status: 'viewing',
    activity: 'Checking release velocity heatmap',
  },
  {
    id: 'u-sora',
    name: 'Sora Takahashi',
    role: 'QA Architect',
    status: 'idle',
    activity: 'Standing by for v2.2 sign-off',
  },
];

const SPRINT_COLUMNS: ReadonlyArray<KanbanColumnDef> = [
  { id: 'backlog', title: 'Backlog', wipLimit: 5 },
  { id: 'progress', title: 'In Progress', wipLimit: 2 },
  { id: 'review', title: 'Review', wipLimit: 2 },
  { id: 'done', title: 'Shipped' },
];

const INITIAL_SPRINT_CARDS: ReadonlyArray<KanbanCardItem> = [
  {
    id: 'sp-1',
    columnId: 'backlog',
    title: 'Calibrate dark-mode refraction bloom on OLED panels',
    assignee: 'Elena Vance',
    priority: 'high',
    tags: ['Optics', 'WCAG'],
  },
  {
    id: 'sp-2',
    columnId: 'progress',
    title: 'Wire keyboard card transfers across WIP lanes',
    assignee: 'Marcus Chen',
    priority: 'critical',
    tags: ['A11y', 'Sprint'],
  },
  {
    id: 'sp-3',
    columnId: 'progress',
    title: 'Ship sub-millisecond SVG dependency arcs in GanttChart',
    assignee: 'Maya Lin',
    priority: 'high',
    tags: ['Data Viz'],
  },
  {
    id: 'sp-4',
    columnId: 'review',
    title: 'Verify strict AST ESLint pass across docs',
    assignee: 'Devon Park',
    priority: 'medium',
    tags: ['Quality'],
  },
  {
    id: 'sp-5',
    columnId: 'done',
    title: 'Publish Cycle 18 optical token bundle & changelog',
    assignee: 'Sora Takahashi',
    priority: 'low',
    tags: ['Release'],
  },
];

const ROADMAP_GANTT_TASKS: ReadonlyArray<GanttTaskItem> = [
  {
    id: 'g-tokens',
    title: 'Optical Token Cascade v2.2',
    assignee: 'Elena Vance',
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    progress: 100,
    tone: 'emerald',
  },
  {
    id: 'g-kanban',
    title: 'Kanban & Keyboard Drag Parity',
    assignee: 'Marcus Chen',
    startDate: '2026-11-07',
    endDate: '2026-11-15',
    progress: 92,
    dependencies: ['g-tokens'],
    tone: 'cobalt',
  },
  {
    id: 'g-gantt',
    title: 'Dependency Graph & Resource Lanes',
    assignee: 'Maya Lin',
    startDate: '2026-11-13',
    endDate: '2026-11-21',
    progress: 78,
    dependencies: ['g-kanban'],
    tone: 'primary',
  },
  {
    id: 'g-qa',
    title: 'Strict Coverage & WCAG AA Audit',
    assignee: 'Sora Takahashi',
    startDate: '2026-11-19',
    endDate: '2026-11-26',
    progress: 45,
    dependencies: ['g-gantt'],
    tone: 'emerald',
  },
];

const VELOCITY_HEATMAP_ENTRIES: CalendarHeatmapEntry[] = [
  { date: '2026-09-14', count: 5, detail: 'Token cascade refactor' },
  { date: '2026-09-17', count: 9, detail: 'Specular border tuning' },
  { date: '2026-09-22', count: 12, detail: 'Kanban keyboard traps' },
  { date: '2026-09-29', count: 7, detail: 'Gantt tick math' },
  { date: '2026-10-03', count: 14, detail: 'Release v2.1 cut' },
  { date: '2026-10-08', count: 11, detail: 'Heatmap UTC grid' },
  { date: '2026-10-14', count: 6, detail: 'Theme contrast tests' },
  { date: '2026-10-21', count: 15, detail: 'Strict AST lint pass' },
  { date: '2026-10-28', count: 10, detail: 'Mobile drawer polish' },
  { date: '2026-11-04', count: 13, detail: 'Data Viz SVG sprint' },
  { date: '2026-11-11', count: 16, detail: 'Cycle 18 milestone' },
  { date: '2026-11-17', count: 9, detail: 'Gantt dependency lines' },
  { date: '2026-11-19', count: 14, detail: 'Coverage gate 99.4%' },
  { date: '2026-11-20', count: 12, detail: 'Docs workbench QA' },
  { date: '2026-11-21', count: 18, detail: 'v2.2 RC freeze' },
];

type PriorityFilter = 'all' | KanbanPriority;
type SprintHubTab = 'kanban' | 'gantt' | 'velocity';

function ProjectKanbanRoadmapScreen() {
  const [activeTab, setActiveTab] = useState<SprintHubTab>('kanban');
  const [cards, setCards] = useState<KanbanCardItem[]>([...INITIAL_SPRINT_CARDS]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [focusedUser, setFocusedUser] = useState<PresenceUser | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardItem | null>(
    INITIAL_SPRINT_CARDS[1] ?? null
  );
  const [selectedTask, setSelectedTask] = useState<GanttTaskItem | null>(
    ROADMAP_GANTT_TASKS[2] ?? null
  );
  const [selectedDay, setSelectedDay] = useState<CalendarHeatmapEntry | null>(
    VELOCITY_HEATMAP_ENTRIES[VELOCITY_HEATMAP_ENTRIES.length - 1] ?? null
  );
  const [activityNote, setActivityNote] = useState(
    'Cycle 18 synced · Drag or use arrow controls to move sprint cards across WIP columns.'
  );

  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        const matchesPriority = priorityFilter === 'all' || card.priority === priorityFilter;
        const matchesUser = !focusedUser || card.assignee === focusedUser.name;
        return matchesPriority && matchesUser;
      }),
    [cards, focusedUser, priorityFilter]
  );

  const shippedCount = useMemo(
    () => cards.filter((card) => card.columnId === 'done').length,
    [cards]
  );

  const totalCommits = useMemo(
    () => VELOCITY_HEATMAP_ENTRIES.reduce((sum, entry) => sum + entry.count, 0),
    []
  );

  const handleTabChange = (nextId: string) => {
    if (nextId === 'kanban' || nextId === 'gantt' || nextId === 'velocity') {
      setActiveTab(nextId);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="prism-slab rounded-[24px] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Delivery Hub · Cycle 18
              </span>
              <BadgeStatus label="Sprint Live" tone="online" />
            </div>
            <h4 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Prism Optical Engine v2.2
            </h4>
          </div>

          <LivePresenceIndicator
            users={SPRINT_PRESENCE_USERS}
            maxVisible={4}
            size="sm"
            onUserSelect={(user) => {
              setFocusedUser((prev) => (prev?.id === user.id ? null : user));
              setActivityNote(
                `${user.name} (${user.status}) · ${user.activity ?? user.role ?? 'Active in Cycle 18'}`
              );
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="prism-crystal rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300">Sprint Throughput</span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
              {shippedCount}/{cards.length} shipped
            </span>
          </div>
          <div className="prism-crystal rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300">Roadmap Milestones</span>
            <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white">
              {ROADMAP_GANTT_TASKS.length} active
            </span>
          </div>
          <div className="prism-crystal rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-300">12-Week Velocity</span>
            <span className="font-mono tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {totalCommits} commits
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'critical', 'high', 'medium'] as const).map((level) => (
              <TagChip
                key={level}
                label={level === 'all' ? 'All Priorities' : level.toUpperCase()}
                selected={priorityFilter === level}
                onSelect={() => setPriorityFilter(level)}
              />
            ))}
            {focusedUser ? (
              <TagChip
                label={`Assignee: ${focusedUser.name}`}
                selected
                onDismiss={() => setFocusedUser(null)}
              />
            ) : null}
          </div>

          <span className="prism-well rounded-full px-3 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 max-w-full truncate">
            {activityNote}
          </span>
        </div>
      </div>

      <PrismTabs
        activeTabId={activeTab}
        onChange={handleTabChange}
        tabs={[
          {
            id: 'kanban',
            label: `Sprint Board (${visibleCards.length})`,
            content: (
              <div className="space-y-3">
                <KanbanBoard
                  columns={SPRINT_COLUMNS}
                  cards={visibleCards}
                  onCardsChange={(nextSubset) => {
                    if (priorityFilter === 'all' && !focusedUser) {
                      setCards(nextSubset);
                    } else {
                      const updatedById = new Map<string, KanbanCardItem>();
                      for (const item of nextSubset) {
                        updatedById.set(item.id, item);
                      }
                      const merged = cards.map((card) => updatedById.get(card.id) ?? card);
                      for (const item of nextSubset) {
                        if (!cards.some((existing) => existing.id === item.id)) {
                          merged.push(item);
                        }
                      }
                      setCards(merged);
                    }
                  }}
                  onCardMove={(cardId, fromCol, toCol) =>
                    setActivityNote(`Moved ${cardId} from ${fromCol} to ${toCol}`)
                  }
                  onCardAdd={(colId, title) =>
                    setActivityNote(`Added "${title}" into ${colId}`)
                  }
                  onCardSelect={(card) => {
                    setSelectedCard(card);
                    setActivityNote(`Inspecting ${card.title}`);
                  }}
                />

                {selectedCard ? (
                  <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        Selected Card: {selectedCard.title}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        Owner: {selectedCard.assignee ?? 'Unassigned'} · Lane: {selectedCard.columnId} ·
                        Priority: {selectedCard.priority ?? 'medium'}
                      </p>
                    </div>
                    <span className="prism-emerald rounded-full px-2.5 py-0.5 text-[11px] font-mono">
                      {selectedCard.id}
                    </span>
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            id: 'gantt',
            label: 'Timeline Roadmap',
            content: (
              <div className="space-y-3">
                <GanttChart
                  tasks={ROADMAP_GANTT_TASKS}
                  todayIso="2026-11-18"
                  selectedTaskId={selectedTask?.id ?? null}
                  onSelectTask={(task) => {
                    setSelectedTask(task);
                    setActivityNote(
                      `Milestone "${task.title}" · ${task.progress ?? 0}% complete`
                    );
                  }}
                />
                {selectedTask ? (
                  <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {selectedTask.title}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        {selectedTask.assignee} · {selectedTask.startDate} to {selectedTask.endDate}
                      </p>
                    </div>
                    <span className="prism-well rounded-full px-3 py-1 font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                      {selectedTask.progress ?? 0}% done
                    </span>
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            id: 'velocity',
            label: 'Commit Velocity',
            content: (
              <div className="space-y-3">
                <CalendarHeatmap
                  title="Daily Release & Engineering Velocity"
                  weeks={12}
                  endDate="2026-11-21"
                  valueUnit="commits"
                  tone="emerald"
                  entries={VELOCITY_HEATMAP_ENTRIES}
                  onSelectDay={(entry) => {
                    setSelectedDay(entry);
                    setActivityNote(
                      `${entry.date}: ${entry.count} commits${entry.detail ? ` · ${entry.detail}` : ''}`
                    );
                  }}
                />
                {selectedDay ? (
                  <div className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedDay.date} · {selectedDay.detail ?? 'Scheduled maintenance'}
                    </span>
                    <span className="prism-emerald rounded-full px-3 py-0.5 font-mono tabular-nums font-semibold">
                      {selectedDay.count} commits
                    </span>
                  </div>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Creative Video, Audio & Color Grading Studio                            */
/* -------------------------------------------------------------------------- */

interface ColorGradePreset {
  id: string;
  label: string;
  exposure: number;
  contrast: number;
  saturation: number;
  tempK: number;
  tintHex: string;
  tintAlpha: number;
}

const COLOR_GRADE_PRESETS: ReadonlyArray<ColorGradePreset> = [
  {
    id: 'alabaster',
    label: 'Daylight Crystal',
    exposure: 8,
    contrast: 108,
    saturation: 112,
    tempK: 5600,
    tintHex: '#38BDF8',
    tintAlpha: 0.25,
  },
  {
    id: 'amber',
    label: 'Cinema Amber',
    exposure: 14,
    contrast: 122,
    saturation: 128,
    tempK: 6400,
    tintHex: '#E75C24',
    tintAlpha: 0.42,
  },
  {
    id: 'obsidian',
    label: 'Cobalt Night',
    exposure: -12,
    contrast: 132,
    saturation: 96,
    tempK: 4200,
    tintHex: '#7C3AED',
    tintAlpha: 0.36,
  },
];

interface AudioStemTrack {
  id: string;
  label: string;
  subtitle: string;
  durationSeconds: number;
  peaks: ReadonlyArray<number>;
}

const AUDIO_STEMS: ReadonlyArray<AudioStemTrack> = [
  {
    id: 'master',
    label: 'Master Mix — 48kHz PCM',
    subtitle: 'Full orchestral & foley bus (-14 LUFS)',
    durationSeconds: 186,
    peaks: [
      0.24, 0.48, 0.72, 0.58, 0.9, 0.76, 0.44, 0.66, 0.94, 0.82, 0.52, 0.36, 0.74, 0.92, 0.68,
      0.5, 0.84, 0.96, 0.7, 0.6, 0.42, 0.78, 0.62, 0.38, 0.54, 0.8, 0.64, 0.34, 0.46, 0.28,
    ],
  },
  {
    id: 'dialogue',
    label: 'Director Voiceover — ADR',
    subtitle: 'Cardioid vocal booth stem (-16 LUFS)',
    durationSeconds: 186,
    peaks: [
      0.14, 0.32, 0.64, 0.78, 0.45, 0.22, 0.18, 0.68, 0.86, 0.54, 0.3, 0.16, 0.58, 0.82, 0.74,
      0.34, 0.2, 0.66, 0.9, 0.62, 0.28, 0.14, 0.52, 0.76, 0.6, 0.32, 0.18, 0.44, 0.36, 0.16,
    ],
  },
  {
    id: 'synth',
    label: 'Prismatic Sub-Bass & Pads',
    subtitle: 'Analog stereo refraction layer',
    durationSeconds: 186,
    peaks: [
      0.52, 0.58, 0.64, 0.68, 0.74, 0.78, 0.72, 0.66, 0.7, 0.82, 0.88, 0.84, 0.76, 0.72, 0.68,
      0.74, 0.8, 0.86, 0.92, 0.88, 0.78, 0.72, 0.66, 0.62, 0.68, 0.74, 0.7, 0.6, 0.54, 0.46,
    ],
  },
];

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:12`;
}

function CreativeMediaStudioScreen() {
  const [exposure, setExposure] = useState(14);
  const [contrast, setContrast] = useState(118);
  const [saturation, setSaturation] = useState(124);
  const [tempK, setTempK] = useState(6100);
  const [tintHex, setTintHex] = useState('#E75C24');
  const [tintAlpha, setTintAlpha] = useState(0.35);
  const [activePresetId, setActivePresetId] = useState<string>('amber');
  const [activeStemId, setActiveStemId] = useState<string>('master');
  const [playheadSec, setPlayheadSec] = useState(48);
  const [isPlaying, setIsPlaying] = useState(false);
  const [splitPct, setSplitPct] = useState(52);
  const [exportStatus, setExportStatus] = useState<string>('LUT ready · 33-point .cube');

  const activeStem = useMemo(
    () => AUDIO_STEMS.find((stem) => stem.id === activeStemId) ?? AUDIO_STEMS[0],
    [activeStemId]
  );

  const brightnessFactor = Math.max(0.45, Math.min(1.8, 1 + exposure / 120));
  const contrastFactor = Math.max(0.5, Math.min(1.8, contrast / 100));
  const saturationFactor = Math.max(0, Math.min(2, saturation / 100));
  const frameSrc = assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg');

  const applyPreset = (preset: ColorGradePreset) => {
    setActivePresetId(preset.id);
    setExposure(preset.exposure);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
    setTempK(preset.tempK);
    setTintHex(preset.tintHex);
    setTintAlpha(preset.tintAlpha);
    setExportStatus(`Applied "${preset.label}" optical grade`);
  };

  const resetGrade = () => {
    setActivePresetId('neutral');
    setExposure(0);
    setContrast(100);
    setSaturation(100);
    setTempK(5600);
    setTintHex('#38BDF8');
    setTintAlpha(0.12);
    setExportStatus('Reset to Rec.709 neutral baseline');
  };

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <div className="prism-slab rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <span className="prism-crystal w-9 h-9 rounded-2xl inline-flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0">
            <Film className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Prism Lens Commercial — Master Reel
              </h4>
              <BadgeStatus
                label={isPlaying ? 'Playing' : 'Color Lock'}
                tone={isPlaying ? 'online' : 'warning'}
              />
            </div>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              TC {formatTimecode(playheadSec)} · ProRes 4444 · Split {Math.round(splitPct)}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_GRADE_PRESETS.map((preset) => (
            <TagChip
              key={preset.id}
              label={preset.label}
              selected={activePresetId === preset.id}
              onSelect={() => applyPreset(preset)}
            />
          ))}
          <SecondaryButton
            size="sm"
            leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={resetGrade}
          >
            Reset
          </SecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 @4xl:grid-cols-12 gap-4 items-start">
        <div className="@4xl:col-span-7 space-y-4 min-w-0">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Live Color Grade A/B Wipe</span>
              </span>
              <span className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-200">
                EV {exposure >= 0 ? `+${exposure}` : exposure} · Con {contrast}% · Sat {saturation}% ·{' '}
                {tempK}K
              </span>
            </div>

            <BeforeAfterSlider
              beforeLabel="Raw Log-C"
              afterLabel="Live Refractor Grade"
              position={splitPct}
              onPositionChange={setSplitPct}
              heightPx={240}
              beforeContent={
                <img
                  src={frameSrc}
                  alt="Raw Log-C studio optical frame"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                  style={{ filter: 'contrast(0.84) saturate(0.7) brightness(0.94)' }}
                />
              }
              afterContent={
                <div className="relative w-full h-full">
                  <img
                    src={frameSrc}
                    alt="Live graded studio optical frame"
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none select-none transition-[filter] duration-150"
                    style={{
                      filter: `brightness(${brightnessFactor.toFixed(2)}) contrast(${contrastFactor.toFixed(2)}) saturate(${saturationFactor.toFixed(2)})`,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none transition-colors duration-150"
                    style={{
                      backgroundColor: tintHex,
                      opacity: Number((tintAlpha * 0.32).toFixed(2)),
                      mixBlendMode: 'soft-light',
                    }}
                  />
                </div>
              }
            />
          </div>

          <CustomVideoPlayer
            title="Refractor Optical Glass — 4K Master Timeline"
            poster={assetUrl('src/assets/images/carousel_optical_glass_2_1795197571569.jpg')}
            durationSeconds={186}
            defaultCaptionsEnabled
            captionsText="Live specular highlight roll-off calibrated for Alabaster and Obsidian cinema grades."
            chapters={[
              { id: 'ch-log', title: 'Log-C Opening', timeSeconds: 0 },
              { id: 'ch-caustic', title: 'Caustic Dispersion', timeSeconds: 64 },
              { id: 'ch-export', title: 'Final Mastering', timeSeconds: 132 },
            ]}
            onTimeChange={(sec) => setPlayheadSec(sec)}
            onPlayStateChange={(playing) => setIsPlaying(playing)}
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Audio Stem Bus</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {AUDIO_STEMS.map((stem) => (
                  <TagChip
                    key={stem.id}
                    label={stem.id.toUpperCase()}
                    selected={activeStemId === stem.id}
                    onSelect={() => setActiveStemId(stem.id)}
                  />
                ))}
              </div>
            </div>

            {activeStem ? (
              <AudioWaveformPlayer
                title={activeStem.label}
                subtitle={activeStem.subtitle}
                peaks={activeStem.peaks}
                durationSeconds={activeStem.durationSeconds}
                currentTimeSeconds={playheadSec}
                onSeek={(sec) => setPlayheadSec(sec)}
              />
            ) : null}
          </div>
        </div>

        <div className="@4xl:col-span-5 prism-slab rounded-[24px] p-4 space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 min-w-0">
              <Sliders className="w-4 h-4 text-slate-700 dark:text-slate-200 shrink-0" aria-hidden="true" />
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                Optical Color Grading Deck
              </h5>
            </div>
            <span className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-200 shrink-0">
              {tintHex}
            </span>
          </div>

          <div className="prism-well rounded-2xl p-3 flex flex-wrap items-center justify-around gap-4">
            <RotaryDial
              label="Exposure"
              value={exposure}
              onChange={(val) => {
                setExposure(val);
                setActivePresetId('custom');
              }}
              min={-100}
              max={100}
              step={5}
              unit=" EV"
              size={92}
            />
            <RotaryDial
              label="Contrast"
              value={contrast}
              onChange={(val) => {
                setContrast(val);
                setActivePresetId('custom');
              }}
              min={50}
              max={180}
              step={2}
              unit="%"
              size={92}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScrubbableNumberField
              label="Saturation"
              value={saturation}
              onChange={(val) => {
                setSaturation(val);
                setActivePresetId('custom');
              }}
              min={0}
              max={200}
              step={2}
              precision={0}
              suffix="%"
            />
            <ScrubbableNumberField
              label="White Balance"
              value={tempK}
              onChange={(val) => {
                setTempK(val);
                setActivePresetId('custom');
              }}
              min={2800}
              max={8000}
              step={50}
              precision={0}
              suffix="K"
            />
          </div>

          <ColorPicker
            label="Optical Tint Swatch"
            value={tintHex}
            alpha={tintAlpha}
            presets={['#E75C24', '#38BDF8', '#26BC92', '#7C3AED', '#D97706', '#EC4899']}
            onChange={(hex, alpha) => {
              setTintHex(hex);
              setTintAlpha(alpha);
              setActivePresetId('custom');
            }}
          />

          <div className="prism-crystal rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-200 truncate min-w-0">
              {exportStatus}
            </span>
            <PrimaryButton
              size="sm"
              onClick={() =>
                setExportStatus(
                  `Exported prism_${tintHex.slice(1).toLowerCase()}_lut.cube (${Math.round(tintAlpha * 100)}%)`
                )
              }
            >
              Export LUT
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Mobile Fintech & Spending Companion                                     */
/* -------------------------------------------------------------------------- */

type SpendingCategoryId = 'dining' | 'travel' | 'transit' | 'cloud';
type BankingTabId = 'home' | 'cards' | 'insights' | 'profile';
type TransactionTag = 'Personal' | 'Work' | 'Reimbursable';

interface BankTransaction {
  id: string;
  merchant: string;
  categoryId: SpendingCategoryId;
  categoryLabel: string;
  amount: number;
  time: string;
  tag: TransactionTag;
  disputed: boolean;
}

const SPENDING_SLICES: DonutSlice[] = [
  { id: 'dining', label: 'Dining', value: 740, tone: 'primary' },
  { id: 'travel', label: 'Travel', value: 980, tone: 'secondary' },
  { id: 'transit', label: 'Transit', value: 320, tone: 'emerald' },
  { id: 'cloud', label: 'Cloud', value: 410, tone: 'amber' },
];

const INITIAL_TRANSACTIONS: ReadonlyArray<BankTransaction> = [
  {
    id: 'tx-1',
    merchant: 'Blue Bottle Coffee',
    categoryId: 'dining',
    categoryLabel: 'Dining',
    amount: 14.8,
    time: '08:42 AM',
    tag: 'Personal',
    disputed: false,
  },
  {
    id: 'tx-2',
    merchant: 'Delta Air Lines',
    categoryId: 'travel',
    categoryLabel: 'Travel',
    amount: 428.0,
    time: 'Yesterday',
    tag: 'Work',
    disputed: false,
  },
  {
    id: 'tx-3',
    merchant: 'Waymo Autonomous',
    categoryId: 'transit',
    categoryLabel: 'Transit',
    amount: 26.5,
    time: 'Nov 19',
    tag: 'Reimbursable',
    disputed: false,
  },
  {
    id: 'tx-4',
    merchant: 'Cloudflare Workers',
    categoryId: 'cloud',
    categoryLabel: 'Cloud',
    amount: 64.0,
    time: 'Nov 18',
    tag: 'Work',
    disputed: false,
  },
];

function cycleTransactionTag(current: TransactionTag): TransactionTag {
  if (current === 'Personal') return 'Work';
  if (current === 'Work') return 'Reimbursable';
  return 'Personal';
}

function MobileBankingDashboardScreen() {
  const [activeNav, setActiveNav] = useState<BankingTabId>('home');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [balanceCents, setBalanceCents] = useState(2486040);
  const [syncCount, setSyncCount] = useState(1);
  const [cardFrozen, setCardFrozen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([...INITIAL_TRANSACTIONS]);
  const [statusBanner, setStatusBanner] = useState(
    'Swipe any row right to categorize or left to dispute.'
  );

  const disputedCount = useMemo(
    () => transactions.filter((tx) => tx.disputed).length,
    [transactions]
  );

  const visibleTransactions = useMemo(
    () =>
      selectedCategory
        ? transactions.filter((tx) => tx.categoryId === selectedCategory)
        : transactions,
    [selectedCategory, transactions]
  );

  const handleBankRefresh = async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 260);
    });
    const nextSync = syncCount + 1;
    setSyncCount(nextSync);
    setBalanceCents((prev) => prev + 12500);
    setStatusBanner(`Synced ledger #${nextSync} · Instant interest +$125.00 posted`);
  };

  const handleCategorize = (txId: string) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;
        const nextTag = cycleTransactionTag(tx.tag);
        setStatusBanner(`Tagged ${tx.merchant} as ${nextTag}`);
        return { ...tx, tag: nextTag };
      })
    );
  };

  const handleToggleDispute = (txId: string) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;
        const nextDisputed = !tx.disputed;
        setStatusBanner(
          nextDisputed
            ? `Dispute opened for ${tx.merchant} ($${tx.amount.toFixed(2)})`
            : `Dispute withdrawn for ${tx.merchant}`
        );
        return { ...tx, disputed: nextDisputed };
      })
    );
  };

  const formattedBalance = balanceHidden
    ? '••,•••.••'
    : (balanceCents / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const handleNavChange = (nextId: string) => {
    if (
      nextId === 'home' ||
      nextId === 'cards' ||
      nextId === 'insights' ||
      nextId === 'profile'
    ) {
      setActiveNav(nextId);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="prism-slab rounded-[20px] px-3.5 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Prism Vault
          </p>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            Alex Rivera · Reserve
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <BadgeStatus label={`Sync #${syncCount}`} tone="online" />
          <button
            type="button"
            aria-label={balanceHidden ? 'Show account balance' : 'Hide account balance'}
            onClick={() => setBalanceHidden((prev) => !prev)}
            className="prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {balanceHidden ? (
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <PullToRefresh
        pullLabel="Pull to sync ledger"
        releaseLabel="Release to refresh balances"
        refreshingLabel="Syncing bank rails..."
        onRefresh={handleBankRefresh}
      >
        <div className="space-y-3 p-1">
          {activeNav === 'home' ? (
            <>
              <KpiMetricCard
                label="Available Checking & Yield"
                prefix="$"
                value={formattedBalance}
                deltaPercent={6.4}
                deltaLabel="vs 30d"
                icon={<Wallet className="w-4 h-4" aria-hidden="true" />}
                sparkline={[21200, 21950, 22480, 23100, 23820, 24410, balanceCents / 100]}
              />

              <div className="prism-slab rounded-[20px] p-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  7-Day Cashflow Pulse
                </p>
                <div className="prism-crystal rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Inbound</p>
                    <p className="text-xs font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {balanceHidden ? '+$••••' : '+$4,280'}
                    </p>
                  </div>
                  <SparklineChart
                    values={[420, 560, 490, 740, 610, 680, 780]}
                    variant="line"
                    tone="emerald"
                    width={92}
                    height={26}
                    showDelta
                    ariaLabel="Inbound 7-day cashflow"
                  />
                </div>
                <div className="prism-crystal rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Outbound</p>
                    <p className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {balanceHidden ? '-$••••' : '-$1,640'}
                    </p>
                  </div>
                  <SparklineChart
                    values={[180, 310, 240, 195, 290, 225, 200]}
                    variant="bar"
                    tone="primary"
                    width={92}
                    height={26}
                    showDelta
                    ariaLabel="Outbound 7-day cashflow"
                  />
                </div>
              </div>

              <DonutPieChart
                title="Nov Spending Mix"
                centerLabel="Spent"
                centerValue="$2.45k"
                valueUnit=""
                size={140}
                slices={SPENDING_SLICES}
                onSelectSlice={(slice) => {
                  setSelectedCategory((prev) => (prev === slice.id ? null : slice.id));
                  setStatusBanner(`Filtered transactions by ${slice.label}`);
                }}
              />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Recent Activity ({visibleTransactions.length})
                  </span>
                  {selectedCategory ? (
                    <TagChip
                      label={selectedCategory}
                      selected
                      onDismiss={() => setSelectedCategory(null)}
                    />
                  ) : null}
                </div>

                <div className="prism-well rounded-xl px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-200">
                  {statusBanner}
                </div>

                <div className="space-y-2">
                  {visibleTransactions.map((tx) => (
                    <SwipeableActionRow
                      key={tx.id}
                      leftActions={[
                        {
                          id: 'categorize',
                          label: 'Tag',
                          tone: 'emerald',
                          icon: <Tag className="w-3.5 h-3.5" aria-hidden="true" />,
                          onTrigger: () => handleCategorize(tx.id),
                        },
                      ]}
                      rightActions={[
                        {
                          id: 'dispute',
                          label: tx.disputed ? 'Clear' : 'Dispute',
                          tone: 'rose',
                          icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
                          onTrigger: () => handleToggleDispute(tx.id),
                        },
                      ]}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {tx.merchant}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {tx.categoryLabel} · {tx.time}
                            </span>
                            <span className="prism-well rounded-full px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
                              {tx.tag}
                            </span>
                            {tx.disputed ? (
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                                Disputed
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                          -${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </SwipeableActionRow>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeNav === 'cards' ? (
            <div className="space-y-3">
              <div className="prism-slab rounded-[22px] p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Prism Metal Virtual
                  </span>
                  <BadgeStatus
                    label={cardFrozen ? 'Frozen' : 'Active'}
                    tone={cardFrozen ? 'warning' : 'online'}
                  />
                </div>
                <p className="text-base font-mono tracking-widest font-semibold text-slate-900 dark:text-white">
                  4532 •••• •••• 4829
                </p>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>EXP 09/29</span>
                  <span className="font-mono">Limit $12,000</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PrimaryButton
                  size="sm"
                  onClick={() => setCardFrozen((prev) => !prev)}
                  className="flex-1"
                >
                  {cardFrozen ? 'Unfreeze Card' : 'Freeze Card'}
                </PrimaryButton>
                <SecondaryButton
                  size="sm"
                  onClick={() => setActiveNav('home')}
                  className="flex-1"
                >
                  Back to Ledger
                </SecondaryButton>
              </div>
            </div>
          ) : null}

          {activeNav === 'insights' ? (
            <div className="space-y-3">
              <DonutPieChart
                title="Category Breakdown"
                variant="pie"
                valueUnit=""
                size={140}
                slices={SPENDING_SLICES}
              />
              <div className="prism-crystal rounded-2xl p-3.5 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Monthly Burn Pace: 11% Under Target
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Auto-sweep transfers $850 into 4.85% APY Treasury Vault on Nov 30.
                </p>
              </div>
            </div>
          ) : null}

          {activeNav === 'profile' ? (
            <div className="prism-slab rounded-[20px] p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="prism-emerald w-9 h-9 rounded-full inline-flex items-center justify-center font-bold">
                  AR
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Alex Rivera</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Prism Reserve · Biometric Passkey Enabled
                  </p>
                </div>
              </div>
              <div className="prism-well rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-300">Disputed charges</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {disputedCount}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <BottomNavigationBar
        mode="inline"
        activeId={activeNav}
        onChange={handleNavChange}
        ariaLabel="Mobile banking navigation"
        items={[
          {
            id: 'home',
            label: 'Home',
            icon: <Home className="w-4 h-4" aria-hidden="true" />,
            badgeCount: disputedCount > 0 ? disputedCount : undefined,
          },
          {
            id: 'cards',
            label: 'Cards',
            icon: <CreditCard className="w-4 h-4" aria-hidden="true" />,
          },
          {
            id: 'insights',
            label: 'Insights',
            icon: <PieChart className="w-4 h-4" aria-hidden="true" />,
          },
          {
            id: 'profile',
            label: 'Profile',
            icon: <User className="w-4 h-4" aria-hidden="true" />,
          },
        ]}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Mobile Notification Inbox & Support Triage                              */
/* -------------------------------------------------------------------------- */

type InboxNavId = 'inbox' | 'mentions' | 'alerts' | 'settings';

interface SupportTriageItem {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  time: string;
  priority: 'Urgent' | 'Normal';
  unread: boolean;
}

const INITIAL_TRIAGE_QUEUE: ReadonlyArray<SupportTriageItem> = [
  {
    id: 'tr-1',
    sender: 'Nadia Patel · Enterprise',
    subject: 'SSO SAML rotation window',
    snippet: 'Confirming Friday 18:00 UTC certificate cutover checklist.',
    time: '3m',
    priority: 'Urgent',
    unread: true,
  },
  {
    id: 'tr-2',
    sender: 'Marcus Chen',
    subject: 'Mobile swipe threshold QA',
    snippet: 'Verified 56px gesture lock feels great on one-handed reach.',
    time: '19m',
    priority: 'Normal',
    unread: true,
  },
  {
    id: 'tr-3',
    sender: 'Billing Escalation Bot',
    subject: 'Invoice #8841 ACH cleared',
    snippet: 'Automatic seat expansion approved for 120 workspace editors.',
    time: '48m',
    priority: 'Normal',
    unread: false,
  },
];

const INITIAL_FEED_NOTIFICATIONS: ReadonlyArray<NotificationItem> = [
  {
    id: 'nf-1',
    title: '@elena mentioned you in Support #412',
    message: 'Can you confirm the SLA response banner copy before 2pm?',
    timestamp: '5m ago',
    category: 'mention',
    tone: 'mention',
    read: false,
    actor: 'Elena Vance',
    actions: [{ id: 'reply', label: 'Quick Reply', tone: 'primary' }],
  },
  {
    id: 'nf-2',
    title: 'EU-West P99 Latency Normalized',
    message: 'Edge cache hit rate recovered to 99.3% across Frankfurt POPs.',
    timestamp: '22m ago',
    category: 'alert',
    tone: 'success',
    read: false,
    actor: 'Edge Telemetry',
    actions: [{ id: 'ack', label: 'Acknowledge', tone: 'crystal' }],
  },
  {
    id: 'nf-3',
    title: 'Weekly Triage SLA Report',
    message: 'Median first-response time improved to 4m 18s across tier-1.',
    timestamp: '2h ago',
    category: 'system',
    tone: 'info',
    read: true,
    actor: 'Refractor Ops',
  },
];

function MobileInboxNotificationsScreen() {
  const [activeNav, setActiveNav] = useState<InboxNavId>('inbox');
  const [queue, setQueue] = useState<SupportTriageItem[]>([...INITIAL_TRIAGE_QUEUE]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['tr-1']);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    ...INITIAL_FEED_NOTIFICATIONS,
  ]);
  const [lastTriaged, setLastTriaged] = useState<{
    item: SupportTriageItem;
    action: 'Archived' | 'Snoozed';
  } | null>(null);
  const [triageBanner, setTriageBanner] = useState(
    'Swipe cards to Archive or Snooze, or bulk-select with the tri-state header.'
  );
  const [quietHoursOn, setQuietHoursOn] = useState(true);

  const validSelectedCount = useMemo(
    () => selectedIds.filter((id) => queue.some((item) => item.id === id)).length,
    [queue, selectedIds]
  );

  const triState: TriCheckboxState =
    queue.length > 0 && validSelectedCount === queue.length
      ? 'checked'
      : validSelectedCount > 0
        ? 'indeterminate'
        : 'unchecked';

  const unreadMentions = useMemo(
    () => notifications.filter((n) => n.category === 'mention' && !n.read).length,
    [notifications]
  );

  const unreadAlerts = useMemo(
    () => notifications.filter((n) => n.category === 'alert' && !n.read).length,
    [notifications]
  );

  const handleTriStateToggle = (next: TriCheckboxState) => {
    if (next === 'checked') {
      setSelectedIds(queue.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const triageSingle = (id: string, action: 'Archived' | 'Snoozed') => {
    const target = queue.find((item) => item.id === id);
    if (!target) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    setLastTriaged({ item: target, action });
    setTriageBanner(`${action}: ${target.subject}`);
  };

  const handleBulkAction = (action: 'Archived' | 'Snoozed') => {
    const activeSet = new Set(selectedIds);
    const removedCount = queue.filter((item) => activeSet.has(item.id)).length;
    if (removedCount === 0) return;
    setQueue((prev) => prev.filter((item) => !activeSet.has(item.id)));
    setSelectedIds([]);
    setLastTriaged(null);
    setTriageBanner(`${action} ${removedCount} selected thread${removedCount === 1 ? '' : 's'}`);
  };

  const handleUndo = () => {
    if (!lastTriaged) return;
    setQueue((prev) => [lastTriaged.item, ...prev]);
    setTriageBanner(`Restored "${lastTriaged.item.subject}" to inbox`);
    setLastTriaged(null);
  };

  const handleRefresh = async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 240);
    });
    if (queue.length === 0) {
      setQueue([...INITIAL_TRIAGE_QUEUE]);
      setTriageBanner('Refreshed queue · 3 support threads synced');
    } else {
      setTriageBanner('Inbox up to date · Zero missed SLA escalations');
    }
  };

  const handleNavChange = (nextId: string) => {
    if (
      nextId === 'inbox' ||
      nextId === 'mentions' ||
      nextId === 'alerts' ||
      nextId === 'settings'
    ) {
      setActiveNav(nextId);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="prism-slab rounded-[20px] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Support Triage
            </p>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              Mobile Notification Inbox
            </h4>
          </div>
          <BadgeStatus label={`${queue.length} open`} tone={queue.length > 0 ? 'counter' : 'online'} />
        </div>

        <TriStateCheckbox
          label="Bulk select triage queue"
          state={triState}
          selectedCount={validSelectedCount}
          totalCount={Math.max(queue.length, 1)}
          disabled={queue.length === 0}
          onChange={handleTriStateToggle}
        />

        {validSelectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <SecondaryButton
              size="sm"
              leadingIcon={<Archive className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => handleBulkAction('Archived')}
            >
              Archive ({validSelectedCount})
            </SecondaryButton>
            <SecondaryButton
              size="sm"
              leadingIcon={<Clock className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => handleBulkAction('Snoozed')}
            >
              Snooze 2h
            </SecondaryButton>
          </div>
        ) : null}

        <div className="prism-well rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-200">
          <span className="truncate min-w-0">{triageBanner}</span>
          {lastTriaged ? (
            <button
              type="button"
              onClick={handleUndo}
              className="prism-focus-ring font-semibold text-orange-600 dark:text-orange-400 shrink-0 cursor-pointer"
            >
              Undo
            </button>
          ) : null}
        </div>
      </div>

      <PullToRefresh
        pullLabel="Pull to check new tickets"
        releaseLabel="Release to refresh inbox"
        refreshingLabel="Syncing triage queue..."
        onRefresh={handleRefresh}
      >
        <div className="space-y-3 p-1">
          {activeNav === 'inbox' ? (
            <>
              {queue.length === 0 ? (
                <div className="prism-crystal rounded-2xl p-4 text-center space-y-2.5">
                  <CheckCircle2
                    className="w-7 h-7 mx-auto text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Inbox Zero Achieved
                  </p>
                  <SecondaryButton
                    size="sm"
                    onClick={() => {
                      setQueue([...INITIAL_TRIAGE_QUEUE]);
                      setSelectedIds(['tr-1']);
                      setTriageBanner('Restored sample triage threads');
                    }}
                  >
                    Restore Sample Queue
                  </SecondaryButton>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <SwipeableActionRow
                        key={item.id}
                        leftActions={[
                          {
                            id: 'snooze',
                            label: 'Snooze',
                            tone: 'amber',
                            icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
                            onTrigger: () => triageSingle(item.id, 'Snoozed'),
                          },
                        ]}
                        rightActions={[
                          {
                            id: 'archive',
                            label: 'Archive',
                            tone: 'emerald',
                            icon: <Archive className="w-3.5 h-3.5" aria-hidden="true" />,
                            onTrigger: () => triageSingle(item.id, 'Archived'),
                          },
                        ]}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`Select ${item.subject}`}
                            onClick={() => toggleItemSelection(item.id)}
                            className={`prism-focus-ring mt-0.5 w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              isSelected
                                ? 'prism-emerald text-white'
                                : 'prism-well text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" aria-hidden="true" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {item.sender}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                {item.time}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.subject}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                              {item.snippet}
                            </p>
                          </div>
                        </div>
                      </SwipeableActionRow>
                    );
                  })}
                </div>
              )}

              <NotificationCenter
                mode="inline"
                title="Live Activity Stream"
                items={notifications}
                onItemsChange={setNotifications}
                onActionClick={(item, actionId) =>
                  setTriageBanner(`Executed "${actionId}" on "${item.title}"`)
                }
              />
            </>
          ) : null}

          {activeNav === 'mentions' ? (
            <NotificationCenter
              mode="inline"
              title="Direct @Mentions"
              items={notifications.filter((n) => n.category === 'mention')}
              onItemsChange={(nextMentions) => {
                const others = notifications.filter((n) => n.category !== 'mention');
                setNotifications([...nextMentions, ...others]);
              }}
              onActionClick={(item, actionId) =>
                setTriageBanner(`Replied (${actionId}) to ${item.actor ?? item.title}`)
              }
            />
          ) : null}

          {activeNav === 'alerts' ? (
            <NotificationCenter
              mode="inline"
              title="SLA & System Alerts"
              items={notifications.filter((n) => n.category !== 'mention')}
              onItemsChange={(nextAlerts) => {
                const mentions = notifications.filter((n) => n.category === 'mention');
                setNotifications([...mentions, ...nextAlerts]);
              }}
              onActionClick={(item) => setTriageBanner(`Acknowledged alert: ${item.title}`)}
            />
          ) : null}

          {activeNav === 'settings' ? (
            <div className="prism-slab rounded-[20px] p-3.5 space-y-3 text-xs">
              <p className="font-semibold text-slate-900 dark:text-white">
                Thumb Triage Preferences
              </p>
              <div className="prism-crystal rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Quiet Hours Digest</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    22:00 – 07:00 local · Urgent P1 bypass
                  </p>
                </div>
                <SecondaryButton
                  size="sm"
                  onClick={() => setQuietHoursOn((prev) => !prev)}
                >
                  {quietHoursOn ? 'On' : 'Off'}
                </SecondaryButton>
              </div>
            </div>
          ) : null}
        </div>
      </PullToRefresh>

      <BottomNavigationBar
        mode="inline"
        activeId={activeNav}
        onChange={handleNavChange}
        ariaLabel="Mobile inbox navigation"
        items={[
          {
            id: 'inbox',
            label: 'Inbox',
            icon: <Inbox className="w-4 h-4" aria-hidden="true" />,
            badgeCount: queue.length > 0 ? queue.length : undefined,
          },
          {
            id: 'mentions',
            label: 'Mentions',
            icon: <AtSign className="w-4 h-4" aria-hidden="true" />,
            badgeCount: unreadMentions > 0 ? unreadMentions : undefined,
          },
          {
            id: 'alerts',
            label: 'Alerts',
            icon: <Bell className="w-4 h-4" aria-hidden="true" />,
            badgeCount: unreadAlerts > 0 ? unreadAlerts : undefined,
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <Settings className="w-4 h-4" aria-hidden="true" />,
          },
        ]}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Tablet Master-Detail & Geospatial Dispatch Console                      */
/* -------------------------------------------------------------------------- */

interface DispatchTicket extends MasterDetailItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  meta: string;
  siteCode: string;
  technician: string;
  address: string;
  pinId: string;
  arrivalIso: string;
  timezone: string;
  recurrence: RecurrenceRule;
  recurrenceSummary: string;
  recurrenceCron: string;
  signedAt: string | null;
  signatureSvgUrl: string | null;
}

const DISPATCH_MAP_PINS: ReadonlyArray<SpatialMapPin> = [
  {
    id: 'pin-bayview',
    label: 'Bayview Optical Substation',
    description: 'DSP-401 · Priority P1 · Optical splice alignment',
    x: 24,
    y: 48,
    category: 'P1 Dispatch',
  },
  {
    id: 'pin-marin',
    label: 'Marin Relay Tower #14',
    description: 'DSP-402 · Scheduled microwave transceiver calibration',
    x: 36,
    y: 26,
    category: 'Relay',
  },
  {
    id: 'pin-oakland',
    label: 'Oakland Harbor Fiber Node',
    description: 'DSP-403 · On-site marine enclosure pressure check',
    x: 56,
    y: 52,
    category: 'Fiber Node',
    clusterCount: 2,
  },
  {
    id: 'pin-denver',
    label: 'Denver High-Altitude Array',
    description: 'DSP-404 · Preventive winter thermal sweep',
    x: 80,
    y: 38,
    category: 'Regional Hub',
  },
];

const DISPATCH_MAP_ROUTES: ReadonlyArray<MapRoute> = [
  { id: 'rt-1', fromPinId: 'pin-bayview', toPinId: 'pin-marin', label: 'North Loop' },
  { id: 'rt-2', fromPinId: 'pin-bayview', toPinId: 'pin-oakland', label: 'Bay Crossing' },
  { id: 'rt-3', fromPinId: 'pin-oakland', toPinId: 'pin-denver', label: 'Mountain Trunk' },
];

const INITIAL_DISPATCH_TICKETS: ReadonlyArray<DispatchTicket> = [
  {
    id: 'dsp-401',
    title: 'Bayview Optical Substation',
    subtitle: 'Unit 04 · Maya Lin',
    badge: 'P1 Active',
    meta: 'DSP-401',
    siteCode: 'SFO-BV-04',
    technician: 'Maya Lin',
    address: '1420 Evans Ave, San Francisco, CA',
    pinId: 'pin-bayview',
    arrivalIso: '2026-11-21T10:30',
    timezone: 'America/Los_Angeles',
    recurrence: {
      frequency: 'weekly',
      interval: 2,
      weekdays: [1, 4],
      monthDay: 1,
      hour: 10,
      minute: 30,
      endKind: 'never',
    },
    recurrenceSummary: 'Every 2 weeks on Mon, Thu at 10:30',
    recurrenceCron: '30 10 * * 1,4',
    signedAt: null,
    signatureSvgUrl: null,
  },
  {
    id: 'dsp-402',
    title: 'Marin Relay Tower #14',
    subtitle: 'Unit 09 · Marcus Chen',
    badge: 'Scheduled',
    meta: 'DSP-402',
    siteCode: 'MRN-RT-14',
    technician: 'Marcus Chen',
    address: 'Ridgecrest Blvd Mile 4, Mill Valley, CA',
    pinId: 'pin-marin',
    arrivalIso: '2026-11-21T14:00',
    timezone: 'America/Los_Angeles',
    recurrence: {
      frequency: 'monthly',
      interval: 1,
      weekdays: [2],
      monthDay: 15,
      hour: 14,
      minute: 0,
      endKind: 'count',
      count: 6,
    },
    recurrenceSummary: 'Monthly on day 15 at 14:00 (6 occurrences)',
    recurrenceCron: '0 14 15 * *',
    signedAt: null,
    signatureSvgUrl: null,
  },
  {
    id: 'dsp-403',
    title: 'Oakland Harbor Fiber Node',
    subtitle: 'Unit 12 · Devon Park',
    badge: 'On Site',
    meta: 'DSP-403',
    siteCode: 'OAK-HF-07',
    technician: 'Devon Park',
    address: '700 Maritime St, Oakland, CA',
    pinId: 'pin-oakland',
    arrivalIso: '2026-11-22T09:15',
    timezone: 'America/Los_Angeles',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [3],
      monthDay: 1,
      hour: 9,
      minute: 15,
      endKind: 'until',
      untilDate: '2027-03-31',
    },
    recurrenceSummary: 'Weekly on Wed at 09:15 until 2027-03-31',
    recurrenceCron: '15 9 * * 3',
    signedAt: null,
    signatureSvgUrl: null,
  },
  {
    id: 'dsp-404',
    title: 'Denver High-Altitude Array',
    subtitle: 'Unit 18 · Sora Takahashi',
    badge: 'Planned',
    meta: 'DSP-404',
    siteCode: 'DEN-HA-02',
    technician: 'Sora Takahashi',
    address: '3900 Peña Blvd, Denver, CO',
    pinId: 'pin-denver',
    arrivalIso: '2026-11-24T08:45',
    timezone: 'America/Denver',
    recurrence: {
      frequency: 'monthly',
      interval: 1,
      weekdays: [1],
      monthDay: 1,
      hour: 8,
      minute: 45,
      endKind: 'never',
    },
    recurrenceSummary: 'Monthly on day 1 at 08:45',
    recurrenceCron: '45 8 1 * *',
    signedAt: null,
    signatureSvgUrl: null,
  },
];

type DispatchDetailTab = 'map' | 'schedule' | 'signoff';

function TabletFieldOperationsScreen() {
  const [tickets, setTickets] = useState<DispatchTicket[]>([...INITIAL_DISPATCH_TICKETS]);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_DISPATCH_TICKETS[0]?.id ?? null);
  const [detailTab, setDetailTab] = useState<DispatchDetailTab>('map');

  const signedCount = useMemo(
    () => tickets.filter((ticket) => ticket.signedAt !== null).length,
    [tickets]
  );

  const updateTicket = (ticketId: string, updater: (prev: DispatchTicket) => DispatchTicket) => {
    setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updater(ticket) : ticket)));
  };

  const handleDetailTabChange = (nextId: string) => {
    if (nextId === 'map' || nextId === 'schedule' || nextId === 'signoff') {
      setDetailTab(nextId);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-3.5">
      <div className="prism-slab rounded-[22px] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="prism-crystal w-9 h-9 rounded-2xl inline-flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0">
            <Wrench className="w-4 h-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Geospatial Field Dispatch
            </p>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              Pacific & Mountain Grid Operations
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <BadgeStatus label={`${tickets.length} Active Dispatches`} tone="online" />
          <span className="prism-well rounded-full px-3 py-1 text-xs font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            {signedCount}/{tickets.length} Signed Off
          </span>
        </div>
      </div>

      <MasterDetailView
        masterTitle="Service Dispatches"
        masterWidthPx={216}
        searchPlaceholder="Filter site or ID..."
        items={tickets}
        selectedId={selectedId}
        onSelectItem={(item) => setSelectedId(item.id)}
        renderDetail={(ticket) => (
          <div className="space-y-3.5 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-300/45 dark:border-slate-700/55 pb-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {ticket.meta} · {ticket.siteCode}
                  </span>
                  <BadgeStatus
                    label={ticket.signedAt ? 'Customer Signed' : ticket.badge}
                    tone={ticket.signedAt ? 'online' : 'warning'}
                  />
                </div>
                <h5 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {ticket.title}
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ticket.address}</span>
                </p>
              </div>

              <span className="prism-crystal rounded-full px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0">
                Tech: {ticket.technician}
              </span>
            </div>

            <PrismTabs
              activeTabId={detailTab}
              onChange={handleDetailTabChange}
              tabs={[
                {
                  id: 'map',
                  label: 'Map & Site',
                  content: (
                    <div className="space-y-3">
                      <InteractiveMapViewer
                        pins={DISPATCH_MAP_PINS}
                        routes={DISPATCH_MAP_ROUTES}
                        selectedPinId={ticket.pinId}
                        heightPx={245}
                        onSelectPin={(pin) => {
                          if (!pin) return;
                          const matched = tickets.find((entry) => entry.pinId === pin.id);
                          if (matched) {
                            setSelectedId(matched.id);
                          }
                        }}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="prism-crystal rounded-2xl p-3 space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            <span>Arrival Window</span>
                          </span>
                          <p className="font-mono font-semibold text-slate-900 dark:text-white">
                            {ticket.arrivalIso.replace('T', ' ')}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {ticket.timezone}
                          </p>
                        </div>

                        <div className="prism-crystal rounded-2xl p-3 space-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                            <Layers className="w-3 h-3" aria-hidden="true" />
                            <span>Maintenance Cadence</span>
                          </span>
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {ticket.recurrenceSummary}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            cron: {ticket.recurrenceCron}
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'schedule',
                  label: 'Arrival & Cadence',
                  content: (
                    <div className="space-y-3.5">
                      <CombinedDateTimePicker
                        label="Arrival Window"
                        clockFormat="12h"
                        value={ticket.arrivalIso}
                        onChange={(iso) =>
                          updateTicket(ticket.id, (prev) => ({ ...prev, arrivalIso: iso }))
                        }
                      />

                      <TimezoneSelector
                        label="Site Local Timezone"
                        value={ticket.timezone}
                        onChange={(tzId) =>
                          updateTicket(ticket.id, (prev) => ({ ...prev, timezone: tzId }))
                        }
                      />

                      <RecurrenceBuilder
                        label="Preventive Maintenance Cadence"
                        value={ticket.recurrence}
                        onChange={(rule, cron, summary) =>
                          updateTicket(ticket.id, (prev) => ({
                            ...prev,
                            recurrence: rule,
                            recurrenceCron: cron,
                            recurrenceSummary: summary,
                          }))
                        }
                      />
                    </div>
                  ),
                },
                {
                  id: 'signoff',
                  label: ticket.signedAt ? 'Signed ✓' : 'Customer Sign-Off',
                  content: (
                    <div className="space-y-3">
                      <div className="prism-crystal rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            Work Order Verification · {ticket.meta}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Window: {ticket.arrivalIso.replace('T', ' ')} ({ticket.timezone})
                          </p>
                        </div>
                        <span className="prism-well rounded-full px-2.5 py-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                          {ticket.siteCode}
                        </span>
                      </div>

                      {ticket.signedAt && ticket.signatureSvgUrl ? (
                        <div className="prism-slab rounded-2xl p-3.5 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="prism-emerald rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Customer Sign-Off Verified ({ticket.signedAt})</span>
                            </span>
                            <SecondaryButton
                              size="sm"
                              onClick={() =>
                                updateTicket(ticket.id, (prev) => ({
                                  ...prev,
                                  signedAt: null,
                                  signatureSvgUrl: null,
                                  badge: 'Pending Sign',
                                }))
                              }
                            >
                              Re-capture
                            </SecondaryButton>
                          </div>
                          <div className="prism-well rounded-xl p-2 bg-white/75 dark:bg-slate-900/75">
                            <img
                              src={ticket.signatureSvgUrl}
                              alt={`Captured customer signature for ${ticket.title}`}
                              className="w-full h-24 object-contain"
                            />
                          </div>
                        </div>
                      ) : null}

                      <SignaturePad
                        key={ticket.id}
                        label="On-Site Customer Sign-Off"
                        placeholder="Customer signs inside frosted glass pad"
                        width={400}
                        height={145}
                        onSave={(data: SignatureExportData) =>
                          updateTicket(ticket.id, (prev) => ({
                            ...prev,
                            signedAt: 'Captured just now',
                            signatureSvgUrl: data.svgDataUrl,
                            badge: 'Signed',
                          }))
                        }
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Standalone Copy-Pasteable Full TSX Code Snippets                           */
/* -------------------------------------------------------------------------- */

const PROJECT_KANBAN_FULL_CODE = `import { useState } from 'react';
import {
  BadgeStatus, CalendarHeatmap, GanttChart, KanbanBoard,
  type KanbanCardItem, LivePresenceIndicator, type PresenceUser, PrismTabs,
} from '@refractor-ui/core';

const USERS: ReadonlyArray<PresenceUser> = [
  { id: 'u1', name: 'Elena Vance', role: 'Design Director', status: 'editing', activity: 'Specular rim audit' },
  { id: 'u2', name: 'Marcus Chen', role: 'Staff Engineer', status: 'online', activity: 'Kanban WIP parity' },
  { id: 'u3', name: 'Maya Lin', role: 'Core UI Lead', status: 'viewing', activity: 'Gantt roadmap' },
];

const INITIAL_CARDS: KanbanCardItem[] = [
  { id: 'c1', columnId: 'backlog', title: 'Audit dark-mode contrast', assignee: 'Elena Vance', priority: 'high', tags: ['WCAG'] },
  { id: 'c2', columnId: 'progress', title: 'Ship Gantt dependency arcs', assignee: 'Maya Lin', priority: 'critical', tags: ['Viz'] },
  { id: 'c3', columnId: 'done', title: 'Publish v2.2 token cascade', assignee: 'Marcus Chen', priority: 'low', tags: ['Release'] },
];

export function ProjectKanbanRoadmapHub() {
  const [tab, setTab] = useState<'kanban' | 'gantt' | 'velocity'>('kanban');
  const [cards, setCards] = useState<KanbanCardItem[]>(INITIAL_CARDS);

  return (
    <section className="space-y-4">
      <header className="prism-slab rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold">Cycle 18 · Prism Engine v2.2</h2>
          <BadgeStatus label="Sprint Live" tone="online" />
        </div>
        <LivePresenceIndicator users={USERS} maxVisible={4} size="sm" />
      </header>
      <PrismTabs
        activeTabId={tab}
        onChange={(id) => {
          if (id === 'kanban' || id === 'gantt' || id === 'velocity') setTab(id);
        }}
        tabs={[
          {
            id: 'kanban',
            label: 'Sprint Board',
            content: (
              <KanbanBoard
                columns={[
                  { id: 'backlog', title: 'Backlog', wipLimit: 5 },
                  { id: 'progress', title: 'In Progress', wipLimit: 2 },
                  { id: 'done', title: 'Shipped' },
                ]}
                cards={cards}
                onCardsChange={setCards}
              />
            ),
          },
          {
            id: 'gantt',
            label: 'Timeline Roadmap',
            content: (
              <GanttChart
                todayIso="2026-11-18"
                tasks={[
                  { id: 't1', title: 'Optical Token Cascade', assignee: 'Elena Vance', startDate: '2026-11-02', endDate: '2026-11-08', progress: 100, tone: 'emerald' },
                  { id: 't2', title: 'Gantt Dependency Lines', assignee: 'Maya Lin', startDate: '2026-11-09', endDate: '2026-11-20', progress: 78, dependencies: ['t1'], tone: 'primary' },
                ]}
              />
            ),
          },
          {
            id: 'velocity',
            label: 'Commit Velocity',
            content: (
              <CalendarHeatmap
                title="Daily Engineering Velocity"
                weeks={12}
                endDate="2026-11-21"
                valueUnit="commits"
                entries={[{ date: '2026-11-11', count: 14 }, { date: '2026-11-21', count: 18 }]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}`;

const CREATIVE_MEDIA_FULL_CODE = `import { useState } from 'react';
import {
  AudioWaveformPlayer,
  BeforeAfterSlider,
  ColorPicker,
  CustomVideoPlayer,
  RotaryDial,
  ScrubbableNumberField,
} from '@refractor-ui/core';

const AUDIO_PEAKS: ReadonlyArray<number> = [
  0.24, 0.48, 0.72, 0.58, 0.9, 0.76, 0.44, 0.66, 0.94, 0.82, 0.52, 0.36, 0.74, 0.92, 0.68, 0.5,
];

export function CreativeMediaGradingStudio() {
  const [exposure, setExposure] = useState(14);
  const [contrast, setContrast] = useState(118);
  const [saturation, setSaturation] = useState(124);
  const [tintHex, setTintHex] = useState('#E75C24');
  const [tintAlpha, setTintAlpha] = useState(0.35);
  const [playheadSec, setPlayheadSec] = useState(48);

  const filterCss = \`brightness(\${(1 + exposure / 120).toFixed(2)}) contrast(\${(contrast / 100).toFixed(2)}) saturate(\${(saturation / 100).toFixed(2)})\`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7 space-y-4">
        <BeforeAfterSlider
          beforeLabel="Raw Log-C"
          afterLabel="Live Grade"
          heightPx={240}
          beforeContent={<img src="/media/frame-raw.jpg" alt="Raw frame" className="w-full h-full object-cover" />}
          afterContent={
            <div className="relative w-full h-full">
              <img src="/media/frame-raw.jpg" alt="Graded frame" className="w-full h-full object-cover" style={{ filter: filterCss }} />
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: tintHex, opacity: tintAlpha * 0.3, mixBlendMode: 'soft-light' }} />
            </div>
          }
        />

        <CustomVideoPlayer
          title="Master Reel (4K ProRes)"
          poster="/media/reel-poster.jpg"
          durationSeconds={186}
          defaultCaptionsEnabled
          chapters={[
            { id: 'c1', title: 'Log-C Opening', timeSeconds: 0 },
            { id: 'c2', title: 'Caustic Pass', timeSeconds: 64 },
          ]}
          onTimeChange={setPlayheadSec}
        />

        <AudioWaveformPlayer
          title="Master Mix — 48kHz"
          peaks={AUDIO_PEAKS}
          durationSeconds={186}
          currentTimeSeconds={playheadSec}
          onSeek={setPlayheadSec}
        />
      </div>

      <aside className="lg:col-span-5 prism-slab rounded-[24px] p-4 space-y-4">
        <div className="prism-well rounded-2xl p-3 flex flex-wrap justify-around gap-4">
          <RotaryDial label="Exposure" value={exposure} onChange={setExposure} min={-100} max={100} step={5} unit=" EV" />
          <RotaryDial label="Contrast" value={contrast} onChange={setContrast} min={50} max={180} step={2} unit="%" />
        </div>
        <ScrubbableNumberField label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} step={2} precision={0} suffix="%" />
        <ColorPicker
          label="Optical Tint Swatch"
          value={tintHex}
          alpha={tintAlpha}
          onChange={(hex, alpha) => {
            setTintHex(hex);
            setTintAlpha(alpha);
          }}
        />
      </aside>
    </div>
  );
}`;

const MOBILE_BANKING_FULL_CODE = `import { useState } from 'react';
import { CreditCard, Home, PieChart, User } from 'lucide-react';
import {
  BottomNavigationBar, DonutPieChart, KpiMetricCard,
  PullToRefresh, SparklineChart, SwipeableActionRow,
} from '@refractor-ui/core';

interface TransactionItem {
  id: string;
  merchant: string;
  amount: number;
  tag: 'Personal' | 'Work';
  disputed: boolean;
}

export function MobileFintechCompanion() {
  const [nav, setNav] = useState('home');
  const [balance, setBalance] = useState(24860.4);
  const [rows, setRows] = useState<TransactionItem[]>([
    { id: 'tx1', merchant: 'Blue Bottle Coffee', amount: 14.8, tag: 'Personal', disputed: false },
    { id: 'tx2', merchant: 'Delta Air Lines', amount: 428.0, tag: 'Work', disputed: false },
  ]);

  const handleRefresh = async () => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
    setBalance((prev) => prev + 125);
  };
  const toggleTag = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, tag: r.tag === 'Work' ? 'Personal' : 'Work' } : r)));
  const toggleDispute = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, disputed: !r.disputed } : r)));

  return (
    <div className="max-w-[390px] mx-auto space-y-3">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3 p-1">
          <KpiMetricCard
            label="Available Balance"
            prefix="$"
            value={balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            deltaPercent={6.4}
            deltaLabel="vs 30d"
            sparkline={[21200, 22480, 23100, 23820, balance]}
          />
          <div className="prism-crystal rounded-2xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold">7-Day Cashflow</span>
            <SparklineChart values={[420, 560, 490, 740, 680, 780]} variant="line" tone="emerald" showDelta />
          </div>
          <DonutPieChart
            title="Nov Spending Mix"
            centerLabel="Spent"
            size={140}
            slices={[
              { id: 'dining', label: 'Dining', value: 740, tone: 'primary' },
              { id: 'travel', label: 'Travel', value: 980, tone: 'secondary' },
              { id: 'transit', label: 'Transit', value: 320, tone: 'emerald' },
            ]}
          />
          {rows.map((tx) => (
            <SwipeableActionRow
              key={tx.id}
              leftActions={[{ id: 'tag', label: 'Tag', tone: 'emerald', onTrigger: () => toggleTag(tx.id) }]}
              rightActions={[{ id: 'dispute', label: 'Dispute', tone: 'rose', onTrigger: () => toggleDispute(tx.id) }]}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{tx.merchant} ({tx.tag})</span>
                <span className="font-mono font-bold">-\${tx.amount.toFixed(2)}</span>
              </div>
            </SwipeableActionRow>
          ))}
        </div>
      </PullToRefresh>
      <BottomNavigationBar
        mode="inline"
        activeId={nav}
        onChange={setNav}
        items={[
          { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
          { id: 'cards', label: 'Cards', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'insights', label: 'Insights', icon: <PieChart className="w-4 h-4" /> },
          { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
        ]}
      />
    </div>
  );
}`;

const MOBILE_INBOX_FULL_CODE = `import { useState } from 'react';
import { Archive, AtSign, Bell, Clock, Inbox, Settings } from 'lucide-react';
import {
  BottomNavigationBar,
  NotificationCenter,
  type NotificationItem,
  PullToRefresh,
  SwipeableActionRow,
  type TriCheckboxState,
  TriStateCheckbox,
} from '@refractor-ui/core';

interface TriageThread {
  id: string;
  sender: string;
  subject: string;
}

export function MobileInboxTriageApp() {
  const [nav, setNav] = useState('inbox');
  const [threads, setThreads] = useState<TriageThread[]>([
    { id: 't1', sender: 'Nadia Patel', subject: 'SSO SAML rotation window' },
    { id: 't2', sender: 'Marcus Chen', subject: 'Mobile swipe threshold QA' },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['t1']);
  const [feed, setFeed] = useState<NotificationItem[]>([
    { id: 'n1', title: '@elena mentioned you', message: 'Confirm SLA banner copy.', timestamp: '5m ago', category: 'mention', tone: 'mention', read: false },
  ]);

  const triState: TriCheckboxState =
    threads.length > 0 && selectedIds.length === threads.length
      ? 'checked'
      : selectedIds.length > 0
        ? 'indeterminate'
        : 'unchecked';

  const removeThread = (id: string) => {
    setThreads((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className="max-w-[390px] mx-auto space-y-3">
      <div className="prism-slab rounded-[20px] p-3.5">
        <TriStateCheckbox
          label="Bulk select triage queue"
          state={triState}
          selectedCount={selectedIds.length}
          totalCount={Math.max(threads.length, 1)}
          onChange={(next) => setSelectedIds(next === 'checked' ? threads.map((t) => t.id) : [])}
        />
      </div>

      <PullToRefresh onRefresh={async () => new Promise<void>((r) => window.setTimeout(r, 200))}>
        <div className="space-y-2.5 p-1">
          {threads.map((thread) => (
            <SwipeableActionRow
              key={thread.id}
              leftActions={[{ id: 'snooze', label: 'Snooze', tone: 'amber', icon: <Clock className="w-3.5 h-3.5" />, onTrigger: () => removeThread(thread.id) }]}
              rightActions={[{ id: 'archive', label: 'Archive', tone: 'emerald', icon: <Archive className="w-3.5 h-3.5" />, onTrigger: () => removeThread(thread.id) }]}
            >
              <div className="text-xs">
                <p className="font-semibold">{thread.sender}</p>
                <p className="text-slate-600 dark:text-slate-300">{thread.subject}</p>
              </div>
            </SwipeableActionRow>
          ))}
          <NotificationCenter mode="inline" title="Activity Stream" items={feed} onItemsChange={setFeed} />
        </div>
      </PullToRefresh>

      <BottomNavigationBar
        mode="inline"
        activeId={nav}
        onChange={setNav}
        items={[
          { id: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4" />, badgeCount: threads.length },
          { id: 'mentions', label: 'Mentions', icon: <AtSign className="w-4 h-4" /> },
          { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ]}
      />
    </div>
  );
}`;

const TABLET_FIELD_OPS_FULL_CODE = `import { useState } from 'react';
import {
  CombinedDateTimePicker,
  InteractiveMapViewer,
  type MasterDetailItem,
  MasterDetailView,
  RecurrenceBuilder,
  type RecurrenceRule,
  SignaturePad,
  TimezoneSelector,
} from '@refractor-ui/core';

interface FieldTicket extends MasterDetailItem {
  pinId: string;
  arrivalIso: string;
  timezone: string;
  recurrence: RecurrenceRule;
  signed: boolean;
}

export function TabletFieldDispatchConsole() {
  const [tickets, setTickets] = useState<FieldTicket[]>([
    {
      id: 'dsp-401',
      title: 'Bayview Optical Substation',
      subtitle: 'Unit 04 · Maya Lin',
      badge: 'P1 Active',
      pinId: 'pin-bayview',
      arrivalIso: '2026-11-21T10:30',
      timezone: 'America/Los_Angeles',
      recurrence: { frequency: 'weekly', interval: 2, weekdays: [1, 4], monthDay: 1, hour: 10, minute: 30, endKind: 'never' },
      signed: false,
    },
    {
      id: 'dsp-402',
      title: 'Marin Relay Tower #14',
      subtitle: 'Unit 09 · Marcus Chen',
      badge: 'Scheduled',
      pinId: 'pin-marin',
      arrivalIso: '2026-11-21T14:00',
      timezone: 'America/Los_Angeles',
      recurrence: { frequency: 'monthly', interval: 1, weekdays: [2], monthDay: 15, hour: 14, minute: 0, endKind: 'never' },
      signed: false,
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>('dsp-401');

  const patchTicket = (id: string, patch: Partial<FieldTicket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  return (
    <MasterDetailView
      masterTitle="Service Dispatches"
      masterWidthPx={220}
      items={tickets}
      selectedId={selectedId}
      onSelectItem={(item) => setSelectedId(item.id)}
      renderDetail={(ticket) => (
        <div className="space-y-4">
          <InteractiveMapViewer
            heightPx={240}
            selectedPinId={ticket.pinId}
            pins={[
              { id: 'pin-bayview', label: 'Bayview Substation', x: 24, y: 48, category: 'P1' },
              { id: 'pin-marin', label: 'Marin Relay #14', x: 38, y: 26, category: 'Relay' },
            ]}
            routes={[{ id: 'r1', fromPinId: 'pin-bayview', toPinId: 'pin-marin', label: 'North Loop' }]}
            onSelectPin={(pin) => {
              const found = tickets.find((t) => t.pinId === pin?.id);
              if (found) setSelectedId(found.id);
            }}
          />
          <CombinedDateTimePicker label="Arrival Window" clockFormat="12h" value={ticket.arrivalIso} onChange={(iso) => patchTicket(ticket.id, { arrivalIso: iso })} />
          <TimezoneSelector label="Site Timezone" value={ticket.timezone} onChange={(tz) => patchTicket(ticket.id, { timezone: tz })} />
          <RecurrenceBuilder label="Maintenance Cadence" value={ticket.recurrence} onChange={(rule) => patchTicket(ticket.id, { recurrence: rule })} />
          <SignaturePad label="Customer Sign-Off" width={400} height={145} onSave={() => patchTicket(ticket.id, { signed: true, badge: 'Signed' })} />
        </div>
      )}
    />
  );
}`;

/* -------------------------------------------------------------------------- */
/* Exported Domain Spec Registry                                              */
/* -------------------------------------------------------------------------- */

export const WORKSPACE_MOBILE_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'project-kanban-roadmap',
    title: 'Project Kanban, Gantt & Velocity Hub',
    domain: 'workspace-mobile',
    domainTitle: 'Workspaces, Creative Media & Mobile Apps',
    summary:
      'Modern engineering delivery workspace pairing live collaborator presence with tabbed Kanban sprint lanes, dependency-linked Gantt timelines, and a 12-week commit velocity heatmap.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'LivePresenceIndicator',
      'PrismTabs',
      'KanbanBoard',
      'GanttChart',
      'CalendarHeatmap',
      'BadgeStatus',
      'TagChip',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Clicking collaborator avatars in LivePresenceIndicator filters the active sprint board by owner.',
      'Kanban card transfers and quick-adds recalculate shipped throughput metrics in real time.',
      'Single-click PrismTabs transition cleanly between Sprint Board, Gantt Roadmap, and Velocity Heatmap.',
      'Every visualization exposes interactive selection readouts and full keyboard parity.',
    ],
    fullCode: PROJECT_KANBAN_FULL_CODE,
    render: () => <ProjectKanbanRoadmapScreen />,
  },
  {
    id: 'creative-media-studio',
    title: 'Creative Video, Audio & Color Grading Studio',
    domain: 'workspace-mobile',
    domainTitle: 'Workspaces, Creative Media & Mobile Apps',
    summary:
      'Optical media production workbench combining a chaptered 4K video player, multi-stem audio waveform scrubber, live A/B color grade wipe, rotary dials, scrubbable fields, and tint swatch controls.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'CustomVideoPlayer',
      'AudioWaveformPlayer',
      'BeforeAfterSlider',
      'RotaryDial',
      'ScrubbableNumberField',
      'ColorPicker',
      'BadgeStatus',
      'SecondaryButton',
      'TagChip',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'RotaryDial exposure/contrast, ScrubbableNumberField saturation, and ColorPicker tint update the BeforeAfterSlider grade live.',
      'Video playhead and AudioWaveformPlayer scrubbers stay synchronized with studio SMPTE timecode readouts.',
      'One-click cinematic LUT presets (Daylight Crystal, Cinema Amber, Cobalt Night) and instant neutral reset.',
      'Container-aware 12-column workbench stacks gracefully from wide studio displays to 768px tablets.',
    ],
    fullCode: CREATIVE_MEDIA_FULL_CODE,
    render: () => <CreativeMediaStudioScreen />,
  },
  {
    id: 'mobile-banking-dashboard',
    title: 'Mobile Fintech & Spending Companion',
    domain: 'workspace-mobile',
    domainTitle: 'Workspaces, Creative Media & Mobile Apps',
    summary:
      'Native-feel mobile banking screen uniting pull-to-refresh ledger sync, privacy-masked balance KPIs, cashflow sparklines, interactive spending mix donut, swipeable transactions, and bottom navigation.',
    devices: ['mobile'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'PullToRefresh',
      'KpiMetricCard',
      'SparklineChart',
      'DonutPieChart',
      'SwipeableActionRow',
      'BottomNavigationBar',
      'BadgeStatus',
      'TagChip',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'PullToRefresh simulates live ledger settlement updates and reflects sync generation count.',
      'Tapping DonutPieChart slices dynamically filters the SwipeableActionRow transaction feed below.',
      'Bi-directional swipe gestures categorize expenses (Personal/Work/Reimbursable) or flag disputes inline.',
      'BottomNavigationBar switches across Home, Cards (virtual metal freeze), Insights, and Profile with zero overflow at 390px.',
    ],
    fullCode: MOBILE_BANKING_FULL_CODE,
    render: () => <MobileBankingDashboardScreen />,
  },
  {
    id: 'mobile-inbox-notifications',
    title: 'Mobile Notification Inbox & Support Triage',
    domain: 'workspace-mobile',
    domainTitle: 'Workspaces, Creative Media & Mobile Apps',
    summary:
      'Thumb-first mobile support inbox pairing a tri-state bulk selector, pull-to-refresh queue, swipe-to-archive/snooze triage cards with instant undo, inline NotificationCenter stream, and bottom nav.',
    devices: ['mobile'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'TriStateCheckbox',
      'PullToRefresh',
      'SwipeableActionRow',
      'NotificationCenter',
      'BottomNavigationBar',
      'BadgeStatus',
      'SecondaryButton',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'TriStateCheckbox accurately reflects unchecked, indeterminate, and checked bulk selection states.',
      'SwipeableActionRow cards support Archive and Snooze gestures paired with one-tap Undo restoration.',
      'Inline NotificationCenter stays synced with dynamic unread badge counters in BottomNavigationBar.',
      'Graceful Inbox Zero celebration state with one-tap sample queue recovery for rapid demo iteration.',
    ],
    fullCode: MOBILE_INBOX_FULL_CODE,
    render: () => <MobileInboxNotificationsScreen />,
  },
  {
    id: 'tablet-field-operations',
    title: 'Tablet Master-Detail & Geospatial Dispatch Console',
    domain: 'workspace-mobile',
    domainTitle: 'Workspaces, Creative Media & Mobile Apps',
    summary:
      'Split-screen tablet field service workbench synchronizing MasterDetailView dispatches with InteractiveMapViewer pins, CombinedDateTimePicker arrival windows, TimezoneSelector, RecurrenceBuilder, and SignaturePad sign-off.',
    devices: ['tablet', 'web'],
    defaultPreviewFrame: 'tablet',
    componentsUsed: [
      'MasterDetailView',
      'InteractiveMapViewer',
      'CombinedDateTimePicker',
      'TimezoneSelector',
      'RecurrenceBuilder',
      'SignaturePad',
      'PrismTabs',
      'BadgeStatus',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Bi-directional sync between MasterDetailView dispatch tickets and InteractiveMapViewer geospatial pins.',
      'Per-ticket Arrival Window, Site Timezone, and Cron Recurrence state persist cleanly as operators switch sites.',
      'Saving a vector signature in SignaturePad captures an inline SVG proof and marks the ticket Signed in the master list.',
      'Proportioned 216px master rail and tabbed detail stage deliver clutter-free ergonomics on 768px tablets.',
    ],
    fullCode: TABLET_FIELD_OPS_FULL_CODE,
    render: () => <TabletFieldOperationsScreen />,
  },
];
