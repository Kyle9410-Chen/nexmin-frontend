import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { optimisticUpdate } from "@/lib/optimistic";

const KEY = ["thing"];

describe("optimisticUpdate", () => {
  it("writes the new value and can put the old one back", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(KEY, { count: 1 });

    const rollback = await optimisticUpdate<{ count: number }>(
      queryClient,
      KEY,
      (old) => ({ count: old.count + 1 }),
    );

    expect(queryClient.getQueryData(KEY)).toEqual({ count: 2 });

    rollback();
    expect(queryClient.getQueryData(KEY)).toEqual({ count: 1 });
  });

  it("writes nothing when the key holds nothing", async () => {
    const queryClient = new QueryClient();

    const rollback = await optimisticUpdate<{ count: number }>(
      queryClient,
      KEY,
      () => ({ count: 99 }),
    );

    // Inventing an entry would have the UI render a guess as if the server had
    // sent it.
    expect(queryClient.getQueryData(KEY)).toBeUndefined();
    rollback();
    expect(queryClient.getQueryData(KEY)).toBeUndefined();
  });
});
