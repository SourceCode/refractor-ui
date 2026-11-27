import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MotionStudio } from './MotionStudio';

describe('MotionStudio', () => {
  it('switches semantic presets, tunes spring sliders, and emits compiled CSS linear() code', () => {
    const onConfigChange = vi.fn();
    render(<MotionStudio initialToken="ui" onConfigChange={onConfigChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'lively' }));
    expect(onConfigChange).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Spring stiffness'), { target: { value: '420' } });
    fireEvent.change(screen.getByLabelText('Spring damping'), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText('Spring mass'), { target: { value: '1.2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Preview' }));

    expect(screen.getByText(/transition-timing-function: linear\(/)).toBeInTheDocument();
  });
});
