import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiThinkingOrb, type AiOrbState } from './AiThinkingOrb';

describe('AiThinkingOrb', () => {
  it('transitions smoothly across all 5 AI lifecycle states with React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const states: AiOrbState[] = ['idle', 'listening', 'thinking', 'generating', 'complete'];
    const { rerender } = render(<AiThinkingOrb ref={ref} state="idle" sizePx={80} />);

    expect(ref.current).toBe(screen.getByRole('status'));
    expect(screen.getByTestId('ai-thinking-orb-stage').style.width).toBe('80px');

    for (const st of states) {
      rerender(<AiThinkingOrb ref={ref} state={st} sizePx={80} />);
      expect(screen.getByRole('status').getAttribute('data-state')).toBe(st);
    }

    // Complete state settles cleanly without continuous morphing
    expect(screen.getByTestId('ai-thinking-orb-core').className).not.toContain('prism-fx-metaball-a');
  });

  it('clamps invalid sizePx and supports hidden label mode', () => {
    render(<AiThinkingOrb sizePx={Number.NaN} showLabel={false} label="Custom reasoning" disableWebGL />);
    expect(screen.getByRole('status', { name: 'Custom reasoning' })).toBeInTheDocument();
    expect(screen.getByTestId('ai-thinking-orb-stage').style.width).toBe('68px');
  });
});
