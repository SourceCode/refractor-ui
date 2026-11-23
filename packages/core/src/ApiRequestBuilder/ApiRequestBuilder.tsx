'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  Braces,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Loader2,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRequestTab = 'params' | 'headers' | 'body';

export interface ApiKeyValueRow {
  /** Stable unique identifier for the parameter or header row. */
  id: string;
  /** Parameter or HTTP header key name. */
  key: string;
  /** Parameter or HTTP header value. */
  value: string;
  /** Whether this row is active and included in the request. */
  enabled: boolean;
}

export interface ApiRequestPayload {
  /** Selected HTTP verb. */
  method: ApiHttpMethod;
  /** Sanitized request endpoint URL. */
  url: string;
  /** Current query parameter rows. */
  params: ReadonlyArray<ApiKeyValueRow>;
  /** Current request header rows. */
  headers: ReadonlyArray<ApiKeyValueRow>;
  /** Raw request body string. */
  body: string;
}

export interface ApiResponseSnapshot {
  /** HTTP status code (e.g. 200, 201, 404, 500). */
  status: number;
  /** HTTP status reason phrase (e.g. 'OK', 'Created', 'Not Found'). */
  statusText: string;
  /** Measured round-trip latency in milliseconds. */
  latencyMs: number;
  /** Response payload size in bytes. */
  sizeBytes: number;
  /** Response HTTP headers returned by the endpoint or mock responder. */
  headers: ReadonlyArray<{ key: string; value: string }>;
  /** Raw or JSON-encoded response body text. */
  body: string;
}

type ApiRequestBuilderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ApiRequestBuilderProps extends ApiRequestBuilderBaseProps {
  /** Console heading displayed in the optical glass header (defaults to 'API Request Builder'). */
  title?: string;
  /** Initial HTTP method (defaults to 'GET'). */
  defaultMethod?: ApiHttpMethod;
  /** Initial endpoint URL (defaults to 'https://api.refractor.dev/v1/deployments'). */
  defaultUrl?: string;
  /** Initial query parameter rows. */
  defaultParams?: ReadonlyArray<ApiKeyValueRow>;
  /** Initial HTTP request header rows. */
  defaultHeaders?: ReadonlyArray<ApiKeyValueRow>;
  /** Initial request body content. */
  defaultBody?: string;
  /** Synchronous or Promise-returning request executor; falls back to a deterministic optical mock responder when omitted. */
  onSend?: (payload: ApiRequestPayload) => ApiResponseSnapshot | Promise<ApiResponseSnapshot>;
  /** Disables all request editing and execution controls. */
  disabled?: boolean;
}

type SemanticTone = 'info' | 'success' | 'warning' | 'error';

type JsonValidationStatus = 'empty' | 'valid' | 'invalid';

interface JsonValidationResult {
  status: JsonValidationStatus;
  formatted?: string;
  errorMessage?: string;
}

type EndpointUrlValidation =
  | { valid: true; sanitizedUrl: string }
  | { valid: false; error: string };

interface KeyedResponseHeader {
  reactKey: string;
  key: string;
  value: string;
}

type ApiJsonPrimitive = string | number | boolean | null;

interface ApiJsonObject {
  [key: string]: ApiJsonValue;
}

type ApiJsonValue = ApiJsonPrimitive | ReadonlyArray<ApiJsonValue> | ApiJsonObject;

const HTTP_METHODS: ReadonlyArray<ApiHttpMethod> = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const REQUEST_TABS: ReadonlyArray<{ id: ApiRequestTab; label: string }> = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
];

const DEFAULT_URL = 'https://api.refractor.dev/v1/deployments';
const COPY_FEEDBACK_DURATION_MS = 1600;

function parseApiHttpMethod(raw: string): ApiHttpMethod | null {
  for (const method of HTTP_METHODS) {
    if (method === raw) {
      return method;
    }
  }
  return null;
}

