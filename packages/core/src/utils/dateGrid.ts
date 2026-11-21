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
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function buildMonthGrid(year: number, monthZeroIndexed: number): CalendarCell[] {
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 2026;
  const safeMonth = Number.isFinite(monthZeroIndexed) ? Math.trunc(monthZeroIndexed) : 0;
  const firstDay = new Date(Date.UTC(safeYear, safeMonth, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(safeYear, safeMonth + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(Date.UTC(safeYear, safeMonth - 1, day));
    cells.push({
      dateIso: prevDate.toISOString().slice(0, 10),
      dayOfMonth: day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(safeYear, safeMonth, day));
    cells.push({
      dateIso: d.toISOString().slice(0, 10),
      dayOfMonth: day,
      inCurrentMonth: true,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const nextDate = new Date(Date.UTC(safeYear, safeMonth + 1, nextDay));
    cells.push({
      dateIso: nextDate.toISOString().slice(0, 10),
      dayOfMonth: nextDay,
      inCurrentMonth: false,
    });
    nextDay += 1;
  }

  return cells;
}
