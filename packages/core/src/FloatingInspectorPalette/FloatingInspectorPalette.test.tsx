import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FloatingInspectorPalette,
  type FloatingPaletteSection,
} from './index';

describe('FloatingInspectorPalette', () => {
  it('renders visible slim-titlebar palette by default with optical tokens, theme override, and ref passthrough', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FloatingInspectorPalette: {
              className: 'theme-floating-palette',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <FloatingInspectorPalette
          ref={ref}
          className="local-floating-palette"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="palette-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('palette-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-floating-inspector-palette',
      'prism-slab',
      'theme-floating-palette',
      'local-floating-palette'
    );
    expect(root).toHaveAttribute('data-parent-focused', 'true');
    expect(root).toHaveAttribute('data-auto-hide-on-blur', 'true');
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(root).not.toHaveAttribute('data-collapsed');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.96' });

    // Simulator bar visible by default
    expect(screen.getByTestId('palette-focus-simulator')).toBeInTheDocument();
    expect(screen.getByTestId('palette-workspace-name')).toHaveTextContent(
      'Refractor Canvas'
    );
    expect(screen.getByTestId('palette-sim-focused')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('palette-sim-blurred')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Slim-titlebar complementary palette
    const palette = screen.getByRole('complementary', {
      name: 'Tool & Brush Inspector',
    });
    expect(palette).toHaveAttribute('data-tether-state', 'linked');

    const tetherDot = screen.getByTestId('palette-tether-dot');
    expect(tetherDot.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(screen.getByTestId('palette-tether-badge')).toHaveTextContent(
      'Linked'
    );

    expect(screen.getByTestId('palette-autohide-toggle')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('palette-collapse-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    // Default 4 selectable tool sections
    expect(
      screen.getByTestId('palette-section-stroke-bevel')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('palette-section-specular-caustic')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('palette-section-pixel-grid-snap')
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('palette-section-color-guides')
    ).toHaveAttribute('aria-pressed', 'false');

    // Brush size slider & opacity readout
    const slider = screen.getByRole('slider', { name: 'Brush Size' });
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '64');
    expect(slider).toHaveValue('24');
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '24px'
    );
    expect(screen.getByTestId('palette-opacity-readout')).toHaveTextContent(
      'Opacity 92%'
    );
  });

  it('auto-hides palette into a slim translucent status pill on Parent Blurred and restores on Parent Focused or Disable Auto-Hide', () => {
    const onParentFocusChange = vi.fn();

    render(
      <FloatingInspectorPalette
        parentWorkspaceName="Lens Shader Studio"
        onParentFocusChange={onParentFocusChange}
        data-testid="tether-root"
      />
    );

    const root = screen.getByTestId('tether-root');

    // Clicking Parent Focused while already focused is a no-op
    fireEvent.click(screen.getByTestId('palette-sim-focused'));
    expect(onParentFocusChange).not.toHaveBeenCalled();

    // Switching to Parent Blurred auto-hides the complementary palette
    fireEvent.click(screen.getByTestId('palette-sim-blurred'));
    expect(onParentFocusChange).toHaveBeenCalledTimes(1);
    expect(onParentFocusChange).toHaveBeenLastCalledWith(false);
    expect(root).toHaveAttribute('data-palette-state', 'auto-hidden');
    expect(screen.queryByRole('complementary')).toBeNull();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Palette auto-hidden while "Lens Shader Studio" is unfocused — Focus workspace or disable Auto-Hide to restore'
    );

    // Clicking Parent Focused restores the floating palette immediately
    fireEvent.click(screen.getByTestId('palette-sim-focused'));
    expect(onParentFocusChange).toHaveBeenCalledTimes(2);
    expect(onParentFocusChange).toHaveBeenLastCalledWith(true);
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(
      screen.getByRole('complementary', { name: 'Tool & Brush Inspector' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Lens Shader Studio focused; Tool & Brush Inspector active'
    );

    // Blur again, then restore via the inline Disable Auto-Hide pill button
    fireEvent.click(screen.getByTestId('palette-sim-blurred'));
    expect(screen.queryByRole('complementary')).toBeNull();

    fireEvent.click(screen.getByTestId('palette-disable-autohide-btn'));
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(root).not.toHaveAttribute('data-auto-hide-on-blur');
    const pinnedPalette = screen.getByRole('complementary');
    expect(pinnedPalette).toHaveAttribute('data-tether-state', 'unfocused-pinned');
    expect(screen.getByTestId('palette-tether-dot').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
  });

  it('keeps palette visible with warning tether dot when Auto-Hide is disabled and parent workspace blurs', () => {
    render(<FloatingInspectorPalette data-testid="pinned-root" />);

    const root = screen.getByTestId('pinned-root');
    const autoHideBtn = screen.getByTestId('palette-autohide-toggle');

    // Disable Auto-Hide while focused -> toggle back on -> toggle off to exercise focused announcement branch
    fireEvent.click(autoHideBtn);
    expect(autoHideBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Auto-Hide disabled; palette pinned persistent'
    );

    fireEvent.click(autoHideBtn);
    expect(autoHideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Auto-Hide on parent blur enabled'
    );

    fireEvent.click(autoHideBtn);
    expect(autoHideBtn).toHaveAttribute('aria-pressed', 'false');

    // Blur parent workspace: palette MUST stay visible (pinned persistent)
    fireEvent.click(screen.getByTestId('palette-sim-blurred'));
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(root).not.toHaveAttribute('data-parent-focused');

    const palette = screen.getByRole('complementary');
    expect(palette).toHaveAttribute('data-tether-state', 'unfocused-pinned');
    expect(palette.style.getPropertyValue('--prism-specular-opacity')).toBe(
      '0.55'
    );
    expect(screen.getByTestId('palette-tether-dot').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('palette-tether-badge')).toHaveTextContent(
      'Pinned'
    );
    expect(screen.getByTestId('palette-opacity-readout')).toHaveTextContent(
      'Opacity 76%'
    );
    expect(screen.getByTestId('palette-workspace-focus-badge')).toHaveTextContent(
      'Blurred'
    );

    // Re-enabling Auto-Hide while parent is still blurred immediately hides palette
    fireEvent.click(screen.getByTestId('palette-autohide-toggle'));
    expect(root).toHaveAttribute('data-palette-state', 'auto-hidden');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByTestId('palette-auto-hidden-pill')).toBeInTheDocument();
  });

  it('collapses and expands the slim palette body with aria-expanded and polite announcements', () => {
    render(<FloatingInspectorPalette data-testid="collapse-root" />);

    const root = screen.getByTestId('collapse-root');
    const collapseBtn = screen.getByRole('button', {
      name: 'Collapse palette',
    });

    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('palette-body')).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(root).toHaveAttribute('data-collapsed', 'true');
    expect(screen.queryByTestId('palette-body')).toBeNull();
    const expandBtn = screen.getByRole('button', { name: 'Expand palette' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tool & Brush Inspector collapsed'
    );

    fireEvent.click(expandBtn);
    expect(root).not.toHaveAttribute('data-collapsed');
    expect(screen.getByTestId('palette-body')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tool & Brush Inspector expanded'
    );
  });

  it('closes locally with a Reopen Palette chip when onClose is omitted, and delegates to external onClose when provided', () => {
    const { rerender } = render(
      <FloatingInspectorPalette data-testid="close-root" />
    );

    const root = screen.getByTestId('close-root');
    fireEvent.click(screen.getByRole('button', { name: 'Close palette' }));

    expect(root).toHaveAttribute('data-palette-state', 'closed');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByTestId('palette-closed-bar')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tool & Brush Inspector closed'
    );

    // Reopen restores visible palette
    fireEvent.click(screen.getByRole('button', { name: 'Reopen Palette' }));
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tool & Brush Inspector reopened'
    );

    // External onClose callback takes precedence without replacing with local Reopen chip
    const onClose = vi.fn();
    rerender(
      <FloatingInspectorPalette onClose={onClose} data-testid="close-root" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close palette' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('palette-closed-bar')).toBeNull();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Tool & Brush Inspector close requested'
    );
  });

  it('toggles tool sections with aria-pressed and adjusts Brush Size slider with bounds clamping and bracket shortcuts', () => {
    const onToggleSection = vi.fn();

    render(<FloatingInspectorPalette onToggleSection={onToggleSection} />);

    const strokeBtn = screen.getByTestId('palette-section-stroke-bevel');
    const gridBtn = screen.getByTestId('palette-section-pixel-grid-snap');

    expect(strokeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(gridBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(strokeBtn);
    expect(strokeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(onToggleSection).toHaveBeenLastCalledWith('stroke-bevel', false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Stroke & Bevel disabled'
    );

    fireEvent.click(gridBtn);
    expect(gridBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onToggleSection).toHaveBeenLastCalledWith('pixel-grid-snap', true);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Pixel Grid Snap enabled'
    );

    // Range slider change + clamping
    const slider = screen.getByRole('slider', { name: 'Brush Size' });
    fireEvent.change(slider, { target: { value: '48' } });
    expect(slider).toHaveValue('48');
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '48px'
    );

    fireEvent.change(slider, { target: { value: '1' } });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '1px'
    );

    fireEvent.change(slider, { target: { value: '64' } });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '64px'
    );

    // Keyboard [ / ] nudges brush size by 4px, ignoring modifier chords and IME composition
    fireEvent.keyDown(slider, { key: '[' });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '60px'
    );

    fireEvent.keyDown(slider, { key: ']' });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '64px'
    );

    fireEvent.keyDown(slider, { key: '[', ctrlKey: true });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '64px'
    );

    const composingBracket = new KeyboardEvent('keydown', {
      key: '[',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingBracket, 'isComposing', { value: true });
    fireEvent(slider, composingBracket);
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '64px'
    );

    // Unrelated key on slider is ignored
    fireEvent.keyDown(slider, { key: 'a' });
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '64px'
    );
  });

  it('hides the focus simulator strip when showParentFocusSimulator={false}', () => {
    render(
      <FloatingInspectorPalette
        showParentFocusSimulator={false}
        defaultParentFocused={true}
      />
    );

    expect(screen.queryByTestId('palette-focus-simulator')).toBeNull();
    expect(
      screen.getByRole('complementary', { name: 'Tool & Brush Inspector' })
    ).toBeInTheDocument();
  });

  it('respects controlled parentFocused and controlled autoHideOnBlur props', () => {
    const onParentFocusChange = vi.fn();

    const { rerender } = render(
      <FloatingInspectorPalette
        parentFocused={true}
        autoHideOnBlur={true}
        onParentFocusChange={onParentFocusChange}
        data-testid="ctrl-root"
      />
    );

    const root = screen.getByTestId('ctrl-root');

    // Clicking Blurred notifies callback without mutating controlled focus
    fireEvent.click(screen.getByTestId('palette-sim-blurred'));
    expect(onParentFocusChange).toHaveBeenCalledWith(false);
    expect(root).toHaveAttribute('data-palette-state', 'visible');

    // Parent updates controlled parentFocused={false} -> auto-hides
    rerender(
      <FloatingInspectorPalette
        parentFocused={false}
        autoHideOnBlur={true}
        onParentFocusChange={onParentFocusChange}
        data-testid="ctrl-root"
      />
    );
    expect(root).toHaveAttribute('data-palette-state', 'auto-hidden');
    expect(screen.queryByRole('complementary')).toBeNull();

    // Clicking Disable Auto-Hide stays controlled while autoHideOnBlur={true}
    fireEvent.click(screen.getByTestId('palette-disable-autohide-btn'));
    expect(root).toHaveAttribute('data-palette-state', 'auto-hidden');

    // Parent updates autoHideOnBlur={false} -> reveals unfocused-pinned palette
    rerender(
      <FloatingInspectorPalette
        parentFocused={false}
        autoHideOnBlur={false}
        onParentFocusChange={onParentFocusChange}
        data-testid="ctrl-root"
      />
    );
    expect(root).toHaveAttribute('data-palette-state', 'visible');
    expect(screen.getByRole('complementary')).toHaveAttribute(
      'data-tether-state',
      'unfocused-pinned'
    );
  });

  it('blocks all interactions when disabled across visible, auto-hidden, and closed states', () => {
    const onParentFocusChange = vi.fn();
    const onToggleSection = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <FloatingInspectorPalette
        disabled={true}
        onParentFocusChange={onParentFocusChange}
        onToggleSection={onToggleSection}
        onClose={onClose}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const blurredBtn = screen.getByTestId('palette-sim-blurred');
    const autoHideBtn = screen.getByTestId('palette-autohide-toggle');
    const collapseBtn = screen.getByTestId('palette-collapse-toggle');
    const closeBtn = screen.getByTestId('palette-close-btn');
    const sectionBtn = screen.getByTestId('palette-section-stroke-bevel');
    const slider = screen.getByRole('slider', { name: 'Brush Size' });

    expect(blurredBtn).toBeDisabled();
    expect(autoHideBtn).toBeDisabled();
    expect(collapseBtn).toBeDisabled();
    expect(closeBtn).toBeDisabled();
    expect(sectionBtn).toBeDisabled();
    expect(slider).toBeDisabled();

    // Direct events still respect internal disabled guards
    fireEvent.click(blurredBtn);
    fireEvent.keyDown(blurredBtn, { key: 'Enter' });
    fireEvent.click(autoHideBtn);
    fireEvent.click(collapseBtn);
    fireEvent.click(closeBtn);
    fireEvent.click(sectionBtn);
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.keyDown(slider, { key: ']' });

    expect(onParentFocusChange).not.toHaveBeenCalled();
    expect(onToggleSection).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('palette-brush-size-readout')).toHaveTextContent(
      '24px'
    );

    // Programmatically transition to closed while enabled, then verify disabled Reopen chip
    rerender(
      <FloatingInspectorPalette disabled={false} data-testid="disabled-root" />
    );
    fireEvent.click(screen.getByTestId('palette-close-btn'));
    expect(screen.getByTestId('palette-reopen-btn')).toBeInTheDocument();

    rerender(
      <FloatingInspectorPalette disabled={true} data-testid="disabled-root" />
    );
    const reopenBtn = screen.getByTestId('palette-reopen-btn');
    expect(reopenBtn).toBeDisabled();
    fireEvent.click(reopenBtn);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('supports IME-safe keyboard activation on all buttons and handles empty, duplicate, prototype-key, and XSS adversarial inputs', () => {
    const onToggleSection = vi.fn();

    render(<FloatingInspectorPalette onToggleSection={onToggleSection} />);

    // IME composing Enter MUST NOT trigger actions
    const closeBtn = screen.getByTestId('palette-close-btn');
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(closeBtn, composingEnter);
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    // Non-activation key ignored
    fireEvent.keyDown(closeBtn, { key: 'Escape' });
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    // Keyboard Enter/Space operate section toggle, collapse, simulator, auto-hide, close, and reopen
    fireEvent.keyDown(screen.getByTestId('palette-section-color-guides'), {
      key: ' ',
    });
    expect(onToggleSection).toHaveBeenLastCalledWith('color-guides', true);

    fireEvent.keyDown(screen.getByTestId('palette-collapse-toggle'), {
      key: 'Enter',
    });
    expect(screen.queryByTestId('palette-body')).toBeNull();

    fireEvent.keyDown(screen.getByTestId('palette-collapse-toggle'), {
      key: ' ',
    });
    expect(screen.getByTestId('palette-body')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('palette-sim-blurred'), {
      key: 'Enter',
    });
    expect(screen.getByTestId('palette-auto-hidden-pill')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('palette-disable-autohide-btn'), {
      key: ' ',
    });
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('palette-sim-focused'), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByTestId('palette-autohide-toggle'), {
      key: 'Enter',
    });
    fireEvent.keyDown(screen.getByTestId('palette-close-btn'), {
      key: 'Enter',
    });
    expect(screen.getByTestId('palette-reopen-btn')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('palette-reopen-btn'), { key: ' ' });
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('handles blank strings, empty sections, duplicate/prototype-polluting keys, and XSS payloads safely', () => {
    const onToggleSection = vi.fn();
    const xssPayload =
      '<script>window.__paletteXss=1</script><img src=x onerror=alert(1)>';

    const adversarialSections: ReadonlyArray<FloatingPaletteSection> = [
      { id: '__proto__', label: 'Proto Guard', valueLabel: 'safe', active: false },
      { id: 'dup', label: 'Duplicate A', valueLabel: '1px', active: true },
      { id: 'dup', label: 'Duplicate B', valueLabel: '2px', active: false },
      { id: '   ', label: '   ', valueLabel: '   ' },
      { id: 'xss', label: xssPayload, valueLabel: xssPayload, active: false },
    ];

    const { rerender } = render(
      <FloatingInspectorPalette
        title="   "
        parentWorkspaceName="   "
        sections={[]}
        onToggleSection={onToggleSection}
      />
    );

    // Blank strings fall back cleanly; empty sections show empty state
    expect(
      screen.getByRole('complementary', { name: 'Tool & Brush Inspector' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('palette-workspace-name')).toHaveTextContent(
      'Refractor Canvas'
    );
    expect(screen.getByTestId('palette-sections-empty')).toHaveTextContent(
      'No inspector tools configured.'
    );

    // Adversarial sections and XSS text are safely escaped and isolated
    rerender(
      <FloatingInspectorPalette
        title={xssPayload}
        parentWorkspaceName={xssPayload}
        sections={adversarialSections}
        onToggleSection={onToggleSection}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(3);

    // Toggling __proto__ section does not pollute Object.prototype
    fireEvent.click(screen.getByTestId('palette-section-__proto__'));
    expect(onToggleSection).toHaveBeenLastCalledWith('__proto__', true);
    expect(Object.prototype.hasOwnProperty.call({}, 'polluted')).toBe(false);

    // Duplicate IDs render cleanly and toggle independently
    const [firstDup, secondDup] = screen.getAllByTestId('palette-section-dup');
    expect(firstDup).toBeDefined();
    expect(secondDup).toBeDefined();
    if (!firstDup || !secondDup) {
      throw new Error('Expected two duplicate section buttons');
    }
    expect(firstDup).toHaveAttribute('aria-pressed', 'true');
    expect(secondDup).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(secondDup);
    expect(firstDup).toHaveAttribute('aria-pressed', 'true');
    expect(secondDup).toHaveAttribute('aria-pressed', 'true');
    expect(onToggleSection).toHaveBeenLastCalledWith('dup', true);

    // Blank id/label/value falls back gracefully
    const fallbackSection = screen.getByTestId('palette-section-section-4');
    expect(fallbackSection).toHaveTextContent('section-4');
    expect(fallbackSection).toHaveTextContent('—');
  });
});
