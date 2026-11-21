import { useState } from 'react';
import {
  NodeGraphCanvas,
  SortableList,
  type SortableListItem,
  TransferList,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DragDropDemosProps {
  componentId: string;
}

const TRANSFER_ITEMS = [
  { id: 't1', label: 'PrimaryButton', description: 'Warm refractive CTA capsule' },
  { id: 't2', label: 'WindowSplitter', description: 'Draggable multi-pane divider' },
  { id: 't3', label: 'AdvancedDataGrid', description: 'Inline edit & formula-safe CSV' },
  { id: 't4', label: 'RichTextEditor', description: 'Allowlist-sanitized WYSIWYG' },
  { id: 't5', label: 'NodeGraphCanvas', description: 'Zoomable 2D workflow canvas' },
  { id: 't6', label: 'LegacyBridge (Locked)', description: 'Deprecated shim', disabled: true },
];

const INITIAL_SORTABLE: SortableListItem[] = [
  { id: 's1', title: '1. Enforce Strict Zero any/unknown Types', subtitle: 'ADR-0002 · Core Compiler Gate', badge: 'P1' },
  { id: 's2', title: '2. Calibrate Specular & Caustic Tokens', subtitle: 'ADR-0003 · Dual MUI+Astryx Theme', badge: 'P1' },
  { id: 's3', title: '3. Verify >= 93% V8 Adversarial Coverage', subtitle: 'ADR-0005 · Security & Fuzz Suite', badge: 'P1' },
  { id: 's4', title: '4. Publish SemVer 2.0.0 Tag & Changelog', subtitle: 'ADR-0004 · SemVer Release Gate', badge: 'P2' },
];

export function DragDropDemos({ componentId }: DragDropDemosProps) {
  const dispatch = useAppDispatch();
  const [selectedTransfer, setSelectedTransfer] = useState<string[]>(['t1', 't3']);
  const [sortableItems, setSortableItems] = useState<SortableListItem[]>(INITIAL_SORTABLE);

  switch (componentId) {
    case 'transfer-list':
      return (
        <div className="w-full">
          <TransferList
            items={TRANSFER_ITEMS}
            selectedIds={selectedTransfer}
            onChange={setSelectedTransfer}
            availableTitle="Available Primitives"
            selectedTitle="Bundle Exports"
          />
        </div>
      );

    case 'sortable-list':
      return (
        <div className="w-full max-w-xl">
          <SortableList
            items={sortableItems}
            onReorder={(next, from, to) => {
              setSortableItems(next);
              dispatch(
                pushToast({
                  title: `Reordered priority #${from + 1} -> #${to + 1}`,
                  tone: 'emerald',
                })
              );
            }}
          />
        </div>
      );

    case 'node-graph-canvas':
      return (
        <div className="w-full">
          <NodeGraphCanvas
            height={400}
            defaultNodes={[
              { id: 'n1', label: 'Theme Tokens', category: 'Input', x: 28, y: 158, tone: 'primary' },
              { id: 'n2', label: 'Color Math Engine', category: 'Transform', x: 292, y: 84, tone: 'cobalt' },
              { id: 'n3', label: 'Caustic Shader', category: 'Optics', x: 292, y: 232, tone: 'emerald' },
              { id: 'n4', label: 'Optical Surface', category: 'Output', x: 560, y: 158, tone: 'crystal' },
            ]}
            defaultEdges={[
              { id: 'e1', sourceId: 'n1', targetId: 'n2', label: 'RGB' },
              { id: 'e2', sourceId: 'n1', targetId: 'n3', label: 'Blur' },
              { id: 'e3', sourceId: 'n2', targetId: 'n4' },
              { id: 'e4', sourceId: 'n3', targetId: 'n4' },
            ]}
            onSelectNode={(node) => {
              if (node) {
                dispatch(
                  pushToast({
                    title: `Selected node: ${node.label}`,
                    description: `${node.category ?? 'Flow'} (${Math.round(node.x)}, ${Math.round(node.y)})`,
                    tone: 'info',
                  })
                );
              }
            }}
          />
        </div>
      );

    default:
      return null;
  }
}
