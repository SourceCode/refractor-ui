import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpticalDepthVignette } from './OpticalDepthVignette';

describe('OpticalDepthVignette', () => {
  it('blurs background, displays crisp foreground, and handles Escape & veil click dismiss when active', () => {
    const ref = createRef<HTMLDivElement>();
    const onDismiss = vi.fn();
    render(
      <OpticalDepthVignette
        ref={ref}
        active
        blurPx={10}
        aperture={0.4}
        onDismiss={onDismiss}
        foreground={<div role="dialog" aria-label="Approval gate">Approve deployment</div>}
        data-testid="vig-root"
      >
        <div>Background canvas</div>
      </OpticalDepthVignette>
    );

    expect(ref.current).toBe(screen.getByTestId('vig-root'));
    const bg = screen.getByTestId('optical-depth-vignette-bg');
    expect(bg.style.filter).toBe('blur(10px)');
    expect(bg.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Approval gate' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('optical-depth-vignette-veil'));
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('detaches Escape listener and removes blur when inactive and clamps non-finite props', () => {
    const onDismiss = vi.fn();
    render(
      <OpticalDepthVignette active={false} blurPx={Number.NaN} dimOpacity={99} onDismiss={onDismiss}>
        <div>Clear workspace</div>
      </OpticalDepthVignette>
    );
    expect(screen.getByTestId('optical-depth-vignette-bg').style.filter).toBe('none');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
