# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend for SDC club management. It talks to **`../sdc-manager-backend`** (Go, `nycu-sdc/club-manager`) — read that repo's `CLAUDE.md` before changing anything in `src/lib/request/`, since the error shape and auth model come from there.

**The contract lives in `../sdc-manager-backend/docs/api`** — TypeSpec sources under `service/*.tsp`, compiled to OpenAPI. That repo's rule is that every endpoint change updates them in the same commit, so read `user.tsp` / `group.tsp` before writing a request function rather than reverse-engineering the Go handlers. `make preview` there serves Swagger UI on :8090. The spec is not infallible: `GroupResponse.aliases` is declared `string[]`, but a Go nil slice still marshals to `null`, which is why this repo types it `string[] | null` — see the alias trap below.

The backend exposes a health probe, the Google OAuth session routes, and the mailing list routes. This app is wired to those:

| Endpoint                                              | Auth          | Wired up in                                                                                                                      |
| ----------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/google/login`                          | open          | `AuthProvider.login` — a full-page redirect, not a request function                                                              |
| `POST /api/auth/refresh`                              | open          | `lib/request/refreshAuthToken.ts` → `AuthProvider`'s refresh timer                                                               |
| `POST /api/auth/logout`                               | JWT           | `lib/request/logoutRequest.ts` → `AuthProvider.logout`                                                                           |
| `GET /api/groups`                                     | JWT           | `lib/request/getMailingListGroups.ts` → `hooks/useMailingListGroups.ts` → `components/mailingList/GroupTable.tsx`                |
| `GET /api/groups/{group_key}/members`                 | JWT           | `lib/request/getMailingListMembers.ts` → `hooks/useMailingListMembers.ts` → `components/mailingList/MemberTable.tsx`             |
| `PATCH /api/groups/{group_key}/members/{member_key}`  | JWT + `admin` | `lib/request/updateMailingListMemberRole.ts` → `hooks/useMailingListMemberMutations.ts` → `components/mailingList/MemberRow.tsx` |
| `GET /api/users/me`                                   | JWT           | `lib/request/getMyProfile.ts` → `hooks/useMyProfile.ts` → `components/profile/ProfileCard.tsx`                                   |
| `PATCH /api/users/me`                                 | JWT           | `lib/request/updateMyProfile.ts` → `hooks/useProfileMutations.ts` → `components/profile/ProfileForm.tsx`                         |
| `GET /api/users/me/groups`                            | JWT           | `lib/request/getMyGroups.ts` → `hooks/useMyGroups.ts` → `components/membership/MyGroupsTable.tsx`                                |
| `GET /api/users`                                      | JWT + `admin` | `lib/request/getRoster.ts` → `hooks/useRoster.ts` → `components/roster/RosterTable.tsx`                                          |
| `POST /api/users`                                     | JWT + `admin` | `lib/request/addRosterMember.ts` → `hooks/useRosterMutations.ts` → `components/roster/AddMemberDialog.tsx`                       |
| `DELETE /api/users/{email}`                           | JWT + `admin` | `lib/request/removeRosterMember.ts` → `hooks/useRosterMutations.ts` → `components/roster/RemoveMemberDialog.tsx`                 |
| `POST /api/groups/{group_key}/members`                | JWT + `admin` | `lib/request/addGroupMember.ts` → `useUpdateMemberGroups` → `components/roster/EditGroupsDialog.tsx`                             |
| `DELETE /api/groups/{group_key}/members/{member_key}` | JWT + `admin` | `lib/request/removeGroupMember.ts` → `useUpdateMemberGroups` → `components/roster/EditGroupsDialog.tsx`                          |

The backend calls this domain `googlegroup` and serves it under `/api/groups`, while this app calls it "mailing lists" throughout (route, hook, `queryKey`, types). That split is deliberate — the club-facing name is the mailing list — so **only the URL follows the backend**; do not rename the frontend domain to match. All three admin-only member routes are wired: `PATCH` behind the Role dropdown on `/mailing-lists/:groupKey` (plain text for a non-admin, who would only ever get a 403), and `POST`/`DELETE` behind the roster's group-editing dialog rather than the members table itself.

Both responses are envelopes, `{ items, totalItems }`, **not** `PaginatedResponse<T>` — the Directory API is not paged through here, so there is no page, size or `hasNextPage`.

`/mailing-lists` lists the groups and drills into `/mailing-lists/:groupKey` for one group's members; the `group_key` in the URL is the group's **email**, encoded. Two traps in this domain:

- **`GET /api/groups` accepts no query params at all** — no page, size, search or sort — and returns every group at once from a 5-minute in-process cache. So `GroupTable` is the documented **exception** to the server-driven-tables rule below: no `PaginationControl`, no filter menus. Any search here would have to be client-side, which is why there is none.
- **`aliases` arrives as `null`, not `[]`,** when a group has none — a Go nil slice marshals that way. It is typed `string[] | null` and must be read through `?? []`.
- **Every group carries `section` and `displayName`.** `section` is the club's classification from the org chart, with a synthetic `unsectioned` (`未分類`) for a list the chart does not mention, and the response arrives **already sorted** in organizational order — All Members, Governance, Departments, …, unclassified last. `GroupTable` buckets by `section.key` in encounter order and never re-sorts, or it would fight the chart. `displayName` is the club's own name (`Core System`); `name` stays whatever the Google console says (`NYCU SDC Core System`) and is not displayed. Unlike `/users/me/groups`, this route deliberately includes sections the chart marks `hidden` (System), because it is the whole account and a missing row would read as a group having disappeared.
- **Section headings collapse**, on both `/mailing-lists` and `/my-groups`, through the shared `components/customUI/SectionHeader.tsx` and `hooks/useCollapsedSections.ts`. The hook tracks _collapsed_ keys, so an empty set means everything is expanded and a newly returned section is visible rather than hidden; state is per mount and a reload expands everything again.

**`/my-groups` is the caller's own view of the same domain**, from `GET /api/users/me/groups`: their lists expanded through nested groups and grouped by the club's org chart (`internal/orgchart/chart.yaml`, so section and group names arrive in **English** — `All Members`, `Governance`, `Core System`; only the officer titles and the `unsectioned` fallback `未分類` are Chinese). `direct` separates "you are on this list" from "you reach it through a nested group" and `via` names the chain, which matters because the org chart is a **DAG**: `design` sits under both `branding` and `general`. `item.key` is a bare group name, so every row links straight into `/mailing-lists/:groupKey`. `leadership` means the caller holds an officer position but **not which one** — all six office holders are MANAGER of every department group, so Google cannot tell them apart. Nothing here degrades: without Google credentials it is a 503, not an empty list. `MyGroupsTable` is rendered on both `/my-groups` and `/profile`; it is the same component and `queryKey`, so the second placement costs no request.

Group members carry `profile: { name, nickname, department } | null` — `null` meaning that address has never signed in here, which is deliberately distinct from a member who signed in and left the fields blank. `MemberRow` shows the name with the address beneath when there is one, and the bare address when there is not.

**Roles render as `components/customUI/RoleBadge.tsx`, not as bare words.** MANAGER and MEMBER are near-identical at a glance — same initial, same length — so each role also carries an icon (crown / shield / person) and a colour, and `RoleIcon` puts the same icons in the picker so the choice and the result match. The badge keeps the word as text, which is what the tests match on. `MailingListMember.role` is a bare `string` on purpose, so an unrecognised value falls through to the raw value with no icon and no colour rather than borrowing the styling of a role it is not.

`findGroupByKey` (exported from `hooks/useMailingListGroups.ts`) resolves a URL key back to its group, matching email, immutable ID and aliases case-insensitively, since the backend accepts any of them and compares with `strings.EqualFold`. The members page uses it only to title itself, and falls back to the raw key so a direct URL hit still renders.

Everything beyond those is scaffolding waiting for a backend.

**`/users` is the club roster**, not a user table — `GET /api/users` returns every direct member of the login mailing list, with the lists each of them reaches and, for those who have signed in, their profile. So `profile: null` is a real club member who has not used this service yet, and the count is the club rather than the set of local accounts. The route is **admin-only**, which is why the Users nav entry is hidden for a member; visiting `/users` directly still renders and shows the 403 `detail`. It takes no query params, so search and the role filter are **client-side** — the same documented exception `GroupTable` is — and there is no pagination.

**Adding and removing club members writes to the login mailing list**, which is the whole operation — there is no local account to create, and a profile row appears by itself when someone first signs in (so a new entry comes back with `profile: null`). Three things follow, all documented backend behaviour rather than choices this app could make differently:

- The `role` on `POST /api/users` is the role on the **login group**, and `MANAGER`/`OWNER` there map onto this service's `admin` — that field is how administrative access is handed out, which is why `AddMemberDialog` warns before saving when either is picked.
- **Nothing stops an admin removing themselves.** They then cannot sign back in, and only a Google Workspace admin can restore them, so `RemoveMemberDialog` says so on your own row instead of blocking the action.
- Removing an address that is **not** on the list answers **400**, not 404, with Google's own wording `Missing required field: memberKey`. `useRemoveRosterMember` translates exactly that string and passes everything else through `getErrMessage`.

Both mutations invalidate `["mailingList"]` as well as `["roster"]`: the login group's own member list just changed too.

The roster reports **bare keys only** — no names, no sections — so an expanded row resolves them against the group list (`sectionsForKeys` in `lib/groupSections.ts`, filtering rather than mapping so the backend's organizational order carries over), and `RosterTable` loads that list once for every row. A key that does not resolve still renders, under "Other", and when the group list is unavailable the badges fall back to raw keys rather than an empty row.

**`RosterEntry.groups` is direct membership only** — it does _not_ expand nesting, unlike `/users/me/groups`. It used to, and the difference is worth knowing because it explains code that is still here: back then, unchecking a list someone merely _reached_ through a nested group produced a `DELETE` Google answered 404, so `useUpdateMemberGroups` fans out with `Promise.allSettled`, applies everything it can, and reports failures by group key rather than stopping at the first. That structure still earns its keep — a stale roster or a rate limit fails one change out of several — but the nested-membership explanation for it is obsolete, and the dialog no longer warns about it.

**`EditGroupsDialog` edits roles as well as membership.** The roster carries keys but no roles, so the dialog reads each list the person is already on through `useMailingListMembersFor` — the same `["mailingList", key, "members"]` entries the members page uses, and on the backend the same member cache `RosterGroupKeys` builds the roster from, so a warm server makes no Google call. One Save carries three diffs: `add` (with the role to join as), `remove`, and `update` (role changes). **A role whose current value could not be read is never sent as a change** — the control falls back to Member, but that is a display default, and treating it as an intent would silently demote people. Role changes are applied optimistically into the group's member list too, since the dialog has just read that row.

The contract-first `/users` panel and `src/mocks/` are **gone** — the backend shipped the real thing, and `types/user.ts` (`studentId`, `ADMIN`/`ORGANIZER`/`MEMBER`, `PaginatedResponse<User>`, the `POST`/`PUT`/`DELETE` proposal) described an API that will not exist. `src/mocks/server.ts` stays with an empty handler list because the whole test suite starts MSW through it; every test registers its own routes with `server.use(...)`. `components/customUI/PaginationControl.tsx` is currently unused but kept — nothing paginates yet, and the convention below still stands for endpoints that will.

**There is no landing page.** `/` is a `<Navigate to="/my-groups" replace />` inside the gated tree — the club-facing default view is your own mailing lists, and the header wordmark points there too. It used to be `pages/Home.tsx`, a backend-status readout that existed to prove the data path worked; that is proven, so the page and the `GET /api/healthz` chain behind it (`lib/request/getHealthz.ts`, `hooks/useHealthz.ts`) are gone. `api.test.ts` still uses the string `/api/healthz` as an arbitrary path, which is all it ever needed. `replace` matters: without it the back button lands on `/` and bounces forward again. The redirect never runs signed out, because `ProtectedRoute` renders `LoginGate` in place of `<Outlet />` and the `<Navigate>` element is never mounted.

## Commands

```bash
pnpm install
pnpm dev              # vite --mode devlocal → reads .env.devlocal
pnpm build            # tsc -b && vite build — typecheck is part of the build
pnpm lint             # eslint .
pnpm format           # prettier --write .
pnpm format:check     # prettier --check . — what CI runs
pnpm test             # vitest run
pnpm test:watch
pnpm test:coverage

