'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  FileText,
  Minus,
  PanelLeft,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, splitLiteralHighlight } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type DocumentZoomPreset = 75 | 100 | 125 | 150;

export interface DocumentViewerPage {
  /** Displayed page number shown on the optical sheet header and thumbnail badge. */
  pageNumber: number;
  /** Primary page heading rendered inside the reading canvas and thumbnail rail. */
  title: string;
  /** Optional chapter or section eyebrow rendered above the page title. */
  section?: string;
  /** Ordered literal text paragraphs rendered safely on the optical paper-glass canvas. */
  paragraphs: ReadonlyArray<string>;
}

export interface DocumentPageViewerProps extends BaseProps<HTMLDivElement> {
  /** Multi-page document payload; defaults to 4 realistic optical specification pages when omitted, or renders a role="status" empty state when []. */
  pages?: ReadonlyArray<DocumentViewerPage>;
  /** Controlled 1-based active page number. */
  page?: number;
  /** Uncontrolled initial 1-based active page number (defaults to 1). */
  defaultPage?: number;
  /** Callback invoked with the new clamped 1-based page number whenever page navigation occurs. */
  onPageChange?: (pageNumber: number) => void;
  /** Initial reading canvas zoom preset percentage (defaults to 100). */
  defaultZoomPct?: DocumentZoomPreset;
  /** Initial visibility of the collapsible miniature page-thumbnail rail (defaults to true). */
  defaultShowThumbnails?: boolean;
  /** Document filename or title displayed in the reader toolbar (defaults to 'Refractor_Optical_Spec_v2.pdf'). */
  documentTitle?: string;
}

type PreparedHighlightSegment =
  | {
      key: string;
      text: string;
      highlighted: false;
    }
  | {
      key: string;
      text: string;
      highlighted: true;
      matchIndex: number;
    };

interface PreparedParagraph {
  key: string;
  segments: ReadonlyArray<PreparedHighlightSegment>;
}

interface PreparedDocumentPage {
  key: string;
  navPageNumber: number;
  pageNumber: number;
  title: string;
  section?: string;
  sectionSegments: ReadonlyArray<PreparedHighlightSegment>;
  titleSegments: ReadonlyArray<PreparedHighlightSegment>;
  paragraphs: ReadonlyArray<PreparedParagraph>;
  matchCount: number;
  previewSnippet: string;
}

interface DocumentMatchLocation {
  matchIndex: number;
  navPageNumber: number;
}

interface PreparedDocumentState {
  pages: ReadonlyArray<PreparedDocumentPage>;
  matches: ReadonlyArray<DocumentMatchLocation>;
}

const ZOOM_PRESETS: ReadonlyArray<DocumentZoomPreset> = [75, 100, 125, 150];

const BASE_CANVAS_WIDTH_PX = 620;

const DEFAULT_DOCUMENT_PAGES: ReadonlyArray<DocumentViewerPage> = [
  {
    pageNumber: 1,
    section: 'Section 1.0 · Overview',
    title: 'Optical Glass Design System Architecture',
    paragraphs: [
      'Refractor establishes a token-driven optical glass rendering layer where every translucent slab, crystal bezel, and recessed input well resolves exclusively from semantic --prism-* custom properties.',
      'Dual warm and cool caustic shadows separate elevated reading panes from ambient workspaces without sacrificing typographic contrast across Alabaster light and Obsidian dark themes.',
      'All interactive controls maintain crisp specular rim borders, keyboard-only focus indicators, and deterministic DOM class surfaces prefixed with refractor-* for predictable cascade overrides.',
    ],
  },
  {
    pageNumber: 2,
    section: 'Section 2.0 · Material Physics',
    title: 'Refraction Intensity & Caustic Dispersion',
    paragraphs: [
      'Refraction intensity presets calibrate caustic opacity across subtle (0.45), standard (1.0), and vivid (1.35) optical profiles while keeping foreground document copy comfortably above WCAG AA contrast thresholds.',
      'Backdrop blur radii scale proportionally between dense toolbars (--prism-blur-px) and structural reading slabs (--prism-slab-blur-px), preserving edge legibility during continuous scrolling and zoom transitions.',
      'Theme cascades created with createPrismTheme or defineTheme propagate derived primary, secondary, and surface tokens down to nested document canvases with zero runtime stylesheet injection.',
    ],
  },
  {
    pageNumber: 3,
    section: 'Section 3.0 · Component Contracts',
    title: 'Astryx Open-Internals & Keyboard Ergonomics',
    paragraphs: [
      'Every Refractor component adopts React 19 direct ref props, extends BaseProps, reflects live state through themeProps data attributes, and composes consumer className and xstyle tokens via mergeProps.',
      'Text inputs and page jump controls guard Enter key commits against active IME composition sessions so CJK and diacritic candidates are never interrupted prematurely.',
      'Collapsible workspace rails expose explicit aria-pressed toggle states, polite live region readouts, and tabular numeric counters for stable layout rhythm across viewports.',
    ],
  },
  {
    pageNumber: 4,
    section: 'Section 4.0 · Verification & Security',
    title: 'Literal Search Highlighting & Release Gates',
    paragraphs: [
      'In-document search tokenizes page headings and body paragraphs with linear-time literal substring matching, avoiding dynamic regular expressions and preventing ReDoS payloads or HTML injection.',
      'Matched terms render strictly as React <mark> elements styled with semantic optical warning and primary tokens so highlighted passages remain legible in every cascade theme.',
      'Continuous integration enforces strict zero-any TypeScript checks, custom Astryx ESLint invariants, and high branch coverage across positive, negative, and adversarial user flows.',
    ],
  },
];

