import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FloatingTableOfContents,
  type TocHeadingEntry,
  type TocHeadingLevel,
  type TocHeadingLevelMap,
} from './index';

function createDomHeading(id: string, top: number): {
  element: HTMLHeadingElement;
  setTop: (nextTop: number) => void;
} {
  let currentTop = top;
  const element = document.createElement('h2');
  element.id = id;
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: currentTop,
      top: currentTop,
      bottom: currentTop + 32,
      left: 0,
      right: 600,
      width: 600,
      height: 32,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(element);
  return {
    element,
    setTop: (nextTop: number) => {
      currentTop = nextTop;
    },
  };
}

describe('FloatingTableOfContents', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders 6 default nested H1/H2/H3 headings, React 19 ref, theme overrides, optical tokens, and zero raw color literals', () => {
    const levelMapKeys: ReadonlyArray<keyof TocHeadingLevelMap> = [1, 2, 3];
    const typedLevels: ReadonlyArray<TocHeadingLevel> = levelMapKeys;
    expect(typedLevels).toEqual([1, 2, 3]);

    const ref = createRef<HTMLElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            FloatingTableOfContents: {
              className: 'theme-toc-card',
              style: { maxWidth: '280px' },
            },
          },
        }}
      >
        <FloatingTableOfContents
          ref={ref}
          className="consumer-toc-card"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="toc-root"
        />
      </PrismThemeProvider>
    );

    const nav = screen.getByTestId('toc-root');
    expect(ref.current).toBe(nav);
    expect(nav.tagName).toBe('NAV');
    expect(FloatingTableOfContents.displayName).toBe('FloatingTableOfContents');
    expect(nav).toHaveAttribute('aria-label', 'On This Page');
    expect(nav).toHaveAttribute('data-sticky', 'true');
    expect(nav).not.toHaveAttribute('data-empty');
    expect(nav).not.toHaveAttribute('data-observing-scroll');
    expect(nav).toHaveAttribute('data-active-id', 'optical-overview');
    expect(nav).toHaveClass(
      'refractor-floating-table-of-contents',
      'prism-slab',
      'sticky',
      'top-6',
      'min-w-0',
      'max-w-full',
      'theme-toc-card',
      'consumer-toc-card'
    );
    expect(nav).toHaveStyle({ maxWidth: '280px' });

    expect(screen.getByTestId('toc-title')).toHaveTextContent('On This Page');

    // Default 6 headings across H1, H2, H3 with distinct indentation
    const list = screen.getByTestId('toc-list');
    expect(list.tagName).toBe('OL');
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);

    const h1Btn = screen.getByTestId('toc-item-optical-overview');
    const h2Btn = screen.getByTestId('toc-item-refraction-tokens');
    const h3Btn = screen.getByTestId('toc-item-surface-layers');

    expect(h1Btn).toHaveAttribute('data-level', '1');
    expect(h1Btn.style.paddingLeft).toBe('20px');
    expect(h1Btn).toHaveAttribute('aria-current', 'location');
    expect(h1Btn).toHaveAttribute('data-active', 'true');
    expect(h1Btn.style.color).toBe('var(--prism-primary-main)');

    expect(h2Btn).toHaveAttribute('data-level', '2');
    expect(h2Btn.style.paddingLeft).toBe('32px');
    expect(h2Btn).not.toHaveAttribute('aria-current');
    expect(h2Btn.style.color).toBe('var(--prism-text-secondary)');

    expect(h3Btn).toHaveAttribute('data-level', '3');
    expect(h3Btn.style.paddingLeft).toBe('44px');
    expect(h3Btn).not.toHaveAttribute('aria-current');

    // Vertical tracking rail + glowing active indicator
    const rail = screen.getByTestId('toc-rail');
    expect(rail.style.backgroundColor).toBe('var(--prism-divider)');

    const indicator = screen.getByTestId('toc-active-indicator');
    expect(indicator.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(indicator.style.boxShadow).toContain('var(--prism-primary-main)');

    // Progress pill + hairline progressbar automatically reflect 1/6 = 17%
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('17%');
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute(
      'aria-label',
      'On This Page reading progress'
    );
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '17');
    expect(progressbar).toHaveAttribute('aria-valuetext', '17%');

    const fill = screen.getByTestId('toc-progress-fill');
    expect(fill.style.width).toBe('17%');
    expect(fill.style.backgroundColor).toBe('var(--prism-primary-main)');

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('supports sticky={false}, custom title, and clean role="status" empty state when headings=[]', () => {
    const { rerender, unmount } = render(
      <FloatingTableOfContents
        title="API Outline"
        sticky={false}
        data-testid="toc-nonsticky"
      />
    );

    const nav = screen.getByTestId('toc-nonsticky');
    expect(nav).toHaveAttribute('aria-label', 'API Outline');
    expect(nav).not.toHaveAttribute('data-sticky');
    expect(nav).not.toHaveClass('sticky');
    expect(screen.getByTestId('toc-title')).toHaveTextContent('API Outline');

    rerender(
      <FloatingTableOfContents
        title="Empty Outline"
        headings={[]}
        sticky={false}
        data-testid="toc-nonsticky"
      />
    );

    expect(nav).toHaveAttribute('data-empty', 'true');
    expect(nav).not.toHaveAttribute('data-active-id');
    expect(screen.queryByTestId('toc-list')).toBeNull();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-testid', 'toc-empty');
    expect(status).toHaveTextContent('No sections available');

    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('0%');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByTestId('toc-progress-fill').style.boxShadow).toBe('');

    unmount();
  });

  it('supports uncontrolled defaultActiveId, smooth scrollIntoView click navigation, and controlled activeId mode', () => {
    const headings: ReadonlyArray<TocHeadingEntry> = [
      { id: 'intro', title: 'Introduction', level: 1 },
      { id: 'setup', title: 'Installation & Setup', level: 2 },
      { id: 'tokens', title: 'Optical Tokens', level: 3 },
      { id: 'deploy', title: 'Deployment', level: 1 },
    ];

    const setupDom = createDomHeading('setup', 300);
    const scrollIntoViewMock = vi.fn();
    setupDom.element.scrollIntoView = scrollIntoViewMock;

    const onSelectHeading = vi.fn();
    const { rerender } = render(
      <FloatingTableOfContents
        headings={headings}
        defaultActiveId="tokens"
        onSelectHeading={onSelectHeading}
      />
    );

    // Starts on defaultActiveId ('tokens', 3/4 = 75%)
    expect(screen.getByTestId('toc-item-tokens')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('75%');

    // Click heading with matching DOM element -> smooth scroll + updates active + fires callback
    fireEvent.click(screen.getByTestId('toc-item-setup'));
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(onSelectHeading).toHaveBeenCalledWith({
      id: 'setup',
      title: 'Installation & Setup',
      level: 2,
    });
    expect(screen.getByTestId('toc-item-setup')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('50%');

    // Click heading without matching DOM element & without onSelectHeading -> safe no-throw
    rerender(
      <FloatingTableOfContents
        headings={headings}
        defaultActiveId="nonexistent-id"
      />
    );
    fireEvent.click(screen.getByTestId('toc-item-deploy'));
    expect(screen.getByTestId('toc-item-deploy')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('100%');

    // Controlled mode: clicking emits callback without mutating active item unless parent updates activeId
    onSelectHeading.mockClear();
    rerender(
      <FloatingTableOfContents
        headings={headings}
        activeId="intro"
        onSelectHeading={onSelectHeading}
      />
    );

    expect(screen.getByTestId('toc-item-intro')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('25%');

    fireEvent.click(screen.getByTestId('toc-item-deploy'));
    expect(onSelectHeading).toHaveBeenCalledWith({
      id: 'deploy',
      title: 'Deployment',
      level: 1,
    });
    expect(screen.getByTestId('toc-item-intro')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Controlled mode with unmatched activeId renders no active indicator and 0% progress
    rerender(
      <FloatingTableOfContents
        headings={headings}
        activeId="missing-section"
      />
    );
    expect(screen.queryByTestId('toc-active-indicator')).toBeNull();
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('0%');
  });

  it('falls back to the first heading in uncontrolled mode when defaultActiveId does not match any heading', () => {
    const headings: ReadonlyArray<TocHeadingEntry> = [
      { id: 'alpha', title: 'Alpha', level: 1 },
      { id: 'beta', title: 'Beta', level: 2 },
    ];

    render(
      <FloatingTableOfContents
        headings={headings}
        defaultActiveId="does-not-exist"
      />
    );

    expect(screen.getByTestId('toc-item-alpha')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('50%');
  });

  it('respects explicit scrollProgressPct, clamps out-of-range values, and ignores non-finite numbers', () => {
    const { rerender } = render(
      <FloatingTableOfContents scrollProgressPct={42.6} />
    );

    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('43%');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '43'
    );
    expect(screen.getByTestId('toc-progress-fill').style.width).toBe('43%');

    rerender(<FloatingTableOfContents scrollProgressPct={-25} />);
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('0%');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );

    rerender(<FloatingTableOfContents scrollProgressPct={160} />);
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('100%');
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );

    // Non-finite values fall back cleanly to computed active-heading progress (1/6 = 17%)
    rerender(<FloatingTableOfContents scrollProgressPct={Number.NaN} />);
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('17%');

    rerender(
      <FloatingTableOfContents scrollProgressPct={Number.POSITIVE_INFINITY} />
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('17%');
  });

  it('tracks matching DOM heading IDs via getBoundingClientRect().top when observeDocumentScroll is enabled and cleans up on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const headings: ReadonlyArray<TocHeadingEntry> = [
      { id: 'sec-1', title: 'Section One', level: 1 },
      { id: 'sec-missing', title: 'Missing DOM Section', level: 2 },
      { id: 'sec-2', title: 'Section Two', level: 2 },
      { id: 'sec-3', title: 'Section Three', level: 3 },
    ];

    // Default observeDocumentScroll=false attaches no scroll/resize listeners
    const { rerender, unmount } = render(
      <FloatingTableOfContents headings={headings} />
    );
    expect(addSpy).not.toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.anything()
    );

    // Enabling scroll-spy with empty headings also attaches no listeners
    rerender(
      <FloatingTableOfContents headings={[]} observeDocumentScroll />
    );
    expect(addSpy).not.toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.anything()
    );

    // Enabling scroll-spy when no matching DOM elements exist keeps active state stable
    rerender(
      <FloatingTableOfContents
        headings={headings}
        defaultActiveId="sec-1"
        observeDocumentScroll
        data-testid="toc-spy-root"
      />
    );
    expect(screen.getByTestId('toc-spy-root')).toHaveAttribute(
      'data-observing-scroll',
      'true'
    );
    expect(screen.getByTestId('toc-item-sec-1')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Mount matching DOM headings below threshold -> picks first found DOM heading ('sec-1')
    const sec1 = createDomHeading('sec-1', 260);
    const sec2 = createDomHeading('sec-2', 640);
    const sec3 = createDomHeading('sec-3', 980);

    fireEvent.scroll(window);
    expect(screen.getByTestId('toc-item-sec-1')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Scroll past sec-1 and sec-2 (top <= 120) -> activates sec-2 and updates progress (3/4 = 75%)
    sec1.setTop(-320);
    sec2.setTop(80);
    sec3.setTop(520);
    fireEvent.scroll(window);

    expect(screen.getByTestId('toc-item-sec-2')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('75%');

    // Firing scroll again at same positions does not cause errors or drift
    fireEvent.scroll(window);
    expect(screen.getByTestId('toc-item-sec-2')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Resize event with sec-3 past threshold activates sec-3 (4/4 = 100%)
    sec2.setTop(-180);
    sec3.setTop(40);
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('toc-item-sec-3')).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.getByTestId('toc-progress-pill')).toHaveTextContent('100%');

    // Scroll back up above all headings -> falls back to firstFoundId ('sec-1')
    sec1.setTop(200);
    sec2.setTop(500);
    sec3.setTop(800);
    fireEvent.scroll(window);
    expect(screen.getByTestId('toc-item-sec-1')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Unmount cleans up scroll and resize listeners
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('supports IME-safe ArrowUp, ArrowDown, Home, End focus traversal and Enter/Space activation', () => {
    const headings: ReadonlyArray<TocHeadingEntry> = [
      { id: 'one', title: 'One', level: 1 },
      { id: 'two', title: 'Two', level: 2 },
      { id: 'three', title: 'Three', level: 3 },
    ];
    const onSelectHeading = vi.fn();

    render(
      <FloatingTableOfContents
        headings={headings}
        onSelectHeading={onSelectHeading}
      />
    );

    const btnOne = screen.getByTestId('toc-item-one');
    const btnTwo = screen.getByTestId('toc-item-two');
    const btnThree = screen.getByTestId('toc-item-three');

    btnOne.focus();
    expect(document.activeElement).toBe(btnOne);

    // ArrowDown traverses one -> two -> three -> wraps to one
    fireEvent.keyDown(btnOne, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btnTwo);

    fireEvent.keyDown(btnTwo, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btnThree);

    fireEvent.keyDown(btnThree, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(btnOne);

    // ArrowUp wraps from first to last -> then steps back
    fireEvent.keyDown(btnOne, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(btnThree);

    fireEvent.keyDown(btnThree, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(btnTwo);

    // Home jumps to first; End jumps to last
    fireEvent.keyDown(btnTwo, { key: 'Home' });
    expect(document.activeElement).toBe(btnOne);

    fireEvent.keyDown(btnOne, { key: 'End' });
    expect(document.activeElement).toBe(btnThree);

    // Unrelated key does not move focus or select
    fireEvent.keyDown(btnThree, { key: 'Escape' });
    expect(document.activeElement).toBe(btnThree);
    expect(onSelectHeading).not.toHaveBeenCalled();

    // Enter activates focused heading
    fireEvent.keyDown(btnThree, { key: 'Enter' });
    expect(onSelectHeading).toHaveBeenCalledWith({
      id: 'three',
      title: 'Three',
      level: 3,
    });
    expect(btnThree).toHaveAttribute('aria-current', 'location');

    // Space activates focused heading
    btnTwo.focus();
    fireEvent.keyDown(btnTwo, { key: ' ' });
    expect(onSelectHeading).toHaveBeenCalledWith({
      id: 'two',
      title: 'Two',
      level: 2,
    });
    expect(btnTwo).toHaveAttribute('aria-current', 'location');

    // IME composition guards keydown traversal and activation
    onSelectHeading.mockClear();
    const composingArrow = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    btnTwo.dispatchEvent(composingArrow);
    expect(document.activeElement).toBe(btnTwo);

    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    btnOne.dispatchEvent(composingEnter);
    expect(onSelectHeading).not.toHaveBeenCalled();
  });

  it('defends against adversarial props, whitespace titles/ids, duplicate/prototype keys, and XSS strings', () => {
    const onSelectHeading = vi.fn();
    const adversarialHeadings: ReadonlyArray<TocHeadingEntry> = [
      { id: '__proto__', title: 'Proto Section A', level: 1 },
      { id: '__proto__', title: 'Proto Section B', level: 2 },
      {
        id: 'constructor',
        title: '<script>alert("xss")</script>',
        level: 3,
      },
      { id: '   ', title: '   ', level: 2 },
      { id: 'xss-img', title: '<img src=x onerror=alert(1)>', level: 1 },
    ];

    const { container } = render(
      <FloatingTableOfContents
        title="   "
        headings={adversarialHeadings}
        onSelectHeading={onSelectHeading}
      />
    );

    // Whitespace title falls back safely
    expect(screen.getByTestId('toc-title')).toHaveTextContent('On This Page');

    // Duplicate prototype-polluting keys render cleanly without collisions
    const protoItems = screen.getAllByTestId('toc-item-__proto__');
    expect(protoItems).toHaveLength(2);
    const secondProto = protoItems[1];
    expect(secondProto).toBeDefined();
    if (secondProto) {
      fireEvent.click(secondProto);
    }
    expect(onSelectHeading).toHaveBeenLastCalledWith({
      id: '__proto__',
      title: 'Proto Section B',
      level: 2,
    });

    // Whitespace id/title fall back deterministically
    const fallbackBtn = screen.getByTestId('toc-item-section-4');
    expect(fallbackBtn).toHaveTextContent('section-4');

    // XSS payloads render strictly as inert text nodes
    expect(screen.getByTestId('toc-item-constructor')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('toc-item-xss-img')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
