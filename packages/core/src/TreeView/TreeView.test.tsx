import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import type { TreeNodeItem } from '../utils/dateGrid';
import { TreeView } from './TreeView';

const NODES: TreeNodeItem[] = [
  { id: 'dir-root-design', name: 'design-tokens', type: 'folder', parentId: null },
  {
    id: 'file-refraction',
    name: 'refraction-caustics.json',
    type: 'file',
    parentId: 'dir-root-design',
    sizeBytes: 14820,
  },
  { id: 'dir-root-specs', name: 'specifications', type: 'folder', parentId: null },
  {
    id: 'file-wcag',
    name: 'accessibility-audit.pdf',
    type: 'file',
    parentId: 'dir-root-specs',
    sizeBytes: 248900,
  },
];

describe('TreeView', () => {
  it('renders nested folders/files, toggles folder expansion, selects nodes, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectNode = vi.fn();

    render(
      <TreeView
        ref={ref}
        nodes={NODES}
        selectedNodeId="file-refraction"
        onSelectNode={onSelectNode}
        className="custom-tree"
        data-testid="tree-view"
      />
    );

    const root = screen.getByTestId('tree-view');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-tree-view', 'prism-slab', 'custom-tree');
    expect(screen.getByRole('tree')).toBeInTheDocument();

    expect(screen.getByText('refraction-caustics.json')).toBeInTheDocument();
    expect(screen.getByText('14.5 KB')).toBeInTheDocument();
    expect(screen.queryByText('accessibility-audit.pdf')).toBeNull();

    const selectedBtn = screen.getByRole('button', { name: /refraction-caustics\.json/ });
    expect(selectedBtn).toHaveClass('prism-emerald');
    fireEvent.click(selectedBtn);
    expect(onSelectNode).toHaveBeenCalledWith(NODES[1]);

    const specsBtn = screen.getByRole('button', { name: 'specifications' });
    fireEvent.click(specsBtn);
    expect(onSelectNode).toHaveBeenCalledWith(NODES[2]);
    expect(screen.getByText('accessibility-audit.pdf')).toBeInTheDocument();

    const designBtn = screen.getByRole('button', { name: 'design-tokens' });
    fireEvent.click(designBtn);
    expect(screen.queryByText('refraction-caustics.json')).toBeNull();
  });

  it('guards against adversarial circular parentId graphs without stack overflow', () => {
    const circularNodes: TreeNodeItem[] = [
      { id: 'root-a', name: 'root-a', type: 'folder', parentId: null },
      { id: 'child-b', name: 'child-b', type: 'folder', parentId: 'root-a' },
      { id: 'root-a', name: 'root-a-cycle', type: 'folder', parentId: 'child-b' },
      { id: 'self-loop', name: 'self-loop', type: 'folder', parentId: 'self-loop' },
    ];

    render(
      <TreeView
        nodes={circularNodes}
        selectedNodeId={null}
        onSelectNode={vi.fn()}
        defaultExpandedIds={['root-a', 'child-b', 'self-loop']}
      />
    );

    expect(screen.getByText('root-a')).toBeInTheDocument();
    expect(screen.getByText('child-b')).toBeInTheDocument();
    expect(screen.queryByText('root-a-cycle')).toBeNull();
  });

  it('handles empty nodes array and applies theme overrides (negative test)', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { TreeView: { className: 'theme-tree', style: { maxWidth: '320px' } } },
        }}
      >
        <TreeView
          nodes={[]}
          selectedNodeId={null}
          onSelectNode={vi.fn()}
          className="local-tree"
          data-testid="empty-tree"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('empty-tree');
    expect(root).toHaveClass('refractor-tree-view', 'theme-tree', 'local-tree');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveStyle({ maxWidth: '320px' });
    expect(screen.queryByRole('tree')).toBeNull();
  });

  it('safely renders adversarial XSS payloads in node names as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <TreeView
        nodes={[{ id: 'n1', name: payload, type: 'file', parentId: null, sizeBytes: 512 }]}
        selectedNodeId={null}
        onSelectNode={vi.fn()}
      />
    );
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
