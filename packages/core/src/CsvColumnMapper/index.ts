export interface CsvTargetFieldTypeMap {
  string: true;
  email: true;
  number: true;
}

export { CsvColumnMapper } from './CsvColumnMapper';
export type {
  CsvColumnMapperProps,
  CsvColumnMapping,
  CsvImportPayload,
  CsvRowValidationError,
  CsvTargetField,
  CsvTargetFieldType,
} from './CsvColumnMapper';
