'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { CheckCircle2, Circle, Clock, Loader2, Users, Wrench } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AgentRosterStatus = 'idle' | 'thinking' | 'tool' | 'waiting' | 'done';

export interface AgentRosterMember {
  /** Unique identifier for the agent member. */
  id: string;
  /** Display name of the agent rendered as literal text. */
  name: string;
  /** Concise role or specialization label (e.g. 'Planner', 'Researcher'). */
  role: string;
  /** Current execution status of the agent. */
  status: AgentRosterStatus;
  /** Optional concise description of the agent's active task. */
  currentTask?: string;
  /** Optional custom short label inside the avatar orb; falls back to 2-letter uppercase initials. */
  avatarLabel?: string;
}

export type AgentRosterOrientation = 'horizontal' | 'vertical';

export interface AgentRosterRailProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of agents participating in the orchestration session. */
  agents: AgentRosterMember[];
  /** Controlled active/selected agent identifier. */
  activeAgentId?: string;
  /** Initial active agent identifier in uncontrolled mode (defaults to first agent's id or ''). */
  defaultActiveAgentId?: string;
  /** Callback invoked whenever an agent card is clicked or selected via keyboard navigation. */
  onSelectAgent?: (agent: AgentRosterMember) => void;
  /** Layout axis of the agent rail ('horizontal' | 'vertical', defaults to 'horizontal'). */
  orientation?: AgentRosterOrientation;
  /** Header heading for the roster slab (defaults to 'Agent Roster'). */
  title?: string;
}

interface RosterStatusVisual {
  label: string;
  pillClass: string;
  colorToken: string;
  borderToken?: string;
  icon: ReactNode;
}

function isWorkingStatus(status: AgentRosterStatus): boolean {
  return status === 'thinking' || status === 'tool';
}

