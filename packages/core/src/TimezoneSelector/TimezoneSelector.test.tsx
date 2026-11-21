import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_TIMEZONES,
  TimezoneSelector,
  formatTimezoneNow,
  type TimezoneEntry,
} from './index';

// 2026-11-21T16:30:00Z (Standard Time in Northern Hemisphere)
const FIXED_TIMESTAMP_MS = Date.UTC(2026, 10, 21, 16, 30, 0);

describe('DEFAULT_TIMEZONES & formatTimezoneNow', () => {
  it('provides at least 12 curated global timezones including all canonical zones', () => {
    expect(DEFAULT_TIMEZONES.length).toBeGreaterThanOrEqual(12);
    const ids = DEFAULT_TIMEZONES.map((tz) => tz.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'UTC',
        'America/Los_Angeles',
        'America/Denver',
        'America/Chicago',
        'America/New_York',
        'America/Sao_Paulo',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Dubai',
        'Asia/Kolkata',
        'Asia/Singapore',
        'Asia/Tokyo',
        'Australia/Sydney',
        'Pacific/Auckland',
      ])
    );
  });

  it('formats 24-hour local times deterministically and falls back to --:-- on invalid zones', () => {
    expect(formatTimezoneNow('UTC', FIXED_TIMESTAMP_MS)).toBe('16:30');
    expect(formatTimezoneNow('America/Los_Angeles', FIXED_TIMESTAMP_MS)).toBe('08:30');
    expect(formatTimezoneNow('Asia/Tokyo', FIXED_TIMESTAMP_MS)).toBe('01:30');
    expect(formatTimezoneNow('Asia/Kolkata', FIXED_TIMESTAMP_MS)).toBe('22:00');
    expect(formatTimezoneNow('UTC')).toMatch(/^\d{2}:\d{2}$/);
    expect(formatTimezoneNow('UTC', Number.NaN)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatTimezoneNow('   ', FIXED_TIMESTAMP_MS)).toBe('--:--');
    expect(formatTimezoneNow('Mars/Olympus_Mons', FIXED_TIMESTAMP_MS)).toBe('--:--');
  });
});

