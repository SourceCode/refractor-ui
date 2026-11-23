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
const CRLF_RE = /\r\n/g;
const MULTI_WS_RE = /\s+/g;

function normalizeLine(line: string, ignoreWhitespace: boolean): string {
  return ignoreWhitespace ? line.trim().replace(MULTI_WS_RE, ' ') : line;
}

/**
 * Computes a deterministic line-by-line diff between two strings using
 * prefix/suffix trimming + pre-normalized flat Int32Array LCS dynamic programming
 * (with a bounded linear fallback for massive inputs to guarantee zero UI freezes).
 */
export function computeLineDiff(
  originalText: string,
  modifiedText: string,
  ignoreWhitespace = false
): DiffResult {
  const oldLines = originalText === '' ? [] : originalText.replace(CRLF_RE, '\n').split('\n');
  const newLines = modifiedText === '' ? [] : modifiedText.replace(CRLF_RE, '\n').split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  if (m === 0 && n === 0) {
    return { lines: [], additions: 0, deletions: 0, unchanged: 0 };
  }

  // Pre-normalize once in O(m + n) instead of O(m * n) inside inner DP loops
  const normOld: string[] = ignoreWhitespace
    ? oldLines.map((line) => normalizeLine(line, true))
    : oldLines;
  const normNew: string[] = ignoreWhitespace
    ? newLines.map((line) => normalizeLine(line, true))
    : newLines;

  if (m > MAX_LCS_LINES || n > MAX_LCS_LINES) {
    const lines: DiffLine[] = [];
    const maxLen = Math.max(m, n);
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;
    for (let i = 0; i < maxLen; i += 1) {
      const a = oldLines[i];
      const b = newLines[i];
      if (a !== undefined && b !== undefined && normOld[i] === normNew[i]) {
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

  // Trim identical leading prefix and trailing suffix before DP allocation
  let prefix = 0;
  while (prefix < m && prefix < n && normOld[prefix] === normNew[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < m - prefix &&
    suffix < n - prefix &&
    normOld[m - 1 - suffix] === normNew[n - 1 - suffix]
  ) {
    suffix += 1;
  }

  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (let idx = 0; idx < prefix; idx += 1) {
    lines.push({
      kind: 'unchanged',
      content: newLines[idx]!,
      oldLineNumber: idx + 1,
      newLineNumber: idx + 1,
    });
    unchanged += 1;
  }

  const subM = m - prefix - suffix;
  const subN = n - prefix - suffix;

  if (subM > 0 || subN > 0) {
    const stride = subN + 1;
    const dp = new Int32Array((subM + 1) * stride);

    for (let i = subM - 1; i >= 0; i -= 1) {
      const rowOffset = i * stride;
      const nextRowOffset = (i + 1) * stride;
      const oldNorm = normOld[prefix + i]!;
      for (let j = subN - 1; j >= 0; j -= 1) {
        if (oldNorm === normNew[prefix + j]!) {
          dp[rowOffset + j] = dp[nextRowOffset + j + 1]! + 1;
        } else {
          const down = dp[nextRowOffset + j]!;
          const right = dp[rowOffset + j + 1]!;
          dp[rowOffset + j] = down >= right ? down : right;
        }
      }
    }

    let i = 0;
    let j = 0;
    while (i < subM && j < subN) {
      const oldIdx = prefix + i;
      const newIdx = prefix + j;
      if (normOld[oldIdx] === normNew[newIdx]) {
        lines.push({
          kind: 'unchanged',
          content: newLines[newIdx]!,
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
        });
        unchanged += 1;
        i += 1;
        j += 1;
      } else if (dp[(i + 1) * stride + j]! >= dp[i * stride + j + 1]!) {
        lines.push({
          kind: 'removed',
          content: oldLines[oldIdx]!,
          oldLineNumber: oldIdx + 1,
          newLineNumber: null,
        });
        deletions += 1;
        i += 1;
      } else {
        lines.push({
          kind: 'added',
          content: newLines[newIdx]!,
          oldLineNumber: null,
          newLineNumber: newIdx + 1,
        });
        additions += 1;
        j += 1;
      }
    }

    while (i < subM) {
      const oldIdx = prefix + i;
      lines.push({
        kind: 'removed',
        content: oldLines[oldIdx]!,
        oldLineNumber: oldIdx + 1,
        newLineNumber: null,
      });
      deletions += 1;
      i += 1;
    }

    while (j < subN) {
      const newIdx = prefix + j;
      lines.push({
        kind: 'added',
        content: newLines[newIdx]!,
        oldLineNumber: null,
        newLineNumber: newIdx + 1,
      });
      additions += 1;
      j += 1;
    }
  }

  for (let k = 0; k < suffix; k += 1) {
    const oldIdx = m - suffix + k;
    const newIdx = n - suffix + k;
    lines.push({
      kind: 'unchanged',
      content: newLines[newIdx]!,
      oldLineNumber: oldIdx + 1,
      newLineNumber: newIdx + 1,
    });
    unchanged += 1;
  }

  return { lines, additions, deletions, unchanged };
}
