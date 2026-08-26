import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Puts the cache back the way it was before the optimistic write. */
export type Rollback = () => void;

/**
 * Writes an optimistic value into the cache and returns the undo.
 *
 * Cancelling first is the load-bearing part: a GET already in flight would
 * otherwise resolve *after* this write and clobber it, so the new value would
 * appear and then visibly flip back.
 *
 * When the key holds nothing — the page was never opened — nothing is written
 * and the rollback is a no-op, rather than inventing an entry the UI would then
 * render as if it came from the server.
 */
export async function optimisticUpdate<T>(
  queryClient: QueryClient,
  key: QueryKey,
  update: (old: T) => T,
): Promise<Rollback> {
  await queryClient.cancelQueries({ queryKey: key });

  const previous = queryClient.getQueryData<T>(key);
  if (previous === undefined) return () => {};

  queryClient.setQueryData<T>(key, update(previous));
  return () => queryClient.setQueryData<T>(key, previous);
}