function getMethodTone(method: ApiHttpMethod): SemanticTone {
  switch (method) {
    case 'GET':
      return 'info';
    case 'POST':
      return 'success';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'error';
  }
}

function getMethodSelectStyle(tone: SemanticTone): OpticalStyleTokens {
  switch (tone) {
    case 'info':
      return {
        color: 'var(--prism-info-main)',
        borderColor: 'var(--prism-info-main)',
        backgroundColor: 'color-mix(in srgb, var(--prism-info-main) 10%, transparent)',
      };
    case 'success':
      return {
        color: 'var(--prism-success-dark)',
        borderColor: 'var(--prism-success-main)',
        backgroundColor: 'color-mix(in srgb, var(--prism-success-main) 12%, transparent)',
      };
    case 'warning':
      return {
        color: 'var(--prism-warning-main)',
        borderColor: 'var(--prism-warning-main)',
        backgroundColor: 'color-mix(in srgb, var(--prism-warning-main) 12%, transparent)',
      };
    case 'error':
      return {
        color: 'var(--prism-error-main)',
        borderColor: 'var(--prism-error-main)',
        backgroundColor: 'color-mix(in srgb, var(--prism-error-main) 10%, transparent)',
      };
  }
}

function getResponseStatusTone(status: number): SemanticTone {
  if (status >= 200 && status < 300) {
    return 'success';
  }
  if (status >= 300 && status < 400) {
    return 'info';
  }
  if (status >= 400 && status < 500) {
    return 'warning';
  }
  return 'error';
}

function getResponseBadgeStyle(tone: SemanticTone): OpticalStyleTokens | undefined {
  switch (tone) {
    case 'success':
      return undefined;
    case 'info':
      return {
        color: 'var(--prism-info-contrast)',
        backgroundColor: 'var(--prism-info-main)',
      };
    case 'warning':
      return {
        color: 'var(--prism-warning-contrast)',
        backgroundColor: 'var(--prism-warning-main)',
      };
    case 'error':
      return {
        color: 'var(--prism-error-contrast)',
        backgroundColor: 'var(--prism-error-main)',
      };
  }
}

function validateEndpointUrl(rawUrl: string): EndpointUrlValidation {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Endpoint URL is required. Enter an https://, http://, or relative endpoint path.',
    };
  }

  const sanitized = sanitizeUrl(trimmed, false);
  const lower = sanitized.toLowerCase();
  if (!sanitized || lower.startsWith('mailto:') || sanitized.startsWith('#')) {
    return {
      valid: false,
      error: 'Blocked unsafe or unsupported URL scheme. Use https://, http://, or a relative path.',
    };
  }

  return {
    valid: true,
    sanitizedUrl: sanitized,
  };
}

function buildResolvedUrl(baseUrl: string, params: ReadonlyArray<ApiKeyValueRow>): string {
  const activeParams = params.filter((row) => row.enabled && row.key.trim().length > 0);
  if (!baseUrl || activeParams.length === 0) {
    return baseUrl;
  }
  const query = activeParams
    .map((row) => `${encodeURIComponent(row.key.trim())}=${encodeURIComponent(row.value)}`)
    .join('&');
  const separator = baseUrl.includes('?')
    ? baseUrl.endsWith('?') || baseUrl.endsWith('&')
      ? ''
      : '&'
    : '?';
  return `${baseUrl}${separator}${query}`;
}

function validateAndFormatJson(raw: string): JsonValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: 'empty' };
  }
  try {
    const formatted = JSON.stringify(JSON.parse(trimmed), null, 2);
    return { status: 'valid', formatted };
  } catch (err) {
    return {
      status: 'invalid',
      errorMessage: String(err),
    };
  }
}

function formatResponseBody(rawBody: string): string {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return rawBody;
  }
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return rawBody;
  }
}

function getByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function isPromiseLike(
  value: ApiResponseSnapshot | Promise<ApiResponseSnapshot>
): value is Promise<ApiResponseSnapshot> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function buildKeyedResponseHeaders(
  headers: ReadonlyArray<{ key: string; value: string }>
): KeyedResponseHeader[] {
  const counts = new Map<string, number>();
  return headers.map((header) => {
    const nextCount = (counts.get(header.key) ?? 0) + 1;
    counts.set(header.key, nextCount);
    return {
      reactKey: `${header.key}#${nextCount}`,
      key: header.key,
      value: header.value,
    };
  });
}

function buildMockResponse(payload: ApiRequestPayload): ApiResponseSnapshot {
  const resolvedUrl = buildResolvedUrl(payload.url, payload.params);
  const activeParams = payload.params
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .map((row) => ({ key: row.key.trim(), value: row.value }));
  const activeHeaders = payload.headers
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .map((row) => ({ key: row.key.trim(), value: row.value }));

  let parsedBody: ApiJsonValue = null;
  const trimmedBody = payload.body.trim();
  if (trimmedBody) {
    try {
      const parsed: ApiJsonValue = JSON.parse(trimmedBody);
      parsedBody = parsed;
    } catch {
      parsedBody = payload.body;
    }
  }

  const status = payload.method === 'POST' ? 201 : 200;
  const statusText = payload.method === 'POST' ? 'Created' : 'OK';
  const mockPayload: ApiJsonObject = {
    ok: true,
    source: 'refractor-optical-mock',
    request: {
      method: payload.method,
      url: payload.url,
      resolvedUrl,
      params: activeParams,
      headers: activeHeaders,
      body: parsedBody,
    },
  };

  const body = JSON.stringify(mockPayload, null, 2);
  const latencyMs = 24 + ((resolvedUrl.length + payload.body.length) % 60);

  return {
    status,
    statusText,
    latencyMs,
    sizeBytes: getByteLength(body),
    headers: [
      { key: 'content-type', value: 'application/json; charset=utf-8' },
      { key: 'x-refractor-mock', value: 'true' },
      { key: 'x-request-method', value: payload.method },
      { key: 'cache-control', value: 'no-store' },
    ],
    body,
  };
}

function createErrorSnapshot(errorMessage: string, latencyMs: number): ApiResponseSnapshot {
  const message = errorMessage.trim() || 'Request execution failed.';
  const body = JSON.stringify(
    {
      error: true,
      status: 500,
      message,
    },
    null,
    2
  );
  return {
    status: 500,
    statusText: 'Internal Error',
    latencyMs: Math.max(0, Math.round(latencyMs)),
    sizeBytes: getByteLength(body),
    headers: [{ key: 'content-type', value: 'application/json; charset=utf-8' }],
    body,
  };
}

function cloneRows(rows?: ReadonlyArray<ApiKeyValueRow>): ApiKeyValueRow[] {
  return rows ? rows.map((row) => ({ ...row })) : [];
}

