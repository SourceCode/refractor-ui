import {
  ChordDiagram,
  NetworkForceGraph,
  SankeyDiagram,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface RelationalFlowChartsDemosProps {
  componentId: string;
}

export function RelationalFlowChartsDemos({ componentId }: RelationalFlowChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'sankey-diagram':
      return (
        <div className="w-full max-w-2xl">
          <SankeyDiagram
            title="Traffic Acquisition to Conversion Flow"
            valueUnit="k"
            nodes={[
              { id: 'organic', label: 'Organic', stage: 0, tone: 'emerald' },
              { id: 'paid', label: 'Paid', stage: 0, tone: 'secondary' },
              { id: 'referral', label: 'Referral', stage: 0, tone: 'primary' },
              { id: 'docs', label: 'Docs', stage: 1, tone: 'secondary' },
              { id: 'workbench', label: 'Workbench', stage: 1, tone: 'primary' },
              { id: 'adopted', label: 'Adopted', stage: 2, tone: 'emerald' },
              { id: 'bounce', label: 'Bounced', stage: 2, tone: 'rose' },
            ]}
            links={[
              { source: 'organic', target: 'docs', value: 42 },
              { source: 'organic', target: 'workbench', value: 24 },
              { source: 'paid', target: 'workbench', value: 30 },
              { source: 'referral', target: 'docs', value: 18 },
              { source: 'docs', target: 'adopted', value: 44 },
              { source: 'docs', target: 'bounce', value: 16 },
              { source: 'workbench', target: 'adopted', value: 46 },
              { source: 'workbench', target: 'bounce', value: 8 },
            ]}
            onSelectLink={(link, source, target) =>
              dispatch(
                pushToast({
                  title: `${source.label} → ${target.label}`,
                  description: `${link.value}k sessions`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'network-force-graph':
      return (
        <div className="w-full max-w-2xl">
          <NetworkForceGraph
            title="Microservice Dependency Topology"
            nodes={[
              { id: 'edge', label: 'Edge Proxy', group: 'Ingress', weight: 10, tone: 'primary' },
              { id: 'auth', label: 'Auth Gateway', group: 'Security', weight: 8, tone: 'amber' },
              { id: 'api', label: 'Core API', group: 'Compute', weight: 12, tone: 'secondary' },
              { id: 'worker', label: 'Async Worker', group: 'Compute', weight: 7, tone: 'secondary' },
              { id: 'cache', label: 'Redis Cache', group: 'Storage', weight: 6, tone: 'emerald' },
              { id: 'db', label: 'Primary DB', group: 'Storage', weight: 11, tone: 'emerald' },
            ]}
            edges={[
              { id: 'e1', source: 'edge', target: 'auth', label: 'JWT', weight: 3 },
              { id: 'e2', source: 'edge', target: 'api', label: 'HTTPS', weight: 5 },
              { id: 'e3', source: 'auth', target: 'cache', label: 'Session', weight: 2 },
              { id: 'e4', source: 'api', target: 'cache', label: 'Read', weight: 4 },
              { id: 'e5', source: 'api', target: 'db', label: 'SQL', weight: 5 },
              { id: 'e6', source: 'api', target: 'worker', label: 'Queue', weight: 3 },
              { id: 'e7', source: 'worker', target: 'db', label: 'Write', weight: 4 },
            ]}
            onSelectNode={(node, degree) =>
              dispatch(
                pushToast({
                  title: node.label,
                  description: `${node.group ?? 'Node'} · ${degree} connections`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'chord-diagram':
      return (
        <div className="w-full max-w-xl">
          <ChordDiagram
            title="Cross-Region Data Replication Flows"
            valueUnit=" TB"
            entities={[
              { id: 'us', label: 'US-West', tone: 'primary' },
              { id: 'eu', label: 'EU-Central', tone: 'secondary' },
              { id: 'ap', label: 'AP-South', tone: 'emerald' },
              { id: 'sa', label: 'SA-East', tone: 'amber' },
            ]}
            flows={[
              { source: 'us', target: 'eu', value: 48 },
              { source: 'eu', target: 'us', value: 36 },
              { source: 'us', target: 'ap', value: 28 },
              { source: 'ap', target: 'eu', value: 22 },
              { source: 'eu', target: 'sa', value: 14 },
              { source: 'sa', target: 'us', value: 18 },
            ]}
          />
        </div>
      );

    default:
      return null;
  }
}
