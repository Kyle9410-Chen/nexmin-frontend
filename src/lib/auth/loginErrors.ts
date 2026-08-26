/**
 * The OAuth callback reports failures as `#error=<reason>` (see
 * `redirectError` in the backend's `internal/auth/handler.go`). It deliberately
 * never says whether an address exists in the login group, so the copy here
 * must not imply otherwise.
 */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  not_a_member:
    "This Google account is not on the club mailing list, so it cannot sign in. Ask a club admin to add you, then try again.",
  email_not_verified:
    "Google has not verified this account's email address, so it cannot be matched against the mailing list.",
  oauth_denied: "Sign-in was cancelled at the Google consent screen.",
  invalid_state:
    "That sign-in link expired or was already used. Start over from this page.",
  exchange_failed: "Google rejected the sign-in. Please try again.",
  userinfo_failed:
    "Signed in with Google, but reading the account profile failed. Please try again.",
  membership_check_failed:
    "The club mailing list could not be reached, so membership could not be confirmed. Please try again shortly.",
  login_not_configured:
    "Sign-in is not configured on the server: it is missing its Google OAuth credentials or its login group.",
  server_error: "Something went wrong on the server. Please try again.",
};

const FALLBACK = "Sign-in failed. Please try again.";

export function getLoginErrorMessage(reason: string | null): string | null {
  if (!reason) return null;
  return LOGIN_ERROR_MESSAGES[reason] ?? FALLBACK;
}
