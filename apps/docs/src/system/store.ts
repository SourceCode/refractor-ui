import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RefractionIntensity, ThemeMode } from '@refractor-ui/core';
import {
  type CalendarEventItem,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_PROJECT_RECORDS,
  INITIAL_VFS_NODES,
  type ProjectRecord,
  type VfsNode,
} from './storage';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'amber' | 'emerald' | 'info' | 'critical';
}

export type ThemePresetId =
  | 'alabaster'
  | 'obsidian'
  | 'amethyst'
  | 'emerald-tide'
  | 'solar-prism'
  | 'custom';

export type DocsCategoryFilter =
  | 'overview'
  | 'buttons-actions'
  | 'form-inputs'
  | 'navigation'
  | 'data-display'
  | 'feedback-status'
  | 'overlays-popups'
  | 'layout-workspace'
  | 'advanced-data'
  | 'search-filtering'
  | 'rich-input'
  | 'drag-and-drop'
  | 'collaboration-guidance'
  | 'ai-conversational'
  | 'media-spatial'
  | 'security-auth'
  | 'commerce-billing'
  | 'mobile-utilities'
  | 'cli-terminal'
  | 'ai-agent-control'
  | 'ai-context-memory'
  | 'multi-agent'
  | 'date-time-scheduling'
  | 'number-currency-fields'
  | 'complex-buttons'
  | 'complex-controls'
  | 'core-trend-charts'
  | 'part-to-whole-charts'
  | 'statistical-charts'
  | 'relational-flow-charts'
  | 'kpi-telemetry-charts'
  | 'geospatial-charts'
  | 'chart-chrome-controls';

export type DocsPageSection =
  | 'catalog'
  | 'examples'
  | 'getting-started'
  | 'theming'
  | 'cli'
  | 'architecture';

export interface CustomPaletteState {
  primaryMain: string;
  secondaryMain: string;
  successMain: string;
  infoMain: string;
  blurPx: number;
  slabRadius: number;
  specularHighlight: boolean;
}

interface SystemState {
  themePreset: ThemePresetId;
  themeMode: ThemeMode;
  refraction: RefractionIntensity;
  customPalette: CustomPaletteState;
  customizerOpen: boolean;
  studioGrid: boolean;
  activeSection: DocsPageSection;
  activeCategory: DocsCategoryFilter;
  focusedComponentId: string | null;
  activeExampleId: string | null;
  searchQuery: string;
  commandPaletteOpen: boolean;
  toasts: ToastItem[];
  vfsNodes: VfsNode[];
  projectRecords: ProjectRecord[];
  calendarEvents: CalendarEventItem[];
  collaborators: string[];
}

export const DEFAULT_CUSTOM_PALETTE: CustomPaletteState = {
  primaryMain: '#E75C24',
  secondaryMain: '#38BDF8',
  successMain: '#26BC92',
  infoMain: '#1D4ED8',
  blurPx: 18,
  slabRadius: 24,
  specularHighlight: true,
};

