const NOOP_EVENT_HANDLER = (): void => {};

/**
 * Composes a caller-supplied event handler with an internal component handler.
 * Fast-paths directly to the defined handler when only one is supplied to avoid
 * allocating a new wrapper closure on every render.
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  externalHandler?: (event: E) => void,
  internalHandler?: (event: E) => void,
  checkDefaultPrevented = true
): (event: E) => void {
  if (!externalHandler) {
    return internalHandler ?? NOOP_EVENT_HANDLER;
  }
  if (!internalHandler) {
    return externalHandler;
  }
  return (event: E) => {
    externalHandler(event);
    if (!checkDefaultPrevented || !event.defaultPrevented) {
      internalHandler(event);
    }
  };
}
