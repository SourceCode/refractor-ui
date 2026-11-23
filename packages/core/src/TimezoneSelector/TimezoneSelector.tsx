'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Globe, Search, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface TimezoneEntry {
  /** Canonical IANA timezone identifier (e.g. 'America/Los_Angeles', 'UTC'). */
  id: string;
  /** Human-readable city or timezone display label. */
  label: string;
  /** Geographic region label used for display and search filtering. */
  region: string;
  /** Canonical UTC offset label (e.g. 'UTC-08:00', 'UTC+05:30'). */
  offsetLabel: string;
}

export const DEFAULT_TIMEZONES: TimezoneEntry[] = [
  { id: 'UTC', label: 'Coordinated Universal Time', region: 'Global', offsetLabel: 'UTC+00:00' },
  {
    id: 'America/Los_Angeles',
    label: 'Los Angeles (Pacific)',
    region: 'Americas',
    offsetLabel: 'UTC-08:00',
  },
  { id: 'America/Denver', label: 'Denver (Mountain)', region: 'Americas', offsetLabel: 'UTC-07:00' },
  {
    id: 'America/Chicago',
    label: 'Chicago (Central)',
    region: 'Americas',
    offsetLabel: 'UTC-06:00',
  },
  {
    id: 'America/New_York',
    label: 'New York (Eastern)',
    region: 'Americas',
    offsetLabel: 'UTC-05:00',
  },
  {
    id: 'America/Sao_Paulo',
    label: 'Sao Paulo (Brasilia)',
    region: 'Americas',
    offsetLabel: 'UTC-03:00',
  },
  { id: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe', offsetLabel: 'UTC+00:00' },
  {
    id: 'Europe/Paris',
    label: 'Paris (Central European)',
    region: 'Europe',
    offsetLabel: 'UTC+01:00',
  },
  {
    id: 'Europe/Berlin',
    label: 'Berlin (Central European)',
    region: 'Europe',
    offsetLabel: 'UTC+01:00',
  },
  { id: 'Asia/Dubai', label: 'Dubai (Gulf)', region: 'Asia', offsetLabel: 'UTC+04:00' },
  { id: 'Asia/Kolkata', label: 'Kolkata (India)', region: 'Asia', offsetLabel: 'UTC+05:30' },
  { id: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia', offsetLabel: 'UTC+08:00' },
  { id: 'Asia/Tokyo', label: 'Tokyo (Japan)', region: 'Asia', offsetLabel: 'UTC+09:00' },
  {
    id: 'Australia/Sydney',
    label: 'Sydney (AEST/AEDT)',
    region: 'Oceania',
    offsetLabel: 'UTC+10:00',
  },
  {
    id: 'Pacific/Auckland',
    label: 'Auckland (NZST/NZDT)',
    region: 'Oceania',
    offsetLabel: 'UTC+12:00',
  },
];

/**
 * Formats the local 24-hour clock time (HH:MM) for an IANA timezone identifier.
 * Returns '--:--' safely when the timezone string is empty or unsupported.
 */
export function formatTimezoneNow(tzId: string, timestampMs?: number): string {
  const trimmed = tzId.trim();
  if (!trimmed) {
    return '--:--';
  }
  const resolvedMs =
    timestampMs !== undefined && Number.isFinite(timestampMs) ? timestampMs : Date.now();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: trimmed,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date(resolvedMs));
  } catch {
    return '--:--';
  }
}

type TimezoneSelectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface TimezoneSelectorProps extends TimezoneSelectorBaseProps {
  /** Controlled IANA timezone identifier. */
  value?: string;
  /** Initial timezone identifier in uncontrolled mode (defaults to 'America/Los_Angeles'). */
  defaultValue?: string;
  /** Callback fired with the selected timezone ID and full entry metadata. */
  onChange?: (tzId: string, entry: TimezoneEntry) => void;
  /** Curated selectable timezones (defaults to DEFAULT_TIMEZONES). */
  timezones?: TimezoneEntry[];
  /** Optional reference epoch timestamp in ms for deterministic live clock rendering. */
  referenceTimestamp?: number;
  /** Controls whether the dropdown slab starts open (defaults to false). */
  defaultOpen?: boolean;
  /** Field label rendered above the selector trigger (defaults to 'Timezone'). */
  label?: string;
  /** Disables opening the dropdown and changing the selected timezone. */
  disabled?: boolean;
}

