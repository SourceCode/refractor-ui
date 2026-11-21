import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  formatFileSize,
  getChildrenNodes,
  INITIAL_PROJECT_RECORDS,
  INITIAL_VFS_NODES,
  queryProjectRecords,
} from './storage';
import {
  COMPONENT_REGISTRY,
  DOC_CATEGORIES,
  filterComponents,
  getCategoryCounts,
} from '../docs/registry';

describe('Docs storage & component registry', () => {
  it('registers all 75 components across 12 complete categories', () => {
    expect(DOC_CATEGORIES).toHaveLength(12);
    expect(COMPONENT_REGISTRY).toHaveLength(75);

    const counts = getCategoryCounts(COMPONENT_REGISTRY);
    expect(counts['buttons-actions']).toBe(6);
    expect(counts['form-inputs']).toBe(11);
    expect(counts['navigation']).toBe(7);
    expect(counts['data-display']).toBe(12);
    expect(counts['feedback-status']).toBe(5);
    expect(counts['overlays-popups']).toBe(5);
    expect(counts['layout-workspace']).toBe(6);
    expect(counts['advanced-data']).toBe(6);
    expect(counts['search-filtering']).toBe(4);
    expect(counts['rich-input']).toBe(6);
    expect(counts['drag-and-drop']).toBe(3);
    expect(counts['collaboration-guidance']).toBe(4);

    const uniqueIds = new Set(COMPONENT_REGISTRY.map((c) => c.id));
    expect(uniqueIds.size).toBe(COMPONENT_REGISTRY.length);
  });

  it('filters components accurately by category and search query', () => {
    const buttonsOnly = filterComponents(COMPONENT_REGISTRY, 'buttons-actions', '');
    expect(buttonsOnly).toHaveLength(6);

    const paletteMatch = filterComponents(COMPONENT_REGISTRY, 'overview', 'Command Palette');
    expect(paletteMatch).toHaveLength(1);
    expect(paletteMatch[0]?.exportName).toBe('CommandPalette');
  });

  it('sorts, filters, and paginates project records deterministically', () => {
    const activeOnly = queryProjectRecords(INITIAL_PROJECT_RECORDS, {
      statusFilter: 'Active',
      sortBy: 'completion',
      sortDir: 'desc',
      page: 1,
      pageSize: 10,
    });

    expect(activeOnly.totalFiltered).toBe(3);
    expect(activeOnly.rows[0]?.completion).toBe(96);
    expect(activeOnly.rows[2]?.completion).toBe(84);
  });

  it('sorts VFS folders before files and formats byte sizes cleanly', () => {
    const rootChildren = getChildrenNodes(INITIAL_VFS_NODES, null);
    expect(rootChildren).toHaveLength(3);
    expect(rootChildren[0]?.name).toBe('components');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('builds complete 7-column calendar month grids', () => {
    const grid = buildMonthGrid(2026, 10);
    expect(grid.length % 7).toBe(0);
    expect(grid.length).toBeGreaterThanOrEqual(35);
    const nov20 = grid.find((c) => c.dateIso === '2026-11-20');
    expect(nov20?.inCurrentMonth).toBe(true);
    expect(nov20?.dayOfMonth).toBe(20);
  });
});
