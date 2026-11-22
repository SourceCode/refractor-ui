import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AlignmentToolbar,
  type AlignmentActionId,
  type AlignmentActionMap,
  type AlignmentAnchorMode,
} from './index';

const ALL_ALIGN_ACTIONS: ReadonlyArray<AlignmentActionId> = [
  'align-left',
  'align-center-h',
  'align-right',
  'align-top',
  'align-middle-v',
  'align-bottom',
];

const ALL_DISTRIBUTE_ACTIONS: ReadonlyArray<AlignmentActionId> = [
  'distribute-h',
  'distribute-v',
];

describe('AlignmentToolbar', () => {
  it('renders Astryx contracts, toolbar groups, selection counter, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const actionMapCheck: AlignmentActionMap = {
      'align-left': true,
      'align-center-h': true,
      'align-right': true,
      'align-top': true,
      'align-middle-v': true,
      'align-bottom': true,
      'distribute-h': true,
      'distribute-v': true,
    };
    expect(Object.values(actionMapCheck).every(Boolean)).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AlignmentToolbar: {
              className: 'theme-alignment-toolbar',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <AlignmentToolbar
          ref={ref}
          className="local-alignment-toolbar"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="alignment-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('alignment-root');
    expect(ref.current).toBe(root);
    expect(AlignmentToolbar.displayName).toBe('AlignmentToolbar');
    expect(root).toHaveAttribute('role', 'toolbar');
    expect(root).toHaveAttribute('aria-label', 'Alignment and distribution controls');
    expect(root).toHaveAttribute('aria-orientation', 'horizontal');
    expect(root).toHaveClass(
      'refractor-alignment-toolbar',
      'prism-slab',
      'flex-wrap',
      'min-w-0',
      'max-w-full',
      'theme-alignment-toolbar',
      'local-alignment-toolbar'
    );
    expect(root).toHaveAttribute('data-anchor-mode', 'selection');
    expect(root).toHaveAttribute('data-selected-count', '3');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-show-mini-stage');
    expect(root).not.toHaveAttribute('data-last-action');
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '8px' });

    // Toolbar groups
    expect(screen.getByRole('group', { name: 'Horizontal alignment' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Vertical alignment' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Distribution' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Alignment anchor mode' })).toBeInTheDocument();

    // Selection counter pill & default scope toggle state
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('3 selected');
    expect(screen.getByTestId('alignment-anchor-selection')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('alignment-anchor-artboard')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Mini-stage hidden by default
    expect(screen.queryByTestId('alignment-mini-stage')).toBeNull();

    // Polite live feedback region
    const live = screen.getByTestId('alignment-live-feedback');
    expect(live).toHaveAttribute('role', 'status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Ready · Align to Selection');

    // All 8 action buttons enabled for default selectedCount=3
    for (const id of [...ALL_ALIGN_ACTIONS, ...ALL_DISTRIBUTE_ACTIONS]) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeEnabled();
    }
  });

  it('enforces selectedCount disabling rules across 0, 1, 2, 3+, and adversarial counts in selection and artboard modes', () => {
    const { rerender } = render(<AlignmentToolbar selectedCount={2} />);

    // selectedCount=2: align enabled, distribute disabled
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('2 selected');
    for (const id of ALL_ALIGN_ACTIONS) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeEnabled();
    }
    for (const id of ALL_DISTRIBUTE_ACTIONS) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeDisabled();
    }

    // selectedCount=1 in selection mode: align disabled & distribute disabled
    rerender(<AlignmentToolbar selectedCount={1} defaultAnchorMode="selection" />);
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('1 selected');
    expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent(
      'Select 2+ objects or switch to Artboard'
    );
    for (const id of [...ALL_ALIGN_ACTIONS, ...ALL_DISTRIBUTE_ACTIONS]) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeDisabled();
    }
    // Roving tab stop falls back automatically to first enabled control (anchor-selection)
    expect(screen.getByTestId('alignment-anchor-selection')).toHaveAttribute('tabindex', '0');

    // Switching to Artboard with selectedCount=1 enables align buttons while distribute remains disabled
    fireEvent.click(screen.getByTestId('alignment-anchor-artboard'));
    for (const id of ALL_ALIGN_ACTIONS) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeEnabled();
    }
    for (const id of ALL_DISTRIBUTE_ACTIONS) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeDisabled();
    }

    // selectedCount=0 in artboard mode: align AND distribute disabled
    rerender(<AlignmentToolbar selectedCount={0} anchorMode="artboard" />);
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('0 selected');
    for (const id of [...ALL_ALIGN_ACTIONS, ...ALL_DISTRIBUTE_ACTIONS]) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeDisabled();
    }

    // Adversarial counts: NaN, Infinity, negative, and fractional numbers normalize safely
    rerender(<AlignmentToolbar selectedCount={Number.NaN} />);
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('0 selected');
    for (const id of [...ALL_ALIGN_ACTIONS, ...ALL_DISTRIBUTE_ACTIONS]) {
      expect(screen.getByTestId(`alignment-btn-${id}`)).toBeDisabled();
    }

    rerender(<AlignmentToolbar selectedCount={-5} />);
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('0 selected');

    rerender(<AlignmentToolbar selectedCount={2.9} />);
    expect(screen.getByTestId('alignment-selected-count')).toHaveTextContent('2 selected');
    expect(screen.getByTestId('alignment-btn-align-left')).toBeEnabled();
    expect(screen.getByTestId('alignment-btn-distribute-h')).toBeDisabled();
  });

  it('announces "Select objects to align" when rendered initially with selectedCount=0', () => {
    render(<AlignmentToolbar selectedCount={0} />);
    expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent(
      'Select objects to align'
    );
  });

  it('invokes onAlign with exact action & anchorMode and updates active feedback across all 8 actions', () => {
    const onAlign = vi.fn<(action: AlignmentActionId, mode: AlignmentAnchorMode) => void>();
    render(<AlignmentToolbar selectedCount={4} onAlign={onAlign} data-testid="alignment-root" />);

    const expectedLabels: ReadonlyArray<{ id: AlignmentActionId; label: string }> = [
      { id: 'align-left', label: 'Align left' },
      { id: 'align-center-h', label: 'Align horizontal center' },
      { id: 'align-right', label: 'Align right' },
      { id: 'align-top', label: 'Align top' },
      { id: 'align-middle-v', label: 'Align vertical middle' },
      { id: 'align-bottom', label: 'Align bottom' },
      { id: 'distribute-h', label: 'Distribute horizontally' },
      { id: 'distribute-v', label: 'Distribute vertically' },
    ];

    for (const item of expectedLabels) {
      const btn = screen.getByRole('button', { name: item.label });
      fireEvent.click(btn);
      expect(onAlign).toHaveBeenLastCalledWith(item.id, 'selection');
      expect(btn).toHaveAttribute('data-active', 'true');
      expect(btn).toHaveClass('prism-btn-primary');
      expect(screen.getByTestId('alignment-root')).toHaveAttribute('data-last-action', item.id);
      expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent(
        `Applied ${item.label} (Selection)`
      );
      expect(screen.getByTestId('alignment-last-action-badge')).toHaveTextContent(item.label);
    }

    expect(onAlign).toHaveBeenCalledTimes(8);
  });

  it('supports uncontrolled and controlled anchorMode transitions and ignores clicking active mode', () => {
    const onAnchorModeChange = vi.fn<(mode: AlignmentAnchorMode) => void>();
    const onAlign = vi.fn<(action: AlignmentActionId, mode: AlignmentAnchorMode) => void>();

    const { unmount } = render(
      <AlignmentToolbar
        defaultAnchorMode="artboard"
        onAnchorModeChange={onAnchorModeChange}
        onAlign={onAlign}
        data-testid="uncontrolled-root"
      />
    );

    expect(screen.getByTestId('uncontrolled-root')).toHaveAttribute('data-anchor-mode', 'artboard');
    expect(screen.getByTestId('alignment-anchor-artboard')).toHaveAttribute('aria-pressed', 'true');

    // Clicking already-active Artboard is a no-op
    fireEvent.click(screen.getByTestId('alignment-anchor-artboard'));
    expect(onAnchorModeChange).not.toHaveBeenCalled();

    // Switching to Selection fires callback and updates pressed state
    fireEvent.click(screen.getByTestId('alignment-anchor-selection'));
    expect(onAnchorModeChange).toHaveBeenCalledTimes(1);
    expect(onAnchorModeChange).toHaveBeenLastCalledWith('selection');
    expect(screen.getByTestId('alignment-anchor-selection')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent(
      'Anchor set to Selection · 3 selected'
    );

    unmount();

    // Controlled mode harness
    function ControlledDemo() {
      const [mode, setMode] = useState<AlignmentAnchorMode>('selection');
      return (
        <AlignmentToolbar
          anchorMode={mode}
          onAnchorModeChange={(next) => {
            onAnchorModeChange(next);
            setMode(next);
          }}
          onAlign={onAlign}
        />
      );
    }

    render(<ControlledDemo />);
    fireEvent.click(screen.getByTestId('alignment-anchor-artboard'));
    expect(screen.getByTestId('alignment-anchor-artboard')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('alignment-btn-align-right'));
    expect(onAlign).toHaveBeenLastCalledWith('align-right', 'artboard');
    expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent(
      'Applied Align right (Artboard)'
    );
  });

  it('snaps and evenly distributes 3 objects geometrically inside showMiniStage and resets cleanly', () => {
    render(<AlignmentToolbar showMiniStage selectedCount={3} data-testid="stage-root" />);

    expect(screen.getByTestId('stage-root')).toHaveAttribute('data-show-mini-stage', 'true');
    expect(screen.getByTestId('alignment-mini-stage')).toBeInTheDocument();
    expect(screen.getByTestId('alignment-stage-scope')).toHaveTextContent('Selection Bounds');

    const getBox = (id: 'box-a' | 'box-b' | 'box-c') => {
      const el = screen.getByTestId(`alignment-stage-${id}`);
      return {
        x: Number(el.getAttribute('data-x')),
        y: Number(el.getAttribute('data-y')),
        selected: el.getAttribute('data-selected'),
      };
    };

    // Initial staggered layout: A(10,10), B(32,34), C(72,70)
    expect(getBox('box-a')).toEqual({ x: 10, y: 10, selected: 'true' });
    expect(getBox('box-b')).toEqual({ x: 32, y: 34, selected: 'true' });
    expect(getBox('box-c')).toEqual({ x: 72, y: 70, selected: 'true' });

    // 1. Distribute horizontally in selection mode -> equal 11% gaps (A:10..28, B:39..61, C:72..90)
    fireEvent.click(screen.getByTestId('alignment-btn-distribute-h'));
    expect(getBox('box-a').x).toBe(10);
    expect(getBox('box-b').x).toBe(39);
    expect(getBox('box-c').x).toBe(72);
    expect(screen.getByTestId('alignment-stage-guide')).toHaveAttribute('data-guide-kind', 'span-h');

    // 2. Distribute vertically in selection mode -> equal 9% gaps (A:10..30, B:39..61, C:70..88)
    fireEvent.click(screen.getByTestId('alignment-btn-distribute-v'));
    expect(getBox('box-a').y).toBe(10);
    expect(getBox('box-b').y).toBe(39);
    expect(getBox('box-c').y).toBe(70);
    expect(screen.getByTestId('alignment-stage-guide')).toHaveAttribute('data-guide-kind', 'span-v');

    // 3. Align left -> all boxes snap to selection left edge (10)
    fireEvent.click(screen.getByTestId('alignment-btn-align-left'));
    expect(getBox('box-a').x).toBe(10);
    expect(getBox('box-b').x).toBe(10);
    expect(getBox('box-c').x).toBe(10);
    expect(screen.getByTestId('alignment-stage-guide')).toHaveAttribute(
      'data-guide-kind',
      'vertical'
    );

    // 4. Reset stage -> restores original staggered positions and clears guide
    fireEvent.click(screen.getByTestId('alignment-stage-reset'));
    expect(getBox('box-a')).toEqual({ x: 10, y: 10, selected: 'true' });
    expect(getBox('box-b')).toEqual({ x: 32, y: 34, selected: 'true' });
    expect(getBox('box-c')).toEqual({ x: 72, y: 70, selected: 'true' });
    expect(screen.queryByTestId('alignment-stage-guide')).toBeNull();
    expect(screen.getByTestId('alignment-live-feedback')).toHaveTextContent('Preview stage reset');

    // 5. Align horizontal center in selection mode (bounds 10..90 -> center 50)
    fireEvent.click(screen.getByTestId('alignment-btn-align-center-h'));
    expect(getBox('box-a').x).toBe(41); // 50 - 18/2
    expect(getBox('box-b').x).toBe(39); // 50 - 22/2
    expect(getBox('box-c').x).toBe(41); // 50 - 18/2

    // 6. Align right in artboard mode (artboard right = 94)
    fireEvent.click(screen.getByTestId('alignment-anchor-artboard'));
    expect(screen.getByTestId('alignment-stage-scope')).toHaveTextContent('Artboard Frame');
    fireEvent.click(screen.getByTestId('alignment-btn-align-right'));
    expect(getBox('box-a').x).toBe(76); // 94 - 18
    expect(getBox('box-b').x).toBe(72); // 94 - 22
    expect(getBox('box-c').x).toBe(76); // 94 - 18

    // 7. Align top in artboard mode (artboard top = 8)
    fireEvent.click(screen.getByTestId('alignment-btn-align-top'));
    expect(getBox('box-a').y).toBe(8);
    expect(getBox('box-b').y).toBe(8);
    expect(getBox('box-c').y).toBe(8);
    expect(screen.getByTestId('alignment-stage-guide')).toHaveAttribute(
      'data-guide-kind',
      'horizontal'
    );

    // 8. Align vertical middle in artboard mode (artboard centerY = 50)
    fireEvent.click(screen.getByTestId('alignment-btn-align-middle-v'));
    expect(getBox('box-a').y).toBe(40); // 50 - 20/2
    expect(getBox('box-b').y).toBe(39); // 50 - 22/2
    expect(getBox('box-c').y).toBe(41); // 50 - 18/2

    // 9. Align bottom in artboard mode (artboard bottom = 92)
    fireEvent.click(screen.getByTestId('alignment-btn-align-bottom'));
    expect(getBox('box-a').y).toBe(72); // 92 - 20
    expect(getBox('box-b').y).toBe(70); // 92 - 22
    expect(getBox('box-c').y).toBe(74); // 92 - 18

    // 10. Distribute horizontally & vertically across artboard frame
    fireEvent.click(screen.getByTestId('alignment-stage-reset'));
    fireEvent.click(screen.getByTestId('alignment-btn-distribute-h'));
    expect(getBox('box-a').x).toBe(6);
    expect(getBox('box-b').x).toBe(39);
    expect(getBox('box-c').x).toBe(76);

    fireEvent.click(screen.getByTestId('alignment-btn-distribute-v'));
    expect(getBox('box-a').y).toBe(8);
    expect(getBox('box-b').y).toBe(40);
    expect(getBox('box-c').y).toBe(74);
  });

  it('moves only selected boxes in showMiniStage when selectedCount is 2', () => {
    render(<AlignmentToolbar showMiniStage selectedCount={2} />);

    expect(screen.getByTestId('alignment-stage-box-a')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('alignment-stage-box-b')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('alignment-stage-box-c')).toHaveAttribute('data-selected', 'false');

    // Align left moves A and B to x=10 while unselected box C stays at x=72
    fireEvent.click(screen.getByTestId('alignment-btn-align-left'));
    expect(screen.getByTestId('alignment-stage-box-a')).toHaveAttribute('data-x', '10');
    expect(screen.getByTestId('alignment-stage-box-b')).toHaveAttribute('data-x', '10');
    expect(screen.getByTestId('alignment-stage-box-c')).toHaveAttribute('data-x', '72');
  });

  it('supports IME-safe roving ArrowLeft/ArrowRight/Home/End navigation skipping disabled buttons', () => {
    render(<AlignmentToolbar selectedCount={2} showMiniStage />);

    const toolbar = screen.getByRole('toolbar');
    const alignLeftBtn = screen.getByTestId('alignment-btn-align-left');
    const alignCenterBtn = screen.getByTestId('alignment-btn-align-center-h');
    const alignBottomBtn = screen.getByTestId('alignment-btn-align-bottom');
    const anchorSelBtn = screen.getByTestId('alignment-anchor-selection');
    const anchorArtBtn = screen.getByTestId('alignment-anchor-artboard');
    const resetBtn = screen.getByTestId('alignment-stage-reset');

    // Initial roving tab stop is align-left
    expect(alignLeftBtn).toHaveAttribute('tabindex', '0');
    expect(alignCenterBtn).toHaveAttribute('tabindex', '-1');

    // Focus align-left, ArrowRight -> align-center-h
    act(() => {
      alignLeftBtn.focus();
    });
    fireEvent.keyDown(alignLeftBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(alignCenterBtn);
    expect(alignCenterBtn).toHaveAttribute('tabindex', '0');

    // Focus align-bottom, ArrowRight skips disabled distribute-h & distribute-v straight to anchor-selection
    act(() => {
      alignBottomBtn.focus();
    });
    fireEvent.keyDown(alignBottomBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(anchorSelBtn);

    // ArrowRight -> anchor-artboard, ArrowRight -> stage-reset, ArrowRight wraps to align-left
    fireEvent.keyDown(anchorSelBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(anchorArtBtn);
    fireEvent.keyDown(anchorArtBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(resetBtn);
    fireEvent.keyDown(resetBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(alignLeftBtn);

    // ArrowLeft wraps backward from align-left to stage-reset
    fireEvent.keyDown(alignLeftBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(resetBtn);

    // Home jumps to first enabled control; End jumps to last enabled control
    fireEvent.keyDown(toolbar, { key: 'Home' });
    expect(document.activeElement).toBe(alignLeftBtn);
    fireEvent.keyDown(toolbar, { key: 'End' });
    expect(document.activeElement).toBe(resetBtn);

    // Keydown fired directly on toolbar (no data-control-id on target) uses effectiveTabStopId fallback
    fireEvent.keyDown(toolbar, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(anchorArtBtn);

    // Keydown bubbling from SVG icon child navigates correctly
    const iconSvg = anchorArtBtn.querySelector('svg');
    expect(iconSvg).not.toBeNull();
    if (iconSvg) {
      fireEvent.keyDown(iconSvg, { key: 'ArrowLeft' });
    }
    expect(document.activeElement).toBe(anchorSelBtn);

    // IME composition must be ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    act(() => {
      anchorSelBtn.dispatchEvent(imeEvent);
    });
    expect(document.activeElement).toBe(anchorSelBtn);

    // Modifier keys & unrelated keys must not shift focus
    fireEvent.keyDown(anchorSelBtn, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(anchorSelBtn, { key: 'ArrowRight', metaKey: true });
    fireEvent.keyDown(anchorSelBtn, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(anchorSelBtn, { key: 'Enter' });
    expect(document.activeElement).toBe(anchorSelBtn);
  });

  it('respects caller onKeyDown preventDefault and non-Element event targets safely', () => {
    const customKeyDown = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });

    render(<AlignmentToolbar onKeyDown={customKeyDown} />);

    const alignLeftBtn = screen.getByTestId('alignment-btn-align-left');
    act(() => {
      alignLeftBtn.focus();
    });
    fireEvent.keyDown(alignLeftBtn, { key: 'ArrowRight' });
    expect(customKeyDown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(alignLeftBtn);
  });

  it('disables all controls, removes tab stops, and blocks keyboard navigation when disabled', () => {
    const onAlign = vi.fn();
    const onAnchorModeChange = vi.fn();

    render(
      <AlignmentToolbar
        disabled
        showMiniStage
        onAlign={onAlign}
        onAnchorModeChange={onAnchorModeChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(11);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('tabindex', '-1');
      fireEvent.click(button);
    }

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'Home' });
    expect(onAlign).not.toHaveBeenCalled();
    expect(onAnchorModeChange).not.toHaveBeenCalled();
  });

  it('supports custom ariaLabel and aria-label override without XSS injection', () => {
    const { rerender } = render(
      <AlignmentToolbar ariaLabel="<script>window.__xss=1</script>Vector alignment bar" />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(
      screen.getByRole('toolbar', {
        name: '<script>window.__xss=1</script>Vector alignment bar',
      })
    ).toBeInTheDocument();

    rerender(
      <AlignmentToolbar ariaLabel="Ignored fallback" aria-label="Explicit ARIA toolbar label" />
    );
    expect(
      screen.getByRole('toolbar', { name: 'Explicit ARIA toolbar label' })
    ).toBeInTheDocument();
  });
});
