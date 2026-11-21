import type { CalendarEventItem, DataTableRow, SortDirection, TreeNodeItem } from '@refractor-ui/core';
import { buildMonthGrid, formatFileSize, getChildrenNodes } from '@refractor-ui/core';

export { buildMonthGrid, formatFileSize, getChildrenNodes };
export type { CalendarEventItem, DataTableRow, SortDirection, TreeNodeItem };

export type VfsNode = TreeNodeItem & { updatedAt: string };
export type ProjectRecord = DataTableRow;

export const INITIAL_VFS_NODES: VfsNode[] = [
  { id: 'dir-root-design', name: 'design-tokens', type: 'folder', parentId: null, updatedAt: '2026-11-18' },
  { id: 'file-refraction', name: 'refraction-caustics.json', type: 'file', parentId: 'dir-root-design', sizeBytes: 14820, mimeType: 'application/json', updatedAt: '2026-11-19' },
  { id: 'file-palette', name: 'optical-surfaces.tokens.ts', type: 'file', parentId: 'dir-root-design', sizeBytes: 9410, mimeType: 'text/typescript', updatedAt: '2026-11-20' },
  { id: 'dir-root-components', name: 'components', type: 'folder', parentId: null, updatedAt: '2026-11-19' },
  { id: 'dir-buttons', name: 'PrimaryButton', type: 'folder', parentId: 'dir-root-components', updatedAt: '2026-11-19' },
  { id: 'file-primary-btn', name: 'PrimaryButton.tsx', type: 'file', parentId: 'dir-buttons', sizeBytes: 4120, mimeType: 'text/tsx', updatedAt: '2026-11-20' },
  { id: 'file-select-ctrl', name: 'DropdownSelect.tsx', type: 'file', parentId: 'dir-root-components', sizeBytes: 6840, mimeType: 'text/tsx', updatedAt: '2026-11-20' },
  { id: 'dir-root-specs', name: 'specifications', type: 'folder', parentId: null, updatedAt: '2026-11-15' },
  { id: 'file-wcag', name: 'accessibility-audit.pdf', type: 'file', parentId: 'dir-root-specs', sizeBytes: 248900, mimeType: 'application/pdf', updatedAt: '2026-11-17' },
];

export const INITIAL_PROJECT_RECORDS: ProjectRecord[] = [
  { id: 'PRJ-101', project: 'Refractor Button Primitives', owner: 'Clara Vance', department: 'Design', status: 'Active', completion: 96, budgetUsd: 48500, updatedAt: '2026-11-20' },
  { id: 'PRJ-102', project: 'Caustic Shader Pipeline', owner: 'Marcus Chen', department: 'Optics', status: 'Active', completion: 84, budgetUsd: 72000, updatedAt: '2026-11-19' },
  { id: 'PRJ-103', project: 'Accessible Dialog Manager', owner: 'Elena Rostova', department: 'Platform', status: 'Review', completion: 78, budgetUsd: 39200, updatedAt: '2026-11-18' },
  { id: 'PRJ-104', project: 'Virtual Storage Driver', owner: 'David Kim', department: 'Systems', status: 'Active', completion: 91, budgetUsd: 64000, updatedAt: '2026-11-17' },
  { id: 'PRJ-105', project: 'Command Palette Indexer', owner: 'Clara Vance', department: 'Platform', status: 'Scheduled', completion: 52, budgetUsd: 28400, updatedAt: '2026-11-16' },
  { id: 'PRJ-106', project: 'High-Contrast Obsidian Theme', owner: 'Marcus Chen', department: 'Design', status: 'Review', completion: 69, budgetUsd: 31800, updatedAt: '2026-11-15' },
  { id: 'PRJ-107', project: 'Touch Sheet Gesture Physics', owner: 'Elena Rostova', department: 'Optics', status: 'Archived', completion: 100, budgetUsd: 53000, updatedAt: '2026-11-10' },
];

export const INITIAL_CALENDAR_EVENTS: CalendarEventItem[] = [
  { id: 'evt-1', title: 'UI Kit v1.0 Freeze', dateIso: '2026-11-05', timeLabel: '10:00 AM', category: 'Release' },
  { id: 'evt-2', title: 'Optical Contrast Review', dateIso: '2026-11-12', timeLabel: '02:00 PM', category: 'Review' },
  { id: 'evt-3', title: 'Design Systems Guild', dateIso: '2026-11-18', timeLabel: '11:30 AM', category: 'Sync' },
  { id: 'evt-4', title: 'Component Accessibility Signoff', dateIso: '2026-11-20', timeLabel: '09:30 AM', category: 'Review' },
  { id: 'evt-5', title: 'Production Bundle Publish', dateIso: '2026-11-26', timeLabel: '04:00 PM', category: 'Release' },
];

export interface TableQueryOptions {
  search?: string;
  statusFilter?: string;
  sortBy?: keyof ProjectRecord;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface TableQueryResult {
  rows: ProjectRecord[];
  totalFiltered: number;
  totalPages: number;
  currentPage: number;
}

export function queryProjectRecords(
  records: ProjectRecord[],
  options: TableQueryOptions
): TableQueryResult {
  const {
    search = '',
    statusFilter = 'All',
    sortBy = 'project',
    sortDir = 'asc',
    page = 1,
    pageSize = 5,
  } = options;

  const q = search.trim().toLowerCase();

  const filtered = records.filter((row) => {
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    const matchesSearch =
      !q ||
      row.project.toLowerCase().includes(q) ||
      row.owner.toLowerCase().includes(q) ||
      row.department.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    const cmp =
      typeof valA === 'number' && typeof valB === 'number'
        ? valA - valB
        : String(valA).localeCompare(String(valB));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(sorted.length / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    rows: sorted.slice(start, start + safePageSize),
    totalFiltered: sorted.length,
    totalPages,
    currentPage,
  };
}