pnpm vitest run src/lib/request/api.test.ts      # single file
pnpm vitest run -t "attaches the bearer token"   # single test by name
```

**pnpm, not npm** — matches `clustron-frontend` and `NYCU-SDC.github.io`. `pnpm-workspace.yaml` carries `allowBuilds: esbuild: true`; without it pnpm 10 skips esbuild's postinstall.

To run against a real backend, start Postgres and the Go service per `../sdc-manager-backend/CLAUDE.md`, then `cp example.env .env.devlocal`.

## Env files

`VITE_BACKEND_BASE_URL` is the important one. `src/lib/request/api.ts` **throws at import time** if it is missing, so every entry path needs it — including tests.

**The dev server port is load-bearing for OAuth.** Vite serves on 5173 (`vite.config.ts`), but the backend's committed `config.example.yaml` ships `http://localhost:3000`. The callback redirects to exactly `frontend_url`, so a local `../sdc-manager-backend/config.yaml` needs **both** `frontend_url: "http://localhost:5173"` and `allow_origins: ["http://localhost:5173"]`, or sign-in bounces to a dead port and every request is blocked by CORS. Sign-in also needs `google_oauth_client_id`/`_secret` and a non-empty `google_group.login_group` — an empty login group **refuses everyone** rather than falling open — and the Cloud Console redirect URI must be exactly `{base_url}/api/auth/google/callback`.

