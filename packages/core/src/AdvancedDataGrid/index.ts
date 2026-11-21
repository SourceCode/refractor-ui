export interface AdvancedGridPinSideMap {
  left: true;
  right: true;
  none: true;
}

export interface AdvancedGridAlignMap {
  left: true;
  right: true;
}

export interface AdvancedGridSortDirectionMap {
  asc: true;
  desc: true;
}

export { AdvancedDataGrid } from './AdvancedDataGrid';
export type {
  AdvancedDataGridProps,
  AdvancedGridAlign,
  AdvancedGridColumn,
  AdvancedGridPinSide,
  AdvancedGridSortDirection,
  GridCellValue,
  GridRowRecord,
} from './AdvancedDataGrid';
