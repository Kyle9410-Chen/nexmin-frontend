import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CookiesProvider } from "react-cookie";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/AuthProvider";

/**
 * A fresh QueryClient per test keeps cached data from leaking between them.
 * Retries are off so a mocked failure surfaces immediately instead of after
 * three backoffs.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  /**
   * Wrap in <AuthProvider>. Opt-in, because it starts the token refresh timer;
   * tests that do not exercise auth should not have to reason about it.
   */
  withAuth?: boolean;
  /** Passed through to AuthProvider, for asserting on login error copy. */
  loginError?: string | null;
  /** Starting history for the MemoryRouter, for testing routes with params. */
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    withAuth,
    loginError = null,
    initialEntries,
    ...options
  }: ProviderOptions = {},
) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    const inner = withAuth ? (
      <AuthProvider loginError={loginError}>{children}</AuthProvider>
    ) : (
      children
    );

    return (
      <MemoryRouter initialEntries={initialEntries}>
        <QueryClientProvider client={queryClient}>
          <CookiesProvider>
            {/* Mounted so tests can assert on mutation toasts. */}
            <Toaster />
            {inner}
          </CookiesProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

export * from "@testing-library/react";