- `example.env` — committed template.
- `.env.devlocal` — gitignored; what `pnpm dev` actually reads (the `--mode devlocal` flag).
- `.env.test` — **committed on purpose.** Vitest runs in mode `test`, so it would not pick up `.env.devlocal`, and the import-time throw would fail the whole suite in CI. Value is a dummy host, never reached: `api.test.ts` stubs `fetch`, and the component tests answer through MSW. The handlers build their route patterns from this value, so changing it does not break them.

## CI

Three GitHub Actions workflows under `.github/workflows/`, mirroring `../sdc-manager-backend`'s: `pull-request.yml` (on PRs), `main.yml` (push to `main`) and `stage.yml` (push of a `v*` tag). All three run the same four jobs — `Lint` (`pnpm lint`), `Format` (`pnpm format:check`), `Test` (`pnpm test:coverage`), then `Build` (`pnpm build`, so `tsc -b` is the typecheck gate). The backend chains its jobs strictly; here `Lint` and `Format` run in parallel because both are cheap, and `Test` takes `needs: [Lint, Format]`. `**.md` is in `paths-ignore` except on `stage.yml`, where a tag push has no useful path filter.

`main.yml` and `stage.yml` add a `Build-Image` job that builds `Dockerfile` and pushes `:dev` / `:stage` plus `:${{ github.sha }}`. It is **guarded by `vars.DOCKER_IMAGE_ENABLED == 'true'`**, exactly like the backend's, so the pipeline is green — the job skipped, not failed — until `DOCKER_REGISTRY_USERNAME` / `DOCKER_REGISTRY_TOKEN` exist. `vars.DOCKER_IMAGE` overrides the default `umineko9410/sdc-manager-frontend`. There is deliberately **no deploy step**: clustron-frontend's n8n webhook, PR preview domains and `Extract-PRbody` are NYCU-SDC org infrastructure this account does not have, and the backend stops at build-and-push too.

