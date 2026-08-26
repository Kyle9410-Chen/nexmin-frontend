import LoginDialog from "@/components/auth/LoginDialog";

/**
 * What a signed-out visitor sees on any route: the app's branding shell with
 * the login dialog on top. No nav and no account menu, since both need a
 * session, and no page content — rendering this *instead of* the routed page
 * is what keeps protected queries from firing and 401ing.
 */
export default function LoginGate() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-10 w-full border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 md:px-6">
          <span className="font-semibold whitespace-nowrap">Nexmin</span>
        </div>
      </header>

      <LoginDialog />
    </div>
  );
}
