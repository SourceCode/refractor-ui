'use client';

import { useMemo } from 'react';
import type { BaseProps } from '../BaseProps';
import { computeMotionScore } from '../motion/motionScore';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface MotionPerformanceDoctorProps extends BaseProps<HTMLDivElement> {
  /** Optional CSS/TSX snippet to statically audit for layout thrashing and blur churn. */
  sourceCode?: string;
  /** Optional array of live frame durations in milliseconds to profile p95 and FPS. */
  frameDurationsMs?: ReadonlyArray<number>;
  /** Title displayed in the audit header (default: `'MotionScore Performance Doctor'`). */
  title?: string;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('motion-performance-doctor');
const SCORE_CLASS = /*#__PURE__*/ stableClassName('motion-performance-doctor', 'score');
const LIST_CLASS = /*#__PURE__*/ stableClassName('motion-performance-doctor', 'findings');

function MotionPerformanceDoctorInner({
  sourceCode = '',
  frameDurationsMs,
  title = 'MotionScore Performance Doctor',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MotionPerformanceDoctorProps) {
  const override = useComponentOverride('MotionPerformanceDoctor');
  const report = useMemo(
    () => computeMotionScore({ sourceCode, frameDurationsMs }),
    [sourceCode, frameDurationsMs]
  );

  const merged = mergeProps({
    themeTarget: themeProps('MotionPerformanceDoctor', {
      grade: report.grade,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab rounded-2xl p-4 flex flex-col gap-3`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="region"
      aria-label={title}
      {...rest}
      {...merged}
      data-motion-score={String(report.score)}
      data-motion-grade={report.grade}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            {title}
          </h4>
          {report.frameSummary ? (
            <p className="text-[11px] font-mono tabular-nums" style={STYLE_TEXT_SECONDARY}>
              ~{report.frameSummary.estimatedFps} FPS · p95 {report.frameSummary.p95FrameMs}ms ·{' '}
              {report.frameSummary.droppedFrames} dropped
            </p>
          ) : (
            <p className="text-[11px]" style={STYLE_TEXT_SECONDARY}>
              Static & runtime compositor audit
            </p>
          )}
        </div>
        <div
          className={`${SCORE_CLASS} prism-crystal rounded-xl px-3 py-1.5 text-center`}
          aria-label={`MotionScore ${report.score} out of 100, Grade ${report.grade}`}
        >
          <div className="text-lg font-bold tabular-nums leading-none" style={STYLE_TEXT_PRIMARY}>
            {report.grade}
          </div>
          <div className="text-[10px] font-mono tabular-nums" style={STYLE_TEXT_SECONDARY}>
            {report.score}/100
          </div>
        </div>
      </div>

      {report.findings.length === 0 ? (
        <div className="prism-well rounded-xl px-3 py-2 text-xs" style={STYLE_TEXT_PRIMARY}>
          All checked animations are compositor-safe with zero layout-thrashing bottlenecks.
        </div>
      ) : (
        <ul className={`${LIST_CLASS} flex flex-col gap-2`}>
          {report.findings.map((finding) => (
            <li key={finding.id} className="prism-well rounded-xl px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold uppercase text-[10px]" style={STYLE_TEXT_PRIMARY}>
                  {finding.severity} · {finding.category}
                </span>
                <span className="text-[10px] font-mono" style={STYLE_TEXT_SECONDARY}>
                  -{finding.penalty} pts
                </span>
              </div>
              <p className="mt-1" style={STYLE_TEXT_PRIMARY}>
                {finding.message}
              </p>
              <p className="mt-0.5 text-[11px]" style={STYLE_TEXT_SECONDARY}>
                {finding.recommendation}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const MotionPerformanceDoctor = /*#__PURE__*/ memoWithDisplayName(MotionPerformanceDoctorInner, 'MotionPerformanceDoctor');
