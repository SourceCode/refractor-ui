import {
  AnomalyForecastChart,
  CapacityAllocationStrip,
  DistributedTraceWaterfall,
  FlameGraphChart,
  ServiceTopologyMap,
  UptimeStatusBar,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ObservabilityWidgetsDemosProps {
  componentId: string;
}

export function ObservabilityWidgetsDemos({ componentId }: ObservabilityWidgetsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'flame-graph-chart':
      return (
        <div className="w-full max-w-3xl">
          <FlameGraphChart
            title="Node.js API Server CPU Flame Graph"
            onSelectFrame={(m) =>
              dispatch(
                pushToast({
                  title: `${m.name}: ${m.totalValue.toFixed(1)}ms (${m.rootSharePct.toFixed(1)}%)`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'distributed-trace-waterfall':
      return (
        <div className="w-full max-w-3xl">
          <DistributedTraceWaterfall
            title="Checkout API OpenTelemetry Trace"
            traceId="tr-9f4a-8c21"
            onSelectSpan={(span) =>
              dispatch(
                pushToast({
                  title: `${span.service} · ${span.operation} (${span.durationMs.toFixed(1)}ms)`,
                  tone: span.status === 'error' ? 'critical' : 'info',
                })
              )
            }
          />
        </div>
      );

    case 'uptime-status-bar':
      return (
        <div className="w-full max-w-3xl">
          <UptimeStatusBar
            serviceName="Core API Edge Gateway (us-east / eu-central)"
            slaTargetPct={99.9}
          />
        </div>
      );

    case 'service-topology-map':
      return (
        <div className="w-full max-w-3xl">
          <ServiceTopologyMap
            title="Production Mesh Dependency Map"
            onSelectNode={(node) =>
              dispatch(
                pushToast({
                  title: `${node.label} (${node.health.toUpperCase()} · ${node.p95Ms}ms P95)`,
                  tone: node.health === 'error' ? 'critical' : node.health === 'degraded' ? 'amber' : 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'capacity-allocation-strip':
      return (
        <div className="w-full max-w-3xl">
          <CapacityAllocationStrip
            title="Primary Kubernetes NVMe Storage Pool"
            total={1000}
            unit="GB"
          />
        </div>
      );

    case 'anomaly-forecast-chart':
      return (
        <div className="w-full max-w-3xl">
          <AnomalyForecastChart
            title="Edge Ingress Throughput & Anomaly Forecast"
            unit="req/s"
            onSelectPoint={(summary) =>
              dispatch(
                pushToast({
                  title: `${summary.point.label}: ${summary.direction.toUpperCase()}`,
                  tone: summary.direction === 'normal' ? 'emerald' : 'critical',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
