import type { ComponentType } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  Mails,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useJwtPayload } from "@/hooks/useJwtPayload";
import { JwtRoleAdmin } from "@/types/auth";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  /** What you can actually do there. */
  items: string[];
  to?: string;
  linkLabel?: string;
  /** Parts of this feature are gated on the admin role. */
  adminOnly?: boolean;
  /** Not backed by the real API yet. */
  preview?: boolean;
}

// Kept as data rather than repeated JSX, so a new feature is one entry to add.
const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Signing in",
    description:
      "Sign-in is Google only, and membership of the club mailing list is what grants access — there is no password to manage.",
    items: [
      "Every page needs a session: signed out, you get the login dialog instead of the page.",
      "Your role comes from the login mailing list — its owners and managers are admins, everyone else is a member.",
      "A role change made in Google Workspace only reaches this app the next time you sign in.",
      "A session lasts a day and renews itself while you are using the app.",
    ],
  },
  {
    icon: UserRound,
    title: "Your profile",
    description:
      "Your own record: who you are in the club, and the details every roster shows.",
    items: [
      "Edit your name, nickname and department, then save.",
      "Your avatar comes from Gravatar, matched on your email address.",
      "Email and role are read-only here — the role is decided by the mailing list.",
    ],
    to: "/profile",
    linkLabel: "Open your profile",
  },
  {
    icon: Mails,
    title: "Mailing lists",
    description:
      "Every Google group in the club and who is on each one. This is live Workspace data, not a copy.",
    items: [
      "Browse all groups with their member counts.",
      "Open a group to see its members and each member's role.",
      "Admins can change a member's role to Owner, Manager or Member; everyone else sees the role as text.",
      "A role change is written straight to Google Workspace.",
    ],
    to: "/mailing-lists",
    linkLabel: "Open mailing lists",
    adminOnly: true,
  },
  {
    icon: Users,
    title: "Club roster",
    description:
      "Everyone on the club mailing list, with the lists each person reaches. Admins only.",
    items: [
      "Search by name, email or department, and filter by role.",
      "Expand anyone's row to see the mailing lists they are on.",
      "Admins can add someone to the club, remove them, and edit which lists they belong to.",
      "Adding someone as Manager or Owner of the club list makes them an administrator here too.",
      "Someone who has never signed in here shows only their address — the mailing list decides who is on the roster, not this app.",
    ],
    to: "/users",
    linkLabel: "Open the roster",
    adminOnly: true,
  },
  {
    icon: Activity,
    title: "Backend status",
    description:
      "The home page checks that the backend is answering — worth a look when another page reports an error.",
    items: [
      "A green status means the API is reachable.",
      "Mailing list pages report a problem of their own when Google Workspace is not configured.",
    ],
    to: "/",
    linkLabel: "Open home",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="bg-muted text-muted-foreground rounded-md p-2">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {feature.title}
              {feature.adminOnly && (
                <Badge variant="outline">Some actions are admin only</Badge>
              )}
              {feature.preview && <Badge variant="secondary">Preview</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">
              {feature.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
          {feature.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {feature.to && (
          <Link
            to={feature.to}
            className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {feature.linkLabel}
            <ArrowRight className="size-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function FeatureGuide() {
  const payload = useJwtPayload();
  const isAdmin = payload?.role === JwtRoleAdmin;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Help</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What SDC Manager can do today.
          {payload &&
            ` You are signed in as ${payload.email ?? "an unknown account"}, with ${
              isAdmin ? "admin" : "member"
            } access.`}
        </p>
      </div>

      {FEATURES.map((feature) => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  );
}
