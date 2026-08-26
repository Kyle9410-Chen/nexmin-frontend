import { useCallback, useState } from "react";

/**
 * A set of keys toggled by the UI, and nothing more — what membership *means*
 * is the caller's choice, which is what lets one hook serve both defaults:
 * section headings track which are **collapsed** (empty set = all expanded, so
 * a newly returned section is visible rather than hidden), while roster rows
 * track which are **expanded** (empty set = all collapsed).
 *
 * In-memory per mount: a reload starts over.
 */
export function useKeySet() {
  const [keys, setKeys] = useState<Set<string>>(new Set());

  const has = useCallback((key: string) => keys.has(key), [keys]);

  const toggle = useCallback((key: string) => {
    // A new Set every time, or React would not see the change.
    setKeys((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  return { has, toggle };
}
