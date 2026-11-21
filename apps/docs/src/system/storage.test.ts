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
  it('registers all core and expansion components across unique categories', () => {
    expect(DOC_CATEGORIES.length).toBeGreaterThanOrEqual(32);
    expect(COMPONENT_REGISTRY.length).toBeGreaterThanOrEqual(179);

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
    expect(counts['ai-conversational']).toBe(6);
    expect(counts['media-spatial']).toBe(6);
    expect(counts['security-auth']).toBe(5);
    expect(counts['commerce-billing']).toBe(5);
    expect(counts['mobile-utilities']).toBe(5);
    expect(counts['cli-terminal']).toBe(7);
    expect(counts['ai-agent-control']).toBe(7);
    expect(counts['ai-context-memory']).toBe(6);
    expect(counts['multi-agent']).toBe(4);
    expect(counts['date-time-scheduling']).toBe(6);
    expect(counts['number-currency-fields']).toBe(6);
    expect(counts['complex-buttons']).toBe(5);
    expect(counts['complex-controls']).toBe(7);
    expect(counts['core-trend-charts']).toBe(5);
    expect(counts['part-to-whole-charts']).toBe(5);
    expect(counts['statistical-charts']).toBe(5);
    expect(counts['relational-flow-charts']).toBe(3);
    expect(counts['kpi-telemetry-charts']).toBe(4);
    expect(counts['geospatial-charts']).toBe(3);
    expect(counts['chart-chrome-controls']).toBe(4);

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