function stepZoomPreset(current: DocumentZoomPreset, delta: -1 | 1): DocumentZoomPreset {
  if (delta < 0) {
    if (current === 150) return 125;
    if (current === 125) return 100;
    return 75;
  }
  if (current === 75) return 100;
  if (current === 100) return 125;
  return 150;
}

function tokenizeField(
  source: string,
  query: string,
  fieldKey: string,
  navPageNumber: number,
  matches: DocumentMatchLocation[]
): { segments: PreparedHighlightSegment[]; count: number } {
  const rawSegments = splitLiteralHighlight(source, query);
  const segments: PreparedHighlightSegment[] = [];
  let offset = 0;
  let count = 0;

  for (const seg of rawSegments) {
    const start = offset;
    offset += seg.text.length;
    if (seg.highlighted) {
      const matchIndex = matches.length;
      matches.push({ matchIndex, navPageNumber });
      count += 1;
      segments.push({
        key: `${fieldKey}-${start}-h-${seg.text.length}`,
        text: seg.text,
        highlighted: true,
        matchIndex,
      });
    } else {
      segments.push({
        key: `${fieldKey}-${start}-n-${seg.text.length}`,
        text: seg.text,
        highlighted: false,
      });
    }
  }

  return { segments, count };
}

function prepareDocumentState(
  pages: ReadonlyArray<DocumentViewerPage>,
  trimmedQuery: string
): PreparedDocumentState {
  const matches: DocumentMatchLocation[] = [];
  const preparedPages: PreparedDocumentPage[] = [];
  let navPageNumber = 1;

  for (const pageItem of pages) {
    const pageKey = `doc-page-${navPageNumber}-${pageItem.pageNumber}`;
    let pageMatchCount = 0;

    let sectionSegments: ReadonlyArray<PreparedHighlightSegment> = [];
    if (pageItem.section) {
      const tokenizedSection = tokenizeField(
        pageItem.section,
        trimmedQuery,
        `${pageKey}-section`,
        navPageNumber,
        matches
      );
      sectionSegments = tokenizedSection.segments;
      pageMatchCount += tokenizedSection.count;
    }

    const tokenizedTitle = tokenizeField(
      pageItem.title,
      trimmedQuery,
      `${pageKey}-title`,
      navPageNumber,
      matches
    );
    pageMatchCount += tokenizedTitle.count;

    const preparedParagraphs: PreparedParagraph[] = [];
    let paragraphOrder = 1;
    for (const paragraphText of pageItem.paragraphs) {
      const paraKey = `${pageKey}-p-${paragraphOrder}`;
      const tokenizedPara = tokenizeField(
        paragraphText,
        trimmedQuery,
        paraKey,
        navPageNumber,
        matches
      );
      pageMatchCount += tokenizedPara.count;
      preparedParagraphs.push({
        key: paraKey,
        segments: tokenizedPara.segments,
      });
      paragraphOrder += 1;
    }

    preparedPages.push({
      key: pageKey,
      navPageNumber,
      pageNumber: pageItem.pageNumber,
      title: pageItem.title,
      section: pageItem.section,
      sectionSegments,
      titleSegments: tokenizedTitle.segments,
      paragraphs: preparedParagraphs,
      matchCount: pageMatchCount,
      previewSnippet: pageItem.paragraphs[0] ?? pageItem.title,
    });

    navPageNumber += 1;
  }

  return { pages: preparedPages, matches };
}

