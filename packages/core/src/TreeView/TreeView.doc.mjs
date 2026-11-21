export const docs = {
  name: 'TreeView',
  displayName: 'Tree View',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['tree', 'hierarchy', 'folder', 'files', 'explorer', 'vfs', 'nested'],
  usage: {
    description:
      'Hierarchical expandable tree rendering nested folders and files from a flat parentId graph with cycle protection, tabular file sizes, and emerald selection states.',
    bestPractices: [
      { guidance: true, description: 'Use unique stable node IDs and parentId: null for top-level entries.' },
      { guidance: true, description: 'Pass defaultExpandedIds to control which branches start expanded.' },
      { guidance: false, description: 'Mutate nodes in place without providing stable IDs.' },
    ],
    accessibility: [
      {
        name: 'Tree ARIA hierarchy',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="tree", role="group", role="treeitem", aria-expanded, and aria-selected',
        description: 'Top-level lists expose role="tree", nested folders expose role="group" with aria-expanded, and every node reflects selection via aria-selected.',
      },
    ],
  },
  props: [
    { name: 'nodes', type: 'ReadonlyArray<TreeNodeItem>', defaultValue: 'required', description: 'Flat folder/file records linked by parentId (cycle-safe).' },
    { name: 'selectedNodeId', type: 'string | null', defaultValue: 'required', description: 'Currently selected node ID.' },
    { name: 'onSelectNode', type: '(node: TreeNodeItem) => void', defaultValue: 'required', description: 'Invoked when any node is selected.' },
    { name: 'defaultExpandedIds', type: 'ReadonlyArray<string>', defaultValue: "['dir-root-design', 'dir-root-components', 'dir-buttons']", description: 'Initial expanded folder IDs.' },
  ],
  examples: [
    `<TreeView\n  nodes={vfsNodes}\n  selectedNodeId={selectedId}\n  onSelectNode={(node) => setSelectedId(node.id)}\n/>`,
  ],
};
