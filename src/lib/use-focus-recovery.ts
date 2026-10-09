import { useEffect, useRef, type FocusEvent, type RefObject } from "react";

type FocusRecoveryProps<T extends HTMLElement> = {
  ref: RefObject<T | null>;
  onFocus: (event: FocusEvent<T>) => void;
  onBlur: (event: FocusEvent<T>) => void;
};

/**
 * For a container whose controls are swapped by an action (start → stop):
 * the button that had focus leaves the DOM and focus falls to <body>, so a
 * keyboard or screen reader user loses their place (WCAG 2.4.3). Once the
 * controls are enabled again, focus goes to the first one. A tap that never
 * focused a button (iOS) moves nothing.
 *
 * `isReady`: the controls are enabled. `swapKey`: changes with the swap.
 */
export function useFocusRecovery<T extends HTMLElement>(
  isReady: boolean,
  swapKey: unknown,
): FocusRecoveryProps<T> {
  const ref = useRef<T>(null);
  // Browsers disagree on firing blur for a removed element, so the test is
  // whether the last focused control is still in the document.
  const lastFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    const lastFocused = lastFocusedRef.current;
    if (!isReady || !lastFocused || lastFocused.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    lastFocusedRef.current = null;
    ref.current?.querySelector<HTMLElement>("button:enabled, a[href]")?.focus();
  }, [isReady, swapKey]);

  return {
    ref,
    onFocus: (event) => {
      lastFocusedRef.current = event.target;
    },
    onBlur: (event) => {
      // Focus moved elsewhere on purpose: nothing to recover.
      const next = event.relatedTarget;
      if (next && !event.currentTarget.contains(next)) {
        lastFocusedRef.current = null;
      }
    },
  };
}