function toSafeOptionId(listboxId: string, tzId: string): string {
  return `${listboxId}-opt-${tzId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function TimezoneSelectorInner({
  value,
  defaultValue = 'America/Los_Angeles',
  onChange,
  timezones = DEFAULT_TIMEZONES,
  referenceTimestamp,
  defaultOpen = false,
  label = 'Timezone',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TimezoneSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const labelId = useId();
  const listboxId = useId();
  const override = useComponentOverride('TimezoneSelector');

  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [query, setQuery] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const isOpen = open && !disabled;

  const [selectedId, setSelectedId] = useControllableState<string>({
    value,
    defaultValue,
  });

  const selectedEntry = useMemo<TimezoneEntry | undefined>(
    () => timezones.find((tz) => tz.id === selectedId),
    [timezones, selectedId]
  );

  const trimmedQuery = query.trim().toLowerCase();

  const filteredTimezones = useMemo<TimezoneEntry[]>(() => {
    if (!trimmedQuery) {
      return timezones;
    }
    return timezones.filter(
      (tz) =>
        tz.id.toLowerCase().includes(trimmedQuery) ||
        tz.label.toLowerCase().includes(trimmedQuery) ||
        tz.region.toLowerCase().includes(trimmedQuery) ||
        tz.offsetLabel.toLowerCase().includes(trimmedQuery)
    );
  }, [timezones, trimmedQuery]);

  const safeActiveIndex =
    filteredTimezones.length > 0
      ? Math.min(Math.max(activeIndex, 0), filteredTimezones.length - 1)
      : -1;
  const activeOption = safeActiveIndex >= 0 ? filteredTimezones[safeActiveIndex] : undefined;
  const activeOptionId = activeOption ? toSafeOptionId(listboxId, activeOption.id) : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const root = containerRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen]);

  const handleToggleOpen = useCallback(() => {
    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setQuery('');
        const matchedIndex = timezones.findIndex((tz) => tz.id === selectedId);
        setActiveIndex(matchedIndex >= 0 ? matchedIndex : 0);
      }
      return nextOpen;
    });
  }, [selectedId, timezones]);

  const handleSelectEntry = useCallback(
    (entry: TimezoneEntry) => {
      setSelectedId(entry.id);
      onChange?.(entry.id, entry);
      setOpen(false);
      setQuery('');
      setActiveIndex(0);
      triggerRef.current?.focus();
    },
    [onChange, setSelectedId]
  );

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredTimezones.length > 0) {
          setActiveIndex((safeActiveIndex + 1) % filteredTimezones.length);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredTimezones.length > 0) {
          setActiveIndex(
            (safeActiveIndex - 1 + filteredTimezones.length) % filteredTimezones.length
          );
        }
        return;
      }

      if (event.key === 'Enter' && activeOption) {
        event.preventDefault();
        handleSelectEntry(activeOption);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [activeOption, filteredTimezones.length, handleSelectEntry, safeActiveIndex]
  );

  const triggerTimezoneId = selectedEntry ? selectedEntry.id : selectedId;
  const triggerLocalTime = formatTimezoneNow(triggerTimezoneId, referenceTimestamp);

  const merged = mergeProps({
    themeTarget: themeProps('timezone-selector', {
      open: isOpen,
      disabled,
      timezone: selectedId || undefined,
    }),
    baseClassName: 'relative inline-block w-full max-w-md',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {label ? (
        <span
          id={labelId}
          className="block text-xs font-semibold mb-1.5 ml-1"
          style={STYLE_TEXT_SECONDARY}
        >
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? 'Timezone' : undefined}
        data-testid="timezone-trigger"
        onClick={handleToggleOpen}
        className="prism-crystal prism-focus-ring w-full min-h-12 px-3.5 py-2 rounded-2xl flex items-center justify-between gap-2.5 text-left cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
        style={STYLE_TEXT_PRIMARY}
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
            <span
              data-testid="timezone-selected-label"
              className="text-sm font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {selectedEntry ? selectedEntry.label : selectedId || 'Select timezone'}
            </span>

            {selectedEntry ? (
              <span
                data-testid="timezone-selected-offset"
                className="prism-btn-secondary inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold whitespace-nowrap shrink-0"
              >
                {selectedEntry.offsetLabel}
              </span>
            ) : null}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span
            data-testid="timezone-selected-time"
            className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono tabular-nums font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            <Clock
              aria-hidden="true"
              className="w-3 h-3 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <span>{triggerLocalTime}</span>
          </span>

          <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
          </span>
        </span>
      </button>

      {isOpen ? (
        <div
          data-testid="timezone-popover"
          className="prism-slab absolute left-0 right-0 mt-2 p-3 z-40 space-y-2.5"
        >
          <div className="prism-well rounded-xl px-3 py-2 flex items-center gap-2">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-label="Search timezones"
              data-testid="timezone-search-input"
              value={query}
              placeholder="Search city, IANA zone, region, or UTC..."
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-transparent text-xs focus:outline-none"
              style={STYLE_TEXT_PRIMARY}
            />
            {query.length > 0 ? (
              <button
                type="button"
                aria-label="Clear search"
                data-testid="timezone-search-clear"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                }}
                className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            aria-label={!label ? 'Timezones' : undefined}
            className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5"
          >
            {filteredTimezones.length === 0 ? (
              <div
                data-testid="timezone-empty"
                className="prism-well rounded-xl px-3.5 py-5 text-center space-y-1"
              >
                <p
                  className="text-xs font-semibold"
                  style={STYLE_TEXT_PRIMARY}
                >
                  No matching timezones
                </p>
                <p className="text-[11px]" style={STYLE_TEXT_SECONDARY}>
                  {query.trim()
                    ? `No zones matched "${query.trim()}".`
                    : 'No timezones configured.'}
                </p>
              </div>
            ) : (
              filteredTimezones.map((tz, index) => {
                const isSelected = tz.id === selectedId;
                const isActive = index === safeActiveIndex;
                const optionLocalTime = formatTimezoneNow(tz.id, referenceTimestamp);

                return (
                  <button
                    key={tz.id}
                    id={toSafeOptionId(listboxId, tz.id)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive ? 'true' : undefined}
                    data-testid={`timezone-option-${tz.id}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectEntry(tz)}
                    className={cx(
                      isSelected || isActive ? 'prism-crystal' : 'prism-well',
                      'prism-focus-ring w-full rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 text-left cursor-pointer enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
                    )}
                    style={
                      isSelected
                        ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
                        : isActive
                          ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-secondary-main)' }
                          : undefined
                    }
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div
                        className="text-xs font-semibold truncate"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {tz.label}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className="font-mono truncate"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {tz.id}
                        </span>
                        <span
                          aria-hidden="true"
                          style={STYLE_TEXT_DISABLED}
                        >
                          ·
                        </span>
                        <span
                          data-testid={`timezone-region-${tz.id}`}
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {tz.region}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        data-testid={`timezone-offset-${tz.id}`}
                        className="prism-well px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {tz.offsetLabel}
                      </span>

                      <span
                        data-testid={`timezone-time-${tz.id}`}
                        className="prism-well px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {optionLocalTime}
                      </span>

                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="prism-emerald w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                        >
                          <Check className="w-3 h-3 stroke-[2.6]" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const TimezoneSelector = memo(TimezoneSelectorInner);
TimezoneSelector.displayName = 'TimezoneSelector';
