export interface SpreadsheetFormulaFnMap {
  SUM: true;
  AVERAGE: true;
  MIN: true;
  MAX: true;
  COUNT: true;
}

export {
  FormulaSpreadsheetGrid,
  evaluateSpreadsheetCell,
} from './FormulaSpreadsheetGrid';
export type {
  FormulaSpreadsheetGridProps,
  SpreadsheetCellEntry,
  SpreadsheetCellEvaluation,
  SpreadsheetErrorCode,
  SpreadsheetFormulaFn,
  SpreadsheetSheetSpec,
} from './FormulaSpreadsheetGrid';
