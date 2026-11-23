import { compareLocaleStrings } from './styles';

export interface CalendarCell {
  dateIso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
}

export interface TreeNodeItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  sizeBytes?: number;
  mimeType?: string;
  updatedAt?: string;
}

const MAX_MONTH_GRID_CACHE = 256;
const monthGridCache = new Map<string, CalendarCell[]>();

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatUtcDateIso(year: number, monthZeroIndexed: number, day: number): string {
  const normalized = new Date(Date.UTC(year, monthZeroIndexed, day));
  const y = normalized.getUTCFullYear();
  const m = normalized.getUTCMonth() + 1;
  const d = normalized.getUTCDate();
  const yStr = y >= 0 && y < 10000 ? String(y).padStart(4, '0') : String(y);
  return `${yStr}-${pad2(m)}-${pad2(d)}`;
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getChildrenNodes<T extends TreeNodeItem>(
  nodes: ReadonlyArray<T>,
  parentId: string | null
): T[] {
  const result: T[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]!;
    if (n.parentId === parentId) {
      result.push(n);
    }
  }
  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return compareLocaleStrings(a.name, b.name);
  });
}

/**
 * Builds (and caches in O(1)) a 7-column UTC calendar grid for the requested month.
 */
export function buildMonthGrid(year: number, monthZeroIndexed: number): CalendarCell[] {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 2026;
  const safeMonth = Number.isFinite(monthZeroIndexed) ? Math.trunc(monthZeroIndexed) : 0;
  const cacheKey = `${safeYear}-${safeMonth}`;
  const cached = monthGridCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const firstDay = new Date(Date.UTC(safeYear, safeMonth, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(safeYear, safeMonth + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    cells.push({
      dateIso: formatUtcDateIso(safeYear, safeMonth - 1, day),
      dayOfMonth: day,
      inCurrentMonth: false,
    });
  }

  const curYear = firstDay.getUTCFullYear();
  const curMonth1 = firstDay.getUTCMonth() + 1;
  const curPrefix = `${curYear >= 0 && curYear < 10000 ? String(curYear).padStart(4, '0') : String(curYear)}-${pad2(curMonth1)}-`;

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateIso: `${curPrefix}${pad2(day)}`,
      dayOfMonth: day,
      inCurrentMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({
      dateIso: formatUtcDateIso(safeYear, safeMonth + 1, nextDay),
      dayOfMonth: nextDay,
      inCurrentMonth: false,
    });
    nextDay += 1;
  }

  if (monthGridCache.size >= MAX_MONTH_GRID_CACHE) {
    monthGridCache.clear();
  }
  monthGridCache.set(cacheKey, cells);
  return cells;
}
