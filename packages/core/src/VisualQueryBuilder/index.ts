export interface QueryCombinatorMap {
  AND: true;
  OR: true;
}

export { VisualQueryBuilder, formatQueryExpression } from './VisualQueryBuilder';
export type {
  QueryCombinator,
  QueryFieldSpec,
  QueryFieldType,
  QueryGroupNode,
  QueryNode,
  QueryOperator,
  QueryRuleNode,
  VisualQueryBuilderProps,
} from './VisualQueryBuilder';
