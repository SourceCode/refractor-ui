import { useState } from 'react';
import { Eye, Power } from 'lucide-react';
import {
  ContextualPopover,
  DropdownSelect,
  IconButton,
  PrimaryButton,
  PrismCard,
  SearchWithSuggestions,
  SecondaryButton,
  ToastSnackbar,
  ToggleSwitch,
} from '@refractor-ui/core';
import { pushToast, setFocusedComponent, useAppDispatch } from '../system/store';
import { COMPONENT_REGISTRY } from './registry';

const SPECIMEN_SUGGESTIONS = [
  { id: 's1', label: 'Primary Action Button', category: 'Buttons & Actions' },
  { id: 's2', label: 'Search Bar with Suggestions', category: 'Form Inputs' },
  { id: 's3', label: 'Dropdown Select Menu', category: 'Form Inputs' },
  { id: 's4', label: 'Popover / Contextual Card', category: 'Overlays & Popups' },
  { id: 's5', label: 'Data Table / Grid', category: 'Data Display' },
];

export function ReferenceSpecimenBoard() {
  const dispatch = useAppDispatch();
  const [powerOn, setPowerOn] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [selectedVal, setSelectedVal] = useState('default');
  const [switchOn, setSwitchOn] = useState(true);
  const [showReferenceImage, setShowReferenceImage] = useState(false);

  return (
    <section aria-labelledby="specimen-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Interactive Optical Glass Specimen · {COMPONENT_REGISTRY.length} Astryx-Standard Components
          </p>
          <h1
            id="specimen-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 text-balance"
          >
            Refractor Prismatic UI Kit &amp; Optical Workbench
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowReferenceImage((s) => !s)}
          className="prism-crystal h-9 px-4 rounded-full inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showReferenceImage ? 'Hide Reference Image' : 'Compare Reference Image'}</span>
        </button>
      </div>

      <div
        className={`grid gap-6 items-start ${
          showReferenceImage ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        <div className="prism-studio-surface rounded-[28px] border border-white/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="max-w-[540px] mx-auto space-y-6">
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3.5">
              <PrimaryButton
                size="lg"
                className="flex-[1.35] px-6"
                onClick={() =>
                  dispatch(
                    pushToast({
                      title: 'Project workspace initialized',
                      description: 'Created new optical component sandbox.',
                      tone: 'amber',
                    })
                  )
                }
              >
                Start project
              </PrimaryButton>

              <SecondaryButton
                size="lg"
                className="flex-1 px-5"
                onClick={() =>
                  dispatch(
                    setFocusedComponent({
                      componentId: 'secondary-action-button',
                      category: 'buttons-actions',
                    })
                  )
                }
              >
                Secondary
              </SecondaryButton>

              <IconButton
                size="lg"
                active={powerOn}
                aria-label="Toggle optical bench power"
                onClick={() => {
                  setPowerOn((p) => !p);
                  dispatch(
                    pushToast({
                      title: powerOn ? 'Optical dispersion standard' : 'Optical dispersion boosted',
                      tone: 'emerald',
                    })
                  );
                }}
              >
                <Power className="w-6 h-6 stroke-[2]" />
              </IconButton>
            </div>

            <div>
              <SearchWithSuggestions
                value={searchVal}
                onChange={setSearchVal}
                placeholder="With suggestions"
                suggestions={SPECIMEN_SUGGESTIONS}
                onSelectSuggestion={(s) => {
                  setSearchVal(s.label);
                  dispatch(
                    pushToast({
                      title: `Selected ${s.label}`,
                      description: s.category,
                      tone: 'info',
                    })
                  );
                }}
                onQuickAdd={(q) =>
                  dispatch(
                    pushToast({
                      title: q ? `Added "${q}" to quick filters` : 'Ready to add suggestion',
                      tone: 'emerald',
                    })
                  )
                }
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-5">
              <div className="flex-1 min-w-[230px]">
                <DropdownSelect
                  value={selectedVal}
                  onChange={setSelectedVal}
                  options={[
                    { value: 'default', label: 'Select' },
                    { value: 'refractive', label: 'Refractive Crystal' },
                    { value: 'frosted', label: 'Frosted Alabaster' },
                    { value: 'obsidian', label: 'Obsidian Bench' },
                  ]}
                />
              </div>

              <div className="shrink-0">
                <ToggleSwitch
                  checked={switchOn}
                  onChange={setSwitchOn}
                  ariaLabel="Enable emerald liquid glass state"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              <button
                type="button"
                onClick={() =>
                  dispatch(
                    setFocusedComponent({
                      componentId: 'tabs',
                      category: 'navigation',
                    })
                  )
                }
                className="prism-crystal h-12 px-6 rounded-full flex items-center gap-3 text-[15px] font-medium text-slate-800 dark:text-slate-100 cursor-pointer hover:-translate-y-0.5 transition-transform w-full text-left"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5 text-slate-600 dark:text-slate-300 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 4 18 10 6 10 12 4" className="fill-slate-500/25" />
                  <polyline points="7 15 12 20 17 15" />
                </svg>
                <span>Tabs</span>
              </button>

              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  dispatch(
                    pushToast({
                      title: 'Toast',
                      description: 'Warm-amber hairline notification triggered.',
                      tone: 'amber',
                    })
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch(
                      pushToast({
                        title: 'Toast',
                        description: 'Warm-amber hairline notification triggered.',
                        tone: 'amber',
                      })
                    );
                  }
                }}
                className="cursor-pointer w-full [&>div]:w-full"
              >
                <ToastSnackbar title="Toast" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch pt-1">
              <PrismCard specimenSlab title="Card" className="max-w-none" />

              <ContextualPopover
                inlineSpecimen
                title="Find files..."
                subtitle="Add collaborator"
                ctaLabel="Pro plan"
                onCtaClick={() =>
                  dispatch(
                    pushToast({
                      title: 'Pro plan unlocked',
                      description: 'Collaborator seat & VFS indexing enabled.',
                      tone: 'info',
                    })
                  )
                }
                onClose={() =>
                  dispatch(
                    pushToast({
                      title: 'Contextual card dismissed',
                      tone: 'amber',
                    })
                  )
                }
              />
            </div>
          </div>
        </div>

        {showReferenceImage && (
          <figure className="prism-slab p-4 space-y-2.5">
            <img
              src="/assets/aistudio/image_5a598908.png"
              alt="Original optical glass UI reference specification"
              referrerPolicy="no-referrer"
              className="w-full rounded-[20px] object-contain max-h-[620px] mx-auto"
            />
            <figcaption className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Original Optical Design Specification Specimen
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
