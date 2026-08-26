import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { CookiesProvider } from "react-cookie";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthProvider";
import { consumeAuthFragment } from "@/lib/auth/authFragment";
import { Toaster } from "@/components/ui/sonner";
import "./index.css";
import App from "./App";

const queryClient = new QueryClient();

// Runs before React mounts, so the first render already sees the session the
// OAuth callback left in the URL fragment. See lib/auth/authFragment.ts.
const { error: loginError } = consumeAuthFragment();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <CookiesProvider>
          <AuthProvider loginError={loginError}>
            <Toaster />
            <App />
          </AuthProvider>
        </CookiesProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
