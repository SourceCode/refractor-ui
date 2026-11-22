import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ApiRequestBuilder,
  type ApiKeyValueRow,
  type ApiRequestPayload,
  type ApiResponseSnapshot,
} from './ApiRequestBuilder';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: Error | string) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolveFn: (value: T) => void = () => undefined;
  let rejectFn: (reason?: Error | string) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  return { promise, resolve: resolveFn, reject: rejectFn };
}

describe('ApiRequestBuilder', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders sculpted prism-slab card, forwards React 19 ref, composes theme overrides, and handles default mock send', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ApiRequestBuilder: {
              className: 'theme-api-console',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <ApiRequestBuilder
          ref={ref}
          title="Deployments API"
          className="local-api-console"
          xstyle={{ '--prism-slab-blur-px': '26px' }}
          style={{ marginTop: '8px' }}
          data-testid="api-console"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('api-console');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-api-request-builder',
      'prism-slab',
      'theme-api-console',
      'local-api-console'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('26px');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveAttribute('data-method', 'get');
    expect(root).toHaveAttribute('data-tab', 'params');

    expect(screen.getByText('Deployments API')).toBeInTheDocument();
    expect(screen.getByTestId('api-response-empty')).toBeInTheDocument();

    const methodSelect = screen.getByLabelText('HTTP method');
    expect(methodSelect).toHaveValue('GET');
    expect(methodSelect).toHaveAttribute('data-method-tone', 'info');

    // Built-in deterministic mock responder runs immediately when onSend is omitted
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));

    const statusBadge = screen.getByTestId('api-response-status');
    expect(statusBadge).toHaveTextContent('200 OK');
    expect(statusBadge).toHaveClass('prism-emerald');
    expect(statusBadge).toHaveAttribute('data-response-tone', 'success');
    expect(screen.getByTestId('api-response-latency').textContent).toMatch(/^\d+ ms$/);
    expect(screen.getByTestId('api-response-size').textContent).toMatch(/^\d+ B$/);

    const responsePre = screen.getByTestId('api-response-body');
    expect(responsePre.textContent).toContain('"method": "GET"');
    expect(responsePre.textContent).toContain('https://api.refractor.dev/v1/deployments');
  });

  it('supports all 5 HTTP methods with semantic tones, ignores invalid verb values, and reflects POST/body in mock responder', () => {
    render(
      <ApiRequestBuilder
        defaultUrl="https://api.refractor.dev/v1/releases"
        defaultBody='{"tag":"v1.36.0"}'
      />
    );

    const methodSelect = screen.getByLabelText('HTTP method');

    fireEvent.change(methodSelect, { target: { value: 'POST' } });
    expect(methodSelect).toHaveValue('POST');
    expect(methodSelect).toHaveAttribute('data-method-tone', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-status')).toHaveTextContent('201 Created');
    expect(screen.getByTestId('api-response-body').textContent).toContain('"tag": "v1.36.0"');

    fireEvent.change(methodSelect, { target: { value: 'PUT' } });
    expect(methodSelect).toHaveValue('PUT');
    expect(methodSelect).toHaveAttribute('data-method-tone', 'warning');

    fireEvent.change(methodSelect, { target: { value: 'PATCH' } });
    expect(methodSelect).toHaveValue('PATCH');
    expect(methodSelect).toHaveAttribute('data-method-tone', 'warning');

    fireEvent.change(methodSelect, { target: { value: 'DELETE' } });
    expect(methodSelect).toHaveValue('DELETE');
    expect(methodSelect).toHaveAttribute('data-method-tone', 'error');

    // Invalid option value is safely ignored
    fireEvent.change(methodSelect, { target: { value: 'TRACE' } });
    expect(methodSelect).toHaveValue('DELETE');

    // Non-JSON body in mock responder falls back to raw string in mock payload
    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));
    fireEvent.change(screen.getByLabelText('Request JSON body'), {
      target: { value: 'plain text payload' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-body').textContent).toContain('plain text payload');
  });

  it('manages params and headers rows (add, edit, toggle, remove, ID collision guard) and encodes resolved URL safely', () => {
    const defaultParams: ReadonlyArray<ApiKeyValueRow> = [
      { id: 'param-1', key: 'env', value: 'prod', enabled: true },
    ];
    const defaultHeaders: ReadonlyArray<ApiKeyValueRow> = [
      { id: 'header-1', key: 'Accept', value: 'application/json', enabled: true },
    ];

    render(
      <ApiRequestBuilder
        defaultUrl="https://api.example.com/v1/search"
        defaultParams={defaultParams}
        defaultHeaders={defaultHeaders}
      />
    );

    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
      'https://api.example.com/v1/search?env=prod'
    );

    // Add second param (skips colliding id 'param-1')
    fireEvent.click(screen.getByRole('button', { name: 'Add Param' }));
    fireEvent.change(screen.getByLabelText('Param key 2'), { target: { value: 'q filter' } });
    fireEvent.change(screen.getByLabelText('Param value 2'), {
      target: { value: 'glass & optics=100%' },
    });

    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
      'https://api.example.com/v1/search?env=prod&q%20filter=glass%20%26%20optics%3D100%25'
    );

    // Disable first param -> excluded from resolved URL
    fireEvent.click(screen.getByLabelText('Enable param 1'));
    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
      'https://api.example.com/v1/search?q%20filter=glass%20%26%20optics%3D100%25'
    );

    // Existing query string separator handling: '?existing=1' uses '&', trailing '?' uses ''
    const urlInput = screen.getByLabelText('Request endpoint URL');
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/v1/search?existing=1' } });
    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
      'https://api.example.com/v1/search?existing=1&q%20filter=glass%20%26%20optics%3D100%25'
    );

    fireEvent.change(urlInput, { target: { value: '/api/v1/search?' } });
    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
      '/api/v1/search?q%20filter=glass%20%26%20optics%3D100%25'
    );

    // Send with active param to verify mock responder includes enabled params
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-body').textContent).toContain('"key": "q filter"');
    expect(screen.getByTestId('api-response-body').textContent).not.toContain('"key": "env"');

    // Remove both params -> empty state message shown
    fireEvent.click(screen.getByLabelText('Remove param 2'));
    fireEvent.click(screen.getByLabelText('Remove param 1'));
    expect(screen.getByText(/No query parameters configured/i)).toBeInTheDocument();
    expect(screen.getByTestId('api-resolved-url')).toHaveTextContent('/api/v1/search?');

    // Switch to Headers tab and exercise add, edit, toggle, remove
    fireEvent.click(screen.getByRole('tab', { name: 'Headers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Header' }));
    fireEvent.change(screen.getByLabelText('Header key 2'), { target: { value: 'X-Trace-Id' } });
    fireEvent.change(screen.getByLabelText('Header value 2'), { target: { value: 'trace-99' } });
    fireEvent.click(screen.getByLabelText('Enable header 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));

    const bodyText = screen.getByTestId('api-response-body').textContent ?? '';
    expect(bodyText).toContain('X-Trace-Id');
    expect(bodyText).not.toContain('"Accept"');

    fireEvent.click(screen.getByLabelText('Remove header 2'));
    fireEvent.click(screen.getByLabelText('Remove header 1'));
    expect(screen.getByText(/No request headers configured/i)).toBeInTheDocument();
  });

  it('validates and formats JSON body safely without eval and handles empty/invalid JSON states', () => {
    render(<ApiRequestBuilder />);

    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));

    const statusPill = screen.getByTestId('api-json-status');
    const formatButton = screen.getByRole('button', { name: 'Format JSON' });
    const textarea = screen.getByLabelText('Request JSON body');

    expect(statusPill).toHaveTextContent('Empty');
    expect(statusPill).toHaveAttribute('data-json-status', 'empty');
    expect(formatButton).toBeDisabled();

    // Valid minified JSON
    fireEvent.change(textarea, { target: { value: '{"service":"optics","replicas":3}' } });
    expect(statusPill).toHaveTextContent('Valid JSON');
    expect(statusPill).toHaveClass('prism-emerald');
    expect(formatButton).not.toBeDisabled();

    fireEvent.click(formatButton);
    expect(textarea).toHaveValue('{\n  "service": "optics",\n  "replicas": 3\n}');
    expect(screen.getByRole('status')).toHaveTextContent('Request JSON body formatted.');

    // Invalid JSON
    fireEvent.change(textarea, { target: { value: '{invalid json' } });
    expect(statusPill).toHaveTextContent('Invalid JSON');
    expect(statusPill).toHaveAttribute('data-json-status', 'invalid');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('api-json-error')).toBeInTheDocument();

    fireEvent.click(formatButton);
    expect(textarea).toHaveValue('{invalid json');
    expect(screen.getByRole('status')).toHaveTextContent('Cannot format invalid JSON body.');
  });

  it('supports IME-safe roving keyboard navigation across Params, Headers, and Body tabs', () => {
    render(<ApiRequestBuilder aria-label="Custom API builder" />);

    const paramsTab = screen.getByRole('tab', { name: 'Params' });
    const headersTab = screen.getByRole('tab', { name: 'Headers' });
    const bodyTab = screen.getByRole('tab', { name: 'Body' });

    expect(paramsTab).toHaveAttribute('aria-selected', 'true');
    expect(paramsTab).toHaveAttribute('tabindex', '0');
    expect(headersTab).toHaveAttribute('tabindex', '-1');

    // IME composing is ignored
    fireEvent.keyDown(paramsTab, { key: 'ArrowRight', isComposing: true });
    expect(paramsTab).toHaveAttribute('aria-selected', 'true');

    // ArrowRight cycles through tabs and moves focus
    fireEvent.keyDown(paramsTab, { key: 'ArrowRight' });
    expect(headersTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(headersTab);

    fireEvent.keyDown(headersTab, { key: 'ArrowRight' });
    expect(bodyTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(bodyTab);

    fireEvent.keyDown(bodyTab, { key: 'ArrowRight' });
    expect(paramsTab).toHaveAttribute('aria-selected', 'true');

    // ArrowLeft wraps backward
    fireEvent.keyDown(paramsTab, { key: 'ArrowLeft' });
    expect(bodyTab).toHaveAttribute('aria-selected', 'true');

    // Home and End jump to first and last tabs
    fireEvent.keyDown(bodyTab, { key: 'Home' });
    expect(paramsTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(paramsTab, { key: 'End' });
    expect(bodyTab).toHaveAttribute('aria-selected', 'true');

    // Unrelated key leaves active tab unchanged
    fireEvent.keyDown(bodyTab, { key: 'Escape' });
    expect(bodyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('blocks dangerous URL schemes and empty URLs via sanitizeUrl, displays inline error banner, and never invokes onSend', () => {
    const onSend = vi.fn<
      (payload: ApiRequestPayload) => ApiResponseSnapshot | Promise<ApiResponseSnapshot>
    >();

    render(<ApiRequestBuilder onSend={onSend} />);

    const urlInput = screen.getByLabelText('Request endpoint URL');
    const sendButton = screen.getByRole('button', { name: 'Send Request' });

    const unsafeUrls = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'mailto:ops@example.com',
      '#anchor-only',
      '   ',
    ];

    for (const badUrl of unsafeUrls) {
      fireEvent.change(urlInput, { target: { value: badUrl } });
      expect(urlInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('api-resolved-url')).toHaveTextContent(
        'Enter a valid http(s) or relative endpoint URL'
      );

      fireEvent.click(sendButton);
      fireEvent.keyDown(urlInput, { key: 'Enter', ctrlKey: true });
      expect(onSend).not.toHaveBeenCalled();
    }

    // Restoring a safe URL clears the error banner and allows sending
    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/v2/health' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(urlInput).toHaveAttribute('aria-invalid', 'false');

    onSend.mockReturnValueOnce({
      status: 200,
      statusText: 'OK',
      latencyMs: 18,
      sizeBytes: 12,
      headers: [],
      body: '{"ok":true}',
    });
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0].url).toBe('https://api.example.com/v2/health');
  });

  it('handles sync status tones (2xx, 3xx, 4xx, 5xx), sync throws, async Sending state, rejected promises, shortcuts, and unmount safety', async () => {
    const rootKeyDown = vi.fn();
    const deferred = createDeferred<ApiResponseSnapshot>();

    const onSend = vi
      .fn<(payload: ApiRequestPayload) => ApiResponseSnapshot | Promise<ApiResponseSnapshot>>()
      .mockReturnValueOnce({
        status: 302,
        statusText: 'Found',
        latencyMs: 12,
        sizeBytes: 0,
        headers: [],
        body: '',
      })
      .mockReturnValueOnce({
        status: 404,
        statusText: 'Not Found',
        latencyMs: 31,
        sizeBytes: 24,
        headers: [{ key: 'content-type', value: 'application/json' }],
        body: '{"error":"not_found"}',
      })
      .mockImplementationOnce(() => {
        throw new Error('Sync transport crash');
      })
      .mockImplementationOnce(() => {
        throw 'Raw string sync failure';
      })
      .mockReturnValueOnce(deferred.promise);

    const { unmount } = render(
      <ApiRequestBuilder
        defaultUrl="https://api.example.com/v1/orders"
        onSend={onSend}
        onKeyDown={rootKeyDown}
      />
    );

    const urlInput = screen.getByLabelText('Request endpoint URL');

    // 3xx info status + empty body disables Copy Body
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-status')).toHaveTextContent('302 Found');
    expect(screen.getByTestId('api-response-status')).toHaveAttribute('data-response-tone', 'info');
    expect(screen.getByRole('button', { name: 'Copy Body' })).toBeDisabled();

    // 4xx amber warning status via Cmd+Enter shortcut (and consumer onKeyDown fires)
    fireEvent.keyDown(urlInput, { key: 'Enter', metaKey: true });
    expect(rootKeyDown).toHaveBeenCalled();
    expect(screen.getByTestId('api-response-status')).toHaveTextContent('404 Not Found');
    expect(screen.getByTestId('api-response-status')).toHaveAttribute(
      'data-response-tone',
      'warning'
    );

    // IME composing ignores Ctrl+Enter
    fireEvent.keyDown(urlInput, { key: 'Enter', ctrlKey: true, isComposing: true });
    expect(onSend).toHaveBeenCalledTimes(2);

    // Sync Error throw recovers into 500 error snapshot
    fireEvent.keyDown(urlInput, { key: 'Enter', ctrlKey: true });
    expect(screen.getByTestId('api-response-status')).toHaveTextContent('500 Internal Error');
    expect(screen.getByTestId('api-response-status')).toHaveAttribute('data-response-tone', 'error');
    expect(screen.getByTestId('api-response-body').textContent).toContain('Sync transport crash');

    // Sync non-Error throw recovers cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-body').textContent).toContain(
      'Raw string sync failure'
    );

    // Async Promise shows Sending... and prevents duplicate concurrent sends
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    const sendingButton = screen.getByRole('button', { name: 'Sending...' });
    expect(sendingButton).toBeDisabled();
    expect(sendingButton).toHaveClass('disabled:cursor-not-allowed');

    fireEvent.keyDown(urlInput, { key: 'Enter', ctrlKey: true });
    expect(onSend).toHaveBeenCalledTimes(5);

    await act(async () => {
      deferred.resolve({
        status: 200,
        statusText: 'OK',
        latencyMs: 84,
        sizeBytes: 32,
        headers: [{ key: 'x-request-id', value: 'req-42' }],
        body: '{"completed":true}',
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Send Request' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('api-response-status')).toHaveTextContent('200 OK');
    expect(screen.getByTestId('api-response-body').textContent).toContain('"completed": true');

    // Async rejection with Error object recovers into 500 snapshot
    onSend.mockReturnValueOnce(Promise.reject(new Error('Upstream gateway timeout')));
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await waitFor(() => {
      expect(screen.getByTestId('api-response-status')).toHaveTextContent('500 Internal Error');
    });
    expect(screen.getByTestId('api-response-body').textContent).toContain(
      'Upstream gateway timeout'
    );

    // Async rejection with empty non-Error falls back to default message
    onSend.mockReturnValueOnce(Promise.reject(''));
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await waitFor(() => {
      expect(screen.getByTestId('api-response-body').textContent).toContain(
        'Request execution failed.'
      );
    });

    // Unmount while async promise is still pending (resolve path)
    const pendingResolve = createDeferred<ApiResponseSnapshot>();
    onSend.mockReturnValueOnce(pendingResolve.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    unmount();
    await act(async () => {
      pendingResolve.resolve({
        status: 200,
        statusText: 'OK',
        latencyMs: 10,
        sizeBytes: 2,
        headers: [],
        body: '{}',
      });
      await Promise.resolve();
    });
  });

  it('safely ignores rejected async onSend after unmount', async () => {
    const pendingReject = createDeferred<ApiResponseSnapshot>();
    const onSend = vi.fn(() => pendingReject.promise);
    const { unmount } = render(<ApiRequestBuilder onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    unmount();

    await act(async () => {
      pendingReject.reject(new Error('Aborted after unmount'));
      await Promise.resolve();
    });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('toggles response headers (including duplicate keys and empty headers) and handles clipboard copy with resilient fallbacks', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onSend = vi
      .fn<() => ApiResponseSnapshot>()
      .mockReturnValueOnce({
        status: 200,
        statusText: 'OK',
        latencyMs: 42,
        sizeBytes: 18,
        headers: [
          { key: 'set-cookie', value: 'sid=abc' },
          { key: 'set-cookie', value: 'theme=obsidian' },
        ],
        body: '{"hello":"world"}',
      })
      .mockReturnValueOnce({
        status: 200,
        statusText: 'OK',
        latencyMs: 14,
        sizeBytes: 11,
        headers: [],
        body: 'plain-reply',
      });

    render(<ApiRequestBuilder onSend={onSend} />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));

    // Toggle headers open & closed
    const toggleHeadersBtn = screen.getByRole('button', { name: 'Toggle Headers' });
    expect(toggleHeadersBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('api-response-headers')).toBeNull();

    fireEvent.click(toggleHeadersBtn);
    expect(toggleHeadersBtn).toHaveAttribute('aria-expanded', 'true');
    const headersPanel = screen.getByTestId('api-response-headers');
    expect(headersPanel).toHaveTextContent('set-cookie:');
    expect(headersPanel).toHaveTextContent('sid=abc');
    expect(headersPanel).toHaveTextContent('theme=obsidian');

    // Copy response body with polite live announcement & 1600ms reset
    fireEvent.click(screen.getByRole('button', { name: 'Copy Body' }));
    expect(writeText).toHaveBeenCalledWith('{\n  "hello": "world"\n}');
    const copiedBtn = screen.getByRole('button', { name: 'Copied' });
    expect(copiedBtn).toHaveClass('prism-emerald');
    expect(screen.getByRole('status')).toHaveTextContent('Response body copied to clipboard.');

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByRole('button', { name: 'Copy Body' })).toBeInTheDocument();

    // Missing clipboard, rejecting clipboard, and throwing clipboard getter all remain resilient
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Body' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(rejectingWrite).toHaveBeenCalledTimes(1);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Blocked');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));

    // Second send with empty headers renders empty headers fallback & non-JSON body verbatim
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    expect(screen.getByTestId('api-response-headers')).toHaveTextContent(
      'No response headers returned.'
    );
    expect(screen.getByTestId('api-response-body')).toHaveTextContent('plain-reply');
  });

  it('renders adversarial XSS payloads strictly as literal text without injecting DOM nodes', () => {
    const xssPayload = '<script>window.__apiXss=1</script><img src=x onerror=alert(1)>';
    const onSend = vi.fn<() => ApiResponseSnapshot>(() => ({
      status: 200,
      statusText: 'OK',
      latencyMs: 15,
      sizeBytes: xssPayload.length,
      headers: [{ key: 'x-xss', value: xssPayload }],
      body: xssPayload,
    }));

    render(
      <ApiRequestBuilder
        title={xssPayload}
        defaultParams={[{ id: 'p1', key: 'q', value: xssPayload, enabled: true }]}
        defaultBody={xssPayload}
        onSend={onSend}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Headers' }));

    expect(screen.getByTestId('api-response-body')).toHaveTextContent(xssPayload);
    expect(screen.getByTestId('api-response-headers')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('enforces disabled state across all controls and blocks keyboard submission', () => {
    const onSend = vi.fn();
    render(
      <ApiRequestBuilder
        disabled
        defaultParams={[{ id: 'p1', key: 'limit', value: '10', enabled: true }]}
        defaultBody='{"a":1}'
        onSend={onSend}
        data-testid="disabled-builder"
      />
    );

    expect(screen.getByTestId('disabled-builder')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByLabelText('HTTP method')).toBeDisabled();
    expect(screen.getByLabelText('Request endpoint URL')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send Request' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Param' })).toBeDisabled();
    expect(screen.getByLabelText('Enable param 1')).toBeDisabled();
    expect(screen.getByLabelText('Param key 1')).toBeDisabled();
    expect(screen.getByLabelText('Param value 1')).toBeDisabled();
    expect(screen.getByLabelText('Remove param 1')).toBeDisabled();

    fireEvent.keyDown(screen.getByTestId('disabled-builder'), { key: 'Enter', ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Body' }));
    expect(screen.getByLabelText('Request JSON body')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Format JSON' })).toBeDisabled();
  });
});
