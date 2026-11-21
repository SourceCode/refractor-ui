import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { Accordion, type AccordionItem } from './Accordion';

const ITEMS: AccordionItem[] = [
  { id: 'a1', title: 'Surface Physics', body: 'High-blur backdrop saturation with specular sheen.' },
  { id: 'a2', title: 'Storage Decoupling', body: 'Components accept pure typed props and callbacks.' },
  { id: 'a3', title: 'Dispersion Modes', body: 'Switch seamlessly between subtle, standard, and vivid.' },
];

describe('Accordion', () => {
  it('expands first item by default, switches active panel in single mode, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Accordion ref={ref} items={ITEMS} className="custom-acc" data-testid="accordion" />);

    const root = screen.getByTestId('accordion');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-accordion', 'custom-acc');

    const firstTrigger = screen.getByRole('button', { name: 'Surface Physics' });
    const secondTrigger = screen.getByRole('button', { name: 'Storage Decoupling' });

    expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: 'Surface Physics' })).toHaveTextContent(
      'High-blur backdrop saturation'
    );

    fireEvent.click(secondTrigger);
    expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText(/High-blur backdrop saturation/)).toBeNull();
    expect(screen.getByRole('region', { name: 'Storage Decoupling' })).toBeInTheDocument();

    fireEvent.click(secondTrigger);
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports allowMultiple mode and theme overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { Accordion: { className: 'theme-acc', style: { maxWidth: '600px' } } },
        }}
      >
        <Accordion items={ITEMS} allowMultiple className="local-acc" data-testid="multi-acc" />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('multi-acc');
    expect(root).toHaveClass('refractor-accordion', 'theme-acc', 'local-acc');
    expect(root).toHaveAttribute('data-allow-multiple', 'true');
    expect(root).toHaveStyle({ maxWidth: '600px' });

    const secondTrigger = screen.getByRole('button', { name: 'Storage Decoupling' });
    fireEvent.click(secondTrigger);

    expect(screen.getByRole('button', { name: 'Surface Physics' })).toHaveAttribute('aria-expanded', 'true');
    expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('handles empty items array cleanly (negative test)', () => {
    render(<Accordion items={[]} data-testid="empty-acc" />);
    const root = screen.getByTestId('empty-acc');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root.children).toHaveLength(0);
  });

  it('safely renders adversarial XSS payloads in titles and bodies as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<Accordion items={[{ id: 'xss', title: payload, body: payload }]} />);
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(document.querySelector('script')).toBeNull();
  });
});