Two things that will bite:

- **`VITE_BACKEND_BASE_URL` has to reach the build, and a missing value fails silently.** Vite inlines it, so `pnpm build` succeeds with it unset and emits a bundle where `api.ts`'s import-time throw fires in the browser instead. Every workflow sets it at the top level from `vars.VITE_BACKEND_BASE_URL || 'http://localhost:8080'`, and `Build-Image` forwards it as a `build-args` entry that the `Dockerfile` takes as an `ARG`. Vite's `loadEnv` reads `VITE_`-prefixed variables straight out of the environment, so no `.env.production` is involved — set the repository variable rather than committing one.
- **`NODE_VERSION` / `PNPM_VERSION` in the workflow `env:` blocks and the `pnpm@` pin in the `Dockerfile` are three copies of the same fact.** Change one, change all three. `pnpm/action-setup@v4` must come **before** `actions/setup-node@v5`, since `cache: pnpm` needs pnpm on `PATH`; and there is intentionally **no `packageManager` field** in `package.json`, because the action errors when it disagrees with the `version:` input.

The image is `node:24-alpine` building into `nginx:alpine`. `nginx.conf`'s `try_files $uri $uri/ /index.html` is load-bearing: without it every deep link 404s, including `/mailing-lists/:groupKey` where the key is a percent-encoded email.

