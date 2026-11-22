import { Sparkles } from 'lucide-react';
import {
  AvatarStack,
  ExpandableTextClamp,
  InlineCopyTrigger,
  MarqueeTicker,
  OpticalDivider,
  PropertyGrid,
  ScrollShadowArea,
  ShortcutCheatSheet,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface FoundationalMicroUtilitiesDemosProps {
  componentId: string;
}

export function FoundationalMicroUtilitiesDemos({
  componentId,
}: FoundationalMicroUtilitiesDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'optical-divider':
      return (
        <div className="w-full max-w-xl space-y-5">
          <OpticalDivider variant="specular" label="Optical Specular Seam" icon={<Sparkles className="w-3.5 h-3.5" aria-hidden="true" />} />
          <OpticalDivider variant="seam" label="Section Start" labelAlign="start" />
          <OpticalDivider variant="dashed" label="End Aligned" labelAlign="end" />
          <div className="prism-slab p-4 flex items-center justify-around gap-4 min-h-[72px]">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Left Zone</span>
            <OpticalDivider orientation="vertical" variant="specular" label="OR" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Right Zone</span>
          </div>
        </div>
      );

    case 'property-grid':
      return (
        <div className="w-full max-w-2xl">
          <PropertyGrid
            title="Cluster Deployment Inspector"
            columns={2}
            searchable
            onCopyEntry={(entry) =>
              dispatch(pushToast({ title: `Copied ${entry.label}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'avatar-stack':
      return (
        <div className="prism-slab p-5 w-full max-w-md flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Design Review Squad</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Click +3 to inspect full roster</div>
          </div>
          <AvatarStack
            maxVisible={4}
            onSelectUser={(user) =>
              dispatch(pushToast({ title: `Selected ${user.name}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'inline-copy-trigger':
      return (
        <div className="flex flex-wrap items-center gap-3 w-full max-w-xl">
          <InlineCopyTrigger
            value="rfr_prod_9f4a8c21e0b7"
            onCopy={(val) =>
              dispatch(pushToast({ title: `Copied token ${val}`, tone: 'emerald' }))
            }
          />
          <InlineCopyTrigger
            value="https://sourcecode.github.io/refractor-ui/"
            variant="crystal"
            size="sm"
          />
        </div>
      );

    case 'expandable-text-clamp':
      return (
        <div className="w-full max-w-xl">
          <ExpandableTextClamp
            lines={3}
            text="Refractor Optical Glass models multi-layered specular refraction with calibrated backdrop blur, meniscus highlight rims, and WCAG-verified contrast tokens across both Alabaster Light and Obsidian Dark modes. Every primitive composes seamlessly through React 19 ref passthrough, CSS @layer components scoping, and zero-wildcard strict TypeScript types so engineering teams can scale from simple dashboards to creative pro studio tools without visual drift."
          />
        </div>
      );

    case 'marquee-ticker':
      return (
        <div className="w-full max-w-3xl">
          <MarqueeTicker
            onSelectItem={(item) =>
              dispatch(pushToast({ title: `${item.label}: ${item.value ?? ''}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'shortcut-cheat-sheet':
      return (
        <div className="w-full max-w-3xl">
          <ShortcutCheatSheet
            mode="inline"
            enableQuestionMarkHotkey={false}
            onSelectShortcut={(sc) =>
              dispatch(
                pushToast({
                  title: `${sc.label} (${sc.keys.join(' + ')})`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'scroll-shadow-area':
      return (
        <div className="w-full max-w-xl">
          <ScrollShadowArea maxHeight={200} showScrollButtons viewportLabel="Release highlights">
            <div className="space-y-2.5 p-3">
              {[
                '01 · Specular Glass Physics Engine calibrated for light & dark themes',
                '02 · Dynamic edge-fade masks signal hidden vertical or horizontal overflow',
                '03 · Keyboard-focusable scroll region with accessible landmark labeling',
                '04 · Zero raw color literals — reads strictly from --prism-* custom properties',
                '05 · Optional jump-to-top and jump-to-end controls on long feeds',
                '06 · Full ResizeObserver and window resize synchronization',
                '07 · Tested across 15 desktop, tablet, and mobile viewports',
              ].map((line) => (
                <div
                  key={line}
                  className="prism-crystal rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100"
                >
                  {line}
                </div>
              ))}
            </div>
          </ScrollShadowArea>
        </div>
      );

    default:
      return null;
  }
}