const initialState: SystemState = {
  themePreset: 'alabaster',
  themeMode: 'light',
  refraction: 'standard',
  customPalette: DEFAULT_CUSTOM_PALETTE,
  customizerOpen: false,
  studioGrid: false,
  activeSection: 'catalog',
  activeCategory: 'overview',
  focusedComponentId: null,
  activeExampleId: null,
  searchQuery: '',
  commandPaletteOpen: false,
  toasts: [],
  vfsNodes: INITIAL_VFS_NODES,
  projectRecords: INITIAL_PROJECT_RECORDS,
  calendarEvents: INITIAL_CALENDAR_EVENTS,
  collaborators: ['Clara Vance', 'Marcus Chen'],
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    setThemePreset(state, action: PayloadAction<ThemePresetId>) {
      state.themePreset = action.payload;
      if (action.payload === 'obsidian') {
        state.themeMode = 'dark';
      } else if (action.payload === 'alabaster') {
        state.themeMode = 'light';
        state.customPalette = DEFAULT_CUSTOM_PALETTE;
      } else if (action.payload === 'amethyst') {
        state.customPalette = {
          ...state.customPalette,
          primaryMain: '#7C3AED',
          secondaryMain: '#06B6D4',
          successMain: '#10B981',
          infoMain: '#4F46E5',
        };
      } else if (action.payload === 'emerald-tide') {
        state.customPalette = {
          ...state.customPalette,
          primaryMain: '#0D9488',
          secondaryMain: '#0EA5E9',
          successMain: '#16A34A',
          infoMain: '#0284C7',
        };
      } else if (action.payload === 'solar-prism') {
        state.customPalette = {
          ...state.customPalette,
          primaryMain: '#D97706',
          secondaryMain: '#2563EB',
          successMain: '#059669',
          infoMain: '#1D4ED8',
        };
      }
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
      if (action.payload === 'dark' && state.themePreset === 'alabaster') {
        state.themePreset = 'obsidian';
      } else if (action.payload === 'light' && state.themePreset === 'obsidian') {
        state.themePreset = 'alabaster';
      }
    },
    toggleThemeMode(state) {
      const nextMode: ThemeMode = state.themeMode === 'light' ? 'dark' : 'light';
      state.themeMode = nextMode;
      if (nextMode === 'dark' && state.themePreset === 'alabaster') {
        state.themePreset = 'obsidian';
      } else if (nextMode === 'light' && state.themePreset === 'obsidian') {
        state.themePreset = 'alabaster';
      }
    },
    setRefraction(state, action: PayloadAction<RefractionIntensity>) {
      state.refraction = action.payload;
    },
    updateCustomPalette(state, action: PayloadAction<Partial<CustomPaletteState>>) {
      state.themePreset = 'custom';
      state.customPalette = { ...state.customPalette, ...action.payload };
    },
    resetCustomPalette(state) {
      state.themePreset = 'alabaster';
      state.themeMode = 'light';
      state.refraction = 'standard';
      state.customPalette = DEFAULT_CUSTOM_PALETTE;
    },
    setCustomizerOpen(state, action: PayloadAction<boolean>) {
      state.customizerOpen = action.payload;
    },
    setStudioGrid(state, action: PayloadAction<boolean>) {
      state.studioGrid = action.payload;
    },
    setActiveSection(state, action: PayloadAction<DocsPageSection>) {
      state.activeSection = action.payload;
      if (action.payload !== 'catalog') {
        state.focusedComponentId = null;
      }
      if (action.payload !== 'examples') {
        state.activeExampleId = null;
      }
    },
    setActiveExample(state, action: PayloadAction<string | null>) {
      state.activeSection = 'examples';
      state.focusedComponentId = null;
      state.activeExampleId = action.payload;
    },
    setActiveCategory(state, action: PayloadAction<DocsCategoryFilter>) {
      state.activeSection = 'catalog';
      state.activeCategory = action.payload;
      state.focusedComponentId = null;
      state.activeExampleId = null;
    },
    setFocusedComponent(
      state,
      action: PayloadAction<{ componentId: string | null; category?: DocsCategoryFilter }>
    ) {
      state.activeSection = 'catalog';
      state.focusedComponentId = action.payload.componentId;
      state.activeExampleId = null;
      if (action.payload.category) {
        state.activeCategory = action.payload.category;
      }
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload;
    },
    pushToast(state, action: PayloadAction<Omit<ToastItem, 'id'>>) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      state.toasts.push({ id, ...action.payload });
      if (state.toasts.length > 4) {
        state.toasts.shift();
      }
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    addVfsFile(
      state,
      action: PayloadAction<{
        name: string;
        sizeBytes: number;
        mimeType: string;
        parentId?: string | null;
      }>
    ) {
      const newFile: VfsNode = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: action.payload.name,
        type: 'file',
        parentId: action.payload.parentId ?? 'dir-root-specs',
        sizeBytes: action.payload.sizeBytes,
        mimeType: action.payload.mimeType || 'application/octet-stream',
        updatedAt: '2026-11-20',
      };
      state.vfsNodes.unshift(newFile);
    },
    removeVfsNode(state, action: PayloadAction<string>) {
      state.vfsNodes = state.vfsNodes.filter(
        (n) => n.id !== action.payload && n.parentId !== action.payload
      );
    },
    addProjectRecord(state, action: PayloadAction<Omit<ProjectRecord, 'id' | 'updatedAt'>>) {
      const nextNum = 108 + state.projectRecords.length;
      state.projectRecords.unshift({
        ...action.payload,
        id: `PRJ-${nextNum}`,
        updatedAt: '2026-11-20',
      });
    },
    clearProjectRecords(state) {
      state.projectRecords = [];
    },
    restoreProjectRecords(state) {
      state.projectRecords = INITIAL_PROJECT_RECORDS;
    },
    addCalendarEvent(state, action: PayloadAction<Omit<CalendarEventItem, 'id'>>) {
      state.calendarEvents.push({
        id: `evt-${Date.now()}`,
        ...action.payload,
      });
    },
    addCollaborator(state, action: PayloadAction<string>) {
      const trimmed = action.payload.trim();
      if (trimmed && !state.collaborators.includes(trimmed)) {
        state.collaborators.push(trimmed);
      }
    },
  },
});

export const {
  setThemePreset,
  setThemeMode,
  toggleThemeMode,
  setRefraction,
  updateCustomPalette,
  resetCustomPalette,
  setCustomizerOpen,
  setStudioGrid,
  setActiveSection,
  setActiveExample,
  setActiveCategory,
  setFocusedComponent,
  setSearchQuery,
  setCommandPaletteOpen,
  pushToast,
  dismissToast,
  addVfsFile,
  removeVfsNode,
  addProjectRecord,
  clearProjectRecords,
  restoreProjectRecords,
  addCalendarEvent,
  addCollaborator,
} = systemSlice.actions;

export function createDocsStore() {
  return configureStore({
    reducer: {
      system: systemSlice.reducer,
    },
  });
}

export const store = createDocsStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
