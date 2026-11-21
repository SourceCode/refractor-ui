import type { ReactNode } from 'react';

export type ExampleDeviceTarget = 'web' | 'tablet' | 'mobile';

export type ExampleDomainCategory =
  | 'auth-security'
  | 'analytics-reporting'
  | 'ai-workflows'
  | 'developer-ops'
  | 'commerce-billing'
  | 'workspace-mobile';

export interface ExampleDomainMeta {
  id: ExampleDomainCategory;
  title: string;
  shortLabel: string;
  description: string;
}

export interface ExampleScreenSpec {
  id: string;
  title: string;
  domain: ExampleDomainCategory;
  domainTitle: string;
  summary: string;
  devices: ReadonlyArray<ExampleDeviceTarget>;
  defaultPreviewFrame: ExampleDeviceTarget;
  componentsUsed: ReadonlyArray<string>;
  uxScore: number;
  uxHighlights: ReadonlyArray<string>;
  fullCode: string;
  render: () => ReactNode;
}

export const EXAMPLE_DOMAINS: ReadonlyArray<ExampleDomainMeta> = [
  {
    id: 'auth-security',
    title: 'Auth, Onboarding & Security',
    shortLabel: 'Auth & Security',
    description: 'Sign-in portals, password-validated onboarding, mobile OTP flows, API key vaults, and RBAC admin consoles.',
  },
  {
    id: 'analytics-reporting',
    title: 'Analytics, Telemetry & Reports',
    shortLabel: 'Analytics & Reports',
    description: 'Executive KPI dashboards, financial report views, live SRE telemetry NOCs, geospatial traffic maps, and A/B lab reports.',
  },
  {
    id: 'ai-workflows',
    title: 'AI Chat, Copilots & Agent Workflows',
    shortLabel: 'AI & Agents',
    description: 'Streaming chat assistants, split artifact canvases, human-in-the-loop agent pipelines, multi-agent consoles, and mobile copilots.',
  },
  {
    id: 'developer-ops',
    title: 'Code Editing, Diffs & DevOps',
    shortLabel: 'Dev & Code',
    description: 'Cloud IDE workspaces, PR diff reviews, CI/CD log streamers, visual node workflow builders, and enterprise data query studios.',
  },
  {
    id: 'commerce-billing',
    title: 'E-Commerce, Products & Billing',
    shortLabel: 'Commerce & Forms',
    description: 'Faceted product browsing, 360° product detail pages, merchant new-product authoring forms, mobile checkout, and SaaS pricing.',
  },
  {
    id: 'workspace-mobile',
    title: 'Workspaces, Creative Media & Mobile Apps',
    shortLabel: 'Workspace & Mobile',
    description: 'Kanban/Gantt sprint hubs, video & audio grading studios, native-feel mobile banking & inbox apps, and tablet dispatch consoles.',
  },
];
