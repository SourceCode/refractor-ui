import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { RefractionIntensity, ThemeMode } from '../os/theme/prismTheme';
import {
  CalendarEventItem,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_PROJECT_RECORDS,
  INITIAL_VFS_NODES,
  ProjectRecord,
  VfsNode,
} from './storage';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'amber' | 'emerald' | 'info' | 'critical';
}

export type DocsCategoryFilter =
  | 'overview'
  | 'buttons-actions'
  | 'form-inputs'
  | 'navigation'
  | 'data-display'
  | 'feedback-status'
  | 'overlays-popups';

interface SystemState {
  themeMode: ThemeMode;
  refraction: RefractionIntensity;
  studioGrid: boolean;
  activeCategory: DocsCategoryFilter;
  focusedComponentId: string | null;
  searchQuery: string;
  commandPaletteOpen: boolean;
  toasts: ToastItem[];
  vfsNodes: VfsNode[];
  projectRecords: ProjectRecord[];
  calendarEvents: CalendarEventItem[];
  collaborators: string[];
}

const initialState: SystemState = {
  themeMode: 'light',
  refraction: 'standard',
  studioGrid: false,
  activeCategory: 'overview',
  focusedComponentId: null,
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
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    },
    setRefraction(state, action: PayloadAction<RefractionIntensity>) {
      state.refraction = action.payload;
    },
    setStudioGrid(state, action: PayloadAction<boolean>) {
      state.studioGrid = action.payload;
    },
    setActiveCategory(state, action: PayloadAction<DocsCategoryFilter>) {
      state.activeCategory = action.payload;
      state.focusedComponentId = null;
    },
    setFocusedComponent(
      state,
      action: PayloadAction<{ componentId: string | null; category?: DocsCategoryFilter }>
    ) {
      state.focusedComponentId = action.payload.componentId;
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
      action: PayloadAction<{ name: string; sizeBytes: number; mimeType: string; parentId?: string | null }>
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
  setThemeMode,
  toggleThemeMode,
  setRefraction,
  setStudioGrid,
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

export const store = configureStore({
  reducer: {
    system: systemSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
