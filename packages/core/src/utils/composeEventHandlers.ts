/**
 * Composes a caller-supplied event handler with an internal component handler.
 * If the caller calls `event.preventDefault()`, the internal handler is skipped unless
 * `checkDefaultPrevented` is set to false.
 */
export function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  externalHandler?: (event: E) => void,
  internalHandler?: (event: E) => void,
  checkDefaultPrevented = true
): (event: E) => void {
  return (event: E) => {
    externalHandler?.(event);
    if (!checkDefaultPrevented || !event.defaultPrevented) {
      internalHandler?.(event);
    }
  };
}
