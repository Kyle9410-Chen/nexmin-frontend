import { NavLink, Outlet, useNavigate } from "react-router";
import { CircleUserRound, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth/authContext";
import { useJwtPayload } from "@/hooks/useJwtPayload";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { JwtRoleAdmin } from "@/types/auth";

// GET /api/users is admin-only, so a member is not offered a page that can only
// 403 for them.
const NAV_ITEMS = [
  { to: "/users", label: "Users", adminOnly: true },
  // No `end` on the NavLink, so this stays active on a group's member page.
  { to: "/mailing-lists", label: "Mailing Lists" },
  { to: "/my-groups", label: "My Groups" },
  { to: "/help", label: "Help" },
];

function navLinkClass(isActive: boolean): string {
  return cn(
    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export default function AppLayout() {
  const { logout } = useAuth();
  const payload = useJwtPayload();
  const isAdmin = payload?.role === JwtRoleAdmin;
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background sticky top-0 z-10 w-full border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
          <NavLink to="/" className="font-semibold whitespace-nowrap">
            SDC Manager
          </NavLink>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(
              (item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => navLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <CircleUserRound className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">
                    {payload?.email ?? "Unknown user"}
                  </span>
                  {payload?.role && (
                    <span className="text-muted-foreground block text-xs">
                      {payload.role}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserRound className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/", { replace: true });
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
