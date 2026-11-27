'use client';

import { useMemo, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { MOTION_THEME, type MotionTokenName } from '../motion/motion.theme';
import {
  compileSpringToCssLinear,
  simulateSpring,
  type SpringPhysicsConfig,
} from '../motion/springPhysics';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface MotionStudioProps extends BaseProps<HTMLDivElement> {
  /** Initial semantic motion token loaded into the visual editor (default: `'ui'`). */
  initialToken?: MotionTokenName;
  /** Callback fired whenever the user tunes spring physics parameters. */
  onConfigChange?: (config: SpringPhysicsConfig, compiledCssLinear: string) => void;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('motion-studio');
const CURVE_CLASS = /*#__PURE__*/ stableClassName('motion-studio', 'curve');
const STAGE_CLASS = /*#__PURE__*/ stableClassName('motion-studio', 'stage');

const TOKEN_NAMES: ReadonlyArray<MotionTokenName> = /*#__PURE__*/ Object.freeze([
  'snap',
  'ui',
  'gentle',
  'lively',
  'ambient',
]);

function MotionStudioInner({
  initialToken = 'ui',
  onConfigChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MotionStudioProps) {
  const override = useComponentOverride('MotionStudio');
  const [activeToken, setActiveToken] = useState<MotionTokenName>(initialToken);
  const [stiffness, setStiffness] = useState<number>(MOTION_THEME[initialToken].spring.stiffness);
  const [damping, setDamping] = useState<number>(MOTION_THEME[initialToken].spring.damping);
  const [mass, setMass] = useState<number>(MOTION_THEME[initialToken].spring.mass);
  const [toggled, setToggled] = useState<boolean>(false);

  const simulation = useMemo(
    () => simulateSpring({ stiffness, damping, mass }, 12),
    [stiffness, damping, mass]
  );
  const compiled = useMemo(
    () => compileSpringToCssLinear({ stiffness, damping, mass }, 16),
    [stiffness, damping, mass]
  );

  const polylinePoints = useMemo(() => {
    const pts: string[] = [];
    const len = Math.max(1, simulation.values.length - 1);
    for (let i = 0; i < simulation.values.length; i += 1) {
      const x = (i / len) * 200;
      const val = simulation.values[i] ?? 0;
      const y = 78 - Math.min(1.4, Math.max(-0.2, val)) * 54;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [simulation]);

  const applyPreset = (token: MotionTokenName) => {
    const spec = MOTION_THEME[token];
    setActiveToken(token);
    setStiffness(spec.spring.stiffness);
    setDamping(spec.spring.damping);
    setMass(spec.spring.mass);
    onConfigChange?.(spec.spring, spec.cssEasing);
  };

  const updateParam = (nextStiffness: number, nextDamping: number, nextMass: number) => {
    setStiffness(nextStiffness);
    setDamping(nextDamping);
    setMass(nextMass);
    const nextConfig: SpringPhysicsConfig = {
      stiffness: nextStiffness,
      damping: nextDamping,
      mass: nextMass,
    };
    onConfigChange?.(nextConfig, compileSpringToCssLinear(nextConfig, 16).easing);
  };

  const merged = mergeProps({
    themeTarget: themeProps('MotionStudio', { token: activeToken }),
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
      aria-label="Motion Studio Visual Transition Editor"
      {...rest}
      {...merged}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            Motion Studio
          </h4>
          <p className="text-[11px]" style={STYLE_TEXT_SECONDARY}>
            {compiled.durationMs}ms · overshoot {Math.round(compiled.overshoot * 100)}%
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-1">
          {TOKEN_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              aria-pressed={activeToken === name}
              className={`prism-focus-prismatic rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer ${
                activeToken === name ? 'prism-btn-primary' : 'prism-btn-secondary'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        <div className={`${CURVE_CLASS} prism-well rounded-xl p-2`}>
          <svg
            width="100%"
            height="92"
            viewBox="0 0 200 92"
            className="prism-contain-box"
            role="img"
            aria-label="Spring physics response curve"
          >
            <line
              x1="0"
              y1="24"
              x2="200"
              y2="24"
              stroke="var(--prism-border-divider)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              stroke="var(--prism-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <label className="flex items-center justify-between gap-2" style={STYLE_TEXT_SECONDARY}>
            <span>Stiffness ({stiffness})</span>
            <input
              type="range"
              aria-label="Spring stiffness"
              min={60}
              max={700}
              step={10}
              value={stiffness}
              onChange={(e) => updateParam(Number(e.target.value), damping, mass)}
            />
          </label>
          <label className="flex items-center justify-between gap-2" style={STYLE_TEXT_SECONDARY}>
            <span>Damping ({damping})</span>
            <input
              type="range"
              aria-label="Spring damping"
              min={6}
              max={60}
              step={1}
              value={damping}
              onChange={(e) => updateParam(stiffness, Number(e.target.value), mass)}
            />
          </label>
          <label className="flex items-center justify-between gap-2" style={STYLE_TEXT_SECONDARY}>
            <span>Mass ({mass.toFixed(2)})</span>
            <input
              type="range"
              aria-label="Spring mass"
              min={0.4}
              max={2.5}
              step={0.05}
              value={mass}
              onChange={(e) => updateParam(stiffness, damping, Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className={`${STAGE_CLASS} flex items-center justify-between gap-3 rounded-xl prism-well px-3 py-2`}>
        <div
          className="h-7 w-16 rounded-full prism-btn-primary"
          style={{
            transform: toggled ? 'translate3d(100%, 0, 0)' : 'translate3d(0, 0, 0)',
            transition: `transform ${compiled.durationMs}ms ${compiled.easing}`,
          }}
        />
        <button
          type="button"
          onClick={() => setToggled((prev) => !prev)}
          className="prism-btn-secondary prism-focus-prismatic rounded-full px-3 py-1 text-xs cursor-pointer"
        >
          Play Preview
        </button>
      </div>

      <code
        className="block rounded-lg prism-well px-2.5 py-1.5 text-[10px] font-mono overflow-x-auto"
        style={STYLE_TEXT_SECONDARY}
      >
        {`transition-timing-function: ${compiled.easing}; /* ${compiled.durationMs}ms */`}
      </code>
    </div>
  );
}

export const MotionStudio = /*#__PURE__*/ memoWithDisplayName(MotionStudioInner, 'MotionStudio');