function ApiRequestBuilderInner({
  title = 'API Request Builder',
  defaultMethod = 'GET',
  defaultUrl = DEFAULT_URL,
  defaultParams,
  defaultHeaders,
  defaultBody = '',
  onSend,
  disabled = false,
  className,
  style,
  xstyle,
  onKeyDown,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ApiRequestBuilderProps) {
  const override = useComponentOverride('ApiRequestBuilder');
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const errorBannerId = `${baseId}-url-error`;
  const responseHeadersId = `${baseId}-response-headers`;

  const [method, setMethod] = useState<ApiHttpMethod>(defaultMethod);
  const [url, setUrl] = useState<string>(defaultUrl);
  const [params, setParams] = useState<ApiKeyValueRow[]>(() => cloneRows(defaultParams));
  const [headers, setHeaders] = useState<ApiKeyValueRow[]>(() => cloneRows(defaultHeaders));
  const [body, setBody] = useState<string>(defaultBody);
  const [activeTab, setActiveTab] = useState<ApiRequestTab>('params');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [response, setResponse] = useState<ApiResponseSnapshot | null>(null);
  const [showResponseHeaders, setShowResponseHeaders] = useState<boolean>(false);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const mountedRef = useRef<boolean>(true);
  const inFlightRef = useRef<boolean>(false);
  const idCounterRef = useRef<number>(1);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Map<ApiRequestTab, HTMLButtonElement | null>>(new Map());

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const urlValidation = useMemo(() => validateEndpointUrl(url), [url]);
  const resolvedUrl = useMemo(
    () => (urlValidation.valid ? buildResolvedUrl(urlValidation.sanitizedUrl, params) : ''),
    [params, urlValidation]
  );
  const jsonValidation = useMemo(() => validateAndFormatJson(body), [body]);
  const formattedResponseBody = useMemo(
    () => (response ? formatResponseBody(response.body) : ''),
    [response]
  );
  const keyedResponseHeaders = useMemo(
    () => (response ? buildKeyedResponseHeaders(response.headers) : []),
    [response]
  );

  const enabledParamsCount = useMemo(
    () => params.filter((row) => row.enabled && row.key.trim().length > 0).length,
    [params]
  );
  const enabledHeadersCount = useMemo(
    () => headers.filter((row) => row.enabled && row.key.trim().length > 0).length,
    [headers]
  );

  const allocateRowId = useCallback(
    (prefix: 'param' | 'header', existingRows: ReadonlyArray<ApiKeyValueRow>): string => {
      const existingIds = new Set(existingRows.map((row) => row.id));
      let candidate = `${prefix}-${idCounterRef.current}`;
      while (existingIds.has(candidate)) {
        idCounterRef.current += 1;
        candidate = `${prefix}-${idCounterRef.current}`;
      }
      idCounterRef.current += 1;
      return candidate;
    },
    []
  );

  const handleMethodChange = useCallback((rawValue: string) => {
    const parsed = parseApiHttpMethod(rawValue);
    if (parsed) {
      setMethod(parsed);
    }
  }, []);

  const handleAddRow = useCallback(
    (section: 'params' | 'headers') => {
      if (section === 'params') {
        setParams((prev) => [
          ...prev,
          { id: allocateRowId('param', prev), key: '', value: '', enabled: true },
        ]);
      } else {
        setHeaders((prev) => [
          ...prev,
          { id: allocateRowId('header', prev), key: '', value: '', enabled: true },
        ]);
      }
    },
    [allocateRowId]
  );

  const handleUpdateRow = useCallback(
    (
      section: 'params' | 'headers',
      rowId: string,
      patch: Partial<Pick<ApiKeyValueRow, 'key' | 'value' | 'enabled'>>
    ) => {
      const updater = (prev: ApiKeyValueRow[]) =>
        prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
      if (section === 'params') {
        setParams(updater);
      } else {
        setHeaders(updater);
      }
    },
    []
  );

  const handleRemoveRow = useCallback((section: 'params' | 'headers', rowId: string) => {
    const remover = (prev: ApiKeyValueRow[]) => prev.filter((row) => row.id !== rowId);
    if (section === 'params') {
      setParams(remover);
    } else {
      setHeaders(remover);
    }
  }, []);

  const handleFormatJson = useCallback(() => {
    const result = validateAndFormatJson(body);
    if (result.status === 'valid' && result.formatted !== undefined) {
      setBody(result.formatted);
      setAnnouncement('Request JSON body formatted.');
    } else {
      setAnnouncement('Cannot format invalid JSON body.');
    }
  }, [body]);

  const handleSend = useCallback(() => {
    if (disabled || isSending || inFlightRef.current) {
      return;
    }

    if (!urlValidation.valid) {
      setAnnouncement(urlValidation.error);
      return;
    }

    clearCopyTimer();
    setCopiedBody(false);

    const payload: ApiRequestPayload = {
      method,
      url: urlValidation.sanitizedUrl,
      params: params.map((row) => ({ ...row })),
      headers: headers.map((row) => ({ ...row })),
      body,
    };

    const startedAt = Date.now();
    try {
      const result = onSend ? onSend(payload) : buildMockResponse(payload);
      if (isPromiseLike(result)) {
        inFlightRef.current = true;
        setIsSending(true);
        setAnnouncement(`Sending ${method} request.`);

        void (async () => {
          try {
            const snapshot = await result;
            inFlightRef.current = false;
            if (!mountedRef.current) {
              return;
            }
            setIsSending(false);
            setResponse(snapshot);
            setAnnouncement(`Response received: ${snapshot.status} ${snapshot.statusText}.`);
          } catch (err) {
            inFlightRef.current = false;
            if (!mountedRef.current) {
              return;
            }
            const message = err instanceof Error ? err.message : String(err);
            const errorSnapshot = createErrorSnapshot(message, Date.now() - startedAt);
            setIsSending(false);
            setResponse(errorSnapshot);
            setAnnouncement(`Request failed with status 500: ${message}`);
          }
        })();
      } else {
        setResponse(result);
        setAnnouncement(`Response received: ${result.status} ${result.statusText}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorSnapshot = createErrorSnapshot(message, Date.now() - startedAt);
      setResponse(errorSnapshot);
      setAnnouncement(`Request failed with status 500: ${message}`);
    }
  }, [
    body,
    clearCopyTimer,
    disabled,
    headers,
    isSending,
    method,
    onSend,
    params,
    urlValidation,
  ]);

  const handleContainerKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % REQUEST_TABS.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + REQUEST_TABS.length) % REQUEST_TABS.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = REQUEST_TABS.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextTab = REQUEST_TABS[nextIndex];
        if (nextTab) {
          setActiveTab(nextTab.id);
          tabRefs.current.get(nextTab.id)?.focus();
        }
      }
    },
    []
  );

  const handleCopyBody = useCallback(() => {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        void Promise.resolve(clipboard.writeText(formattedResponseBody)).catch(() => undefined);
      }
    } catch {
      // Clipboard API unavailable or restricted; continue with polite confirmation state.
    }

    setCopiedBody(true);
    setAnnouncement('Response body copied to clipboard.');
    clearCopyTimer();
    copyTimerRef.current = setTimeout(() => {
      setCopiedBody(false);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [clearCopyTimer, formattedResponseBody]);

  const methodTone = getMethodTone(method);
  const responseTone = response ? getResponseStatusTone(response.status) : null;
  const controlsDisabled = disabled || isSending;

  const merged = mergeProps({
    themeTarget: themeProps('api-request-builder', {
      method: method.toLowerCase(),
      tab: activeTab,
      sending: isSending,
      disabled,
      hasResponse: response !== null,
      invalidUrl: !urlValidation.valid,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full flex flex-col gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('api-request-builder', 'header');
  const requestBarClass = stableClassName('api-request-builder', 'request-bar');
  const errorBannerClass = stableClassName('api-request-builder', 'error-banner');
  const resolvedUrlClass = stableClassName('api-request-builder', 'resolved-url');
  const tabsClass = stableClassName('api-request-builder', 'tabs');
  const inspectorClass = stableClassName('api-request-builder', 'inspector');
  const responseClass = stableClassName('api-request-builder', 'response');

  const renderKeyValueEditor = (section: 'params' | 'headers') => {
    const isParams = section === 'params';
    const rows = isParams ? params : headers;
    const itemNoun = isParams ? 'param' : 'header';
    const capitalizedNoun = isParams ? 'Param' : 'Header';

    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className="text-xs font-semibold"
            style={STYLE_TEXT_SECONDARY}
          >
            {isParams ? 'Query Parameters' : 'Request Headers'}
          </span>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => handleAddRow(section)}
            className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>{isParams ? 'Add Param' : 'Add Header'}</span>
          </button>
        </div>

        {rows.length === 0 ? (
          <div
            className="prism-well rounded-2xl px-3.5 py-3 text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            {isParams
              ? 'No query parameters configured. Click Add Param to append encoded query values.'
              : 'No request headers configured. Click Add Header to attach HTTP headers.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <div
                key={row.id}
                data-row-id={row.id}
                className="prism-crystal rounded-2xl p-2.5 flex flex-wrap items-center gap-2"
              >
                <input
                  type="checkbox"
                  aria-label={`Enable ${itemNoun} ${index + 1}`}
                  checked={row.enabled}
                  disabled={controlsDisabled}
                  onChange={(event) =>
                    handleUpdateRow(section, row.id, { enabled: event.target.checked })
                  }
                  className="prism-focus-ring h-4 w-4 rounded cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed accent-[var(--prism-primary-main)]"
                />

                <input
                  type="text"
                  aria-label={`${capitalizedNoun} key ${index + 1}`}
                  value={row.key}
                  disabled={controlsDisabled}
                  placeholder={isParams ? 'Key (e.g. limit)' : 'Header (e.g. Authorization)'}
                  onChange={(event) =>
                    handleUpdateRow(section, row.id, { key: event.target.value })
                  }
                  className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-mono flex-1 min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={STYLE_TEXT_PRIMARY}
                />

                <input
                  type="text"
                  aria-label={`${capitalizedNoun} value ${index + 1}`}
                  value={row.value}
                  disabled={controlsDisabled}
                  placeholder={isParams ? 'Value (e.g. 25)' : 'Value'}
                  onChange={(event) =>
                    handleUpdateRow(section, row.id, { value: event.target.value })
                  }
                  className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-mono flex-1 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={STYLE_TEXT_PRIMARY}
                />

                <button
                  type="button"
                  aria-label={`Remove ${itemNoun} ${index + 1}`}
                  disabled={controlsDisabled}
                  onClick={() => handleRemoveRow(section, row.id)}
                  className="prism-crystal prism-focus-ring h-9 px-2.5 rounded-xl inline-flex items-center gap-1 text-xs font-medium shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={STYLE_ERROR_MAIN}
                >
                  <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={!ariaLabel && title ? titleId : undefined}
      onKeyDown={composeEventHandlers(onKeyDown, handleContainerKeyDown)}
      {...rest}
      {...merged}
    >
      {/* Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Globe aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h2
            id={titleId}
            className="m-0 text-sm sm:text-base font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h2>
        </div>

        <span
          className="text-[11px] font-mono tabular-nums px-2.5 py-1 rounded-full prism-well"
          style={STYLE_TEXT_SECONDARY}
        >
          Ctrl/Cmd + Enter to send
        </span>
      </div>

      {/* Top Request Bar */}
      <div className={cx(requestBarClass, 'flex flex-wrap items-center gap-2.5 min-w-0')}>
        <select
          aria-label="HTTP method"
          value={method}
          disabled={controlsDisabled}
          data-method-tone={methodTone}
          onChange={(event) => handleMethodChange(event.target.value)}
          className="prism-well prism-focus-ring h-10 px-3 rounded-xl text-xs sm:text-sm font-mono font-bold border shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={getMethodSelectStyle(methodTone)}
        >
          {HTTP_METHODS.map((verb) => (
            <option key={verb} value={verb}>
              {verb}
            </option>
          ))}
        </select>

        <input
          type="url"
          aria-label="Request endpoint URL"
          aria-invalid={!urlValidation.valid}
          aria-describedby={!urlValidation.valid ? errorBannerId : undefined}
          value={url}
          disabled={controlsDisabled}
          placeholder="https://api.example.com/v1/resource"
          onChange={(event) => setUrl(event.target.value)}
          className="prism-well prism-focus-ring h-10 px-3.5 rounded-xl text-xs sm:text-sm font-mono flex-1 min-w-0 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        />

        <button
          type="button"
          disabled={controlsDisabled}
          onClick={handleSend}
          className="prism-btn-primary prism-focus-ring h-10 px-5 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <>
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {/* Inline Optical URL Security / Validation Banner */}
      {!urlValidation.valid ? (
        <div
          id={errorBannerId}
          role="alert"
          data-testid="api-url-error"
          className={cx(
            errorBannerClass,
            'prism-crystal rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 border text-xs font-medium'
          )}
          style={{
            color: 'var(--prism-error-main)',
            borderColor: 'var(--prism-error-main)',
            backgroundColor: 'color-mix(in srgb, var(--prism-error-main) 10%, transparent)',
          }}
        >
          <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span className="min-w-0 break-words">{urlValidation.error}</span>
        </div>
      ) : null}

      {/* Computed Resolved URL Preview */}
      <div
        className={cx(
          resolvedUrlClass,
          'prism-well rounded-2xl px-3.5 py-2 flex flex-wrap items-center gap-2 min-w-0'
        )}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          Resolved URL
        </span>
        <code
          data-testid="api-resolved-url"
          className="font-mono text-xs min-w-0 flex-1 overflow-x-auto whitespace-nowrap"
          style={{
            color: urlValidation.valid ? 'var(--prism-text-primary)' : 'var(--prism-text-disabled)',
          }}
        >
          {urlValidation.valid ? resolvedUrl : 'Enter a valid http(s) or relative endpoint URL'}
        </code>
      </div>

      {/* Tabbed Request Inspector */}
      <div className="flex flex-col gap-3">
        <div
          role="tablist"
          aria-label="Request inspector sections"
          className={cx(
            tabsClass,
            'prism-well p-1 rounded-full inline-flex flex-wrap items-center gap-1 self-start max-w-full'
          )}
        >
          {REQUEST_TABS.map((tab, index) => {
            const isSelected = activeTab === tab.id;
            const badgeCount =
              tab.id === 'params'
                ? enabledParamsCount
                : tab.id === 'headers'
                  ? enabledHeadersCount
                  : null;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current.set(tab.id, el);
                }}
                id={`${baseId}-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cx(
                  'prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                  isSelected ? 'prism-crystal font-semibold' : 'font-medium'
                )}
                style={{
                  color: isSelected ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
                }}
              >
                <span>{tab.label}</span>
                {badgeCount !== null && badgeCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="prism-well px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums leading-none"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          id={`${baseId}-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeTab}`}
          className={cx(inspectorClass, 'flex flex-col gap-3 min-w-0')}
        >
          {activeTab === 'params' ? renderKeyValueEditor('params') : null}
          {activeTab === 'headers' ? renderKeyValueEditor('headers') : null}
          {activeTab === 'body' ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    JSON Payload
                  </span>
                  <span
                    data-testid="api-json-status"
                    data-json-status={jsonValidation.status}
                    className={cx(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                      jsonValidation.status === 'valid' ? 'prism-emerald' : 'prism-well'
                    )}
                    style={
                      jsonValidation.status === 'invalid'
                        ? { color: 'var(--prism-error-main)' }
                        : jsonValidation.status === 'empty'
                          ? { color: 'var(--prism-text-secondary)' }
                          : undefined
                    }
                  >
                    {jsonValidation.status === 'valid'
                      ? 'Valid JSON'
                      : jsonValidation.status === 'invalid'
                        ? 'Invalid JSON'
                        : 'Empty'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={controlsDisabled || jsonValidation.status === 'empty'}
                  onClick={handleFormatJson}
                  className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <Braces aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Format JSON</span>
                </button>
              </div>

              <textarea
                aria-label="Request JSON body"
                aria-invalid={jsonValidation.status === 'invalid'}
                rows={6}
                spellCheck={false}
                value={body}
                disabled={controlsDisabled}
                placeholder={'{\n  "service": "refractor-edge",\n  "replicas": 3\n}'}
                onChange={(event) => setBody(event.target.value)}
                className="prism-well prism-focus-ring w-full rounded-2xl p-3 font-mono text-xs sm:text-sm leading-relaxed resize-y min-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />

              {jsonValidation.status === 'invalid' && jsonValidation.errorMessage ? (
                <p
                  data-testid="api-json-error"
                  className="m-0 text-xs font-mono break-words"
                  style={STYLE_ERROR_MAIN}
                >
                  {jsonValidation.errorMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Live Response Viewer */}
      <div
        role="region"
        aria-label="Response viewer"
        className={cx(
          responseClass,
          'pt-3.5 border-t border-[var(--prism-divider)] flex flex-col gap-3 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Response
            </span>

            {response && responseTone ? (
              <>
                <span
                  data-testid="api-response-status"
                  data-response-status={String(response.status)}
                  data-response-tone={responseTone}
                  className={cx(
                    'px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tabular-nums',
                    responseTone === 'success' ? 'prism-emerald' : ''
                  )}
                  style={getResponseBadgeStyle(responseTone)}
                >
                  {`${response.status} ${response.statusText}`}
                </span>

                <span
                  data-testid="api-response-latency"
                  className="prism-well px-2.5 py-0.5 rounded-full text-xs font-mono tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`${Math.max(0, Math.round(response.latencyMs))} ms`}
                </span>

                <span
                  data-testid="api-response-size"
                  className="prism-well px-2.5 py-0.5 rounded-full text-xs font-mono tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`${Math.max(0, Math.round(response.sizeBytes))} B`}
                </span>
              </>
            ) : null}
          </div>

          {response ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-expanded={showResponseHeaders}
                aria-controls={responseHeadersId}
                onClick={() => setShowResponseHeaders((prev) => !prev)}
                className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                style={STYLE_TEXT_PRIMARY}
              >
                {showResponseHeaders ? (
                  <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Toggle Headers</span>
                <span
                  aria-hidden="true"
                  className="font-mono text-[11px] tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`(${response.headers.length})`}
                </span>
              </button>

              <button
                type="button"
                disabled={formattedResponseBody.length === 0}
                data-copied={copiedBody ? 'true' : undefined}
                onClick={handleCopyBody}
                className={cx(
                  'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  copiedBody ? 'prism-emerald font-semibold' : 'prism-crystal'
                )}
                style={copiedBody ? undefined : { color: 'var(--prism-text-primary)' }}
              >
                {copiedBody ? (
                  <>
                    <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy Body</span>
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {response ? (
          <>
            {showResponseHeaders ? (
              <div
                id={responseHeadersId}
                data-testid="api-response-headers"
                className="prism-well rounded-2xl p-3 flex flex-col gap-1.5"
              >
                {keyedResponseHeaders.length === 0 ? (
                  <span
                    className="text-xs"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    No response headers returned.
                  </span>
                ) : (
                  keyedResponseHeaders.map((header) => (
                    <div
                      key={header.reactKey}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-mono min-w-0"
                    >
                      <span
                        className="font-semibold shrink-0"
                        style={STYLE_PRIMARY_MAIN}
                      >
                        {`${header.key}:`}
                      </span>
                      <span
                        className="min-w-0 break-all"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {header.value}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <pre
              data-testid="api-response-body"
              className="prism-well rounded-2xl p-3.5 m-0 min-w-0 w-full overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed whitespace-pre"
              style={STYLE_TEXT_PRIMARY}
            >
              {formattedResponseBody}
            </pre>
          </>
        ) : (
          <div
            data-testid="api-response-empty"
            className="prism-well rounded-2xl px-3.5 py-4 text-xs"
            style={STYLE_TEXT_SECONDARY}
          >
            Send a request to inspect status, latency, headers, and formatted payload.
          </div>
        )}
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}

export const ApiRequestBuilder = memo(ApiRequestBuilderInner);
ApiRequestBuilder.displayName = 'ApiRequestBuilder';
