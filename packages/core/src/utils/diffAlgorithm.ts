export type DiffLineKind = 'unchanged' | 'added' | 'removed';

export interface DiffLine {
  kind: DiffLineKind;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

const MAX_LCS_LINES = 600;

/**
 * Computes a deterministic line-by-line diff between two strings using LCS dynamic programming
 * (with a bounded linear fallback for massive inputs to guarantee zero UI freezes).
 */
export function computeLineDiff(
  originalText: string,
  modifiedText: string,
  ignoreWhitespace = false
): DiffResult {
  const oldLines = originalText === '' ? [] : originalText.replace(/\r\n/g, '\n').split('\n');
  const newLines = modifiedText === '' ? [] : modifiedText.replace(/\r\n/g, '\n').split('\n');

  const norm = (line: string): string => (ignoreWhitespace ? line.trim().replace(/\s+/g, ' ') : line);

  if (oldLines.length === 0 && newLines.length === 0) {
    return { lines: [], additions: 0, deletions: 0, unchanged: 0 };
  }

  if (oldLines.length > MAX_LCS_LINES || newLines.length > MAX_LCS_LINES) {
    const lines: DiffLine[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;
    for (let i = 0; i < maxLen; i++) {
      const a = oldLines[i];
      const b = newLines[i];
      if (a !== undefined && b !== undefined && norm(a) === norm(b)) {
        lines.push({ kind: 'unchanged', content: b, oldLineNumber: i + 1, newLineNumber: i + 1 });
        unchanged += 1;
      } else {
        if (a !== undefined) {
          lines.push({ kind: 'removed', content: a, oldLineNumber: i + 1, newLineNumber: null });
          deletions += 1;
        }
        if (b !== undefined) {
          lines.push({ kind: 'added', content: b, oldLineNumber: null, newLineNumber: i + 1 });
          additions += 1;
        }
      }
    }
    return { lines, additions, deletions, unchanged };
  }

  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  const at = (r: number, c: number): number => dp[r]![c]!;

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (norm(oldLines[i]!) === norm(newLines[j]!)) {
        dp[i]![j] = at(i + 1, j + 1) + 1;
      } else {
        dp[i]![j] = Math.max(at(i + 1, j), at(i, j + 1));
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  while (i < m && j < n) {
    const oldVal = oldLines[i]!;
    const newVal = newLines[j]!;
    if (norm(oldVal) === norm(newVal)) {
      lines.push({
        kind: 'unchanged',
        content: newVal,
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      });
      unchanged += 1;
      i += 1;
      j += 1;
    } else if (at(i + 1, j) >= at(i, j + 1)) {
      lines.push({
        kind: 'removed',
        content: oldVal,
        oldLineNumber: i + 1,
        newLineNumber: null,
      });
      deletions += 1;
      i += 1;
    } else {
      lines.push({
        kind: 'added',
        content: newVal,
        oldLineNumber: null,
        newLineNumber: j + 1,
      });
      additions += 1;
      j += 1;
    }
  }

  while (i < m) {
    lines.push({
      kind: 'removed',
      content: oldLines[i]!,
      oldLineNumber: i + 1,
      newLineNumber: null,
    });
    deletions += 1;
    i += 1;
  }

  while (j < n) {
    lines.push({
      kind: 'added',
      content: newLines[j]!,
      oldLineNumber: null,
      newLineNumber: j + 1,
    });
    additions += 1;
    j += 1;
  }

  return { lines, additions, deletions, unchanged };
}
