import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useAuth } from "@/lib/auth/authContext";
import { getLoginErrorMessage } from "@/lib/auth/loginErrors";

/**
 * The sign-in surface. Permanently open and deliberately impossible to close:
 * there is nothing behind it to reach, since every route is gated.
 */
export default function LoginDialog() {
  const { login, loginError } = useAuth();
  const errorMessage = getLoginErrorMessage(loginError);

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        // All three are needed. Radix closes on any one of them, and closing
        // would leave an empty page with no way back.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Sign in to Nexmin</DialogTitle>
          <DialogDescription>
            Sign in with the Google account that is on the club mailing list.
            Membership of that list is what grants access — nothing else needs
            to be set up.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage}
          </p>
        )}

        <Button variant="outline" className="w-full" onClick={() => login()}>
          <GoogleIcon className="size-4" />
          Sign in with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}
