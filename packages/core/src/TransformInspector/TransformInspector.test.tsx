import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TransformInspector,
  type Transform3DState,
  type TransformAxis,
  type TransformAxisMap,
} from './index';

describe('TransformInspector', () => {
  it('renders prism-slab inspector, semantic axis tokens, React 19 ref, theme override, and default live telemetry', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TransformInspector: {
              className: 'theme-transform-inspector',
              style: { maxWidth: '480px' },
            },
          },
        }}
      >
        <TransformInspector
          ref={ref}
          title="Mesh Transform"
          className="local-transform-inspector"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="transform-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('transform-root');
    const telemetry = screen.getByTestId('transform-telemetry');
    const lockBtn = screen.getByRole('button', { name: 'Lock uniform scale aspect ratio' });

    expect(TransformInspector.displayName).toBe('TransformInspector');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-transform-inspector',
      'prism-slab',
      'theme-transform-inspector',
      'local-transform-inspector'
    );
    expect(root).toHaveStyle({ maxWidth: '480px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Mesh Transform');
    expect(root).toHaveAttribute('data-scale-locked', 'true');

    expect(screen.getByTestId('transform-inspector-title')).toHaveTextContent('Mesh Transform');
    expect(screen.getByTestId('transform-position-unit')).toHaveTextContent('px');

    // Semantic color-coded X/Y/Z axis tokens with zero raw color literals
    for (const channel of ['position', 'rotation', 'scale']) {
      expect(screen.getByTestId(`transform-label-${channel}-x`).style.color).toBe(
        'var(--prism-error-main)'
      );
      expect(screen.getByTestId(`transform-accent-${channel}-x`).style.backgroundColor).toBe(
        'var(--prism-error-main)'
      );
      expect(screen.getByTestId(`transform-label-${channel}-y`).style.color).toBe(
        'var(--prism-success-main)'
      );
      expect(screen.getByTestId(`transform-accent-${channel}-y`).style.backgroundColor).toBe(
        'var(--prism-success-main)'
      );
      expect(screen.getByTestId(`transform-label-${channel}-z`).style.color).toBe(
        'var(--prism-info-main)'
      );
      expect(screen.getByTestId(`transform-accent-${channel}-z`).style.backgroundColor).toBe(
        'var(--prism-info-main)'
      );
    }

    // Default spinbutton accessible names and values
    expect(screen.getByRole('spinbutton', { name: 'Position X' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Position Y' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Position Z' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Rotation X' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Rotation Y' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Rotation Z' })).toHaveValue('0');
    expect(screen.getByRole('spinbutton', { name: 'Scale X' })).toHaveValue('1');
    expect(screen.getByRole('spinbutton', { name: 'Scale Y' })).toHaveValue('1');
    expect(screen.getByRole('spinbutton', { name: 'Scale Z' })).toHaveValue('1');

    // Scale lock & reset controls at identity
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lockBtn).toHaveAttribute('data-locked', 'true');
    expect(screen.getByTestId('transform-scale-mode-badge')).toHaveTextContent('Uniform');
    expect(screen.getByTestId('transform-reset-all')).toBeDisabled();
    expect(screen.getByTestId('transform-reset-position')).toBeDisabled();
    expect(screen.getByTestId('transform-reset-rotation')).toBeDisabled();
    expect(screen.getByTestId('transform-reset-scale')).toBeDisabled();

    // Live telemetry readout
    expect(telemetry).toHaveAttribute('role', 'status');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(telemetry).toHaveTextContent(
      'translate3d(0px, 0px, 0px) rotate3d(0deg, 0deg, 0deg) scale3d(1, 1, 1)'
    );
  });

  it('supports numeric typing, draft handling, Enter/Escape/blur cleanup, and no-op deduplication across all channels and axes', () => {
    const onChange = vi.fn<(state: Transform3DState) => void>();

    render(<TransformInspector onChange={onChange} />);

    const posX = screen.getByRole('spinbutton', { name: 'Position X' });
    const posY = screen.getByRole('spinbutton', { name: 'Position Y' });
    const posZ = screen.getByRole('spinbutton', { name: 'Position Z' });
    const rotX = screen.getByRole('spinbutton', { name: 'Rotation X' });
    const rotY = screen.getByRole('spinbutton', { name: 'Rotation Y' });
    const rotZ = screen.getByRole('spinbutton', { name: 'Rotation Z' });

    fireEvent.focus(posX);
    // Intermediate non-numeric drafts do not emit onChange
    fireEvent.change(posX, { target: { value: '-' } });
    expect(posX).toHaveValue('-');
    expect(onChange).not.toHaveBeenCalled();

    // Huge overflowing numeric string (> Number.MAX_VALUE) returns null and does not emit
    fireEvent.change(posX, { target: { value: '9'.repeat(400) } });
    expect(onChange).not.toHaveBeenCalled();

    // Valid negative numeric value emits immediately
    fireEvent.change(posX, { target: { value: '-12.5' } });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: -12.5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      scaleLocked: true,
    });

    // Typing equivalent canonical value with trailing zeros triggers equality guard (no duplicate call)
    const callsBeforeNoOp = onChange.mock.calls.length;
    fireEvent.change(posX, { target: { value: '-12.50' } });
    expect(posX).toHaveValue('-12.50');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeNoOp);

    // Pressing Enter clears draft and snaps to canonical display
    fireEvent.keyDown(posX, { key: 'Enter' });
    expect(posX).toHaveValue('-12.5');

    // Invalid draft reverts on Escape
    fireEvent.change(posX, { target: { value: 'abc' } });
    expect(posX).toHaveValue('abc');
    fireEvent.keyDown(posX, { key: 'Escape' });
    expect(posX).toHaveValue('-12.5');

    // Invalid draft reverts on blur
    fireEvent.change(posX, { target: { value: '' } });
    expect(posX).toHaveValue('');
    fireEvent.blur(posX);
    expect(posX).toHaveValue('-12.5');

    // Update Position Y & Z and Rotation X, Y, Z
    fireEvent.change(posY, { target: { value: '.5' } });
    fireEvent.change(posZ, { target: { value: '24' } });
    fireEvent.change(rotX, { target: { value: '15' } });
    fireEvent.change(rotY, { target: { value: '-30' } });
    fireEvent.change(rotZ, { target: { value: '45.25' } });
    fireEvent.blur(rotZ);

    expect(screen.getByTestId('transform-telemetry')).toHaveTextContent(
      'translate3d(-12.5px, 0.5px, 24px) rotate3d(15deg, -30deg, 45.25deg) scale3d(1, 1, 1)'
    );
  });

  it('supports IME-safe ArrowUp/ArrowDown stepping with Shift ×10 across position, rotation, and scale', () => {
    const onChange = vi.fn<(state: Transform3DState) => void>();

    render(<TransformInspector onChange={onChange} />);

    const posX = screen.getByRole('spinbutton', { name: 'Position X' });
    const rotY = screen.getByRole('spinbutton', { name: 'Rotation Y' });
    const scaleZ = screen.getByRole('spinbutton', { name: 'Scale Z' });

    // IME composing events must be ignored
    fireEvent.keyDown(posX, { key: 'ArrowUp', isComposing: true });
    fireEvent.keyDown(posX, { key: 'ArrowDown', isComposing: true });
    fireEvent.keyDown(posX, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(posX, { key: 'Escape', isComposing: true });
    // Unrelated key ignored
    fireEvent.keyDown(posX, { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();

    // Position: ±1 and Shift ±10
    fireEvent.keyDown(posX, { key: 'ArrowUp' });
    expect(posX).toHaveValue('1');
    fireEvent.keyDown(posX, { key: 'ArrowUp', shiftKey: true });
    expect(posX).toHaveValue('11');
    fireEvent.keyDown(posX, { key: 'ArrowDown', shiftKey: true });
    expect(posX).toHaveValue('1');
    fireEvent.keyDown(posX, { key: 'ArrowDown' });
    expect(posX).toHaveValue('0');

    // Stepping while an active valid draft exists starts from that draft
    fireEvent.change(posX, { target: { value: '5.' } });
    fireEvent.keyDown(posX, { key: 'ArrowUp' });
    expect(posX).toHaveValue('6');

    // Stepping while an invalid draft exists falls back to committed value (6)
    fireEvent.change(posX, { target: { value: 'invalid' } });
    fireEvent.keyDown(posX, { key: 'ArrowDown' });
    expect(posX).toHaveValue('5');

    // Rotation: ±1° and Shift ±10°
    fireEvent.keyDown(rotY, { key: 'ArrowUp', shiftKey: true });
    expect(rotY).toHaveValue('10');
    fireEvent.keyDown(rotY, { key: 'ArrowDown' });
    expect(rotY).toHaveValue('9');

    // Scale (locked by default): ±0.1 and Shift ±1 uniformly across all three axes
    fireEvent.keyDown(scaleZ, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 5, y: 0, z: 0 },
      rotation: { x: 0, y: 9, z: 0 },
      scale: { x: 1.1, y: 1.1, z: 1.1 },
      scaleLocked: true,
    });

    fireEvent.keyDown(scaleZ, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 5, y: 0, z: 0 },
      rotation: { x: 0, y: 9, z: 0 },
      scale: { x: 2.1, y: 2.1, z: 2.1 },
      scaleLocked: true,
    });
  });

  it('scales proportionally when aspect-ratio chain lock is active, handles zero-axis fallback uniformly, and edits independently when unlocked', () => {
    const onChange = vi.fn<(state: Transform3DState) => void>();

    render(
      <TransformInspector
        defaultValue={{
          scale: { x: 2, y: 4, z: 6 },
          scaleLocked: true,
        }}
        onChange={onChange}
        data-testid="inspector"
      />
    );

    const root = screen.getByTestId('inspector');
    const lockBtn = screen.getByRole('button', { name: 'Lock uniform scale aspect ratio' });
    const scaleX = screen.getByRole('spinbutton', { name: 'Scale X' });
    const scaleY = screen.getByRole('spinbutton', { name: 'Scale Y' });
    const scaleZ = screen.getByRole('spinbutton', { name: 'Scale Z' });

    // Locked proportional edit via X preserves 2:4:6 ratio even when typing "0" -> "0." -> "0.5" while focused
    fireEvent.focus(scaleX);
    fireEvent.change(scaleX, { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0, y: 0, z: 0 },
      scaleLocked: true,
    });
    fireEvent.change(scaleX, { target: { value: '0.' } });
    fireEvent.change(scaleX, { target: { value: '0.5' } });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0.5, y: 1, z: 1.5 },
      scaleLocked: true,
    });
    fireEvent.blur(scaleX);

    // Locked proportional edit via Y (1 -> 2 doubles all axes: 1, 2, 3)
    fireEvent.change(scaleY, { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 2, z: 3 },
      scaleLocked: true,
    });
    fireEvent.blur(scaleY);

    // Locked proportional edit via Z (3 -> 0 zeroes all axes)
    fireEvent.change(scaleZ, { target: { value: '0' } });
    fireEvent.blur(scaleZ);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 0, y: 0, z: 0 },
      scaleLocked: true,
    });

    // Prior axis is 0 while locked -> editing matches all three axes uniformly
    fireEvent.change(scaleY, { target: { value: '2.5' } });
    fireEvent.blur(scaleY);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2.5, y: 2.5, z: 2.5 },
      scaleLocked: true,
    });

    // Unlock aspect ratio -> axes edit independently
    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'false');
    expect(lockBtn).toHaveAttribute('data-locked', 'false');
    expect(root).toHaveAttribute('data-scale-locked', 'false');
    expect(screen.getByTestId('transform-scale-mode-badge')).toHaveTextContent('Free');

    fireEvent.change(scaleX, { target: { value: '3' } });
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 3, y: 2.5, z: 2.5 },
      scaleLocked: false,
    });

    // Re-lock aspect ratio
    fireEvent.click(lockBtn);
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-scale-locked', 'true');
  });

  it('resets individual rows and Reset All while preserving scaleLocked state', () => {
    const onChange = vi.fn<(state: Transform3DState) => void>();

    render(
      <TransformInspector
        defaultValue={{
          position: { x: 10, y: 20, z: 30 },
          rotation: { x: 45, y: 90, z: 180 },
          scale: { x: 2, y: 3, z: 4 },
          scaleLocked: false,
        }}
        onChange={onChange}
      />
    );

    const resetPos = screen.getByRole('button', { name: 'Reset position' });
    const resetRot = screen.getByRole('button', { name: 'Reset rotation' });
    const resetScale = screen.getByRole('button', { name: 'Reset scale' });
    const resetAll = screen.getByRole('button', { name: 'Reset all transform values' });

    expect(resetPos).toBeEnabled();
    expect(resetRot).toBeEnabled();
    expect(resetScale).toBeEnabled();
    expect(resetAll).toBeEnabled();

    // Reset Position row only
    fireEvent.click(resetPos);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 45, y: 90, z: 180 },
      scale: { x: 2, y: 3, z: 4 },
      scaleLocked: false,
    });
    expect(resetPos).toBeDisabled();

    // Reset Rotation row only
    fireEvent.click(resetRot);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 3, z: 4 },
      scaleLocked: false,
    });
    expect(resetRot).toBeDisabled();

    // Re-dirty position & rotation then trigger Reset All
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Position X' }), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Rotation Z' }), {
      target: { value: '60' },
    });

    fireEvent.click(resetAll);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      scaleLocked: false,
    });
    expect(resetAll).toBeDisabled();
    expect(resetScale).toBeDisabled();

    // Modify scale and test per-row Reset scale button
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Scale Y' }), {
      target: { value: '5' },
    });
    expect(resetScale).toBeEnabled();
    fireEvent.click(resetScale);
    expect(onChange).toHaveBeenLastCalledWith({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      scaleLocked: false,
    });
  });

  it('supports controlled mode and custom or empty positionUnit formatting', () => {
    const onChangeSpy = vi.fn<(state: Transform3DState) => void>();

    function ControlledHarness() {
      const [transform, setTransform] = useState<Transform3DState>({
        position: { x: 4, y: 8, z: -2 },
        rotation: { x: 0, y: 15, z: 0 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        scaleLocked: true,
      });

      return (
        <TransformInspector
          value={transform}
          positionUnit="rem"
          onChange={(next) => {
            onChangeSpy(next);
            setTransform(next);
          }}
        />
      );
    }

    const { rerender } = render(<ControlledHarness />);

    expect(screen.getByTestId('transform-position-unit')).toHaveTextContent('rem');
    expect(screen.getByRole('spinbutton', { name: 'Position X' })).toHaveAttribute(
      'aria-valuetext',
      '4rem'
    );
    expect(screen.getByTestId('transform-telemetry')).toHaveTextContent(
      'translate3d(4rem, 8rem, -2rem) rotate3d(0deg, 15deg, 0deg) scale3d(1.5, 1.5, 1.5)'
    );

    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Position X' }), { key: 'ArrowUp' });
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      position: { x: 5, y: 8, z: -2 },
      rotation: { x: 0, y: 15, z: 0 },
      scale: { x: 1.5, y: 1.5, z: 1.5 },
      scaleLocked: true,
    });
    expect(screen.getByTestId('transform-telemetry')).toHaveTextContent(
      'translate3d(5rem, 8rem, -2rem) rotate3d(0deg, 15deg, 0deg) scale3d(1.5, 1.5, 1.5)'
    );

    // Empty positionUnit omits unit badge and renders bare coordinates
    rerender(
      <TransformInspector
        positionUnit="   "
        defaultValue={{ position: { x: 3, y: 6, z: 9 } }}
      />
    );
    expect(screen.queryByTestId('transform-position-unit')).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Position X' })).toHaveAttribute(
      'aria-valuetext',
      '3'
    );
    expect(screen.getByTestId('transform-telemetry')).toHaveTextContent(
      'translate3d(3, 6, 9) rotate3d(0deg, 0deg, 0deg) scale3d(1, 1, 1)'
    );
  });

  it('blocks all inputs, scale lock toggle, reset controls, and synthetic events when disabled', () => {
    const onChange = vi.fn<(state: Transform3DState) => void>();

    render(
      <TransformInspector
        disabled
        defaultValue={{
          position: { x: 10, y: 0, z: 0 },
          rotation: { x: 15, y: 0, z: 0 },
          scale: { x: 2, y: 2, z: 2 },
        }}
        onChange={onChange}
        data-testid="disabled-inspector"
      />
    );

    const root = screen.getByTestId('disabled-inspector');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const posX = screen.getByRole('spinbutton', { name: 'Position X' });
    const scaleX = screen.getByRole('spinbutton', { name: 'Scale X' });
    const lockBtn = screen.getByTestId('transform-scale-lock');
    const resetAll = screen.getByTestId('transform-reset-all');
    const resetPos = screen.getByTestId('transform-reset-position');

    expect(posX).toBeDisabled();
    expect(scaleX).toBeDisabled();
    expect(lockBtn).toBeDisabled();
    expect(resetAll).toBeDisabled();
    expect(resetPos).toBeDisabled();

    // Synthetic events while disabled must not mutate or invoke onChange
    fireEvent.change(posX, { target: { value: '99' } });
    fireEvent.keyDown(posX, { key: 'ArrowUp' });
    fireEvent.change(scaleX, { target: { value: '4' } });
    fireEvent.keyDown(scaleX, { key: 'ArrowDown' });
    fireEvent.click(lockBtn);
    fireEvent.click(resetAll);
    fireEvent.click(resetPos);

    expect(onChange).not.toHaveBeenCalled();
    expect(posX).toHaveValue('10');
    expect(scaleX).toHaveValue('2');
  });

  it('sanitizes adversarial NaN, Infinity, -0, and out-of-range coordinates and aligns TransformAxisMap', () => {
    render(
      <TransformInspector
        value={{
          position: {
            x: Number.NaN,
            y: Number.POSITIVE_INFINITY,
            z: 5_000_000,
          },
          rotation: {
            x: Number.NEGATIVE_INFINITY,
            y: -0,
            z: -5_000_000,
          },
          scale: {
            x: Number.NaN,
            y: 1.23456,
            z: Number.POSITIVE_INFINITY,
          },
          scaleLocked: true,
        }}
      />
    );

    expect(screen.getByTestId('transform-telemetry')).toHaveTextContent(
      'translate3d(0px, 0px, 1000000px) rotate3d(0deg, 0deg, -1000000deg) scale3d(1, 1.235, 1)'
    );

    const axisMapCheck: Record<keyof TransformAxisMap, TransformAxis> = {
      x: 'x',
      y: 'y',
      z: 'z',
    };
    expect(Object.keys(axisMapCheck)).toEqual(['x', 'y', 'z']);
  });
});
