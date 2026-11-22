import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  LayerBlendStack,
  type BlendLayerItem,
  type LayerBlendMode,
  type LayerBlendModeMap,
  type LayerKind,
} from './index';

const ALL_FIVE_KINDS: ReadonlyArray<BlendLayerItem> = [
  {
    id: 'k-image',
    name: 'RAW Capture',
    kind: 'image',
    visible: true,
    opacity: 100,
    blendMode: 'normal',
  },
  {
    id: 'k-adjustment',
    name: 'Curves Grade',
    kind: 'adjustment',
    visible: true,
    opacity: 80,
    blendMode: 'multiply',
    clipped: true,
  },
  {
    id: 'k-text',
    name: 'Caption Overlay',
    kind: 'text',
    visible: true,
    opacity: 90,
    blendMode: 'screen',
  },
  {
    id: 'k-shape',
    name: 'Vignette Frame',
    kind: 'shape',
    visible: true,
    opacity: 45,
    blendMode: 'color-dodge',
  },
  {
    id: 'k-mask',
    name: 'Luminance Mask',
    kind: 'mask',
    visible: false,
    opacity: 70,
    blendMode: 'difference',
    locked: true,
  },
];

describe('LayerBlendStack', () => {
  it('renders 4 default grading layers, PrismThemeProvider overrides, xstyle, React 19 ref, and LayerBlendModeMap', () => {
    const ref = createRef<HTMLDivElement>();
    const modeMap: LayerBlendModeMap = {
      normal: true,
      multiply: true,
      screen: true,
      overlay: true,
      'soft-light': true,
      'color-dodge': true,
      difference: true,
    };
    expect(Object.keys(modeMap)).toEqual([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'soft-light',
      'color-dodge',
      'difference',
    ]);
    expect(LayerBlendStack.displayName).toBe('LayerBlendStack');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LayerBlendStack: {
              className: 'theme-blend-stack',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <LayerBlendStack
          ref={ref}
          className="custom-blend-stack"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ maxWidth: '520px' }}
          data-testid="blend-stack"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('blend-stack');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-layer-blend-stack',
      'prism-slab',
      'theme-blend-stack',
      'custom-blend-stack'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-count', '4');
    expect(root).toHaveAttribute('data-active-blend-mode', 'overlay');
    expect(root).toHaveAttribute('data-active-clipped', 'true');
    expect(root).not.toHaveAttribute('data-active-locked');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ letterSpacing: '0.1px', maxWidth: '520px' });

    expect(screen.getByRole('heading', { name: 'Layer & Blend Stack' })).toBeInTheDocument();
    expect(screen.getByTestId('layer-count-pill')).toHaveTextContent('4 / 4 visible');

    const list = screen.getByRole('list', { name: 'Layer & Blend Stack layers' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(4);

    // First default layer is selected, clipped, Overlay · 85%
    expect(screen.getByTestId('layer-row-layer-lut-grade')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('layer-row-layer-lut-grade')).toHaveAttribute('data-clipped', 'true');
    expect(screen.getByTestId('layer-clip-glyph-layer-lut-grade')).toBeInTheDocument();
    expect(screen.getByTestId('layer-meta-layer-lut-grade')).toHaveTextContent('Overlay · 85%');

    const status = screen.getByTestId('layer-status-summary');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Film LUT · Kodak 2383');
    expect(status).toHaveTextContent('Overlay');
    expect(status).toHaveTextContent('85%');
    expect(status).toHaveTextContent('Clipped to Below');
  });

  it('renders semantic kind icons, accent tokens, and all 7 blend modes accurately', () => {
    const onChange = vi.fn();
    render(
      <LayerBlendStack
        defaultLayers={ALL_FIVE_KINDS}
        onChange={onChange}
        title="Color Grading Pipeline"
      />
    );

    const expectedMeta: Array<{ id: string; kind: LayerKind; token: string; label: string }> = [
      { id: 'k-image', kind: 'image', token: 'var(--prism-secondary-main)', label: 'Image' },
      { id: 'k-adjustment', kind: 'adjustment', token: 'var(--prism-primary-main)', label: 'Adjustment' },
      { id: 'k-text', kind: 'text', token: 'var(--prism-info-main)', label: 'Text' },
      { id: 'k-shape', kind: 'shape', token: 'var(--prism-success-main)', label: 'Shape' },
      { id: 'k-mask', kind: 'mask', token: 'var(--prism-warning-main)', label: 'Mask' },
    ];

    for (const item of expectedMeta) {
      const badge = screen.getByTestId(`layer-kind-icon-${item.id}`);
      expect(badge).toHaveAttribute('data-layer-kind', item.kind);
      expect(badge).toHaveAttribute('data-layer-kind-label', item.label);
      expect(badge.style.color).toBe(item.token);
    }

    expect(screen.getByTestId('layer-count-pill')).toHaveTextContent('4 / 5 visible');
    expect(screen.getByTestId('layer-meta-k-adjustment')).toHaveTextContent('Multiply · 80%');
    expect(screen.getByTestId('layer-meta-k-text')).toHaveTextContent('Screen · 90%');
    expect(screen.getByTestId('layer-meta-k-shape')).toHaveTextContent('Color Dodge · 45%');
    expect(screen.getByTestId('layer-meta-k-mask')).toHaveTextContent('Difference · 70%');

    const blendSelect = screen.getByLabelText('Active layer blend mode') as HTMLSelectElement;
    const allModes: Array<{ value: LayerBlendMode; label: string }> = [
      { value: 'normal', label: 'Normal' },
      { value: 'multiply', label: 'Multiply' },
      { value: 'screen', label: 'Screen' },
      { value: 'overlay', label: 'Overlay' },
      { value: 'soft-light', label: 'Soft Light' },
      { value: 'color-dodge', label: 'Color Dodge' },
      { value: 'difference', label: 'Difference' },
    ];

    for (const mode of allModes) {
      fireEvent.change(blendSelect, { target: { value: mode.value } });
      expect(screen.getByTestId('layer-meta-k-image')).toHaveTextContent(`${mode.label} · 100%`);
      expect(screen.getByTestId('layer-status-summary')).toHaveTextContent(mode.label);
    }
  });

  it('updates opacity slider, Clip to Below toggle, and Lock toggle with proper lock enforcement', () => {
    const onChange = vi.fn();
    render(<LayerBlendStack onChange={onChange} data-testid="controls-stack" />);

    const blendSelect = screen.getByLabelText('Active layer blend mode') as HTMLSelectElement;
    const opacitySlider = screen.getByLabelText('Active layer opacity') as HTMLInputElement;
    const opacityReadout = screen.getByTestId('active-opacity-readout');
    const clipBtn = screen.getByTestId('active-clip-toggle');
    const lockBtn = screen.getByTestId('active-lock-toggle');
    const status = screen.getByTestId('layer-status-summary');

    // Initial active layer: layer-lut-grade (Overlay, 85%, clipped=true, locked=false)
    expect(blendSelect.value).toBe('overlay');
    expect(opacitySlider.value).toBe('85');
    expect(opacityReadout).toHaveTextContent('85%');
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');

    // Adjust opacity slider
    fireEvent.change(opacitySlider, { target: { value: '42' } });
    expect(opacityReadout).toHaveTextContent('42%');
    expect(screen.getByTestId('layer-meta-layer-lut-grade')).toHaveTextContent('Overlay · 42%');
    expect(status).toHaveTextContent('42%');

    // Toggle Clip to Below off and back on
    fireEvent.click(clipBtn);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('layer-clip-glyph-layer-lut-grade')).toBeNull();
    expect(status).toHaveTextContent('Unclipped');

    fireEvent.click(clipBtn);
    expect(clipBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('layer-clip-glyph-layer-lut-grade')).toBeInTheDocument();
    expect(status).toHaveTextContent('Clipped to Below');

    // Lock active layer -> disables blend mode, opacity, clip, move up/down, delete; keeps visibility & lock active
    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lockBtn).toHaveTextContent('Locked');
    expect(screen.getByTestId('layer-locked-badge-layer-lut-grade')).toBeInTheDocument();
    expect(status).toHaveTextContent('Locked');
    expect(blendSelect).toBeDisabled();
    expect(opacitySlider).toBeDisabled();
    expect(clipBtn).toBeDisabled();
    expect(screen.getByTestId('layer-move-up-layer-lut-grade')).toBeDisabled();
    expect(screen.getByTestId('layer-move-down-layer-lut-grade')).toBeDisabled();
    expect(screen.getByTestId('layer-delete-layer-lut-grade')).toBeDisabled();
    expect(screen.getByTestId('layer-visibility-layer-lut-grade')).not.toBeDisabled();
    expect(lockBtn).not.toBeDisabled();

    // Direct synthetic change events while locked are ignored safely
    const callCountBeforeLockedEdit = onChange.mock.calls.length;
    fireEvent.change(blendSelect, { target: { value: 'multiply' } });
    fireEvent.change(opacitySlider, { target: { value: '10' } });
    expect(onChange).toHaveBeenCalledTimes(callCountBeforeLockedEdit);
    expect(opacityReadout).toHaveTextContent('42%');

    // Visibility toggle still works on locked layer
    const visBtn = screen.getByRole('button', { name: 'Toggle visibility for Film LUT · Kodak 2383' });
    fireEvent.click(visBtn);
    expect(visBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('layer-count-pill')).toHaveTextContent('3 / 4 visible');

    // Unlock restores editing controls
    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    expect(blendSelect).not.toBeDisabled();
    expect(opacitySlider).not.toBeDisabled();
    expect(clipBtn).not.toBeDisabled();
  });

  it('selects layers via pointer click and IME-safe Enter / Space keydown while ignoring non-activation keys', () => {
    const onSelectLayer = vi.fn();
    render(<LayerBlendStack onSelectLayer={onSelectLayer} />);

    const secondSelect = screen.getByRole('button', { name: 'Select layer Specular Halation Mask' });
    const thirdSelect = screen.getByRole('button', { name: 'Select layer Editorial Title Plate' });
    const fourthSelect = screen.getByRole('button', { name: 'Select layer RAW Base Plate · 16-bit' });

    // Click selects second layer
    fireEvent.click(secondSelect);
    expect(onSelectLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'layer-halation-mask' })
    );
    expect(secondSelect).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('Specular Halation Mask');

    // Enter selects third layer
    fireEvent.keyDown(thirdSelect, { key: 'Enter' });
    expect(onSelectLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'layer-title-plate' })
    );
    expect(thirdSelect).toHaveAttribute('aria-pressed', 'true');

    // Space selects fourth layer
    fireEvent.keyDown(fourthSelect, { key: ' ' });
    expect(onSelectLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'layer-raw-plate' })
    );
    expect(fourthSelect).toHaveAttribute('aria-pressed', 'true');

    // Non-activation key does nothing
    const callsBefore = onSelectLayer.mock.calls.length;
    fireEvent.keyDown(secondSelect, { key: 'ArrowDown' });
    expect(onSelectLayer).toHaveBeenCalledTimes(callsBefore);

    // IME composition Enter is ignored
    const imeEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    secondSelect.dispatchEvent(imeEnter);
    expect(imeEnter.defaultPrevented).toBe(false);
    expect(onSelectLayer).toHaveBeenCalledTimes(callsBefore);
  });

  it('reorders layers with Move Up / Move Down buttons and disables boundary arrows at top and bottom', () => {
    const onChange = vi.fn();
    render(<LayerBlendStack onChange={onChange} />);

    // Top layer cannot move up; bottom layer cannot move down
    expect(screen.getByRole('button', { name: 'Move Film LUT · Kodak 2383 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move RAW Base Plate · 16-bit down' })).toBeDisabled();

    // Move top layer down to index 1
    fireEvent.click(screen.getByRole('button', { name: 'Move Film LUT · Kodak 2383 down' }));
    let listItems = screen.getAllByRole('listitem');
    expect(listItems.map((el) => el.getAttribute('data-layer-id'))).toEqual([
      'layer-halation-mask',
      'layer-lut-grade',
      'layer-title-plate',
      'layer-raw-plate',
    ]);

    // Move it back up to index 0
    fireEvent.click(screen.getByRole('button', { name: 'Move Film LUT · Kodak 2383 up' }));
    listItems = screen.getAllByRole('listitem');
    expect(listItems.map((el) => el.getAttribute('data-layer-id'))).toEqual([
      'layer-lut-grade',
      'layer-halation-mask',
      'layer-title-plate',
      'layer-raw-plate',
    ]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('appends new adjustment layers with collision-safe IDs and enforces delete safeguards', () => {
    const onChange = vi.fn();
    const onSelectLayer = vi.fn();

    const seed: BlendLayerItem[] = [
      {
        id: 'layer-adjustment-2',
        name: 'Existing Adjustment 2',
        kind: 'adjustment',
        visible: true,
        opacity: 90,
        blendMode: 'overlay',
      },
      {
        id: 'base-img',
        name: 'Base Photo',
        kind: 'image',
        visible: true,
        opacity: 100,
        blendMode: 'normal',
      },
    ];

    render(
      <LayerBlendStack
        defaultLayers={seed}
        onChange={onChange}
        onSelectLayer={onSelectLayer}
      />
    );

    // Add Adjustment skips colliding id `layer-adjustment-2` and creates `layer-adjustment-3`
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    let listItems = screen.getAllByRole('listitem');
    expect(listItems.map((el) => el.getAttribute('data-layer-id'))).toEqual([
      'layer-adjustment-2',
      'base-img',
      'layer-adjustment-3',
    ]);
    expect(onSelectLayer).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'layer-adjustment-3', name: 'Adjustment 3', kind: 'adjustment' })
    );

    // Delete active bottom layer -> selects neighboring remaining layer (`base-img`)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Adjustment 3' }));
    listItems = screen.getAllByRole('listitem');
    expect(listItems.map((el) => el.getAttribute('data-layer-id'))).toEqual([
      'layer-adjustment-2',
      'base-img',
    ]);
    expect(screen.getByTestId('layer-row-base-img')).toHaveAttribute('data-selected', 'true');

    // Delete non-active layer -> active layer remains `base-img` and Delete disables with 1 layer left
    fireEvent.click(screen.getByRole('button', { name: 'Delete Existing Adjustment 2' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('layer-row-base-img')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('button', { name: 'Delete Base Photo' })).toBeDisabled();
  });

  it('supports controlled layers and selectedLayerId (including null selection) and renders empty state when layers is []', () => {
    function ControlledHarness() {
      const [layers, setLayers] = useState<BlendLayerItem[]>([
        {
          id: 'c-1',
          name: 'Grade A',
          kind: 'adjustment',
          visible: true,
          opacity: 75,
          blendMode: 'overlay',
        },
        {
          id: 'c-2',
          name: 'Base B',
          kind: 'image',
          visible: true,
          opacity: 100,
          blendMode: 'normal',
        },
      ]);
      const [selectedId, setSelectedId] = useState<string | null>(null);

      return (
        <div>
          <LayerBlendStack
            layers={layers}
            selectedLayerId={selectedId}
            onChange={setLayers}
            onSelectLayer={(layer) => setSelectedId(layer.id)}
            data-testid="controlled-stack"
          />
          <button type="button" onClick={() => setLayers([])}>
            Clear All
          </button>
        </div>
      );
    }

    render(<ControlledHarness />);

    // Initially selectedLayerId is null -> controls disabled, status prompts selection
    expect(screen.getByLabelText('Active layer blend mode')).toBeDisabled();
    expect(screen.getByLabelText('Active layer opacity')).toBeDisabled();
    expect(screen.getByTestId('active-opacity-readout')).toHaveTextContent('—');
    expect(screen.getByTestId('active-clip-toggle')).toBeDisabled();
    expect(screen.getByTestId('active-lock-toggle')).toBeDisabled();
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('No layer selected');

    // Select Grade A
    fireEvent.click(screen.getByRole('button', { name: 'Select layer Grade A' }));
    expect(screen.getByTestId('layer-row-c-1')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('active-opacity-readout')).toHaveTextContent('75%');

    // Clear all layers -> empty state renders cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    expect(screen.getByTestId('layer-stack-empty')).toHaveTextContent('No layers in stack');
    expect(screen.getByTestId('layer-count-pill')).toHaveTextContent('0 / 0 visible');
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('Stack is empty');

    // Add Adjustment from empty state appends Adjustment 1 and selects it
    fireEvent.click(screen.getByRole('button', { name: 'Add Adjustment' }));
    expect(screen.queryByTestId('layer-stack-empty')).toBeNull();
    expect(screen.getByTestId('layer-row-layer-adjustment-1')).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  it('handles uncontrolled defaultSelectedLayerId null, missing ID fallback, and empty defaultLayers', () => {
    const { rerender } = render(
      <LayerBlendStack defaultLayers={[]} data-testid="empty-uncontrolled" />
    );
    expect(screen.getByTestId('layer-stack-empty')).toBeInTheDocument();
    expect(screen.getByTestId('empty-uncontrolled')).toHaveAttribute('data-empty', 'true');

    rerender(
      <LayerBlendStack
        key="null-sel"
        defaultSelectedLayerId={null}
        data-testid="null-uncontrolled"
      />
    );
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('No layer selected');

    rerender(
      <LayerBlendStack
        key="missing-sel"
        defaultSelectedLayerId="does-not-exist"
        data-testid="fallback-uncontrolled"
      />
    );
    expect(screen.getByTestId('layer-row-layer-lut-grade')).toHaveAttribute(
      'data-selected',
      'true'
    );

    rerender(
      <LayerBlendStack
        key="missing-empty-sel"
        defaultLayers={[]}
        defaultSelectedLayerId="does-not-exist"
        data-testid="fallback-empty-uncontrolled"
      />
    );
    expect(screen.getByTestId('layer-stack-empty')).toBeInTheDocument();
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('Stack is empty');

    rerender(
      <LayerBlendStack
        key="missing-controlled-sel"
        selectedLayerId="nonexistent-controlled"
        data-testid="fallback-controlled"
      />
    );
    expect(screen.getByTestId('layer-status-summary')).toHaveTextContent('No layer selected');
  });

  it('blocks all interactions cleanly when component disabled is true', () => {
    const onChange = vi.fn();
    const onSelectLayer = vi.fn();

    render(
      <LayerBlendStack
        disabled
        onChange={onChange}
        onSelectLayer={onSelectLayer}
        data-testid="disabled-stack"
      />
    );

    const root = screen.getByTestId('disabled-stack');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    expect(screen.getByTestId('layer-add-adjustment')).toBeDisabled();
    expect(screen.getByLabelText('Active layer blend mode')).toBeDisabled();
    expect(screen.getByLabelText('Active layer opacity')).toBeDisabled();
    expect(screen.getByTestId('active-clip-toggle')).toBeDisabled();
    expect(screen.getByTestId('active-lock-toggle')).toBeDisabled();

    // Row click & keydown blocked when disabled
    const rowSelect = screen.getByTestId('layer-select-layer-halation-mask');
    expect(rowSelect).toHaveAttribute('tabIndex', '-1');
    expect(rowSelect).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(rowSelect);
    fireEvent.keyDown(rowSelect, { key: 'Enter' });
    fireEvent.keyDown(rowSelect, { key: ' ' });

    // Synthetic select/slider changes blocked when disabled
    fireEvent.change(screen.getByLabelText('Active layer blend mode'), {
      target: { value: 'difference' },
    });
    fireEvent.change(screen.getByLabelText('Active layer opacity'), {
      target: { value: '15' },
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onSelectLayer).not.toHaveBeenCalled();
  });

  it('defends against XSS payloads, duplicate IDs, NaN/out-of-range opacities, blank names/titles, invalid blend values, and passes through BaseProps', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn();
    const onKeyDown = vi.fn();

    const adversarialLayers: BlendLayerItem[] = [
      {
        id: 'dup-id',
        name: payload,
        kind: 'image',
        visible: true,
        opacity: 145.6,
        blendMode: 'normal',
      },
      {
        id: 'dup-id',
        name: 'Duplicate Should Be Dropped',
        kind: 'mask',
        visible: true,
        opacity: 50,
        blendMode: 'screen',
      },
      {
        id: 'blank-name',
        name: '   ',
        kind: 'shape',
        visible: true,
        opacity: Number.NaN,
        blendMode: 'overlay',
      },
      {
        id: 'neg-opacity',
        name: 'Shadow Crush',
        kind: 'adjustment',
        visible: true,
        opacity: -25,
        blendMode: 'multiply',
      },
    ];

    render(
      <LayerBlendStack
        title="   "
        defaultLayers={adversarialLayers}
        onChange={onChange}
        onKeyDown={onKeyDown}
        aria-label="Custom compositor landmark"
        data-testid="adversarial-stack"
      />
    );

    const root = screen.getByTestId('adversarial-stack');
    expect(root).toHaveAttribute('aria-label', 'Custom compositor landmark');
    expect(screen.getByRole('heading', { name: 'Layer & Blend Stack' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();

    // Deduplicated to 3 unique layers
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByTestId('layer-name-dup-id')).toHaveTextContent(payload);
    expect(screen.getByTestId('layer-meta-dup-id')).toHaveTextContent('Normal · 100%');
    expect(screen.getByTestId('layer-name-blank-name')).toHaveTextContent('Untitled Layer');
    expect(screen.getByTestId('layer-meta-blank-name')).toHaveTextContent('Overlay · 100%');
    expect(screen.getByTestId('layer-meta-neg-opacity')).toHaveTextContent('Multiply · 0%');

    // Invalid blend mode value is ignored safely
    fireEvent.change(screen.getByLabelText('Active layer blend mode'), {
      target: { value: 'not-a-blend-mode' },
    });
    expect(onChange).not.toHaveBeenCalled();

    // BaseProps event handler passthrough
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
