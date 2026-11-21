import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Timeline, type TimelineEntry } from './Timeline';

const ENTRIES: TimelineEntry[] = [
  {
    id: 't1',
    timestamp: '09:15 AM',
    title: 'Optical Token Calibration',
    detail: 'Established specular highlight curves.',
    tone: 'emerald',
  },
  {
    id: 't2',
    timestamp: '11:40 AM',
    title: 'Component Verification',
    detail: 'Completed keyboard and dual-theme contrast audit.',
    tone: 'cobalt',
  },
  {
    id: 't3',
    timestamp: '02:30 PM',
    title: 'Documentation Publish',
    detail: 'Published live interactive playground.',
    tone: 'amber',
  },
];

describe('Timeline', () => {
  it('renders chronological entries, tone markers, connectors, ref forwarding, and className passthrough', () => {
    const ref = createRef<HTMLOListElement>();

    render(
      <Timeline
        ref={ref}
        entries={ENTRIES}
        className="custom-timeline"
        data-testid="timeline"
      />
    );

    const list = screen.getByTestId('timeline');
    expect(ref.current).toBe(list);
    expect(list.tagName).toBe('OL');
    expect(list).toHaveClass('refractor-timeline', 'prism-slab', 'custom-timeline');

    expect(screen.getByText('1')).toHaveClass('prism-emerald');
    expect(screen.getByText('2')).toHaveClass('prism-btn-cobalt');
    expect(screen.getByText('3')).toHaveClass('prism-btn-primary');

    expect(screen.getByText('Optical Token Calibration')).toBeInTheDocument();
    expect(screen.getByText('11:40 AM')).toBeInTheDocument();
    expect(screen.getByText('Published live interactive playground.')).toBeInTheDocument();

    const connectors = list.querySelectorAll('.w-px');
    expect(connectors).toHaveLength(2);
  });

  it('handles empty entries array and applies theme overrides (negative test)', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Timeline: { className: 'theme-timeline', style: { maxWidth: '480px' } } },
        }}
      >
        <Timeline entries={[]} className="local-timeline" data-testid="empty-timeline" />
      </PrismThemeProvider>
    );

    const list = screen.getByTestId('empty-timeline');
    expect(list).toHaveClass('refractor-timeline', 'theme-timeline', 'local-timeline');
    expect(list).toHaveAttribute('data-empty', 'true');
    expect(list).toHaveStyle({ maxWidth: '480px' });
    expect(list.children).toHaveLength(0);
  });

  it('safely renders adversarial XSS payloads in title, detail, and timestamp as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <Timeline entries={[{ id: 'xss', timestamp: payload, title: payload, detail: payload }]} />
    );
    expect(screen.getAllByText(payload)).toHaveLength(3);
    expect(document.querySelector('script')).toBeNull();
  });
});
