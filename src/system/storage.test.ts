import test from 'node:test';
import assert from 'node:assert/strict';
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
} from '../apps/docs/registry';

test('component registry contains all 46 requested UI kit components across 6 categories', () => {
  assert.equal(DOC_CATEGORIES.length, 6);
  assert.equal(COMPONENT_REGISTRY.length, 46);

  const counts = getCategoryCounts(COMPONENT_REGISTRY);
  assert.equal(counts['buttons-actions'], 6);
  assert.equal(counts['form-inputs'], 11);
  assert.equal(counts['navigation'], 7);
  assert.equal(counts['data-display'], 12);
  assert.equal(counts['feedback-status'], 5);
  assert.equal(counts['overlays-popups'], 5);

  const uniqueIds = new Set(COMPONENT_REGISTRY.map((c) => c.id));
  assert.equal(uniqueIds.size, 46);
});

test('filterComponents filters accurately by category and search query', () => {
  const buttonsOnly = filterComponents(COMPONENT_REGISTRY, 'buttons-actions', '');
  assert.equal(buttonsOnly.length, 6);

  const paletteMatch = filterComponents(COMPONENT_REGISTRY, 'overview', 'Command Palette');
  assert.equal(paletteMatch.length, 1);
  assert.equal(paletteMatch[0]?.exportName, 'CommandPalette');
});

test('queryProjectRecords sorts, filters, and paginates deterministically', () => {
  const activeOnly = queryProjectRecords(INITIAL_PROJECT_RECORDS, {
    statusFilter: 'Active',
    sortBy: 'completion',
    sortDir: 'desc',
    page: 1,
    pageSize: 10,
  });

  assert.equal(activeOnly.totalFiltered, 3);
  assert.equal(activeOnly.rows[0]?.completion, 96);
  assert.equal(activeOnly.rows[2]?.completion, 84);
});

test('VFS helpers sort folders before files and format byte sizes cleanly', () => {
  const rootChildren = getChildrenNodes(INITIAL_VFS_NODES, null);
  assert.equal(rootChildren.length, 3);
  assert.equal(rootChildren[0]?.name, 'components');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
});

test('buildMonthGrid produces complete 7-column calendar weeks', () => {
  const grid = buildMonthGrid(2026, 10); // November 2026
  assert.equal(grid.length % 7, 0);
  assert.ok(grid.length >= 35);
  const nov20 = grid.find((c) => c.dateIso === '2026-11-20');
  assert.equal(nov20?.inCurrentMonth, true);
  assert.equal(nov20?.dayOfMonth, 20);
});
