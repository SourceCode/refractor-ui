import {
  CombinedDateTimePicker,
  DateRangePicker,
  DurationInput,
  MonthQuarterYearPicker,
  RecurrenceBuilder,
  TimezoneSelector,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DateTimeSchedulingDemosProps {
  componentId: string;
}

export function DateTimeSchedulingDemos({ componentId }: DateTimeSchedulingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'date-range-picker':
      return (
        <div className="w-full max-w-3xl">
          <DateRangePicker
            referenceDate="2026-11-21"
            defaultValue={{ start: '2026-11-14', end: '2026-11-21' }}
            onChange={(range) =>
              dispatch(
                pushToast({
                  title: 'Updated date range',
                  description: `${range.start ?? '—'} → ${range.end ?? '—'}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'combined-date-time-picker':
      return (
        <div className="w-full max-w-2xl">
          <CombinedDateTimePicker
            clockFormat="12h"
            defaultValue="2026-11-21T14:30"
            onChange={(iso) =>
              dispatch(pushToast({ title: 'Selected timestamp', description: iso, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'duration-input':
      return (
        <div className="w-full max-w-xl">
          <DurationInput
            defaultValueSeconds={9000}
            showDays
            showSeconds
            onChange={(secs) =>
              dispatch(pushToast({ title: `Duration updated`, description: `${secs}s total`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'recurrence-builder':
      return (
        <div className="w-full max-w-2xl">
          <RecurrenceBuilder
            defaultValue={{
              frequency: 'weekly',
              interval: 2,
              weekdays: [2, 4],
              monthDay: 1,
              hour: 9,
              minute: 30,
              endKind: 'until',
              untilDate: '2026-12-31',
            }}
            onChange={(_rule, cron, summary) =>
              dispatch(pushToast({ title: summary, description: `Cron: ${cron}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'month-quarter-year-picker':
      return (
        <div className="w-full max-w-lg">
          <MonthQuarterYearPicker
            defaultValue={{ granularity: 'quarter', year: 2026, quarter: 4 }}
            onChange={(period) =>
              dispatch(
                pushToast({
                  title: 'Updated reporting period',
                  description: `${period.granularity.toUpperCase()} · ${period.year}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'timezone-selector':
      return (
        <div className="w-full max-w-md">
          <TimezoneSelector
            defaultOpen
            defaultValue="America/Los_Angeles"
            onChange={(tzId, entry) =>
              dispatch(
                pushToast({
                  title: `Timezone: ${entry.label}`,
                  description: `${tzId} (${entry.offsetLabel})`,
                  tone: 'emerald',
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