The `Test` job passes no env — that is the whole reason `.env.test` is committed.

## Architecture

Layered so that each concern has exactly one home. Adding an endpoint means touching four files in this order:

```
types/<domain>.ts        response shape
lib/request/<verb>.ts    thin wrapper over api(), one function per endpoint
hooks/use<Thing>.ts      useQuery/useMutation, owns the queryKey
pages/ or components/    consumes the hook, renders
```

- **`lib/request/api.ts` is the only place that calls `fetch`.** It attaches `Authorization: Bearer <token>` from the cookie, and normalizes failures into an `ApiError` (`types/generic.ts`). The backend answers errors as RFC 9457 `application/problem+json` (via `summer/pkg/problem`), so **`detail` is the message field**, not `message` — `api.ts` reads `detail` first and falls back. It also special-cases 204, which would otherwise blow up on `res.json()`.
- **Request functions never call hooks and hooks never call `fetch`.** Keeping them split is what makes `api.test.ts` able to mock at one seam.
- **`getErrMessage` (`lib/errors.ts`)** is for rendering caught errors, where the type is `unknown`. Use it in components rather than casting.
- `@/` aliases `./src/` — configured in **both** `vite.config.ts` and the tsconfigs; changing one without the other breaks either the build or the editor.
- **`src/mocks/` is now only MSW plumbing.** It held a contract-first `/users` seam until the backend shipped the real roster; what is left is `server.ts`, started once in `setupTests.ts`, with an empty handler list. Tests register their own routes per case, so a handler file never drifts from the API.

## Auth

**Every route requires a session.** `src/App.tsx` nests all of them — `/` included — under `<Route element={<ProtectedRoute />}>`. `ProtectedRoute` renders `components/auth/LoginGate.tsx` _instead of_ `<Outlet />` when signed out, rather than redirecting: no protected page mounts, so no query fires and a 401 storm is structurally impossible. `LoginGate` is a branding-only header plus `LoginDialog`, a permanently-open shadcn `<Dialog>` with `showCloseButton={false}` and `onEscapeKeyDown`/`onPointerDownOutside`/`onInteractOutside` all prevented — **all three are needed**, since Radix closes on any one of them and closing would leave an empty page with no way back.

Login is **Google OAuth, gated on club mailing list membership**, implemented in the backend's `internal/auth`. The flow:

