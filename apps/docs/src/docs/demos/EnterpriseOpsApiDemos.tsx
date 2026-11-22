import {
  ApiRequestBuilder,
  ApprovalChainStrip,
  AuditTrailFeed,
  CsvColumnMapper,
  FeatureFlagRollout,
  SlaCountdownTimer,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface EnterpriseOpsApiDemosProps {
  componentId: string;
}

export function EnterpriseOpsApiDemos({ componentId }: EnterpriseOpsApiDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'csv-column-mapper':
      return (
        <div className="w-full max-w-4xl">
          <CsvColumnMapper
            title="Customer Ledger CSV Importer"
            onImport={(payload) =>
              dispatch(
                pushToast({
                  title: `Imported ${payload.validRows.length} valid row(s) (${payload.errors.length} error(s) skipped)`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'api-request-builder':
      return (
        <div className="w-full max-w-4xl">
          <ApiRequestBuilder title="Refractor Optical Edge API Console" />
        </div>
      );

    case 'feature-flag-rollout':
      return (
        <div className="w-full max-w-2xl">
          <FeatureFlagRollout
            flagKey="prism.optical_raytracer_v2"
            title="Optical Raytracer Pipeline"
          />
        </div>
      );

    case 'approval-chain-strip':
      return (
        <div className="w-full max-w-4xl">
          <ApprovalChainStrip
            title="Production Release Sign-Off Chain"
            mode="sequential"
            onDecision={(reviewerId, status) =>
              dispatch(
                pushToast({
                  title: `Updated ${reviewerId} -> ${status}`,
                  tone: status === 'approved' ? 'emerald' : status === 'rejected' ? 'critical' : 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'audit-trail-feed':
      return (
        <div className="w-full max-w-4xl">
          <AuditTrailFeed
            title="Enterprise Compliance & Access Audit Trail"
            onExportCsv={(_csv, count) =>
              dispatch(
                pushToast({
                  title: `Exported ${count} sanitized compliance event(s) to CSV`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'sla-countdown-timer':
      return (
        <div className="w-full max-w-xl space-y-4">
          <SlaCountdownTimer
            title="Tier-1 Optical Telemetry SLA"
            ticketId="INC-4821"
            policyLabel="P1 Response · 60m"
            remainingSeconds={1420}
            autoStart={false}
            onEscalate={(event) =>
              dispatch(
                pushToast({
                  title: `Escalated ${event.ticketId} (${event.urgency})`,
                  tone: 'amber',
                })
              )
            }
          />
          <SlaCountdownTimer
            ticketId="INC-4829"
            remainingSeconds={-95}
            autoStart={false}
            variant="compact"
            onEscalate={(event) =>
              dispatch(
                pushToast({
                  title: `Escalated breached ticket ${event.ticketId}`,
                  tone: 'critical',
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