function renderHighlightSegments(
  segments: ReadonlyArray<PreparedHighlightSegment>,
  activeMatchIndex: number | null
) {
  return segments.map((segment) => {
    if (!segment.highlighted) {
      return <span key={segment.key}>{segment.text}</span>;
    }
    const isActive = segment.matchIndex === activeMatchIndex;
    return (
      <mark
        key={segment.key}
        data-match-index={String(segment.matchIndex)}
        data-active-match={isActive ? 'true' : undefined}
        className="rounded-sm px-0.5 font-semibold"
        style={
          isActive
            ? {
                backgroundColor: 'var(--prism-primary-main)',
                color: 'var(--prism-primary-contrast)',
                borderBottom: '1px solid var(--prism-primary-dark)',
              }
            : {
                backgroundColor: 'color-mix(in srgb, var(--prism-warning-main) 34%, transparent)',
                color: 'var(--prism-text-primary)',
                borderBottom: '1px solid var(--prism-warning-main)',
              }
        }
      >
        {segment.text}
      </mark>
    );
  });
}

export function DocumentPageViewer({
  pages,
  page,
  defaultPage = 1,
  onPageChange,
  defaultZoomPct = 100,
  defaultShowThumbnails = true,
  documentTitle = 'Refractor_Optical_Spec_v2.pdf',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DocumentPageViewerProps) {
  const thumbnailsId = useId();
  const titleId = useId();
  const override = useComponentOverride('DocumentPageViewer');

  const resolvedPages = pages ?? DEFAULT_DOCUMENT_PAGES;
  const totalPages = resolvedPages.length;

  const [rawPage, setRawPage] = useControllableState<number>({
    value: page,
    defaultValue: defaultPage,
  });

  const safePage = totalPages > 0 ? Math.round(clampNumber(rawPage, 1, totalPages, 1)) : 1;

  const [pageInputValue, setPageInputValue] = useState<string>(String(safePage));
  const [zoomPct, setZoomPct] = useState<DocumentZoomPreset>(defaultZoomPct);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(defaultShowThumbnails);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  useEffect(() => {
    setPageInputValue(String(safePage));
  }, [safePage]);

  const trimmedQuery = searchQuery.trim();

  const preparedDocument = useMemo<PreparedDocumentState>(
    () => prepareDocumentState(resolvedPages, trimmedQuery),
    [resolvedPages, trimmedQuery]
  );

  const totalMatches = preparedDocument.matches.length;
  const safeMatchIndex = totalMatches > 0 ? activeMatchIndex % totalMatches : 0;
  const activePage = preparedDocument.pages[safePage - 1];

  const goToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.round(clampNumber(targetPage, 1, totalPages, 1));
      if (clamped === safePage) return;
      setRawPage(clamped);
      onPageChange?.(clamped);
    },
    [onPageChange, safePage, setRawPage, totalPages]
  );

  const commitPageInput = useCallback(() => {
    const parsed = Number.parseInt(pageInputValue.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setPageInputValue(String(safePage));
      return;
    }
    const clamped = Math.round(clampNumber(parsed, 1, totalPages, safePage));
    goToPage(clamped);
    setPageInputValue(String(page !== undefined ? safePage : clamped));
  }, [goToPage, page, pageInputValue, safePage, totalPages]);

  const handlePageInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(event.target.value);
  }, []);

  const handlePageInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        commitPageInput();
      }
    },
    [commitPageInput]
  );

  const handlePrevPage = useCallback(() => {
    goToPage(safePage - 1);
  }, [goToPage, safePage]);

  const handleNextPage = useCallback(() => {
    goToPage(safePage + 1);
  }, [goToPage, safePage]);

  const handleZoomOut = useCallback(() => {
    setZoomPct((prev) => stepZoomPreset(prev, -1));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomPct((prev) => stepZoomPreset(prev, 1));
  }, []);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setActiveMatchIndex(0);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveMatchIndex(0);
  }, []);

  const handleJumpToNextMatch = useCallback(() => {
    const currentMatch = preparedDocument.matches[safeMatchIndex];
    if (!currentMatch) return;
    if (currentMatch.navPageNumber !== safePage) {
      goToPage(currentMatch.navPageNumber);
      return;
    }
    const nextIndex = (safeMatchIndex + 1) % preparedDocument.matches.length;
    setActiveMatchIndex(nextIndex);
    const nextMatch = preparedDocument.matches[nextIndex]!;
    goToPage(nextMatch.navPageNumber);
  }, [goToPage, preparedDocument.matches, safeMatchIndex, safePage]);

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleJumpToNextMatch();
      } else if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        handleClearSearch();
      }
    },
    [handleClearSearch, handleJumpToNextMatch, searchQuery.length]
  );

  const toolbarClass = stableClassName('document-page-viewer', 'toolbar');
  const thumbnailsClass = stableClassName('document-page-viewer', 'thumbnails');
  const canvasClass = stableClassName('document-page-viewer', 'canvas');
  const statusClass = stableClassName('document-page-viewer', 'status');

  const merged = mergeProps({
    themeTarget: themeProps('document-page-viewer', {
      page: totalPages > 0 ? safePage : undefined,
      zoom: zoomPct,
      thumbnails: showThumbnails,
      searching: trimmedQuery.length > 0,
      empty: totalPages === 0,
    }),
    baseClassName: 'prism-slab p-3 sm:p-4 flex flex-col gap-3 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!activePage) {
    return (
      <div ref={ref} {...rest} {...merged}>
        <div
          role="status"
          data-testid="document-viewer-empty"
          className="prism-well rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 min-w-0 max-w-full"
        >
          <span
            aria-hidden="true"
            className="prism-crystal w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <FileText className="w-5 h-5" />
          </span>
          <p
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            No document pages available
          </p>
          <p
            className="text-xs max-w-sm leading-relaxed"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Provide one or more pages to inspect {documentTitle} with thumbnail navigation, zoom controls, and literal search highlighting.
          </p>
        </div>
      </div>
    );
  }

  const canGoPrev = safePage > 1;
  const canGoNext = safePage < totalPages;
  const canZoomOut = zoomPct > 75;
  const canZoomIn = zoomPct < 150;
  const scaledWidthPx = Math.round((BASE_CANVAS_WIDTH_PX * zoomPct) / 100);
  const scaledFontSizePx = Math.round((16 * zoomPct) / 100);
  const activeHighlightIndex = totalMatches > 0 ? safeMatchIndex : null;
  const matchCountText = `${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'}`;

  const canvasSheetStyle: OpticalStyleTokens = {
    width: `${scaledWidthPx}px`,
    maxWidth: zoomPct <= 100 ? '100%' : 'none',
    fontSize: `${scaledFontSizePx}px`,
    border: '1px solid var(--prism-well-border)',
  };

  const liveAnnouncement =
    trimmedQuery.length > 0
      ? totalMatches > 0
        ? `Page ${safePage} of ${totalPages} · ${activePage.title} · ${zoomPct}% · ${matchCountText} (${safeMatchIndex + 1} of ${totalMatches})`
        : `Page ${safePage} of ${totalPages} · ${activePage.title} · ${zoomPct}% · 0 matches`
      : `Page ${safePage} of ${totalPages} · ${activePage.title} · ${zoomPct}%`;

  return (
    <div ref={ref} role="region" aria-labelledby={titleId} {...rest} {...merged}>
      {/* Sculpted Optical Document Reader Toolbar */}
      <div
        role="toolbar"
        aria-label="Document viewer controls"
        className={cx(
          toolbarClass,
          'prism-crystal rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full">
          {/* Left: Thumbnails toggle + Document Title */}
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <button
              type="button"
              aria-pressed={showThumbnails}
              aria-controls={thumbnailsId}
              aria-label={showThumbnails ? 'Hide page thumbnails' : 'Show page thumbnails'}
              data-testid="document-viewer-thumbnails-toggle"
              onClick={() => setShowThumbnails((prev) => !prev)}
              className={cx(
                'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all',
                showThumbnails ? 'prism-btn-primary' : 'prism-btn-secondary'
              )}
            >
              <PanelLeft className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              <span className="relative z-10">Thumbnails</span>
            </button>

            <div className="flex items-center gap-1.5 min-w-0 max-w-full">
              <FileText
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
              <h2
                id={titleId}
                data-testid="document-viewer-title"
                className="text-xs sm:text-sm font-semibold tracking-tight truncate max-w-[200px] sm:max-w-[280px]"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {documentTitle}
              </h2>
            </div>
          </div>

          {/* Right: Page Jump Navigation + Zoom Controls */}
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {/* Page Jump Controls */}
            <div
              role="group"
              aria-label="Page navigation"
              className="prism-well rounded-full px-1.5 py-1 inline-flex items-center gap-1 shrink-0"
            >
              <button
                type="button"
                aria-label="Previous page"
                disabled={!canGoPrev}
                data-testid="document-viewer-prev"
                onClick={handlePrevPage}
                className="prism-focus-ring prism-btn-secondary w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronLeft className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              </button>

              <input
                type="number"
                min={1}
                max={totalPages}
                aria-label="Jump to page"
                data-testid="document-viewer-page-input"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onKeyDown={handlePageInputKeyDown}
                onBlur={commitPageInput}
                className="prism-focus-ring w-11 h-7 rounded-lg px-1.5 text-center font-mono text-xs font-semibold tabular-nums"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 72%, transparent)',
                  color: 'var(--prism-text-primary)',
                  border: '1px solid var(--prism-well-border)',
                }}
              />

              <span
                data-testid="document-viewer-page-total"
                className="px-1 font-mono text-xs font-medium tabular-nums whitespace-nowrap"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                / {totalPages}
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={!canGoNext}
                data-testid="document-viewer-next"
                onClick={handleNextPage}
                className="prism-focus-ring prism-btn-secondary w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ChevronRight className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div
              role="group"
              aria-label="Zoom controls"
              className="prism-well rounded-full px-1.5 py-1 inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full"
            >
              <button
                type="button"
                aria-label="Zoom out"
                disabled={!canZoomOut}
                data-testid="document-viewer-zoom-out"
                onClick={handleZoomOut}
                className="prism-focus-ring prism-btn-secondary w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Minus className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              </button>

              <div className="inline-flex items-center gap-0.5 flex-wrap">
                {ZOOM_PRESETS.map((preset) => {
                  const isSelected = zoomPct === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={isSelected}
                      data-testid={`document-viewer-zoom-${preset}`}
                      onClick={() => setZoomPct(preset)}
                      className={cx(
                        'prism-focus-ring h-7 px-2 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-all',
                        isSelected ? 'prism-btn-primary' : 'prism-btn-secondary'
                      )}
                    >
                      <span className="relative z-10">{preset}%</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Zoom in"
                disabled={!canZoomIn}
                data-testid="document-viewer-zoom-in"
                onClick={handleZoomIn}
                className="prism-focus-ring prism-btn-secondary w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar Row */}
        <div className="prism-well rounded-xl px-2.5 py-1.5 flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <Search
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
            aria-hidden="true"
          />

          <input
            type="search"
            aria-label="Search document text"
            placeholder="Search document text..."
            data-testid="document-viewer-search-input"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="prism-focus-ring flex-1 min-w-[150px] h-7 bg-transparent text-xs font-medium"
            style={{ color: 'var(--prism-text-primary)' }}
          />

          {searchQuery.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search"
              data-testid="document-viewer-search-clear"
              onClick={handleClearSearch}
              className="prism-focus-ring prism-btn-secondary w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-3 h-3 relative z-10" aria-hidden="true" />
            </button>
          ) : null}

          {trimmedQuery.length > 0 ? (
            <div
              data-testid="document-viewer-search-meta"
              className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span data-testid="document-viewer-match-count" className="font-semibold">
                {matchCountText}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                disabled={totalMatches === 0}
                data-testid="document-viewer-next-match"
                onClick={handleJumpToNextMatch}
                className="prism-focus-ring prism-btn-secondary h-6 px-2.5 rounded-full inline-flex items-center gap-1 font-sans text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CornerDownRight className="w-3 h-3 relative z-10" aria-hidden="true" />
                <span className="relative z-10">jump to next match</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Responsive Workspace: Miniature Page-Thumbnail Rail + Optical Paper-Glass Reading Canvas */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0 max-w-full">
        {showThumbnails ? (
          <aside
            id={thumbnailsId}
            aria-label="Page thumbnails"
            data-testid="document-viewer-thumbnails"
            className={cx(
              thumbnailsClass,
              'prism-well rounded-2xl p-2.5 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:w-44 sm:max-h-[540px] shrink-0 min-w-0 max-w-full'
            )}
          >
            {preparedDocument.pages.map((item) => {
              const isCurrent = item.navPageNumber === safePage;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-label={`Page ${item.navPageNumber}: ${item.title}`}
                  data-testid={`document-viewer-thumb-${item.navPageNumber}`}
                  onClick={() => goToPage(item.navPageNumber)}
                  className={cx(
                    'prism-focus-ring w-36 sm:w-full rounded-xl p-2 text-left flex flex-col gap-1.5 shrink-0 cursor-pointer transition-all',
                    isCurrent ? 'prism-crystal' : 'prism-well'
                  )}
                  style={{
                    border: isCurrent
                      ? '1.5px solid var(--prism-primary-main)'
                      : '1px solid var(--prism-divider)',
                  }}
                >
                  {/* Miniature Paper-Glass Page Silhouette */}
                  <div
                    className="rounded-lg p-2 flex flex-col gap-1 min-h-[54px]"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 72%, transparent)',
                      border: '1px solid var(--prism-divider)',
                    }}
                  >
                    <span
                      className="text-[10px] font-bold leading-tight line-clamp-1"
                      style={{ color: 'var(--prism-text-primary)' }}
                    >
                      {item.title}
                    </span>
                    <span
                      className="text-[9px] leading-snug line-clamp-2"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {item.previewSnippet}
                    </span>
                  </div>

                  {/* Thumbnail Page Footer */}
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span
                      className="font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap"
                      style={{
                        color: isCurrent
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      P.{item.pageNumber}
                    </span>
                    {item.matchCount > 0 ? (
                      <span
                        data-testid={`document-viewer-thumb-matches-${item.navPageNumber}`}
                        className="px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap"
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-warning-main) 28%, transparent)',
                          color: 'var(--prism-text-primary)',
                        }}
                      >
                        {item.matchCount}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </aside>
        ) : null}

        {/* Optical Paper-Glass Reading Canvas Viewport */}
        <div
          data-testid="document-viewer-viewport"
          className="prism-well rounded-2xl p-3 sm:p-5 flex-1 min-w-0 max-w-full overflow-x-auto"
        >
          <article
            aria-label={`Page ${safePage} of ${totalPages}: ${activePage.title}`}
            data-testid="document-viewer-canvas"
            data-page-number={String(activePage.pageNumber)}
            data-zoom-pct={String(zoomPct)}
            className={cx(
              canvasClass,
              'prism-crystal rounded-2xl p-5 sm:p-8 flex flex-col gap-4 transition-all duration-150 mx-auto'
            )}
            style={canvasSheetStyle}
          >
            <header
              className="flex flex-wrap items-start justify-between gap-2 pb-3 min-w-0"
              style={{ borderBottom: '1px solid var(--prism-divider)' }}
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {activePage.section ? (
                  <p
                    data-testid="document-viewer-section"
                    className="font-mono text-[0.72em] font-semibold uppercase tracking-wider break-words"
                    style={{ color: 'var(--prism-primary-main)' }}
                  >
                    {renderHighlightSegments(activePage.sectionSegments, activeHighlightIndex)}
                  </p>
                ) : null}
                <h3
                  data-testid="document-viewer-page-heading"
                  className="text-[1.15em] font-bold tracking-tight leading-snug break-words"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {renderHighlightSegments(activePage.titleSegments, activeHighlightIndex)}
                </h3>
              </div>

              <span
                data-testid="document-viewer-page-badge"
                className="prism-well px-2.5 py-1 rounded-full font-mono text-[0.72em] font-semibold tabular-nums whitespace-nowrap shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Page {activePage.pageNumber} / {totalPages}
              </span>
            </header>

            <div className="flex flex-col gap-3 min-w-0">
              {activePage.paragraphs.length > 0 ? (
                activePage.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.key}
                    className="text-[0.875em] leading-relaxed break-words"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {renderHighlightSegments(paragraph.segments, activeHighlightIndex)}
                  </p>
                ))
              ) : (
                <p
                  data-testid="document-viewer-blank-page"
                  className="text-[0.82em] italic"
                  style={{ color: 'var(--prism-text-disabled)' }}
                >
                  This page contains no body text.
                </p>
              )}
            </div>
          </article>
        </div>
      </div>

      {/* Polite Live Region Status Bar */}
      <div
        role="status"
        aria-live="polite"
        data-testid="document-viewer-status"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums min-w-0 max-w-full'
        )}
        style={{ color: 'var(--prism-text-secondary)' }}
      >
        <span className="truncate max-w-full">{liveAnnouncement}</span>
        <span className="whitespace-nowrap shrink-0" style={{ color: 'var(--prism-text-primary)' }}>
          {zoomPct}%
        </span>
      </div>
    </div>
  );
}

DocumentPageViewer.displayName = 'DocumentPageViewer';