1. `AuthProvider.login` sets `window.location.href` to `{BASE_URL}/api/auth/google/login?redirect=<path>`. This is a full-page navigation on purpose — the endpoint 302s to Google, which no cross-origin `fetch` could follow, so it is **not** a `lib/request/` function. `redirect` is signed into the OAuth `state` and handed back afterwards.
2. The callback redirects to the backend's configured `frontend_url` — **the bare root URL, not a `/callback` route** — with everything in the **URL fragment**: `#accessToken=<jwt>&refreshToken=<uuid>&expiresIn=900&redirect=<path>`. Fragments are never sent to servers, which is the point: the tokens stay out of access logs, `Referer` headers and proxy records.
3. `lib/auth/authFragment.ts:consumeAuthFragment` reads it. It is called from `main.tsx` **synchronously, before `createRoot`** — not from an effect, which would flash the login dialog for a frame and could let a page fire queries before the token exists. It writes cookies directly through `lib/token.ts` rather than `CookiesProvider`, so React's first render already sees the session, then `history.replaceState`s to `redirect`. A fragment carrying neither `accessToken` nor `error` is left completely alone, so an ordinary `#anchor` survives.
4. Failures arrive as `#error=<reason>` and are mapped to human copy by `lib/auth/loginErrors.ts`. Reasons: `not_a_member`, `email_not_verified`, `oauth_denied`, `invalid_state`, `exchange_failed`, `userinfo_failed`, `membership_check_failed`, `login_not_configured`, `server_error`.

**`isAuthenticated` tracks the _refresh_ token, not the access token.** This is load-bearing: access tokens live 15 minutes, so gating on one would eject a signed-in user every quarter hour. The refresh token (24 h) is the session.

`AuthProvider` therefore owns a refresh timer. It schedules `exp - 60s`, clamped to `[0, 2**31-1]`; a missing, expired or nearly-expired access token clamps to **0 and refreshes immediately**, which is what restores a session on a fresh page load. The timeout lives in a `useRef` — do not copy clustron's module-level `let refreshTimer`, which double-fires under StrictMode. The refresh itself is a `useMutation`, since TanStack owns server state; on failure it clears both cookies, because refresh tokens **rotate** on use so a rejection means that one is spent for good.

`logout()` fires `POST /api/auth/logout` best-effort _before_ clearing cookies (`api()` reads the access token to authorize it) and ignores the result — a session the backend already considers dead must still clear locally. Only refresh tokens are revoked; outstanding access tokens stay valid until they expire, which is inherent to stateless JWTs.

Two things follow from the backend and will look like frontend bugs if you forget them:

- **Roles come from Google Groups, never from config.** `OWNER`/`MANAGER` of the login group become `admin`; everyone else is `member`. The `role` claim is set at sign-in, and `POST /api/auth/refresh` re-reads the user row but **never re-reads the mailing list** — so a promotion or demotion made in the Workspace console only lands when that person signs in again.
- **The backend replaces its `Secret` with a random UUID** when it is left at the default and `Debug` is false, invalidating every issued token. If requests 401 for no clear reason, check `SECRET` on the backend before debugging this side.

There is no user-management login path and no password anywhere. `pages/DevToken.tsx` (the old paste-a-JWT stopgap) is gone.

## Conventions

Mirror **`~/clustron/clustron-frontend`** — the org's current production frontend. `~/sdc/eng-training-social-frontend` is older and predates these patterns (it calls `fetch` directly from `src/requests/*`, with no shared `api()` wrapper); don't copy from it.

- **React 19 + Vite + TypeScript, `strict` with `noUnusedLocals`/`noUnusedParameters`.** `verbatimModuleSyntax` is on, so type imports must be written `import type { … }` — this is the most common build break.
- **react-router v7**, imported from `"react-router"` (not `react-router-dom`). Routes live in `src/App.tsx`; auth-gated routes nest under `<Route element={<ProtectedRoute />}>`.
- **TanStack Query owns all server state.** No `useEffect` + `fetch`. One hook per endpoint; `queryKey` is an array namespaced by domain (`["mailingList", groupKey, "members"]`).
- **Tailwind v4** via `@tailwindcss/vite` — no `tailwind.config.js`, no PostCSS config. `src/index.css` holds the shadcn design tokens (`:root` / `.dark` oklch blocks + `@theme inline`); dark mode is the `.dark` class via `@custom-variant`, and **nothing toggles it yet**. Use `cn()` from `lib/utils.ts` to merge conditional classes.
- **shadcn/ui, `new-york` style, `neutral` base, CSS variables, lucide icons** — `components.json` matches clustron's. Generated primitives live in `src/components/ui/` and are **excluded from coverage**; treat them as vendored and prefer composing over editing. Add more with `pnpm dlx shadcn@latest add <name>`.
  - The current CLI no longer has `--style`/`--base-color` flags and its `init` will rewrite `components.json` and `src/index.css`. Both are already correct — **do not re-run `init`**, only `add`.
  - `add` does not reliably install every peer. After adding, check that `lucide-react`, `class-variance-authority` and `tw-animate-css` are still in `dependencies`.
  - `ui/sonner.tsx` is deliberately edited to drop `next-themes`, which this repo does not use.