describe('TimezoneSelector', () => {
  it('renders prism-crystal trigger with ref, displayName, theme overrides, live time, and opens prism-slab listbox', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TimezoneSelector: {
              className: 'theme-tz-selector',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <TimezoneSelector
          ref={ref}
          referenceTimestamp={FIXED_TIMESTAMP_MS}
          className="local-tz-selector"
          style={{ maxWidth: '420px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tz-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tz-root');
    expect(TimezoneSelector.displayName).toBe('TimezoneSelector');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-timezone-selector',
      'theme-tz-selector',
      'local-tz-selector'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.1px', maxWidth: '420px' });
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-timezone', 'America/Los_Angeles');
    expect(root).not.toHaveAttribute('data-open');

    expect(screen.getByText('Timezone')).toBeInTheDocument();

    const trigger = screen.getByTestId('timezone-trigger');
    expect(trigger).toHaveClass('prism-crystal');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent(
      'Los Angeles (Pacific)'
    );
    expect(screen.getByTestId('timezone-selected-offset')).toHaveTextContent('UTC-08:00');
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('08:30');
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();

    // Open dropdown panel
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');

    const popover = screen.getByTestId('timezone-popover');
    expect(popover).toHaveClass('prism-slab');
    expect(screen.getByRole('listbox', { name: 'Timezone' })).toBeInTheDocument();
    expect(screen.getByTestId('timezone-option-America/Los_Angeles')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('timezone-region-Asia/Tokyo')).toHaveTextContent('Asia');
    expect(screen.getByTestId('timezone-offset-Asia/Tokyo')).toHaveTextContent('UTC+09:00');
    expect(screen.getByTestId('timezone-time-Asia/Tokyo')).toHaveTextContent('01:30');
  });

  it('filters case-insensitively by id, label, region, and offsetLabel, shows empty state, and selects on click', () => {
    const onChange = vi.fn<(tzId: string, entry: TimezoneEntry) => void>();

    render(
      <TimezoneSelector
        defaultOpen
        referenceTimestamp={FIXED_TIMESTAMP_MS}
        onChange={onChange}
      />
    );

    const searchInput = screen.getByTestId('timezone-search-input');

    // Filter by IANA id
    fireEvent.change(searchInput, { target: { value: 'kolkata' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('timezone-option-Asia/Kolkata')).toBeInTheDocument();

    // Filter by label
    fireEvent.change(searchInput, { target: { value: 'BRASILIA' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('timezone-option-America/Sao_Paulo')).toBeInTheDocument();

    // Filter by region
    fireEvent.change(searchInput, { target: { value: 'oceania' } });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByTestId('timezone-option-Australia/Sydney')).toBeInTheDocument();
    expect(screen.getByTestId('timezone-option-Pacific/Auckland')).toBeInTheDocument();

    // Filter by offsetLabel
    fireEvent.change(searchInput, { target: { value: '+05:30' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByTestId('timezone-option-Asia/Kolkata')).toBeInTheDocument();

    // Unmatched search shows empty state
    fireEvent.change(searchInput, { target: { value: 'atlantis' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByTestId('timezone-empty')).toHaveTextContent('No matching timezones');
    expect(screen.getByTestId('timezone-empty')).toHaveTextContent('atlantis');

    // Clear search button restores full catalog
    fireEvent.click(screen.getByTestId('timezone-search-clear'));
    expect(screen.getAllByRole('option')).toHaveLength(DEFAULT_TIMEZONES.length);

    // Click Asia/Tokyo to select and close
    fireEvent.click(screen.getByTestId('timezone-option-Asia/Tokyo'));
    expect(onChange).toHaveBeenCalledWith('Asia/Tokyo', {
      id: 'Asia/Tokyo',
      label: 'Tokyo (Japan)',
      region: 'Asia',
      offsetLabel: 'UTC+09:00',
    });
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent('Tokyo (Japan)');
    expect(screen.getByTestId('timezone-selected-offset')).toHaveTextContent('UTC+09:00');
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('01:30');
  });

  it('supports ArrowDown, ArrowUp, mouse hover, IME-safe Enter, and Escape keyboard navigation', () => {
    const onChange = vi.fn<(tzId: string, entry: TimezoneEntry) => void>();

    render(
      <TimezoneSelector
        defaultOpen
        referenceTimestamp={FIXED_TIMESTAMP_MS}
        onChange={onChange}
      />
    );

    const searchInput = screen.getByTestId('timezone-search-input');

    // Filter down to 3 Europe options (London, Paris, Berlin)
    fireEvent.change(searchInput, { target: { value: 'europe' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(screen.getByTestId('timezone-option-Europe/London')).toHaveAttribute(
      'data-active',
      'true'
    );

    // ArrowDown moves to Paris
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    expect(screen.getByTestId('timezone-option-Europe/Paris')).toHaveAttribute(
      'data-active',
      'true'
    );

    // ArrowUp moves back to London, ArrowUp wraps to Berlin
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    expect(screen.getByTestId('timezone-option-Europe/London')).toHaveAttribute(
      'data-active',
      'true'
    );
    fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
    expect(screen.getByTestId('timezone-option-Europe/Berlin')).toHaveAttribute(
      'data-active',
      'true'
    );

    // Mouse enter moves highlight to Paris
    fireEvent.mouseEnter(screen.getByTestId('timezone-option-Europe/Paris'));
    expect(screen.getByTestId('timezone-option-Europe/Paris')).toHaveAttribute(
      'data-active',
      'true'
    );

    // Composing Enter must NOT select (IME safety)
    fireEvent.keyDown(searchInput, { key: 'Enter', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Non-composing Enter selects Europe/Paris and closes
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Europe/Paris', {
      id: 'Europe/Paris',
      label: 'Paris (Central European)',
      region: 'Europe',
      offsetLabel: 'UTC+01:00',
    });
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();

    // Reopen, test ArrowDown/ArrowUp/Enter on empty search results, and Escape on search input
    fireEvent.click(screen.getByTestId('timezone-trigger'));
    const reopenedInput = screen.getByTestId('timezone-search-input');
    fireEvent.change(reopenedInput, { target: { value: 'zzzz-no-match' } });
    fireEvent.keyDown(reopenedInput, { key: 'ArrowDown' });
    fireEvent.keyDown(reopenedInput, { key: 'ArrowUp' });
    fireEvent.keyDown(reopenedInput, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(reopenedInput, { key: 'Escape' });
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
  });

  it('closes popover on outside click and non-composing window Escape while staying open on inside click or composing Escape', () => {
    render(
      <div>
        <button type="button" data-testid="outside-target">
          Outside
        </button>
        <TimezoneSelector defaultOpen referenceTimestamp={FIXED_TIMESTAMP_MS} />
      </div>
    );

    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Non-Escape key keeps open
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Composing Escape keeps open
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Inside click keeps open
    fireEvent.mouseDown(screen.getByTestId('timezone-popover'));
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Outside mousedown closes
    fireEvent.mouseDown(screen.getByTestId('outside-target'));
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();

    // Reopen and close via window Escape
    fireEvent.click(screen.getByTestId('timezone-trigger'));
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
  });

  it('supports controlled value updates', () => {
    function ControlledTimezoneHarness() {
      const [tzId, setTzId] = useState<string>('UTC');
      return (
        <div>
          <span data-testid="controlled-tz">{tzId}</span>
          <TimezoneSelector
            value={tzId}
            onChange={(nextId) => setTzId(nextId)}
            referenceTimestamp={FIXED_TIMESTAMP_MS}
            defaultOpen
          />
        </div>
      );
    }

    render(<ControlledTimezoneHarness />);

    expect(screen.getByTestId('controlled-tz')).toHaveTextContent('UTC');
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('16:30');

    fireEvent.click(screen.getByTestId('timezone-option-America/New_York'));
    expect(screen.getByTestId('controlled-tz')).toHaveTextContent('America/New_York');
    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent('New York (Eastern)');
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('11:30');
  });

  it('handles unmatched/empty values, empty timezones list, empty label, and disabled state gracefully (negative test)', () => {
    const { rerender } = render(
      <TimezoneSelector
        value="Invalid/Zone"
        timezones={[]}
        label=""
        defaultOpen
        referenceTimestamp={FIXED_TIMESTAMP_MS}
      />
    );

    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent('Invalid/Zone');
    expect(screen.queryByTestId('timezone-selected-offset')).not.toBeInTheDocument();
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('--:--');
    expect(screen.getByTestId('timezone-empty')).toHaveTextContent('No timezones configured.');
    expect(screen.getByRole('listbox', { name: 'Timezones' })).toBeInTheDocument();

    // Empty value fallback label & toggle close then reopen when selectedId is not in list
    rerender(
      <TimezoneSelector
        value=""
        label=""
        referenceTimestamp={FIXED_TIMESTAMP_MS}
      />
    );
    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent('Select timezone');
    expect(screen.getByTestId('timezone-selected-time')).toHaveTextContent('--:--');
    // Currently open from initial defaultOpen -> click closes, second click reopens with activeIndex fallback 0
    fireEvent.click(screen.getByTestId('timezone-trigger'));
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('timezone-trigger'));
    expect(screen.getByTestId('timezone-popover')).toBeInTheDocument();

    // Disabled state blocks popover even with defaultOpen
    rerender(
      <TimezoneSelector
        disabled
        defaultOpen
        data-testid="disabled-tz"
      />
    );
    expect(screen.getByTestId('disabled-tz')).toHaveAttribute('data-disabled', 'true');
    const trigger = screen.getByTestId('timezone-trigger');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByTestId('timezone-popover')).not.toBeInTheDocument();
  });

  it('renders XSS payloads in label, custom timezone entries, and search query as literal text (adversarial test)', () => {
    const payload = '<script>window.__tzXss=1</script><img src=x onerror=alert(1)>';
    const hostileZones: TimezoneEntry[] = [
      {
        id: 'UTC',
        label: payload,
        region: payload,
        offsetLabel: payload,
      },
    ];

    render(
      <TimezoneSelector
        label={payload}
        timezones={hostileZones}
        defaultValue="UTC"
        defaultOpen
        referenceTimestamp={FIXED_TIMESTAMP_MS}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('timezone-selected-label')).toHaveTextContent(payload);

    fireEvent.change(screen.getByTestId('timezone-search-input'), {
      target: { value: payload + '-unmatched' },
    });
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('timezone-empty')).toHaveTextContent(payload);
  });
});
