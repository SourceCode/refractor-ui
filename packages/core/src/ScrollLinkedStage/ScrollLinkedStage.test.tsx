import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MotionConfigProvider } from '../motion/MotionConfigProvider';
import { ScrollLinkedStage } from './ScrollLinkedStage';

describe('ScrollLinkedStage', () => {
  it('renders sticky optical header, progressbar, and responds to container scroll', () => {
    render(
      <ScrollLinkedStage title="Reading Progress" data-testid="scroll-stage">
        <div style={{ height: 600 }}>Long optical article content</div>
      </ScrollLinkedStage>
    );

    const stage = screen.getByTestId('scroll-stage');
    expect(screen.getByText('Reading Progress')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Scroll progress' })).toBeInTheDocument();

    Object.defineProperty(stage, 'scrollHeight', { value: 600, configurable: true });
    Object.defineProperty(stage, 'clientHeight', { value: 200, configurable: true });
    stage.scrollTop = 200;
    fireEvent.scroll(stage);

    expect(stage).toHaveAttribute('data-scroll-progress');
  });

  it('supports hiding progress bar and calm reduced-motion mode', () => {
    render(
      <MotionConfigProvider reducedMotion="calm">
        <ScrollLinkedStage showProgressBar={false}>
          <p>Calm scroll content</p>
        </ScrollLinkedStage>
      </MotionConfigProvider>
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