function deriveAvatarInitials(name: string, avatarLabel?: string): string {
  const customLabel = avatarLabel?.trim();
  if (customLabel) {
    return customLabel;
  }
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const [first, second] = parts;
  if (!first) {
    return 'AG';
  }
  if (!second) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function getStatusVisual(status: AgentRosterStatus): RosterStatusVisual {
  switch (status) {
    case 'thinking':
      return {
        label: 'Thinking',
        pillClass: 'prism-well',
        colorToken: 'var(--prism-primary-main)',
        borderToken: 'var(--prism-primary-main)',
        icon: <Loader2 aria-hidden="true" className="w-3 h-3 shrink-0 animate-spin motion-reduce:animate-none" />,
      };
    case 'tool':
      return {
        label: 'Tool',
        pillClass: 'prism-well',
        colorToken: 'var(--prism-info-main)',
        borderToken: 'var(--prism-info-main)',
        icon: <Wrench aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'waiting':
      return {
        label: 'Waiting',
        pillClass: 'prism-well',
        colorToken: 'var(--prism-warning-main)',
        borderToken: 'var(--prism-warning-main)',
        icon: <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'done':
      return {
        label: 'Done',
        pillClass: 'prism-emerald',
        colorToken: 'var(--prism-success-contrast)',
        icon: <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
    case 'idle':
      return {
        label: 'Idle',
        pillClass: 'prism-well',
        colorToken: 'var(--prism-text-secondary)',
        borderToken: 'var(--prism-divider)',
        icon: <Circle aria-hidden="true" className="w-3 h-3 shrink-0" />,
      };
  }
}

const headerClass = /*#__PURE__*/ stableClassName('agent-roster-rail', 'header');
const railClass = /*#__PURE__*/ stableClassName('agent-roster-rail', 'rail');
const cardClass = /*#__PURE__*/ stableClassName('agent-roster-rail', 'card');

function AgentRosterRailInner({
  agents,
  activeAgentId,
  defaultActiveAgentId,
  onSelectAgent,
  orientation = 'horizontal',
  title = 'Agent Roster',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AgentRosterRailProps) {
  const override = useComponentOverride('AgentRosterRail');
  const headingId = useId();
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [currentActiveId, setCurrentActiveId] = useControllableState<string>({
    value: activeAgentId,
    defaultValue: defaultActiveAgentId ?? agents[0]?.id ?? '',
  });

  const activeWorkingCount = agents.filter((agent) => isWorkingStatus(agent.status)).length;
  const isHorizontal = orientation === 'horizontal';
  const isEmpty = agents.length === 0;
  const hasMatchingActive = agents.some((agent) => agent.id === currentActiveId);

  const registerCardRef = (id: string, node: HTMLButtonElement | null) => {
    if (node) {
      cardRefs.current.set(id, node);
    } else {
      cardRefs.current.delete(id);
    }
  };

  const selectAgent = (agent: AgentRosterMember) => {
    setCurrentActiveId(agent.id);
    onSelectAgent?.(agent);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.nativeEvent.isComposing) return;

    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    let targetIndex: number | null = null;
    if (event.key === nextKey) {
      targetIndex = (index + 1) % agents.length;
    } else if (event.key === prevKey) {
      targetIndex = (index - 1 + agents.length) % agents.length;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = agents.length - 1;
    }

    if (targetIndex === null) return;

    event.preventDefault();
    const targetAgent = agents[targetIndex];
    if (targetAgent) {
      selectAgent(targetAgent);
      cardRefs.current.get(targetAgent.id)?.focus();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('agent-roster-rail', {
      orientation,
      empty: isEmpty,
      hasActive: activeWorkingCount > 0,
    }),
    baseClassName: 'prism-slab overflow-hidden w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div
        className={cx(headerClass, 'px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b')}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color:
                activeWorkingCount > 0 ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
            }}
          >
            <Users aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h3>
        </div>

        <span
          data-testid="agent-roster-summary"
          className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {activeWorkingCount} active · {agents.length} total
        </span>
      </div>

      <div className="p-4">
        {isEmpty ? (
          <div
            data-testid="agent-roster-empty"
            className="prism-well rounded-2xl py-6 px-4 text-center"
          >
            <p className="text-xs font-medium" style={STYLE_TEXT_SECONDARY}>
              No agents currently registered in this roster.
            </p>
          </div>
        ) : (
          <ul
            data-testid="agent-roster-list"
            data-orientation={orientation}
            className={cx(
              railClass,
              isHorizontal
                ? 'flex flex-row items-stretch gap-3 overflow-x-auto pb-1.5 px-0.5 pt-0.5'
                : 'flex flex-col gap-2.5'
            )}
          >
            {agents.map((agent, index) => {
              const isSelected = agent.id === currentActiveId;
              const isTabStop = isSelected || (!hasMatchingActive && index === 0);
              const visual = getStatusVisual(agent.status);
              const initials = deriveAvatarInitials(agent.name, agent.avatarLabel);

              return (
                <li
                  key={agent.id}
                  className={cx(isHorizontal ? 'shrink-0 w-56 flex' : 'w-full')}
                >
                  <button
                    ref={(node) => registerCardRef(agent.id, node)}
                    type="button"
                    tabIndex={isTabStop ? 0 : -1}
                    aria-current={isSelected ? 'true' : undefined}
                    data-testid={`agent-roster-card-${agent.id}`}
                    data-agent-id={agent.id}
                    data-agent-status={agent.status}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => selectAgent(agent)}
                    onKeyDown={(event) => handleCardKeyDown(event, index)}
                    className={cx(
                      cardClass,
                      'prism-crystal prism-focus-ring w-full rounded-2xl p-3 text-left flex flex-col gap-2.5 border cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
                    )}
                    style={
                      isSelected
                        ? {
                            borderColor: 'var(--prism-primary-main)',
                            boxShadow: '0 0 0 2px var(--prism-primary-main)',
                          }
                        : STYLE_BORDER_DIVIDER
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span
                          data-testid={`agent-roster-avatar-${agent.id}`}
                          aria-hidden="true"
                          className={cx(
                            'w-8 h-8 rounded-full inline-flex items-center justify-center text-[11px] font-bold tracking-tight shrink-0',
                            isSelected ? 'prism-btn-primary' : 'prism-well'
                          )}
                          style={
                            isSelected ? undefined : STYLE_TEXT_PRIMARY
                          }
                        >
                          <span className="relative z-10">{initials}</span>
                        </span>

                        <div className="min-w-0">
                          <div
                            className="text-xs font-semibold truncate"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {agent.name}
                          </div>
                          <div
                            className="text-[11px] truncate"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {agent.role}
                          </div>
                        </div>
                      </div>

                      <span
                        data-testid={`agent-roster-status-${agent.id}`}
                        data-status={agent.status}
                        className={cx(
                          visual.pillClass,
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight shrink-0',
                          visual.borderToken && 'border'
                        )}
                        style={
                          visual.borderToken
                            ? {
                                color: visual.colorToken,
                                borderColor: visual.borderToken,
                              }
                            : { color: visual.colorToken }
                        }
                      >
                        {visual.icon}
                        <span>{visual.label}</span>
                      </span>
                    </div>

                    {agent.currentTask ? (
                      <p
                        data-testid={`agent-roster-task-${agent.id}`}
                        className="prism-well rounded-xl px-2.5 py-1.5 text-[11px] leading-snug break-words"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {agent.currentTask}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export const AgentRosterRail = /*#__PURE__*/ memoWithDisplayName(AgentRosterRailInner, 'AgentRosterRail');
