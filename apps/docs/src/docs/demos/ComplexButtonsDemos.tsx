import {
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  Download,
  FilePlus2,
  Repeat,
  Repeat1,
  Save,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ComboSplitButton,
  HoldToConfirmButton,
  MultiStateCycleButton,
  SpeedDialButton,
  StatefulAsyncButton,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ComplexButtonsDemosProps {
  componentId: string;
}

export function ComplexButtonsDemos({ componentId }: ComplexButtonsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'combo-split-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <ComboSplitButton
            label="Save Changes"
            icon={<Save className="h-4 w-4" />}
            onPrimaryClick={() =>
              dispatch(pushToast({ title: 'Saved changes immediately', tone: 'emerald' }))
            }
            actions={[
              { id: 'draft', label: 'Save as Draft', description: 'Keep unpublished in staging' },
              { id: 'exit', label: 'Save & Exit', description: 'Return to catalog overview' },
              { id: 'discard', label: 'Discard Draft', description: 'Revert unsaved edits', destructive: true },
            ]}
            onActionSelect={(action) =>
              dispatch(
                pushToast({
                  title: action.label,
                  description: action.description,
                  tone: action.destructive ? 'amber' : 'info',
                })
              )
            }
          />
        </div>
      );

    case 'hold-to-confirm-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <HoldToConfirmButton
            label="Hold to Purge Environment"
            holdingLabel="Keep holding..."
            confirmedLabel="Environment Purged"
            holdDurationMs={1000}
            onConfirm={() =>
              dispatch(pushToast({ title: 'Destructive action confirmed', tone: 'amber' }))
            }
          />
          <HoldToConfirmButton
            tone="primary"
            label="Hold to Deploy"
            holdDurationMs={800}
            onConfirm={() =>
              dispatch(pushToast({ title: 'Deployment initiated', tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'stateful-async-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <StatefulAsyncButton
            idleLabel="Publish Package"
            loadingLabel="Publishing..."
            successLabel="Published"
            onAction={async () => {
              await new Promise((resolve) => setTimeout(resolve, 650));
              dispatch(pushToast({ title: 'Async publish succeeded', tone: 'emerald' }));
            }}
          />
          <StatefulAsyncButton
            idleLabel="Simulate Error"
            loadingLabel="Retrying..."
            errorLabel="Network Error"
            onAction={async () => {
              await new Promise((resolve) => setTimeout(resolve, 450));
              throw new Error('Simulated timeout');
            }}
          />
        </div>
      );

    case 'multi-state-cycle-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <MultiStateCycleButton
            states={[
              { id: 'asc', label: 'Sort Ascending', icon: <ArrowUpAZ className="h-4 w-4" />, tone: 'primary' },
              { id: 'desc', label: 'Sort Descending', icon: <ArrowDownAZ className="h-4 w-4" />, tone: 'secondary' },
              { id: 'none', label: 'Unsorted', icon: <ArrowUpDown className="h-4 w-4" />, tone: 'neutral' },
            ]}
            onChange={(_id, opt) =>
              dispatch(pushToast({ title: `Sort state: ${opt.label}`, tone: 'info' }))
            }
          />
          <MultiStateCycleButton
            states={[
              { id: 'off', label: 'Repeat Off', icon: <Repeat className="h-4 w-4" />, tone: 'neutral' },
              { id: 'all', label: 'Repeat All', icon: <Repeat className="h-4 w-4" />, tone: 'emerald' },
              { id: 'one', label: 'Repeat One', icon: <Repeat1 className="h-4 w-4" />, tone: 'amber' },
            ]}
          />
        </div>
      );

    case 'speed-dial-button':
      return (
        <div className="flex min-h-[140px] w-full items-center justify-center gap-10">
          <SpeedDialButton
            direction="right"
            defaultOpen
            actions={[
              {
                id: 'new',
                label: 'New File',
                icon: <FilePlus2 className="h-4 w-4" />,
                tone: 'primary',
                onSelect: () => dispatch(pushToast({ title: 'Created new file', tone: 'emerald' })),
              },
              {
                id: 'export',
                label: 'Export Bundle',
                icon: <Download className="h-4 w-4" />,
                tone: 'secondary',
                onSelect: () => dispatch(pushToast({ title: 'Export started', tone: 'info' })),
              },
              {
                id: 'share',
                label: 'Share Link',
                icon: <Share2 className="h-4 w-4" />,
                tone: 'emerald',
                onSelect: () => dispatch(pushToast({ title: 'Copied share URL', tone: 'emerald' })),
              },
              {
                id: 'spark',
                label: 'AI Enhance',
                icon: <Sparkles className="h-4 w-4" />,
                tone: 'amber',
                onSelect: () => dispatch(pushToast({ title: 'Running optical polish', tone: 'info' })),
              },
              {
                id: 'clear',
                label: 'Clear Draft',
                icon: <Trash2 className="h-4 w-4" />,
                tone: 'rose',
                onSelect: () => dispatch(pushToast({ title: 'Cleared draft', tone: 'amber' })),
              },
            ]}
          />
        </div>
      );

    default:
      return null;
  }
}
