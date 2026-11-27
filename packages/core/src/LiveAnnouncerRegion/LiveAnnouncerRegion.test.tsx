import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  LiveAnnouncerProvider,
  LiveAnnouncerRegion,
  useLiveAnnouncer,
} from './LiveAnnouncerRegion';

function AnnouncerHarness() {
  const { announce, clear } = useLiveAnnouncer();
  return (
    <div>
      <button type="button" onClick={() => announce('Token stream complete', 'polite')}>
        Announce Polite
      </button>
      <button type="button" onClick={() => announce('Validation failed', 'assertive')}>
        Announce Assertive
      </button>
      <button type="button" onClick={clear}>
        Clear
      </button>
    </div>
  );
}

describe('LiveAnnouncerRegion', () => {
  it('announces polite and assertive messages through dedicated ARIA live channels', () => {
    render(
      <LiveAnnouncerProvider>
        <AnnouncerHarness />
      </LiveAnnouncerProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Announce Polite' }));
    expect(screen.getByRole('status')).toHaveTextContent('Token stream complete');

    fireEvent.click(screen.getByRole('button', { name: 'Announce Assertive' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Validation failed');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.getByRole('alert')).toHaveTextContent('');
  });

  it('supports visible debug preview mode', () => {
    render(
      <LiveAnnouncerRegion
        politeMessage="File uploaded"
        assertiveMessage="Connection lost"
        visible
      />
    );
    expect(screen.getByText('File uploaded')).toBeInTheDocument();
    expect(screen.getByText('Connection lost')).toBeInTheDocument();
  });
});
