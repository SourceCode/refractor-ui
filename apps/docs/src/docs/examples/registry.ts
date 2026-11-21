import { AI_WORKFLOW_EXAMPLES } from './AiWorkflowExamples';
import { ANALYTICS_REPORTING_EXAMPLES } from './AnalyticsReportingExamples';
import { AUTH_SECURITY_EXAMPLES } from './AuthSecurityExamples';
import { COMMERCE_BILLING_EXAMPLES } from './CommerceBillingExamples';
import { DEVELOPER_OPS_EXAMPLES } from './DeveloperOpsExamples';
import { WORKSPACE_MOBILE_EXAMPLES } from './WorkspaceMobileExamples';
import type { ExampleScreenSpec } from './types';

export {
  EXAMPLE_DOMAINS,
  type ExampleDeviceTarget,
  type ExampleDomainCategory,
  type ExampleDomainMeta,
  type ExampleScreenSpec,
} from './types';

export const EXAMPLE_SCREENS: ReadonlyArray<ExampleScreenSpec> = [
  ...AUTH_SECURITY_EXAMPLES,
  ...ANALYTICS_REPORTING_EXAMPLES,
  ...AI_WORKFLOW_EXAMPLES,
  ...DEVELOPER_OPS_EXAMPLES,
  ...COMMERCE_BILLING_EXAMPLES,
  ...WORKSPACE_MOBILE_EXAMPLES,
];
