import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MillerColumnsBrowser as BarrelMillerColumnsBrowser,
  type MillerNodeKindMap,
} from './index';
import { MillerColumnsBrowser, type MillerFileNode } from './MillerColumnsBrowser';

const CUSTOM_ROOTS: ReadonlyArray<MillerFileNode> = [
  {
    id: 'workspace',
    name: 'workspace',
    kind: 'folder',
    children: [
      {
        id: 'empty-dir',
        name: 'empty-dir',
        kind: 'folder',
        children: [],
      },
      {
        id: 'undef-dir',
        name: 'undef-dir',
        kind: 'folder',
      },
      {
        id: 'minimal-file',
        name: 'notes.txt',
        kind: 'document',
      },
    ],
  },
  {
    id: 'solo-dir',
    name: 'solo-dir',
    kind: 'folder',
    children: [
      {
        id: 'single-item',
        name: 'only.wav',
        kind: 'audio',
        sizeLabel: '512 KB',
        modifiedAt: 'Today',
        previewText: 'Single audio clip metadata',
      },
    ],
  },
];

describe('MillerColumnsBrowser', () => {
  it('renders the default 3-level filesystem tree with breadcrumbs, preview pane, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MillerColumnsBrowser: {
              className: 'theme-miller-browser',
              style: { letterSpacing: '0.15px' },
            },
          },
        }}
      >
        <MillerColumnsBrowser
          ref={ref}
          className="local-miller-browser"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="default-miller"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('default-miller');
    expect(ref.current).toBe(root);
    expect(MillerColumnsBrowser.displayName).toBe('MillerColumnsBrowser');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-miller-columns-browser',
      'prism-slab',
      'theme-miller-browser',
      'local-miller-browser'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.15px', marginTop: '6px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-columns', '3');
    expect(root).toHaveAttribute('data-depth', '3');
    expect(root).toHaveAttribute('data-preview-open', 'true');

    expect(screen.getByRole('heading', { name: 'Miller Columns Explorer' })).toBeInTheDocument();
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('3 items');
    expect(screen.getByTestId('miller-columns-header')).toHaveClass('prism-slab');

    const viewport = screen.getByTestId('miller-columns-viewport');
    expect(viewport).toHaveClass(
      'refractor-miller-columns-browser__viewport',
      'prism-well',
      'rounded-2xl',
      'overflow-x-auto',
      'flex',
      'divide-x'
    );

    // Breadcrumb trail: packages / core / PrimaryButton.tsx
    expect(screen.getByTestId('miller-columns-crumb-0')).toHaveTextContent('packages');
    expect(screen.getByTestId('miller-columns-crumb-1')).toHaveTextContent('core');
    expect(screen.getByTestId('miller-columns-crumb-2')).toHaveTextContent('PrimaryButton.tsx');
    expect(screen.getByTestId('miller-columns-crumb-2')).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Three columns open
    expect(screen.getByTestId('miller-columns-col-0')).toBeInTheDocument();
    expect(screen.getByTestId('miller-columns-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('miller-columns-col-2')).toBeInTheDocument();

    // Right-hand File Preview Pane shows PrimaryButton.tsx code preview
    const preview = screen.getByTestId('miller-columns-preview');
    expect(preview).toHaveAttribute('data-preview-kind', 'code');
    expect(screen.getByTestId('miller-columns-preview-name')).toHaveTextContent(
      'PrimaryButton.tsx'
    );
    expect(screen.getByTestId('miller-columns-preview-kind')).toHaveTextContent('code');
    expect(screen.getByTestId('miller-columns-preview-size')).toHaveTextContent('4.8 KB');
    expect(screen.getByTestId('miller-columns-preview-modified')).toHaveTextContent('Today, 14:18');
    const previewContent = screen.getByTestId('miller-columns-preview-content');
    expect(previewContent.tagName).toBe('PRE');
    expect(previewContent).toHaveTextContent('export function PrimaryButton');
  });

  it('renders a clean role="status" empty state when roots is [] and falls back cleanly on blank title', () => {
    render(
      <MillerColumnsBrowser
        roots={[]}
        title="   "
        aria-label="Empty File Explorer"
        data-testid="empty-miller"
      />
    );

    const root = screen.getByTestId('empty-miller');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('aria-label', 'Empty File Explorer');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Miller Columns Explorer' })).toBeInTheDocument();
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('0 items');
    expect(screen.getByTestId('miller-columns-breadcrumb-root')).toHaveTextContent('Root');

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveAttribute('data-testid', 'miller-columns-empty');
    expect(emptyStatus).toHaveTextContent('No files or folders');
    expect(screen.queryByTestId('miller-columns-viewport')).toBeNull();
  });

  it('navigates folders and all 5 file kinds via clicks, updating columns, breadcrumbs, preview pane, and onSelectNode', () => {
    const onSelectNode = vi.fn();

    render(<MillerColumnsBrowser onSelectNode={onSelectNode} />);

    // Click assets folder in column 0
    fireEvent.click(screen.getByTestId('miller-columns-item-0-assets'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'assets', kind: 'folder' }),
      ['assets']
    );
    expect(screen.queryByTestId('miller-columns-preview')).toBeNull();
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('1 item');

    // Click media folder in column 1
    fireEvent.click(screen.getByTestId('miller-columns-item-1-media'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'media', kind: 'folder' }),
      ['assets', 'media']
    );
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('2 items');

    // Click prism-hero.png (image kind) in column 2
    fireEvent.click(screen.getByTestId('miller-columns-item-2-prism-hero-png'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'prism-hero-png', kind: 'image' }),
      ['assets', 'media', 'prism-hero-png']
    );
    expect(screen.getByTestId('miller-columns-preview')).toHaveAttribute(
      'data-preview-kind',
      'image'
    );
    expect(screen.getByTestId('miller-columns-preview-kind')).toHaveTextContent('image');
    const imagePreview = screen.getByTestId('miller-columns-preview-content');
    expect(imagePreview.tagName).toBe('DIV');
    expect(imagePreview).toHaveTextContent('2560 x 1440');

    // Click glass-chime.wav (audio kind) in column 2
    fireEvent.click(screen.getByTestId('miller-columns-item-2-glass-chime-wav'));
    expect(screen.getByTestId('miller-columns-preview')).toHaveAttribute(
      'data-preview-kind',
      'audio'
    );
    expect(screen.getByTestId('miller-columns-preview-kind')).toHaveTextContent('audio');
    expect(screen.getByTestId('miller-columns-preview-size')).toHaveTextContent('1.4 MB');

    // Click README.md (document kind) in column 0
    fireEvent.click(screen.getByTestId('miller-columns-item-0-readme-md'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'readme-md', kind: 'document' }),
      ['readme-md']
    );
    expect(screen.getByTestId('miller-columns-preview')).toHaveAttribute(
      'data-preview-kind',
      'document'
    );
    expect(screen.queryByTestId('miller-columns-col-1')).toBeNull();
  });

  it('handles breadcrumb clicks, IME-safe keyboard breadcrumb activation, empty folders, and files without optional metadata', () => {
    const onSelectNode = vi.fn();

    render(
      <MillerColumnsBrowser
        title="Custom Workspace"
        roots={CUSTOM_ROOTS}
        onSelectNode={onSelectNode}
      />
    );

    // Custom roots without defaultSelectedPath starts cleanly at Root
    expect(screen.getByTestId('miller-columns-breadcrumb-root')).toHaveTextContent('Root');
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('2 items');

    // Open workspace -> empty-dir
    fireEvent.click(screen.getByTestId('miller-columns-item-0-workspace'));
    fireEvent.click(screen.getByTestId('miller-columns-item-1-empty-dir'));
    expect(screen.getByTestId('miller-columns-col-empty-2')).toHaveTextContent('Empty folder');
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('0 items');

    // Open undef-dir (folder with omitted children)
    fireEvent.click(screen.getByTestId('miller-columns-item-1-undef-dir'));
    expect(screen.getByTestId('miller-columns-col-empty-2')).toHaveTextContent('Empty folder');

    // Open minimal-file (omits sizeLabel, modifiedAt, previewText)
    fireEvent.click(screen.getByTestId('miller-columns-item-1-minimal-file'));
    expect(screen.getByTestId('miller-columns-preview-size')).toHaveTextContent('—');
    expect(screen.getByTestId('miller-columns-preview-modified')).toHaveTextContent('—');
    expect(screen.getByTestId('miller-columns-preview-empty')).toHaveTextContent(
      'No preview text available for this file.'
    );

    // Breadcrumb keyboard navigation: ignore IME composition and non-activation keys
    const workspaceCrumb = screen.getByTestId('miller-columns-crumb-0');
    const callsBefore = onSelectNode.mock.calls.length;
    fireEvent.keyDown(workspaceCrumb, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(workspaceCrumb, { key: 'Tab' });
    expect(onSelectNode).toHaveBeenCalledTimes(callsBefore);

    // Activate breadcrumb via Enter
    fireEvent.keyDown(workspaceCrumb, { key: 'Enter' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'workspace' }),
      ['workspace']
    );
    expect(screen.queryByTestId('miller-columns-preview')).toBeNull();

    // Navigate into solo-dir -> single-item and activate breadcrumb via Space and click
    fireEvent.click(screen.getByTestId('miller-columns-item-0-solo-dir'));
    expect(screen.getByTestId('miller-columns-count')).toHaveTextContent('1 item');
    fireEvent.click(screen.getByTestId('miller-columns-item-1-single-item'));
    expect(screen.getByTestId('miller-columns-crumb-1')).toHaveTextContent('only.wav');

    fireEvent.keyDown(screen.getByTestId('miller-columns-crumb-0'), { key: ' ' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'solo-dir' }),
      ['solo-dir']
    );

    fireEvent.click(screen.getByTestId('miller-columns-crumb-0'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'solo-dir' }),
      ['solo-dir']
    );
  });

  it('supports full keyboard navigation (ArrowDown, ArrowUp, ArrowRight, ArrowLeft, IME-safe Enter/Space)', () => {
    const onSelectNode = vi.fn();

    render(
      <MillerColumnsBrowser
        defaultSelectedPath={[]}
        onSelectNode={onSelectNode}
      />
    );

    const packagesBtn = screen.getByTestId('miller-columns-item-0-packages');
    packagesBtn.focus();

    // IME composing Enter & Space are ignored
    fireEvent.keyDown(packagesBtn, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(packagesBtn, { key: ' ', isComposing: true });
    expect(onSelectNode).not.toHaveBeenCalled();

    // Unrelated key is ignored
    fireEvent.keyDown(packagesBtn, { key: 'Escape' });
    expect(onSelectNode).not.toHaveBeenCalled();

    // ArrowUp at top index 0 and ArrowLeft at column 0 are clean no-ops
    fireEvent.keyDown(packagesBtn, { key: 'ArrowUp' });
    fireEvent.keyDown(packagesBtn, { key: 'ArrowLeft' });
    expect(onSelectNode).not.toHaveBeenCalled();

    // Enter selects packages folder
    fireEvent.keyDown(packagesBtn, { key: 'Enter' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'packages' }),
      ['packages']
    );

    // ArrowDown moves to assets and focuses it
    fireEvent.keyDown(packagesBtn, { key: 'ArrowDown' });
    const assetsBtn = screen.getByTestId('miller-columns-item-0-assets');
    expect(document.activeElement).toBe(assetsBtn);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'assets' }),
      ['assets']
    );

    // ArrowDown moves to README.md (last item in column 0)
    fireEvent.keyDown(assetsBtn, { key: 'ArrowDown' });
    const readmeBtn = screen.getByTestId('miller-columns-item-0-readme-md');
    expect(document.activeElement).toBe(readmeBtn);
    expect(screen.getByTestId('miller-columns-preview-name')).toHaveTextContent('README.md');

    // ArrowDown at last item is a clean no-op
    const callsAtBottom = onSelectNode.mock.calls.length;
    fireEvent.keyDown(readmeBtn, { key: 'ArrowDown' });
    expect(onSelectNode).toHaveBeenCalledTimes(callsAtBottom);

    // ArrowRight on a file selects it cleanly without opening a folder column
    fireEvent.keyDown(readmeBtn, { key: 'ArrowRight' });
    expect(screen.getByTestId('miller-columns-preview-name')).toHaveTextContent('README.md');

    // ArrowUp moves back to assets, then ArrowUp to packages
    fireEvent.keyDown(readmeBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(assetsBtn);
    fireEvent.keyDown(assetsBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(packagesBtn);

    // Space activates packages
    fireEvent.keyDown(packagesBtn, { key: ' ' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'packages' }),
      ['packages']
    );

    // ArrowRight enters packages -> selects and focuses first child (core) in column 1
    fireEvent.keyDown(packagesBtn, { key: 'ArrowRight' });
    const coreBtn = screen.getByTestId('miller-columns-item-1-core');
    expect(document.activeElement).toBe(coreBtn);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'core' }),
      ['packages', 'core']
    );

    // ArrowRight enters core -> selects and focuses PrimaryButton.tsx in column 2
    fireEvent.keyDown(coreBtn, { key: 'ArrowRight' });
    const primaryBtn = screen.getByTestId('miller-columns-item-2-primary-button');
    expect(document.activeElement).toBe(primaryBtn);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'primary-button' }),
      ['packages', 'core', 'primary-button']
    );

    // ArrowLeft from column 2 returns to core in column 1 and restores focus
    fireEvent.keyDown(primaryBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByTestId('miller-columns-item-1-core'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'core' }),
      ['packages', 'core']
    );

    // ArrowLeft from column 1 returns to packages in column 0
    fireEvent.keyDown(screen.getByTestId('miller-columns-item-1-core'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(screen.getByTestId('miller-columns-item-0-packages'));
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'packages' }),
      ['packages']
    );
  });

  it('handles ArrowRight on an empty folder gracefully without errors', () => {
    const onSelectNode = vi.fn();
    render(
      <MillerColumnsBrowser
        roots={CUSTOM_ROOTS}
        defaultSelectedPath={['workspace']}
        onSelectNode={onSelectNode}
      />
    );

    const emptyDirBtn = screen.getByTestId('miller-columns-item-1-empty-dir');
    fireEvent.keyDown(emptyDirBtn, { key: 'ArrowRight' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'empty-dir' }),
      ['workspace', 'empty-dir']
    );
    expect(screen.getByTestId('miller-columns-col-empty-2')).toHaveTextContent('Empty folder');
  });

  it('caps adversarial cyclic trees and oversized paths strictly at MAX_DEPTH = 10', () => {
    const cyclicNode: MillerFileNode = {
      id: 'loop',
      name: 'loop',
      kind: 'folder',
      children: [],
    };
    cyclicNode.children = [cyclicNode];

    const onSelectNode = vi.fn();
    const deepPath = Array.from({ length: 25 }, () => 'loop');

    render(
      <MillerColumnsBrowser
        roots={[cyclicNode]}
        defaultSelectedPath={deepPath}
        onSelectNode={onSelectNode}
        data-testid="cyclic-miller"
      />
    );

    const root = screen.getByTestId('cyclic-miller');
    expect(root).toHaveAttribute('data-columns', '10');
    expect(root).toHaveAttribute('data-depth', '10');
    expect(root).toHaveAttribute('data-depth-capped', 'true');
    expect(screen.getByTestId('miller-columns-depth-cap')).toHaveTextContent('Max depth 10');

    // Columns 0..9 exist, column 10 must NOT exist
    expect(screen.getByTestId('miller-columns-col-9')).toBeInTheDocument();
    expect(screen.queryByTestId('miller-columns-col-10')).toBeNull();

    // Pressing ArrowRight at depth 9 stays strictly capped at 10 columns
    const deepestItem = screen.getByTestId('miller-columns-item-9-loop');
    fireEvent.keyDown(deepestItem, { key: 'ArrowRight' });
    expect(screen.queryByTestId('miller-columns-col-10')).toBeNull();
    expect(onSelectNode).toHaveBeenLastCalledWith(
      cyclicNode,
      Array.from({ length: 10 }, () => 'loop')
    );
  });

  it('prunes invalid defaultSelectedPath segments, neutralizes XSS/prototype-pollution payloads, and exports cleanly via barrel', () => {
    const xss = '<script>window.__millerXss=1</script><img src=x onerror=alert(1)>';
    const kindMapCheck: MillerNodeKindMap = {
      folder: true,
      code: true,
      image: true,
      document: true,
      audio: true,
    };
    expect(kindMapCheck.folder).toBe(true);
    expect(kindMapCheck.audio).toBe(true);

    const adversarialRoots: ReadonlyArray<MillerFileNode> = [
      {
        id: '__proto__',
        name: xss,
        kind: 'folder',
        children: [
          {
            id: 'constructor',
            name: xss,
            kind: 'code',
            sizeLabel: xss,
            modifiedAt: xss,
            previewText: xss,
          },
          {
            id: 'constructor',
            name: 'duplicate-sibling.ts',
            kind: 'code',
            previewText: 'export const duplicateSafe = true;',
          },
        ],
      },
    ];

    const { rerender } = render(
      <BarrelMillerColumnsBrowser
        title={xss}
        roots={adversarialRoots}
        defaultSelectedPath={['__proto__', 'nonexistent', 'ignored']}
        data-testid="adversarial-miller"
      />
    );

    // Invalid segment stops cleanly after __proto__
    expect(screen.getByTestId('miller-columns-crumb-0')).toHaveTextContent(xss);
    expect(screen.queryByTestId('miller-columns-crumb-1')).toBeNull();

    // Click constructor child and inspect literal XSS rendering (duplicate sibling ID renders safely too)
    const constructorButtons = screen.getAllByTestId('miller-columns-item-1-constructor');
    expect(constructorButtons).toHaveLength(2);
    fireEvent.click(constructorButtons[0]!);
    expect(screen.getByTestId('miller-columns-preview-name')).toHaveTextContent(xss);
    expect(screen.getByTestId('miller-columns-preview-content')).toHaveTextContent(xss);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Rerendering with empty roots clears cleanly without stale selection errors
    rerender(<BarrelMillerColumnsBrowser roots={[]} />);
    expect(screen.getByTestId('miller-columns-empty')).toBeInTheDocument();
  });
});
