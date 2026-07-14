"use client";

import * as React from "react";

/**
 * Reactively reports whether a CSS media query currently matches.
 * Keeps viewport detection in one place so components do not manage resize listeners.
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", onStoreChange);

    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }, [query]);

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
