import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SplitArtifactCanvas,
  type ArtifactItem,
  type ArtifactViewMode,
} from './SplitArtifactCanvas';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

const SAMPLE_ARTIFACTS: ReadonlyArray<ArtifactItem> = [
  {
    id: 'art-code',
    title: 'Button.tsx',
    kind: 'code',
    language: 'tsx',
    version: 'v1.2',
    content: 'export const Button = () => <button>Launch</button>;',
    preview: <div data-testid="code-preview">Rendered Button Preview</div>,
  },
  {
    id: 'art-doc',
    title: 'Architecture.md',
    kind: 'document',
    language: 'markdown',
    version: 'v2.0',
    content: '# Optical Architecture\n\nAll surfaces consume --prism-* tokens.',
  },
  {
    id: 'art-preview',
    title: 'HeroSpecimen',
    kind: 'preview',
    content: '<section class="prism-slab">Specimen</section>',
    preview: <div data-testid="hero-preview">Live Hero Specimen</div>,
  },
];

describe('SplitArtifactCanvas', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders prism-slab split workspace, forwards React 19 ref, composes theme overrides, and displays pills', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SplitArtifactCanvas: {
              className: 'theme-split-canvas',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <SplitArtifactCanvas
          ref={ref}
          conversationTitle="AI Studio"
          conversationPane={<div data-testid="chat-stream">Assistant messages</div>}
          artifacts={[SAMPLE_ARTIFACTS[0] as ArtifactItem]}
          className="local-canvas"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          style={{ marginBottom: '10px' }}
          data-testid="canvas-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('canvas-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-split-artifact-canvas',
      'prism-slab',
      'theme-split-canvas',
      'local-canvas'
    );
    expect(root).toHaveAttribute('data-view-mode', 'split');
    expect(root).toHaveAttribute('data-artifact-kind', 'code');
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginBottom: '10px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');

    expect(screen.getByText('1 artifact')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI Studio' })).toBeInTheDocument();
    expect(screen.getByText('AI Studio')).toBeInTheDocument();
    expect(screen.getByTestId('chat-stream')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('Button.tsx')).toBeInTheDocument();
    expect(screen.getByText('Code')).toHaveAttribute('data-artifact-kind', 'code');
    expect(screen.getByText('tsx')).toHaveAttribute('data-artifact-language', 'tsx');
    expect(screen.getByText('v1.2')).toHaveAttribute('data-artifact-version', 'v1.2');
    expect(
      screen.getByText('export const Button = () => <button>Launch</button>;')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
  });

  it('switches workspace layouts between Split, Chat-only, and Artifact-only in uncontrolled and controlled modes', () => {
    const onViewModeChange = vi.fn();
    const { rerender } = render(
      <SplitArtifactCanvas
        conversationPane={<div data-testid="chat-pane">Chat content</div>}
        artifacts={SAMPLE_ARTIFACTS}
        onViewModeChange={onViewModeChange}
        data-testid="canvas"
      />
    );

    const splitBtn = screen.getByRole('button', { name: 'Split' });
    const chatBtn = screen.getByRole('button', { name: 'Chat' });
    const artifactBtn = screen.getByRole('button', { name: 'Artifact' });

    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chat-pane')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Artifact workspace' })).toBeInTheDocument();

    // Switch to Chat-only
    fireEvent.click(chatBtn);
    expect(onViewModeChange).toHaveBeenLastCalledWith('conversation-only');
    expect(chatBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chat-pane')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Artifact workspace' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Layout switched to conversation only.');

    // Switch to Artifact-only
    fireEvent.click(artifactBtn);
    expect(onViewModeChange).toHaveBeenLastCalledWith('artifact-only');
    expect(artifactBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('chat-pane')).toBeNull();
    expect(screen.getByRole('region', { name: 'Artifact workspace' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Layout switched to artifact only.');

    // Switch back to Split
    fireEvent.click(splitBtn);
    expect(onViewModeChange).toHaveBeenLastCalledWith('split');
    expect(screen.getByRole('status')).toHaveTextContent('Layout switched to split view.');

    // Controlled viewMode
    const controlledChanges: ArtifactViewMode[] = [];
    rerender(
      <SplitArtifactCanvas
        conversationPane={<div data-testid="chat-pane">Chat content</div>}
        artifacts={SAMPLE_ARTIFACTS}
        viewMode="artifact-only"
        onViewModeChange={(mode) => {
          controlledChanges.push(mode);
        }}
      />
    );
    expect(screen.queryByTestId('chat-pane')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    expect(controlledChanges).toEqual(['conversation-only']);
    expect(screen.queryByTestId('chat-pane')).toBeNull();
  });

  it('switches multiple artifacts by click and keyboard (ArrowRight/Left/Home/End + IME guard), deduplicates IDs, and toggles Preview/Source', () => {
    const onActiveArtifactChange = vi.fn();
    const duplicated: ReadonlyArray<ArtifactItem> = [
      ...SAMPLE_ARTIFACTS,
      {
        id: 'art-code',
        title: 'DuplicateButton.tsx',
        kind: 'code',
        content: 'duplicate ignored',
      },
    ];

    render(
      <SplitArtifactCanvas
        conversationPane={<div>Chat</div>}
        artifacts={duplicated}
        defaultArtifactId="art-preview"
        onActiveArtifactChange={onActiveArtifactChange}
      />
    );

    expect(screen.getByText('3 artifacts')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    // art-preview is kind 'preview' with preview node -> starts in Preview mode
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('hero-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');

    // Toggle to Source mode on art-preview
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    expect(screen.getByRole('button', { name: 'Source' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('hero-preview')).toBeNull();
    expect(screen.getByText('<section class="prism-slab">Specimen</section>')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing source for HeroSpecimen.');

    // Toggle back to Preview mode
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTestId('hero-preview')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing live preview for HeroSpecimen.');

    // Keyboard navigation: IME composing event is ignored
    fireEvent.keyDown(tabs[2] as HTMLButtonElement, { key: 'ArrowRight', isComposing: true });
    expect(onActiveArtifactChange).not.toHaveBeenCalled();

    // Unrelated key is ignored
    fireEvent.keyDown(tabs[2] as HTMLButtonElement, { key: 'Tab' });
    expect(onActiveArtifactChange).not.toHaveBeenCalled();

    // ArrowRight wraps from last tab (2) -> first tab (0: art-code)
    fireEvent.keyDown(tabs[2] as HTMLButtonElement, { key: 'ArrowRight' });
    expect(onActiveArtifactChange).toHaveBeenLastCalledWith('art-code');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // Code artifact with preview defaults to Source and can toggle to Preview
    expect(screen.queryByTestId('code-preview')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByTestId('code-preview')).toBeInTheDocument();

    // ArrowLeft wraps from 0 -> 2
    fireEvent.keyDown(tabs[0] as HTMLButtonElement, { key: 'ArrowLeft' });
    expect(onActiveArtifactChange).toHaveBeenLastCalledWith('art-preview');

    // Home jumps to index 0
    fireEvent.keyDown(tabs[2] as HTMLButtonElement, { key: 'Home' });
    expect(onActiveArtifactChange).toHaveBeenLastCalledWith('art-code');

    // End jumps to index 2
    fireEvent.keyDown(tabs[0] as HTMLButtonElement, { key: 'End' });
    expect(onActiveArtifactChange).toHaveBeenLastCalledWith('art-preview');

    // Click middle document tab (no preview -> no Preview/Source toggle)
    fireEvent.click(tabs[1] as HTMLButtonElement);
    expect(onActiveArtifactChange).toHaveBeenLastCalledWith('art-doc');
    expect(screen.getByText('Document')).toHaveAttribute('data-artifact-kind', 'document');
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull();
    expect(screen.getByText(/Optical Architecture/)).toBeInTheDocument();
  });

  it('copies artifact content with clipboard fallbacks, resets timer on artifact switch/unmount, and invokes download callback', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onCopyArtifact = vi.fn();
    const onDownloadArtifact = vi.fn();

    const { unmount } = render(
      <SplitArtifactCanvas
        conversationPane={<div>Chat</div>}
        artifacts={SAMPLE_ARTIFACTS}
        onCopyArtifact={onCopyArtifact}
        onDownloadArtifact={onDownloadArtifact}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(SAMPLE_ARTIFACTS[0]?.content);
    expect(onCopyArtifact).toHaveBeenCalledWith(SAMPLE_ARTIFACTS[0]);
    expect(screen.getByRole('button', { name: 'Copied' })).toHaveClass('prism-emerald');
    expect(screen.getByRole('status')).toHaveTextContent('Copied Button.tsx to clipboard.');

    // Repeat copy while timer active resets timeout
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    // Copy then immediately switch tab clears copied indicator and timer
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Architecture.md' }));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    // Download action invokes callback with active artifact
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(onDownloadArtifact).toHaveBeenCalledWith(SAMPLE_ARTIFACTS[1]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Download requested for Architecture.md.'
    );

    // Rejecting clipboard promise and throwing clipboard getter are caught safely
    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await Promise.resolve();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Unavailable');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));

    // Unmount with active timer clears timeout cleanly
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('handles missing clipboard cleanly and renders graceful empty state when artifacts is empty (negative test)', () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    const onCopyArtifact = vi.fn();
    const { rerender } = render(
      <SplitArtifactCanvas
        conversationPane={<div>Chat</div>}
        artifacts={[]}
        onCopyArtifact={onCopyArtifact}
        data-testid="empty-canvas"
      />
    );

    const root = screen.getByTestId('empty-canvas');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('0 artifacts')).toBeInTheDocument();
    expect(screen.getByText('No artifacts yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();

    // Falls back gracefully when activeArtifactId does not match any artifact
    rerender(
      <SplitArtifactCanvas
        conversationPane={<div>Chat</div>}
        artifacts={[SAMPLE_ARTIFACTS[1] as ArtifactItem]}
        activeArtifactId="missing-id"
        onCopyArtifact={onCopyArtifact}
      />
    );
    expect(screen.getByText('Architecture.md')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopyArtifact).toHaveBeenCalledWith(SAMPLE_ARTIFACTS[1]);
  });

  it('renders adversarial XSS payloads in artifact title and content strictly as escaped literal text (security test)', () => {
    const xssPayload = '<script>window.__artifactXss=1</script><img src=x onerror=alert(1)>';

    render(
      <SplitArtifactCanvas
        conversationPane={<div>Conversation</div>}
        artifacts={[
          {
            id: 'xss-doc',
            title: xssPayload,
            kind: 'code',
            language: 'html',
            content: xssPayload,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    const codeEl = document.querySelector('pre code');
    expect(codeEl).not.toBeNull();
    expect(codeEl?.textContent).toBe(xssPayload);
  });
});