- **No TanStack Table and no react-hook-form**, matching clustron: tables are a plain shadcn `<Table>` plus a hand-written `<XxxRow>` component (with a `<Drawer>` variant for mobile in the same file), and forms are one `useState` per field validated on submit-click with an early-return `toast.error`. clustron ships `ui/form.tsx` but imports it nowhere — don't be misled by it.
- **Tables are server-driven**: 0-indexed pagination, `placeholderData: (prev) => prev` on every paginated query, filters as `DropdownMenuCheckboxItem` with an "All" entry, and any search/filter/page-size change resets the page to 0.
- **Writes are optimistic.** Every mutation that touches cached data writes the expected result through `optimisticUpdate` (`lib/optimistic.ts`) in `onMutate`, calls the rollback it returns from `onError`, and invalidates in **`onSettled`** rather than `onSuccess` — after a rollback the cache still has to resync. The helper cancels in-flight fetches first, or a GET already on the wire would land after the write and visibly undo it; it writes nothing when the key is empty rather than inventing an entry. Because the screen reacts immediately there are **no loading toasts and no per-row spinners** for writes, only success and failure ones — the failure toast matters most, since it is the explanation for the UI snapping back. `useUpdateMemberGroups` is the documented exception: it resolves with a list of per-group failures instead of rejecting, so a partial failure never reaches `onError` and is corrected by the `onSettled` invalidation, not a rollback. A form keeps what the user typed when a write is rolled back, so the edit can be corrected and retried.
- **Toasts are sonner**, imported as `import { toast } from "sonner"`. Mutations key their toast by a stable per-entity id (`update-role-${id}`) threaded from `onMutate` so loading is replaced in place rather than stacking.
- **Tests are colocated** as `*.test.ts(x)` next to the code, jsdom + Testing Library. `globals: true` is set, but that only affects the **runtime** — `pnpm build` runs `tsc` over `src/` including tests, which has no vitest globals, so every test file must still `import { describe, expect, it } from "vitest"` or the build fails. `setupTests.ts` starts the MSW server for the whole suite, so component tests exercise the real request layer; render them through `renderWithProviders` (`src/test/test-utils.tsx`), which supplies the router, query client, cookies and `<Toaster />`, plus an opt-in `withAuth` (and `loginError`) that wraps in `AuthProvider` — opt-in because it starts the refresh timer. `src/test/tokens.ts` mints unsigned JWTs and `src/test/cookies.ts` has `clearAllCookies` (jsdom keeps `document.cookie` for a whole file) and `setLocation`, which swaps `window.location` for a `URL` object so an `href` assignment does not throw jsdom's "Not implemented: navigation".

  Auth routes are registered per-test with `server.use(...)` rather than in `src/mocks/handlers.ts`, keeping that file purely the contract-first `/users` seam that gets deleted wholesale later.
  - MSW patches `globalThis.fetch` in a `beforeAll`. A test that stubs `fetch` itself must assign it **inside `beforeEach`**, not at module scope, or the stub is silently clobbered — this is what `api.test.ts` does.

- Prettier owns formatting and `eslint-config-prettier` is last in the ESLint chain, so **never add stylistic ESLint rules** — run `pnpm format` instead.
