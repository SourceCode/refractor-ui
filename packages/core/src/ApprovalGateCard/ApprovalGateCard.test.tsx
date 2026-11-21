import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ApprovalGateCard,
  type ApprovalDecision,
  type ApprovalParameter,
  type ApprovalRiskLevel,
} from './index';

describe('ApprovalGateCard', () => {
  it('renders prism-slab region with theme overrides, React 19 ref, risk badge, parameters, and approves clean params', () => {
    const ref = createRef<HTMLDivElement>();
    const onApprove = vi.fn<(updatedParams: Record<string, string>) => void>();

    const parameters: ApprovalParameter[] = [
      { key: 'environment', label: 'Environment', value: 'production' },
      { key: 'replicas', label: 'Replicas', value: '3', editable: true },
    ];

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ApprovalGateCard: { className: 'theme-gate', style: { maxWidth: '560px' } },
          },
        }}
      >
        <ApprovalGateCard
          ref={ref}
          title="Scale Production Deployment"
          actionName="k8s.scale_deployment"
          description="Adjusts replica count on the primary checkout service."
          riskLevel="low"
          parameters={parameters}
          onApprove={onApprove}
          className="local-gate"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="gate-root"
        />
      </PrismThemeProvider>
    );

    const region = screen.getByRole('region', { name: 'Scale Production Deployment' });
    expect(ref.current).toBe(region);
    expect(region).toHaveClass(
      'refractor-approval-gate-card',
      'prism-slab',
      'theme-gate',
      'local-gate'
    );
    expect(region).toHaveStyle({ maxWidth: '560px' });
    expect(region).toHaveAttribute('data-risk-level', 'low');
    expect(region).not.toHaveAttribute('data-edited');

    expect(screen.getByTestId('approval-action-name')).toHaveTextContent('k8s.scale_deployment');
    expect(screen.getByTestId('approval-description')).toHaveTextContent(
      'Adjusts replica count on the primary checkout service.'
    );
    expect(screen.getByTestId('approval-risk-badge')).toHaveTextContent('Low Risk');
    expect(screen.getByTestId('approval-param-value-environment')).toHaveTextContent('production');

    const replicasInput = screen.getByLabelText('Replicas');
    expect(replicasInput).toHaveValue('3');

    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(approveBtn);

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith({
      environment: 'production',
      replicas: '3',
    });

    const decisionPill = screen.getByTestId('approval-decision-pill');
    expect(decisionPill).toHaveClass('prism-emerald');
    expect(decisionPill).toHaveTextContent('Approved');
    expect(region).toHaveAttribute('data-decision', 'approved');

    // Decision buttons are hidden once resolved to prevent duplicate execution
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(replicasInput).toBeDisabled();
  });

  it('detects editable parameter changes, toggles Edit & Approve label, and submits updated values', () => {
    const onApprove = vi.fn<(updatedParams: Record<string, string>) => void>();

    render(
      <ApprovalGateCard
        title="Run Database Migration"
        actionName="db.migrate"
        parameters={[
          { key: 'target', label: 'Target DB', value: 'primary' },
          { key: 'batchSize', label: 'Batch Size', value: '1000', editable: true },
        ]}
        onApprove={onApprove}
        data-testid="edit-gate"
      />
    );

    const root = screen.getByTestId('edit-gate');
    expect(root).toHaveAttribute('data-risk-level', 'medium');
    expect(screen.getByTestId('approval-risk-badge')).toHaveTextContent('Medium Risk');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();

    const batchInput = screen.getByLabelText('Batch Size');
    fireEvent.change(batchInput, { target: { value: '250' } });

    expect(root).toHaveAttribute('data-edited', 'true');
    expect(screen.getByRole('button', { name: 'Edit & Approve' })).toBeInTheDocument();

    // Reverting back to initial value restores plain Approve label
    fireEvent.change(batchInput, { target: { value: '1000' } });
    expect(root).not.toHaveAttribute('data-edited');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();

    // Re-edit and submit
    fireEvent.change(batchInput, { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit & Approve' }));

    expect(onApprove).toHaveBeenCalledWith({
      target: 'primary',
      batchSize: '500',
    });
    expect(screen.getByTestId('approval-decision-pill')).toHaveTextContent('Approved');
  });

  it('supports rejecting with reason, rejecting with blank reason as undefined, and IME-safe Enter on reason input', () => {
    const onRejectWithReason = vi.fn<(reason?: string) => void>();
    const onRejectBlank = vi.fn<(reason?: string) => void>();

    const { unmount } = render(
      <ApprovalGateCard
        title="Delete Staging Bucket"
        actionName="storage.delete_bucket"
        riskLevel="high"
        onReject={onRejectWithReason}
      />
    );

    expect(screen.getByTestId('approval-risk-badge')).toHaveTextContent('High Risk');
    const reasonInput = screen.getByRole('textbox', { name: 'Rejection reason' });

    // IME composing Enter must NOT trigger reject
    fireEvent.change(reasonInput, { target: { value: '  Needs DBA sign-off  ' } });
    fireEvent.keyDown(reasonInput, { key: 'Enter', isComposing: true });
    expect(onRejectWithReason).not.toHaveBeenCalled();

    // Normal Enter submits trimmed reason and resolves to rejected
    fireEvent.keyDown(reasonInput, { key: 'Enter' });
    expect(onRejectWithReason).toHaveBeenCalledTimes(1);
    expect(onRejectWithReason).toHaveBeenCalledWith('Needs DBA sign-off');
    expect(screen.getByTestId('approval-decision-pill')).toHaveTextContent('Rejected');
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();

    unmount();

    // Blank / whitespace-only rejection reason passes undefined
    render(
      <ApprovalGateCard
        title="Purge CDN Cache"
        actionName="cdn.purge_all"
        riskLevel="critical"
        onReject={onRejectBlank}
      />
    );

    expect(screen.getByTestId('approval-risk-badge')).toHaveTextContent('Critical Risk');
    fireEvent.change(screen.getByRole('textbox', { name: 'Rejection reason' }), {
      target: { value: '    ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(onRejectBlank).toHaveBeenCalledTimes(1);
    expect(onRejectBlank).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId('approval-decision-pill')).toHaveTextContent('Rejected');
  });

  it('respects controlled decision prop across all risk levels and hides decision buttons', () => {
    function ControlledGateHarness() {
      const [decision, setDecision] = useState<ApprovalDecision | undefined>(undefined);
      const risk: ApprovalRiskLevel = 'high';

      return (
        <ApprovalGateCard
          title="Rotate API Key"
          actionName="secrets.rotate"
          riskLevel={risk}
          decision={decision}
          onApprove={() => setDecision('approved')}
          onReject={() => setDecision('rejected')}
        />
      );
    }

    const { rerender } = render(<ControlledGateHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByTestId('approval-decision-pill')).toHaveTextContent('Approved');

    // Direct controlled rejected state
    rerender(
      <ApprovalGateCard
        title="Rotate API Key"
        actionName="secrets.rotate"
        decision="rejected"
      />
    );
    expect(screen.getByTestId('approval-decision-pill')).toHaveTextContent('Rejected');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('disables parameter editors, rejection input, and decision buttons when disabled is true (negative test)', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ApprovalGateCard
        title="Restart Worker Pool"
        actionName="workers.restart"
        disabled
        parameters={[{ key: 'pool', label: 'Pool', value: 'default', editable: true }]}
        onApprove={onApprove}
        onReject={onReject}
        data-testid="disabled-gate"
      />
    );

    expect(screen.getByTestId('disabled-gate')).toHaveAttribute('data-disabled', 'true');
    const poolInput = screen.getByLabelText('Pool');
    const reasonInput = screen.getByRole('textbox', { name: 'Rejection reason' });
    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    const rejectBtn = screen.getByRole('button', { name: 'Reject' });

    expect(poolInput).toBeDisabled();
    expect(reasonInput).toBeDisabled();
    expect(approveBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();

    fireEvent.keyDown(reasonInput, { key: 'Enter' });
    fireEvent.click(approveBtn);
    fireEvent.click(rejectBtn);

    expect(onApprove).not.toHaveBeenCalled();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('defends against prototype-polluting parameter keys and renders XSS payloads as literal text (adversarial)', () => {
    const payload = '<script>window.__gateXss=1</script><img src=x onerror=alert(1)>';
    const onApprove = vi.fn<(updatedParams: Record<string, string>) => void>();

    render(
      <ApprovalGateCard
        title={payload}
        actionName={payload}
        description={payload}
        parameters={[
          { key: '__proto__', label: 'Proto Key', value: 'polluted', editable: true },
          { key: 'constructor', label: 'Constructor Key', value: 'bad' },
          { key: 'prototype', label: 'Prototype Key', value: 'bad' },
          { key: 'safeKey', label: 'Safe Key', value: payload, editable: true },
        ]}
        onApprove={onApprove}
      />
    );

    // Editing even an unsafe key in Map must not pollute Object.prototype
    const protoInput = screen.getByLabelText('Proto Key');
    fireEvent.change(protoInput, { target: { value: 'mutated-proto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit & Approve' }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    const approvedRecord = onApprove.mock.calls[0]?.[0];
    expect(approvedRecord).toEqual({ safeKey: payload });
    expect(Object.prototype.hasOwnProperty.call(approvedRecord, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedRecord, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(approvedRecord, 'prototype')).toBe(false);

    // Zero raw HTML/script execution
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(3);
  });
});
