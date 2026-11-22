import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ApprovalChainStrip,
  type ApprovalChainModeMap,
  type ApprovalChainStatus,
  type ApprovalChainStatusMap,
  type ApprovalReviewerNode,
} from './index';

describe('ApprovalChainStrip', () => {
  it('renders Astryx contracts, default 4-stage enterprise release chain, theme overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    const statusMapCheck: ApprovalChainStatusMap = {
      pending: true,
      approved: true,
      'changes-requested': true,
      rejected: true,
    };
    const modeMapCheck: ApprovalChainModeMap = {
      sequential: true,
      parallel: true,
    };
    expect(
      statusMapCheck.pending &&
        statusMapCheck.approved &&
        statusMapCheck['changes-requested'] &&
        statusMapCheck.rejected &&
        modeMapCheck.sequential &&
        modeMapCheck.parallel
    ).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ApprovalChainStrip: {
              className: 'theme-approval-strip',
              style: { maxWidth: '920px' },
            },
          },
        }}
      >
        <ApprovalChainStrip
          ref={ref}
          className="local-approval-strip"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '12px' }}
          data-testid="approval-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('approval-root');
    expect(ref.current).toBe(root);
    expect(ApprovalChainStrip.displayName).toBe('ApprovalChainStrip');
    expect(root).toHaveClass(
      'refractor-approval-chain-strip',
      'prism-slab',
      'theme-approval-strip',
      'local-approval-strip',
      'min-w-0',
      'max-w-full'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mode', 'sequential');
    expect(root).toHaveAttribute('data-verdict', 'pending');
    expect(root).toHaveStyle({ maxWidth: '920px', marginTop: '12px' });

    expect(
      screen.getByRole('heading', { name: 'Production Release Approval Chain' })
    ).toBeInTheDocument();

    const modeBadge = screen.getByTestId('approval-mode-badge');
    expect(modeBadge).toHaveTextContent('Sequential Chain');
    expect(modeBadge).toHaveAttribute('data-mode', 'sequential');

    const verdictBadge = screen.getByTestId('approval-verdict-badge');
    expect(verdictBadge).toHaveTextContent('Pending (2/4 Approved)');
    expect(verdictBadge).toHaveAttribute('data-verdict', 'pending');
    expect(verdictBadge.style.color).toBe('var(--prism-info-main)');

    const progressBar = screen.getByTestId('approval-progress-bar');
    expect(progressBar).toHaveAttribute('role', 'progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '4');
    expect(progressBar).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByTestId('approval-progress-fill')).toHaveStyle({ width: '50%' });

    // Default 4 stages
    expect(screen.getByTestId('approval-node-security-review')).toHaveAttribute(
      'data-status',
      'approved'
    );
    expect(screen.getByTestId('approval-stage-index-security-review')).toHaveTextContent('Stage 1');
    expect(screen.getByTestId('approval-avatar-security-review').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('approval-node-updated-security-review')).toHaveTextContent(
      '09:14 UTC'
    );
    expect(screen.getByTestId('approval-node-comment-security-review')).toHaveTextContent(
      'SBOM & SAST checks passed'
    );

    expect(screen.getByTestId('approval-node-design-systems')).toHaveAttribute(
      'data-status',
      'approved'
    );
    expect(screen.getByTestId('approval-stage-index-design-systems')).toHaveTextContent('Stage 2');

    // Stage 3 is first actionable pending stage -> selected by default and NOT gated
    const stage3 = screen.getByTestId('approval-node-staff-engineering');
    expect(stage3).toHaveAttribute('data-status', 'pending');
    expect(stage3).toHaveAttribute('data-selected', 'true');
    expect(stage3).toHaveAttribute('aria-pressed', 'true');
    expect(stage3).not.toHaveAttribute('data-gated');
    expect(screen.getByTestId('approval-avatar-staff-engineering').style.color).toBe(
      'var(--prism-info-main)'
    );

    // Stage 4 is gated because stage 3 is pending
    const stage4 = screen.getByTestId('approval-node-release-manager');
    expect(stage4).toHaveAttribute('data-status', 'pending');
    expect(stage4).toHaveAttribute('data-gated', 'true');
    expect(screen.getByTestId('approval-node-gated-release-manager')).toHaveTextContent(
      'Waiting on prior stage'
    );

    // Directional optical connectors
    expect(screen.getByTestId('approval-connector-0')).toHaveAttribute(
      'data-connector-mode',
      'sequential'
    );
    expect(screen.getByTestId('approval-connector-0').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('approval-connector-2').style.color).toBe(
      'var(--prism-text-disabled)'
    );

    // Action bar shows Stage 3 initially
    expect(screen.getByTestId('approval-selected-summary')).toHaveTextContent(
      'Priya Nair·Staff Engineering'
    );
    expect(screen.getByTestId('approval-live-announcement')).toHaveAttribute('aria-live', 'polite');
  });

  it('enforces sequential gating on stage 4 while stage 3 is pending and unlocks stage 4 once stage 3 is approved', () => {
    const onDecision = vi.fn();

    render(<ApprovalChainStrip onDecision={onDecision} data-testid="approval-root" />);

    const stage3 = screen.getByTestId('approval-node-staff-engineering');
    const stage4 = screen.getByTestId('approval-node-release-manager');
    const noteInput = screen.getByLabelText('Reviewer decision note');

    // Select stage 4 while stage 3 is pending
    fireEvent.click(stage4);
    expect(stage4).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('approval-gating-notice')).toHaveTextContent(
      'Waiting on prior stage: Staff Engineering (Priya Nair) must approve before this stage can be approved.'
    );
    expect(screen.getByTestId('approval-action-approve')).toBeDisabled();

    // Pressing Enter in decision note while gated must NOT trigger approval
    fireEvent.change(noteInput, { target: { value: 'Premature approval attempt' } });
    fireEvent.keyDown(noteInput, { key: 'Enter' });
    expect(onDecision).not.toHaveBeenCalled();

    // Select stage 3, add comment, and approve
    fireEvent.click(stage3);
    expect(screen.queryByTestId('approval-gating-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-action-approve')).toBeEnabled();

    fireEvent.change(noteInput, { target: { value: 'Load tests green at 12k RPS' } });
    fireEvent.click(screen.getByTestId('approval-action-approve'));

    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(onDecision).toHaveBeenLastCalledWith(
      'staff-engineering',
      'approved',
      'Load tests green at 12k RPS',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'staff-engineering',
          status: 'approved',
          comment: 'Load tests green at 12k RPS',
          updatedAt: 'Just now',
        }),
      ])
    );

    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent(
      'Pending (3/4 Approved)'
    );
    expect(screen.getByTestId('approval-progress-fill')).toHaveStyle({ width: '75%' });
    expect(screen.getByTestId('approval-live-announcement')).toHaveTextContent(
      'Priya Nair (Staff Engineering) marked Approved: Load tests green at 12k RPS'
    );

    // Stage 4 is now unlocked
    expect(stage4).not.toHaveAttribute('data-gated');
    expect(screen.queryByTestId('approval-node-gated-release-manager')).not.toBeInTheDocument();

    // Select stage 4 and approve via Enter in note input -> Chain Approved!
    fireEvent.click(stage4);
    expect(screen.queryByTestId('approval-gating-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-action-approve')).toBeEnabled();

    fireEvent.keyDown(noteInput, { key: 'Enter' });
    expect(onDecision).toHaveBeenCalledTimes(2);
    expect(onDecision).toHaveBeenLastCalledWith(
      'release-manager',
      'approved',
      '',
      expect.arrayContaining([
        expect.objectContaining({ id: 'release-manager', status: 'approved' }),
      ])
    );

    const verdictBadge = screen.getByTestId('approval-verdict-badge');
    expect(verdictBadge).toHaveTextContent('Chain Approved');
    expect(verdictBadge).toHaveAttribute('data-verdict', 'approved');
    expect(verdictBadge).toHaveClass('prism-emerald');
    expect(screen.getByTestId('approval-root')).toHaveAttribute('data-verdict', 'approved');
    expect(screen.getByTestId('approval-progress-fill')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('approval-live-announcement')).toHaveTextContent(
      'David Okafor (Release Manager) marked Approved.'
    );
  });

  it('allows independent sign-off on any stage in parallel mode with non-sequential indicators', () => {
    const onDecision = vi.fn();
    const parallelReviewers: ApprovalReviewerNode[] = [
      { id: 'legal', name: 'Amina Patel', role: 'Legal Counsel', initials: 'AP', status: 'pending' },
      { id: 'privacy', name: 'Lucas Weber', role: 'Privacy Officer', initials: 'LW', status: 'pending' },
      { id: 'infra', name: 'Sora Takahashi', role: 'Infra Lead', initials: 'ST', status: 'pending' },
    ];

    render(
      <ApprovalChainStrip
        title="Data Residency Sign-Off"
        mode="parallel"
        defaultReviewers={parallelReviewers}
        onDecision={onDecision}
        data-testid="approval-root"
      />
    );

    expect(screen.getByTestId('approval-root')).toHaveAttribute('data-mode', 'parallel');
    expect(screen.getByTestId('approval-mode-badge')).toHaveTextContent('Parallel Sign-Off');
    expect(screen.queryByTestId('approval-stage-index-legal')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-connector-0')).toHaveAttribute(
      'data-connector-mode',
      'parallel'
    );

    // Last reviewer is NOT blocked even though earlier reviewers are pending
    const infraCard = screen.getByTestId('approval-node-infra');
    expect(infraCard).not.toHaveAttribute('data-gated');
    fireEvent.click(infraCard);
    expect(screen.queryByTestId('approval-gating-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-action-approve')).toBeEnabled();

    fireEvent.click(screen.getByTestId('approval-action-approve'));
    expect(onDecision).toHaveBeenCalledTimes(1);
    expect(onDecision).toHaveBeenLastCalledWith(
      'infra',
      'approved',
      '',
      expect.arrayContaining([expect.objectContaining({ id: 'infra', status: 'approved' })])
    );
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent(
      'Pending (1/3 Approved)'
    );
  });

  it('supports Request Changes, Reject, Reset Pending, comment preservation, and overall verdict precedence', () => {
    const onDecision = vi.fn();

    render(<ApprovalChainStrip onDecision={onDecision} data-testid="approval-root" />);

    const noteInput = screen.getByLabelText('Reviewer decision note');

    // Stage 3 (Staff Engineering) requests changes
    fireEvent.change(noteInput, { target: { value: 'Add canary rollback check' } });
    fireEvent.click(screen.getByTestId('approval-action-changes'));

    expect(screen.getByTestId('approval-node-staff-engineering')).toHaveAttribute(
      'data-status',
      'changes-requested'
    );
    expect(screen.getByTestId('approval-avatar-staff-engineering').style.color).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent('Changes Requested');
    expect(screen.getByTestId('approval-verdict-badge')).toHaveAttribute(
      'data-verdict',
      'changes-requested'
    );
    expect(screen.getByTestId('approval-verdict-badge').style.color).toBe(
      'var(--prism-warning-main)'
    );

    // Stage 4 (Release Manager) rejects -> Rejected overrides Changes Requested
    fireEvent.click(screen.getByTestId('approval-node-release-manager'));
    fireEvent.change(noteInput, { target: { value: 'Production freeze active' } });
    fireEvent.click(screen.getByTestId('approval-action-reject'));

    expect(screen.getByTestId('approval-node-release-manager')).toHaveAttribute(
      'data-status',
      'rejected'
    );
    expect(screen.getByTestId('approval-avatar-release-manager').style.color).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent('Rejected');
    expect(screen.getByTestId('approval-verdict-badge')).toHaveAttribute(
      'data-verdict',
      'rejected'
    );
    expect(screen.getByTestId('approval-verdict-badge').style.color).toBe(
      'var(--prism-error-main)'
    );

    // Reset stage 4 to pending without a note clears its comment and timestamp
    fireEvent.click(screen.getByTestId('approval-action-reset'));
    expect(screen.getByTestId('approval-node-release-manager')).toHaveAttribute(
      'data-status',
      'pending'
    );
    expect(screen.queryByTestId('approval-node-comment-release-manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-node-updated-release-manager')).not.toBeInTheDocument();
    // Overall verdict returns to Changes Requested because stage 3 still requests changes
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent('Changes Requested');

    // Re-approving stage 1 without typing a new comment preserves its existing comment
    fireEvent.click(screen.getByTestId('approval-node-security-review'));
    fireEvent.click(screen.getByTestId('approval-action-approve'));
    expect(screen.getByTestId('approval-node-comment-security-review')).toHaveTextContent(
      'SBOM & SAST checks passed'
    );

    // Resetting stage 3 with a note attaches that note while setting status to pending
    fireEvent.click(screen.getByTestId('approval-node-staff-engineering'));
    fireEvent.change(noteInput, { target: { value: 'Re-queuing after patch' } });
    fireEvent.click(screen.getByTestId('approval-action-reset'));
    expect(screen.getByTestId('approval-node-comment-staff-engineering')).toHaveTextContent(
      'Re-queuing after patch'
    );
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent(
      'Pending (2/4 Approved)'
    );
  });

  it('supports IME-safe ArrowRight, ArrowLeft, Home, and End keyboard navigation and guards IME Enter', () => {
    const onDecision = vi.fn();

    render(<ApprovalChainStrip onDecision={onDecision} />);

    const stage1 = screen.getByTestId('approval-node-security-review');
    const stage3 = screen.getByTestId('approval-node-staff-engineering');
    const stage4 = screen.getByTestId('approval-node-release-manager');
    const noteInput = screen.getByLabelText('Reviewer decision note');

    // Initially stage 3 is selected
    expect(stage3).toHaveAttribute('tabindex', '0');
    expect(stage1).toHaveAttribute('tabindex', '-1');

    // IME composing ArrowRight is ignored
    const composingArrow = createEvent.keyDown(stage3, { key: 'ArrowRight' });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(stage3, composingArrow);
    expect(stage3).toHaveAttribute('data-selected', 'true');

    // Unrelated key on card is ignored
    fireEvent.keyDown(stage3, { key: 'Escape' });
    expect(stage3).toHaveAttribute('data-selected', 'true');

    // ArrowRight moves to stage 4 and focuses it
    fireEvent.keyDown(stage3, { key: 'ArrowRight' });
    expect(stage4).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(stage4);

    // ArrowRight wraps from last stage back to stage 1
    fireEvent.keyDown(stage4, { key: 'ArrowRight' });
    expect(stage1).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(stage1);

    // ArrowLeft wraps from stage 1 back to stage 4
    fireEvent.keyDown(stage1, { key: 'ArrowLeft' });
    expect(stage4).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(stage4);

    // Home jumps to stage 1
    fireEvent.keyDown(stage4, { key: 'Home' });
    expect(stage1).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(stage1);

    // End jumps to stage 4
    fireEvent.keyDown(stage1, { key: 'End' });
    expect(stage4).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(stage4);

    // IME composing Enter inside decision note input must NOT approve
    fireEvent.click(stage3);
    const composingEnter = createEvent.keyDown(noteInput, { key: 'Enter' });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(noteInput, composingEnter);
    expect(onDecision).not.toHaveBeenCalled();

    // Non-Enter key inside decision note input must NOT approve
    fireEvent.keyDown(noteInput, { key: 'a' });
    expect(onDecision).not.toHaveBeenCalled();
  });

  it('renders clean role="status" empty state when reviewers is empty', () => {
    render(<ApprovalChainStrip reviewers={[]} data-testid="approval-root" />);

    const root = screen.getByTestId('approval-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-verdict', 'empty');

    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveAttribute('data-testid', 'approval-chain-empty');
    expect(emptyState).toHaveTextContent('No approval stages configured');

    expect(screen.queryByTestId('approval-verdict-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-progress-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-reviewer-strip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-action-bar')).not.toBeInTheDocument();
  });

  it('hides interactive action bar in readOnly mode while keeping cards inspectable', () => {
    render(<ApprovalChainStrip readOnly data-testid="approval-root" />);

    expect(screen.getByTestId('approval-root')).toHaveAttribute('data-read-only', 'true');
    expect(screen.queryByTestId('approval-action-bar')).not.toBeInTheDocument();

    const stage1 = screen.getByTestId('approval-node-security-review');
    fireEvent.click(stage1);
    expect(stage1).toHaveAttribute('data-selected', 'true');
  });

  it('disables all interactive controls and blocks keyboard mutations when disabled', () => {
    const onDecision = vi.fn();

    render(<ApprovalChainStrip disabled onDecision={onDecision} data-testid="approval-root" />);

    expect(screen.getByTestId('approval-root')).toHaveAttribute('data-disabled', 'true');

    const stage3 = screen.getByTestId('approval-node-staff-engineering');
    const noteInput = screen.getByLabelText('Reviewer decision note');
    expect(stage3).toBeDisabled();
    expect(noteInput).toBeDisabled();
    expect(screen.getByTestId('approval-action-approve')).toBeDisabled();
    expect(screen.getByTestId('approval-action-changes')).toBeDisabled();
    expect(screen.getByTestId('approval-action-reject')).toBeDisabled();
    expect(screen.getByTestId('approval-action-reset')).toBeDisabled();

    fireEvent.keyDown(stage3, { key: 'ArrowRight' });
    expect(stage3).toHaveAttribute('data-selected', 'true');

    fireEvent.keyDown(noteInput, { key: 'Enter' });
    expect(onDecision).not.toHaveBeenCalled();
  });

  it('distinguishes controlled vs uncontrolled reviewers and recovers gracefully when selected reviewer is removed', () => {
    const initial: ApprovalReviewerNode[] = [
      { id: 'rev-a', name: 'Alice Kim', role: 'Security', initials: 'AK', status: 'approved' },
      { id: 'rev-b', name: 'Ben Silva', role: 'Release', initials: 'BS', status: 'approved' },
    ];

    // Controlled without state update does not mutate DOM internally
    const controlledSpy = vi.fn();
    const { rerender } = render(
      <ApprovalChainStrip reviewers={initial} onDecision={controlledSpy} />
    );

    // When all reviewers are approved, defaults to first reviewer (rev-a)
    expect(screen.getByTestId('approval-node-rev-a')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('approval-verdict-badge')).toHaveTextContent('Chain Approved');

    fireEvent.click(screen.getByTestId('approval-action-reject'));
    expect(controlledSpy).toHaveBeenCalledTimes(1);
    // Still approved because parent has not updated controlled reviewers prop
    expect(screen.getByTestId('approval-node-rev-a')).toHaveAttribute('data-status', 'approved');

    // Remove currently selected rev-a from controlled prop -> gracefully selects remaining rev-b
    rerender(
      <ApprovalChainStrip
        reviewers={[
          { id: 'rev-b', name: 'Ben Silva', role: 'Release', initials: 'BS', status: 'pending' },
        ]}
        onDecision={controlledSpy}
      />
    );
    expect(screen.getByTestId('approval-node-rev-b')).toHaveAttribute('data-selected', 'true');

    // Stateful controlled wrapper updates cleanly when parent applies nextReviewers
    function ControlledHarness() {
      const [items, setItems] = useState<ReadonlyArray<ApprovalReviewerNode>>([
        { id: 'only', name: 'Nora Cho', role: 'Principal', initials: 'NC', status: 'pending' },
      ]);
      const handleDecision = (
        _id: string,
        _status: ApprovalChainStatus,
        _comment: string,
        next: ReadonlyArray<ApprovalReviewerNode>
      ) => {
        setItems(next);
      };
      return <ApprovalChainStrip reviewers={items} onDecision={handleDecision} />;
    }

    const { unmount } = render(<ControlledHarness />);
    fireEvent.click(screen.getByTestId('approval-node-only'));
    const approveButtons = screen.getAllByTestId('approval-action-approve');
    fireEvent.click(approveButtons[approveButtons.length - 1]!);
    expect(screen.getByTestId('approval-node-only')).toHaveAttribute('data-status', 'approved');
    unmount();
  });

  it('renders XSS payloads strictly as inert literal text and handles blank title/initials fallbacks', () => {
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const reviewersWithEdgeData: ApprovalReviewerNode[] = [
      {
        id: 'edge-1',
        name: 'Devon Mercer',
        role: 'AppSec',
        initials: '   ',
        status: 'approved',
        comment: xssPayload,
      },
      {
        id: 'edge-2',
        name: '   ',
        role: 'Fallback Stage',
        initials: '   ',
        status: 'pending',
      },
    ];

    const { container } = render(
      <ApprovalChainStrip title="   " defaultReviewers={reviewersWithEdgeData} />
    );

    expect(
      screen.getByRole('heading', { name: 'Production Release Approval Chain' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('approval-avatar-edge-1')).toHaveTextContent('DE');
    expect(screen.getByTestId('approval-avatar-edge-2')).toHaveTextContent('?');

    // Pre-populated XSS comment is rendered literally with zero script/img nodes
    expect(screen.getByTestId('approval-node-comment-edge-1')).toHaveTextContent(xssPayload);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Submitted XSS comment via decision note input is also strictly inert text
    const noteInput = screen.getByLabelText('Reviewer decision note');
    fireEvent.change(noteInput, { target: { value: xssPayload } });
    fireEvent.click(screen.getByTestId('approval-action-approve'));

    expect(screen.getByTestId('approval-node-comment-edge-2')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('approval-live-announcement')).toHaveTextContent(xssPayload);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
