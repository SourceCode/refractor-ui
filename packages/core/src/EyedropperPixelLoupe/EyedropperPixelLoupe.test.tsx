import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  EyedropperPixelLoupe,
  type SampledRgbPixel,
  type SampleRadius,
  type SampleRadiusMap,
} from './index';

const DETERMINISTIC_RESOLVER = (x: number, y: number) => ({
  r: x * 20,
  g: y * 30,
  b: 100,
});

describe('EyedropperPixelLoupe', () => {
  it('renders prism-slab panel, default 12x8 optical mosaic, circular 5x5 loupe, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const radiusKeys: Array<keyof SampleRadiusMap> = ['1x1', '3x3', '5x5'];
    expect(radiusKeys).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            EyedropperPixelLoupe: {
              className: 'theme-loupe-shell',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <EyedropperPixelLoupe
          ref={ref}
          className="local-loupe-shell"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="loupe-root"
        />
      </PrismThemeProvider>
    );

    expect(EyedropperPixelLoupe.displayName).toBe('EyedropperPixelLoupe');

    const region = screen.getByRole('region', { name: 'Eyedropper & Pixel Loupe' });
    expect(ref.current).toBe(region);
    expect(region).toHaveClass(
      'refractor-eyedropper-pixel-loupe',
      'prism-slab',
      'max-w-full',
      'min-w-0',
      'theme-loupe-shell',
      'local-loupe-shell'
    );
    expect(region).toHaveStyle({ maxWidth: '720px' });
    expect(region).toHaveAttribute('data-radius', '1x1');
    expect(region).not.toHaveAttribute('data-disabled');

    const canvas = screen.getByTestId('eyedropper-canvas');
    expect(canvas).toHaveAttribute('role', 'application');
    expect(canvas).toHaveAttribute('tabindex', '0');
    expect(canvas).toHaveAttribute('data-cursor-x', '6');
    expect(canvas).toHaveAttribute('data-cursor-y', '4');

    const mosaicSvg = screen.getByTestId('eyedropper-mosaic-svg');
    expect(mosaicSvg).toHaveAttribute('viewBox', '0 0 240 160');
    expect(mosaicSvg.querySelectorAll('rect[data-cell-x]')).toHaveLength(96);

    const loupeSvg = screen.getByTestId('eyedropper-loupe-svg');
    expect(loupeSvg).toHaveAttribute('viewBox', '0 0 140 140');
    expect(loupeSvg).toHaveClass('w-36', 'h-36', 'mx-auto');
    expect(loupeSvg.querySelectorAll('rect[data-loupe-cell]')).toHaveLength(25);

    const reticle = screen.getByTestId('eyedropper-loupe-reticle');
    expect(reticle).toHaveAttribute('stroke', 'var(--prism-primary-main)');

    expect(screen.getByTestId('eyedropper-hex').textContent).toMatch(/^#[0-9A-F]{6}$/);
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(6, 4)');
    expect(screen.getByTestId('eyedropper-history-empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('computes exact 1x1, 3x3, and 5x5 RGB averages with custom pixelResolver including edge out-of-bounds cells', () => {
    const onSample = vi.fn<(pixel: SampledRgbPixel) => void>();

    render(
      <EyedropperPixelLoupe
        gridWidth={10}
        gridHeight={6}
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
      />
    );

    // Initial center is (5, 3): r = 100, g = 90, b = 100 -> #645A64
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(5, 3)');
    expect(screen.getByTestId('eyedropper-channel-r')).toHaveTextContent('100');
    expect(screen.getByTestId('eyedropper-channel-g')).toHaveTextContent('90');
    expect(screen.getByTestId('eyedropper-channel-b')).toHaveTextContent('100');
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#645A64');
    expect(screen.queryByTestId('eyedropper-sample-footprint')).not.toBeInTheDocument();

    // Move to top-left corner (0, 0) via Home + repeated ArrowUp
    const canvas = screen.getByTestId('eyedropper-canvas');
    fireEvent.keyDown(canvas, { key: 'Home' });
    for (let i = 0; i < 4; i += 1) {
      fireEvent.keyDown(canvas, { key: 'ArrowUp' });
    }
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(0, 0)');
    expect(screen.getByTestId('eyedropper-channel-r')).toHaveTextContent('0');
    expect(screen.getByTestId('eyedropper-channel-g')).toHaveTextContent('0');
    expect(screen.getByTestId('eyedropper-channel-b')).toHaveTextContent('100');
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#000064');

    // Out-of-bounds loupe cells at corner (0, 0): dx=-2,dy=-2 is out of bounds, dx=0,dy=0 is in bounds
    const loupeSvg = screen.getByTestId('eyedropper-loupe-svg');
    const oobCell = loupeSvg.querySelector('rect[data-loupe-cell="-2,-2"]');
    const centerCell = loupeSvg.querySelector('rect[data-loupe-cell="0,0"]');
    expect(oobCell).toHaveAttribute('data-in-bounds', 'false');
    expect(oobCell).toHaveAttribute('fill', 'var(--prism-well-start)');
    expect(centerCell).toHaveAttribute('data-in-bounds', 'true');
    expect(centerCell).toHaveAttribute('fill', '#000064');

    // Switch to 3x3 Avg at corner (0, 0): in-bounds cells are x in {0,1}, y in {0,1}
    // avg r = (0+20+0+20)/4 = 10, avg g = (0+0+30+30)/4 = 15, avg b = 100 -> #0A0F64
    const btn3x3 = screen.getByRole('button', { name: '3 by 3 average sample' });
    fireEvent.click(btn3x3);
    expect(btn3x3).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eyedropper-sample-footprint')).toBeInTheDocument();
    expect(screen.getByTestId('eyedropper-loupe-kernel')).toBeInTheDocument();
    expect(screen.getByTestId('eyedropper-channel-r')).toHaveTextContent('10');
    expect(screen.getByTestId('eyedropper-channel-g')).toHaveTextContent('15');
    expect(screen.getByTestId('eyedropper-channel-b')).toHaveTextContent('100');
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#0A0F64');

    // Switch to 5x5 Avg at corner (0, 0): in-bounds cells are x in {0,1,2}, y in {0,1,2}
    // avg r = (0+20+40)/3 = 20, avg g = (0+30+60)/3 = 30, avg b = 100 -> #141E64
    const btn5x5 = screen.getByRole('button', { name: '5 by 5 average sample' });
    fireEvent.click(btn5x5);
    expect(btn5x5).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('eyedropper-channel-r')).toHaveTextContent('20');
    expect(screen.getByTestId('eyedropper-channel-g')).toHaveTextContent('30');
    expect(screen.getByTestId('eyedropper-channel-b')).toHaveTextContent('100');
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#141E64');

    // Commit sample via Sample Pixel button
    fireEvent.click(screen.getByRole('button', { name: 'Sample Pixel' }));
    expect(onSample).toHaveBeenCalledWith({
      r: 20,
      g: 30,
      b: 100,
      hex: '#141E64',
      x: 0,
      y: 0,
    });
  });

  it('supports controlled sampleRadius with onSampleRadiusChange', () => {
    function ControlledHarness() {
      const [radius, setRadius] = useState<SampleRadius>('3x3');
      return (
        <EyedropperPixelLoupe
          sampleRadius={radius}
          onSampleRadiusChange={setRadius}
          pixelResolver={DETERMINISTIC_RESOLVER}
        />
      );
    }

    render(<ControlledHarness />);
    const region = screen.getByRole('region', { name: 'Eyedropper & Pixel Loupe' });
    expect(region).toHaveAttribute('data-radius', '3x3');

    fireEvent.click(screen.getByRole('button', { name: '5 by 5 average sample' }));
    expect(region).toHaveAttribute('data-radius', '5x5');

    fireEvent.click(screen.getByRole('button', { name: '1 by 1 point sample' }));
    expect(region).toHaveAttribute('data-radius', '1x1');
  });

  it('supports pointer move & click using getBoundingClientRect as well as direct SVG cell clicks and canvas fallback', () => {
    const onSample = vi.fn<(pixel: SampledRgbPixel) => void>();

    render(
      <EyedropperPixelLoupe
        gridWidth={10}
        gridHeight={8}
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
      />
    );

    const canvas = screen.getByTestId('eyedropper-canvas');

    // Default JSDOM 0x0 rect: pointerMove on canvas itself is a safe no-op
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(5, 4)');

    // Clicking canvas itself with 0x0 rect samples current cursor (5, 4)
    fireEvent.click(canvas);
    expect(onSample).toHaveBeenLastCalledWith({
      r: 100,
      g: 120,
      b: 100,
      hex: '#647864',
      x: 5,
      y: 4,
    });

    // Pointer move & click directly on SVG cell rect in JSDOM (data-cell-x / data-cell-y fallback)
    const mosaicSvg = screen.getByTestId('eyedropper-mosaic-svg');
    const targetCell = mosaicSvg.querySelector('rect[data-cell-x="2"][data-cell-y="3"]');
    expect(targetCell).not.toBeNull();
    fireEvent.pointerMove(targetCell as Element);
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(2, 3)');

    const clickCell = mosaicSvg.querySelector('rect[data-cell-x="7"][data-cell-y="1"]');
    expect(clickCell).not.toBeNull();
    fireEvent.click(clickCell as Element);
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(7, 1)');
    expect(onSample).toHaveBeenLastCalledWith({
      r: 140,
      g: 30,
      b: 100,
      hex: '#8C1E64',
      x: 7,
      y: 1,
    });

    // Now mock a real bounding rect (200x160 -> 20px per cell on 10x8 grid)
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 180,
      width: 200,
      height: 160,
      toJSON: () => ({}),
    });

    // (clientX=75 -> offset 65 / 200 * 10 = 3.25 -> col 3; clientY=125 -> offset 105 / 160 * 8 = 5.25 -> row 5)
    fireEvent.pointerMove(canvas, { clientX: 75, clientY: 125 });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(3, 5)');

    // Click at top-right edge (col 9, row 0)
    fireEvent.click(canvas, { clientX: 250, clientY: 10 });
    expect(document.activeElement).toBe(canvas);
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(9, 0)');
    expect(onSample).toHaveBeenLastCalledWith({
      r: 180,
      g: 0,
      b: 100,
      hex: '#B40064',
      x: 9,
      y: 0,
    });
  });

  it('navigates with keyboard arrows/Home/End, samples on Enter/Space, and guards IME composition', () => {
    const onSample = vi.fn<(pixel: SampledRgbPixel) => void>();

    render(
      <EyedropperPixelLoupe
        gridWidth={6}
        gridHeight={5}
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
      />
    );

    const canvas = screen.getByTestId('eyedropper-canvas');
    // Starts at (3, 2)
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(3, 2)');

    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(2, 2)');

    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(3, 2)');

    fireEvent.keyDown(canvas, { key: 'ArrowUp' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(3, 1)');

    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(3, 2)');

    fireEvent.keyDown(canvas, { key: 'End' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(5, 2)');

    // Clamping past right edge keeps same coordinate without error
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(5, 2)');

    fireEvent.keyDown(canvas, { key: 'Home' });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(0, 2)');

    // Enter samples
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(onSample).toHaveBeenCalledTimes(1);
    expect(onSample).toHaveBeenLastCalledWith({
      r: 0,
      g: 60,
      b: 100,
      hex: '#003C64',
      x: 0,
      y: 2,
    });

    // Space samples
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: ' ' });
    expect(onSample).toHaveBeenCalledTimes(2);
    expect(onSample).toHaveBeenLastCalledWith({
      r: 20,
      g: 60,
      b: 100,
      hex: '#143C64',
      x: 1,
      y: 2,
    });

    // IME composing keystrokes are ignored (negative test)
    fireEvent.keyDown(canvas, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(canvas, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(canvas, { key: ' ', isComposing: true });
    // Unrelated key is a safe no-op
    fireEvent.keyDown(canvas, { key: 'x' });

    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(1, 2)');
    expect(onSample).toHaveBeenCalledTimes(2);
  });

  it('stores up to 6 sampled swatches, re-emits onSample on swatch click, and clears history', () => {
    const onSample = vi.fn<(pixel: SampledRgbPixel) => void>();

    render(
      <EyedropperPixelLoupe
        gridWidth={10}
        gridHeight={6}
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
      />
    );

    const canvas = screen.getByTestId('eyedropper-canvas');
    fireEvent.keyDown(canvas, { key: 'Home' });

    // Capture 8 distinct pixels across x = 0..7
    for (let x = 0; x < 8; x += 1) {
      fireEvent.keyDown(canvas, { key: 'Enter' });
      if (x < 7) {
        fireEvent.keyDown(canvas, { key: 'ArrowRight' });
      }
    }

    const swatches = screen.getAllByTestId('eyedropper-history-swatch');
    expect(swatches).toHaveLength(6);
    // Most recent (x = 7, y = 3) first -> r=140 (#8C), g=90 (#5A), b=100 (#64) -> #8C5A64
    expect(swatches[0]).toHaveTextContent('#8C5A64');
    // Oldest retained (x = 2, y = 3) last -> r=40 (#28), g=90 (#5A), b=100 (#64) -> #285A64
    expect(swatches[5]).toHaveTextContent('#285A64');

    // Click oldest retained swatch to re-emit onSample & move cursor back to (2, 3)
    onSample.mockClear();
    fireEvent.click(swatches[5]!);
    expect(onSample).toHaveBeenCalledTimes(1);
    expect(onSample).toHaveBeenCalledWith({
      r: 40,
      g: 90,
      b: 100,
      hex: '#285A64',
      x: 2,
      y: 3,
    });
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(2, 3)');
    expect(screen.getAllByTestId('eyedropper-history-swatch')).toHaveLength(6);

    // Clear resets history tray
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    expect(clearBtn).toBeEnabled();
    fireEvent.click(clearBtn);
    expect(screen.queryAllByTestId('eyedropper-history-swatch')).toHaveLength(0);
    expect(screen.getByTestId('eyedropper-history-empty')).toBeInTheDocument();
    expect(clearBtn).toBeDisabled();
  });

  it('blocks all interactions when disabled is true (negative test)', () => {
    const onSample = vi.fn<(pixel: SampledRgbPixel) => void>();
    const onSampleRadiusChange = vi.fn<(radius: SampleRadius) => void>();

    const { rerender } = render(
      <EyedropperPixelLoupe
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
        onSampleRadiusChange={onSampleRadiusChange}
      />
    );

    // Seed one swatch before disabling so swatch + Clear button disabled states are also tested
    fireEvent.click(screen.getByRole('button', { name: 'Sample Pixel' }));
    onSample.mockClear();

    rerender(
      <EyedropperPixelLoupe
        disabled
        pixelResolver={DETERMINISTIC_RESOLVER}
        onSample={onSample}
        onSampleRadiusChange={onSampleRadiusChange}
      />
    );

    const region = screen.getByRole('region', { name: 'Eyedropper & Pixel Loupe' });
    const canvas = screen.getByTestId('eyedropper-canvas');
    expect(region).toHaveAttribute('data-disabled', 'true');
    expect(canvas).toHaveAttribute('aria-disabled', 'true');
    expect(canvas).toHaveAttribute('tabindex', '-1');

    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 10 });
    fireEvent.click(canvas);
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' });
    fireEvent.keyDown(canvas, { key: 'Enter' });

    for (const btn of screen.getAllByRole('button')) {
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
    }

    expect(onSample).not.toHaveBeenCalled();
    expect(onSampleRadiusChange).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('eyedropper-history-swatch')).toHaveLength(1);
  });

  it('sanitizes adversarial dimensions, pixelResolver outputs, dynamic grid shrinks, and XSS titles', () => {
    const xssTitle = '<script>window.__loupeXss=1</script><img src=x onerror=alert(1)>';
    const hostileResolver = (x: number, y: number) =>
      x === 0 && y === 0
        ? { r: Number.NaN, g: -500, b: Number.POSITIVE_INFINITY }
        : { r: 420.8, g: 127.6, b: -12 };

    const { rerender } = render(
      <EyedropperPixelLoupe
        title={xssTitle}
        gridWidth={1}
        gridHeight={99}
        pixelResolver={hostileResolver}
      />
    );

    // XSS payload rendered literally
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(xssTitle);

    // Dimensions clamped: gridWidth=1 -> 5, gridHeight=99 -> 16 -> 80 cells
    const mosaicSvg = screen.getByTestId('eyedropper-mosaic-svg');
    expect(mosaicSvg).toHaveAttribute('viewBox', '0 0 100 320');
    expect(mosaicSvg.querySelectorAll('rect[data-cell-x]')).toHaveLength(80);

    // Interior cell sanitized from { r: 420.8, g: 127.6, b: -12 } -> { r: 255, g: 128, b: 0 } -> #FF8000
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#FF8000');

    // Move to (0, 0): NaN / -500 / Infinity sanitized to #000000
    const canvas = screen.getByTestId('eyedropper-canvas');
    fireEvent.keyDown(canvas, { key: 'Home' });
    for (let i = 0; i < 16; i += 1) {
      fireEvent.keyDown(canvas, { key: 'ArrowUp' });
    }
    expect(screen.getByTestId('eyedropper-hex')).toHaveTextContent('#000000');

    // Move to far bottom-right (4, 15) then shrink gridHeight to 5 & pass NaN gridWidth (fallback 12)
    fireEvent.keyDown(canvas, { key: 'End' });
    for (let i = 0; i < 16; i += 1) {
      fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    }
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(4, 15)');

    rerender(
      <EyedropperPixelLoupe
        title="Shrunk Grid"
        gridWidth={Number.NaN}
        gridHeight={5}
        pixelResolver={hostileResolver}
      />
    );
    expect(screen.getByTestId('eyedropper-mosaic-svg')).toHaveAttribute('viewBox', '0 0 240 100');
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(4, 4)');

    // Non-integer data-cell attributes on a child element do not crash
    const fakeCell = document.createElement('span');
    fakeCell.setAttribute('data-cell-x', 'not-a-number');
    fakeCell.setAttribute('data-cell-y', '2');
    canvas.appendChild(fakeCell);
    fireEvent.pointerMove(fakeCell);
    expect(screen.getByTestId('eyedropper-coords')).toHaveTextContent('(4, 4)');
    fakeCell.remove();
  });
});
