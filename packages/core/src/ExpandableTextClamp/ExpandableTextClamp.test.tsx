import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ExpandableTextClamp,
  type TextClampLines,
  type TextClampLinesMap,
} from './index';

const LONG_SAMPLE_TEXT =
  'Refractor Optical Glass surfaces blend specular rim reflections, caustic light dispersion, and strict WCAG contrast tokens across light and dark themes. Long descriptions clamp predictably and expand on demand.';

const SHORT_SAMPLE_TEXT = 'Concise optical summary well below the threshold.';

describe('ExpandableTextClamp', () => {
  it('clamps long text by default with optical fade mask, ARIA disclosure attributes, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ExpandableTextClamp: {
              className: 'theme-clamp',
              style: { maxWidth: '520px' },
            },
          },
        }}
      >
        <ExpandableTextClamp
          ref={ref}
          text={LONG_SAMPLE_TEXT}
          className="local-clamp"
          style={{ marginTop: '8px' }}
          xstyle={{ '--prism-blur-px': '16px' }}
          aria-label="Release overview"
          data-testid="clamp-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('clamp-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-expandable-text-clamp',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-clamp',
      'local-clamp'
    );
    expect(root).toHaveStyle({ maxWidth: '520px', marginTop: '8px' });
    expect(root).toHaveAttribute('aria-label', 'Release overview');
    expect(root).toHaveAttribute('data-clamped', 'true');
    expect(root).toHaveAttribute('data-expandable', 'true');
    expect(root).toHaveAttribute('data-lines', '3');
    expect(root).toHaveAttribute('data-fade-mask', 'true');
    expect(root).not.toHaveAttribute('data-expanded');
    expect(root).not.toHaveAttribute('data-empty');

    const content = screen.getByTestId('expandable-text-content');
    expect(content.tagName).toBe('P');
    expect(content).toHaveTextContent(LONG_SAMPLE_TEXT);
    expect(content).toHaveAttribute('data-clamped', 'true');
    expect(content).toHaveAttribute('data-lines', '3');
    expect(content).toHaveStyle({ overflow: 'hidden' });
    expect(content.id).not.toBe('');

    const fadeMask = screen.getByTestId('expandable-text-fade');
    expect(fadeMask).toHaveAttribute('aria-hidden', 'true');
    expect(fadeMask).toHaveClass(
      'refractor-expandable-text-clamp__fade',
      'pointer-events-none'
    );
    expect(fadeMask.getAttribute('style') ?? '').toContain('--prism-surface');

    const toggle = screen.getByTestId('expandable-text-toggle');
    expect(toggle).toHaveAttribute('type', 'button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', content.id);
    expect(toggle).toHaveTextContent('Read more');
    expect(toggle).toHaveClass('prism-focus-ring');
    expect(screen.getByTestId('expandable-text-icon-down')).toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-icon-up')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-telemetry')
    ).not.toBeInTheDocument();
  });

  it('toggles smoothly between collapsed and expanded states in uncontrolled mode with reading telemetry', () => {
    const onExpandedChange = vi.fn();

    render(
      <ExpandableTextClamp
        text={LONG_SAMPLE_TEXT}
        onExpandedChange={onExpandedChange}
        data-testid="uncontrolled-root"
      />
    );

    const root = screen.getByTestId('uncontrolled-root');
    const toggle = screen.getByTestId('expandable-text-toggle');
    const content = screen.getByTestId('expandable-text-content');

    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledTimes(1);
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    expect(root).toHaveAttribute('data-expanded', 'true');
    expect(root).not.toHaveAttribute('data-clamped');
    expect(root).not.toHaveAttribute('data-fade-mask');
    expect(content).not.toHaveAttribute('data-clamped');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Show less');
    expect(screen.getByTestId('expandable-text-icon-up')).toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-icon-down')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-fade')
    ).not.toBeInTheDocument();

    const telemetry = screen.getByTestId('expandable-text-telemetry');
    const expectedWords = LONG_SAMPLE_TEXT.trim().split(/\s+/).length;
    const expectedChars = LONG_SAMPLE_TEXT.trim().length;
    expect(telemetry).toHaveTextContent(
      `${expectedWords} words·${expectedChars} chars`
    );

    fireEvent.click(toggle);

    expect(onExpandedChange).toHaveBeenCalledTimes(2);
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
    expect(root).not.toHaveAttribute('data-expanded');
    expect(root).toHaveAttribute('data-clamped', 'true');
    expect(root).toHaveAttribute('data-fade-mask', 'true');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('Read more');
    expect(screen.getByTestId('expandable-text-fade')).toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-telemetry')
    ).not.toBeInTheDocument();
  });

  it('honors defaultExpanded and controlled expanded state transitions', () => {
    render(
      <ExpandableTextClamp
        text={LONG_SAMPLE_TEXT}
        defaultExpanded
        data-testid="default-expanded-root"
      />
    );

    const defaultRoot = screen.getByTestId('default-expanded-root');
    expect(defaultRoot).toHaveAttribute('data-expanded', 'true');
    expect(
      screen.queryByTestId('expandable-text-fade')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('expandable-text-telemetry')).toBeInTheDocument();

    // Controlled without state update stays clamped while firing callback
    const controlledSpy = vi.fn();
    function ControlledHarness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <ExpandableTextClamp
          text={LONG_SAMPLE_TEXT}
          expanded={isOpen}
          onExpandedChange={(next) => {
            controlledSpy(next);
            setIsOpen(next);
          }}
          data-testid="controlled-root"
        />
      );
    }

    const { rerender } = render(
      <ExpandableTextClamp
        text={LONG_SAMPLE_TEXT}
        expanded={false}
        onExpandedChange={controlledSpy}
        data-testid="locked-controlled-root"
      />
    );

    const lockedToggle = screen.getAllByTestId('expandable-text-toggle')[1];
    expect(lockedToggle).toBeDefined();
    fireEvent.click(lockedToggle!);
    expect(controlledSpy).toHaveBeenCalledWith(true);
    expect(
      screen.getByTestId('locked-controlled-root')
    ).toHaveAttribute('data-clamped', 'true');

    rerender(<ControlledHarness />);
    const managedRoot = screen.getByTestId('controlled-root');
    const managedToggle = screen.getAllByTestId('expandable-text-toggle')[1]!;
    expect(managedRoot).toHaveAttribute('data-clamped', 'true');

    fireEvent.click(managedToggle);
    expect(managedRoot).toHaveAttribute('data-expanded', 'true');

    fireEvent.click(managedToggle);
    expect(managedRoot).toHaveAttribute('data-clamped', 'true');
  });

  it('supports all TextClampLines variants, showFadeMask=false, custom labels, and singular word telemetry', () => {
    const lineVariants: ReadonlyArray<keyof TextClampLinesMap & TextClampLines> =
      [2, 3, 4, 5, 6];

    const { rerender } = render(
      <ExpandableTextClamp
        text={LONG_SAMPLE_TEXT}
        lines={2}
        showFadeMask={false}
        expandLabel="Expand details"
        collapseLabel="Collapse details"
        data-testid="variant-root"
      />
    );

    const root = screen.getByTestId('variant-root');
    const toggle = screen.getByTestId('expandable-text-toggle');
    expect(root).toHaveAttribute('data-lines', '2');
    expect(root).not.toHaveAttribute('data-fade-mask');
    expect(
      screen.queryByTestId('expandable-text-fade')
    ).not.toBeInTheDocument();
    expect(toggle).toHaveTextContent('Expand details');

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('Collapse details');

    for (const lineCount of lineVariants) {
      rerender(
        <ExpandableTextClamp
          text={LONG_SAMPLE_TEXT}
          lines={lineCount}
          data-testid="variant-root"
        />
      );
      expect(root).toHaveAttribute('data-lines', String(lineCount));
      expect(screen.getByTestId('expandable-text-content')).toHaveAttribute(
        'data-lines',
        String(lineCount)
      );
    }

    // Single uninterrupted token above min threshold exercises singular "1 word"
    const singleToken = 'a'.repeat(32);
    rerender(
      <ExpandableTextClamp
        text={singleToken}
        charThreshold={20}
        expanded
        data-testid="variant-root"
      />
    );
    expect(screen.getByTestId('expandable-text-telemetry')).toHaveTextContent(
      '1 word·32 chars'
    );
  });

  it('omits the toggle cleanly for short, boundary, whitespace-padded, and empty text (negative tests)', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <ExpandableTextClamp
        ref={ref}
        text={SHORT_SAMPLE_TEXT}
        data-testid="short-root"
      />
    );

    const root = screen.getByTestId('short-root');
    expect(ref.current).toBe(root);
    expect(root).not.toHaveAttribute('data-expandable');
    expect(root).not.toHaveAttribute('data-clamped');
    expect(root).not.toHaveAttribute('data-expanded');
    expect(root).not.toHaveAttribute('data-fade-mask');
    expect(root).not.toHaveAttribute('data-empty');
    expect(
      screen.queryByTestId('expandable-text-toggle')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('expandable-text-fade')
    ).not.toBeInTheDocument();

    // Exact threshold boundary (140 trimmed chars) omits toggle
    rerender(
      <ExpandableTextClamp
        ref={ref}
        text={`   ${'x'.repeat(140)}   `}
        charThreshold={140}
        data-testid="short-root"
      />
    );
    expect(
      screen.queryByTestId('expandable-text-toggle')
    ).not.toBeInTheDocument();

    // 141 trimmed chars activates toggle
    rerender(
      <ExpandableTextClamp
        ref={ref}
        text={'x'.repeat(141)}
        charThreshold={140}
        data-testid="short-root"
      />
    );
    expect(screen.getByTestId('expandable-text-toggle')).toBeInTheDocument();

    // Empty / whitespace-only text preserves host element, ref, and sets data-empty
    rerender(
      <ExpandableTextClamp
        ref={ref}
        text={'   \n\t  '}
        data-testid="short-root"
      />
    );
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).not.toHaveAttribute('data-expandable');
    expect(
      screen.queryByTestId('expandable-text-toggle')
    ).not.toBeInTheDocument();
  });

  it('clamps charThreshold to 20..2000, recovers from non-finite values, and falls back blank labels', () => {
    const { rerender } = render(
      <ExpandableTextClamp
        text={'b'.repeat(20)}
        charThreshold={5}
        data-testid="threshold-root"
      />
    );
    // Clamped min is 20, so length 20 does NOT exceed 20
    expect(
      screen.queryByTestId('expandable-text-toggle')
    ).not.toBeInTheDocument();

    rerender(
      <ExpandableTextClamp
        text={'b'.repeat(21)}
        charThreshold={-50}
        expandLabel="   "
        collapseLabel="   "
        data-testid="threshold-root"
      />
    );
    const toggle = screen.getByTestId('expandable-text-toggle');
    expect(toggle).toHaveTextContent('Read more');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('Show less');

    // Clamped max is 2000: 2000 chars stays un-clamped, 2001 chars shows toggle
    rerender(
      <ExpandableTextClamp
        text={'c'.repeat(2000)}
        charThreshold={9999}
        data-testid="threshold-root"
      />
    );
    expect(
      screen.queryByTestId('expandable-text-toggle')
    ).not.toBeInTheDocument();

    rerender(
      <ExpandableTextClamp
        text={'c'.repeat(2001)}
        charThreshold={9999}
        data-testid="threshold-root"
      />
    );
    expect(screen.getByTestId('expandable-text-toggle')).toBeInTheDocument();

    // Non-finite threshold falls back safely to default 140
    rerender(
      <ExpandableTextClamp
        text={'d'.repeat(141)}
        charThreshold={Number.NaN}
        data-testid="threshold-root"
      />
    );
    expect(screen.getByTestId('expandable-text-toggle')).toBeInTheDocument();
  });

  it('renders adversarial HTML/XSS payloads strictly as literal text without injection', () => {
    const xssPayload =
      '<script>window.__textClampXss=1</script><img src=x onerror=alert(1)> '.repeat(
        4
      );

    render(
      <ExpandableTextClamp
        text={xssPayload}
        expandLabel="<svg onload=alert(1)>"
        data-testid="xss-root"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('svg[onload]')).toBeNull();
    expect(screen.getByTestId('expandable-text-content').textContent).toBe(
      xssPayload
    );
    expect(screen.getByTestId('expandable-text-toggle')).toHaveTextContent(
      '<svg onload=alert(1)>'
    );
  });
});
