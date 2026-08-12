# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # production build to dist/
npm run lint     # eslint over the repo
npm run preview  # serve the built dist/
```

There is no test setup in this project (no test runner, no test files).

## What this app is

Driver-facing web app for Epic Rides. It really contains two unrelated surfaces:

1. **Driver onboarding** (`/`, `/signup` … `/subscription`) — phone-OTP login plus a 7-step document/subscription wizard.
2. **Public ride tracking** (`/share`) — no auth, opened from a shared link, live map over a socket.

Everything under `src/pages/app`, `src/layouts`, `src/components/layout`, `src/static`, `src/context`, `src/firebase`, `src/hooks/api`, `src/init`, `src/schema` is leftover boilerplate from a project template (`DummyHome`, `DummyLogin`, `DummySidebaar`, commented-out FCM wiring). Don't treat it as live architecture; the real code is `src/pages/authentication`, `src/pages/tracking`, `src/redux`, `src/utils`.

## API layer

- `src/axios.js` — the single axios instance. `baseUrl` is a **hardcoded const at the top of the file** with dev/staging/prod URLs commented out; switching environments means editing that line (dev is the current default). Not read from env.
- Request interceptor attaches `Bearer` from the `token` cookie (the API is cross-origin, so cookies don't flow automatically).
- Response interceptor globally toasts network/timeout errors and, on `401`, clears cookies and hard-redirects to `/` — **except** on onboarding paths (listed in the interceptor) or when a request sets `config.skipAuthRedirect = true`. Add new onboarding routes to that list or a mid-wizard 401 will kick the user out.
- Errors in feature code go through `processError` (`src/lib/utils.js`), which surfaces `error.response.data.message` via `ErrorToast`.
- `src/hooks/api/{Get,Post,Put,Delete}.jsx` are template hooks (`useUsers`, `useLogin`); the onboarding flow calls axios via redux thunks instead.

## Auth & session state

Session state is duplicated across three stores, and code reads whichever is available:

- **Cookies** (`js-cookie`): `token`, `user` (JSON), 7-day expiry — the source of truth after reload. `hydrateAuthFromCookies` in the auth slice restores redux from them; `resolveDriverId` (`src/utils/subscriptionCheckout.js`) falls back to the cookie when `user._id` is missing.
- **Redux** (`src/redux/store.jsx`) — `auth` and `vehicleTypes`; only `auth` is persisted (redux-persist, localStorage key `root`). `serializableCheck` is off. Note `persistor` is exported but no `PersistGate` is mounted in `main.jsx`.
- **localStorage / sessionStorage** — wizard progress and Stripe hand-off (below).

`src/redux/slices/auth.slice.jsx` holds all onboarding thunks (`sendOtp`, `verifyOtp`, `onboard`, and the four document uploads). All document uploads hit the same endpoint `POST /api/auth/onboard/driver/:driverId/documents?step=N` with `multipart/form-data`, differing only in `step` (1 license, 2 registration, 3 insurance, 4 vehicle details) and field names. Thunks toast their own success/error, so callers usually don't.

## Onboarding wizard

Two independent notions of "where the user is", and both matter:

- **Local progress** — `src/utils/stepValidation.js` keeps a `completedSteps` array in localStorage (`STEPS` / `STEP_ROUTES`). Each step page calls `arePreviousStepsCompleted(...)` on mount and bounces to `getFirstIncompleteStep()`, and `markStepCompleted(...)` on success. `clearAllSteps()` runs on logout.
- **Server truth** — `src/utils/onboardingRedirect.js` `resolvePostLoginRoute({ user, stepToComplete, rejectedDocuments, pendingDocuments })` decides the post-login destination from the API payload, in a deliberate priority order: subscription not active → `/subscription`; active sub with rejected docs → `/verified-account` (rejected state); API `stepToComplete`; first missing doc; then submitted/approved cases. It calls `syncCompletedStepsFromUser` to push server state back into localStorage. Change routing rules here, not ad-hoc in pages.

Document keys used everywhere: `driverLicense`, `vehicleRegistration`, `insurance`, `vehicleDetails`, each with `status` of `approved | pending | rejected` (absent = not uploaded). `pending` means "submitted, awaiting review" — not "needs action".

Resubmission after rejection prefills forms from remote S3 URLs via `fetchUrlAsFile` in `src/utils/rejectedFlowPrefill.js` (requires CORS on the bucket); `clearRejectedFlowState` in the auth slice then flips local doc statuses to `pending`.

Stripe checkout leaves and re-enters the app: `src/utils/subscriptionCheckout.js` stashes flow state in sessionStorage (`pendingStripeCheckout`, `postSubscriptionFlow`, `onboardingJustPurchased`) before redirecting, and `Completesetup.jsx` (route `/complete-setup`) reads `session_id` / `canceled` query params on return.

## Ride tracking

`/share` (`ShareTracking.jsx`) is a dispatcher: `?carpool=…&passengerId=…` renders `CarpoolShare`, otherwise `RideTracking`. The two files are intentionally kept separate — carpool logic was added without touching `RideTracking`.

Both open `io(baseUrl, { transports: ["websocket"], query: { origin: "web", … } })` — ids travel in the socket **query**, not in emits. Server events: `ride:initial_data`, `ride:status:update`, `driver:location:update`, `ride:error` (and carpool equivalents). Payloads arrive inconsistently shaped (sometimes array-wrapped, sometimes `data.ride` vs `ride`), which is why both files normalize defensively before use. Terminal statuses navigate to `/ride-ended`, `/ride-cancelled`, `/ride-not-found`.

Maps use the Google Maps JS API loaded imperatively (`src/utils/loadGoogleMapsPlaces.js` for Places autocomplete on signup; tracking pages create the map directly with `mapId`).

## Conventions

- JS + JSX only (no TypeScript), React 19, `react-router` v7 imported as `react-router` (a few template files still import `react-router-dom`).
- Tailwind for all styling; fonts `font-poppins` / `font-inter` are the configured extensions.
- Toasts only through `src/components/global/Toaster.jsx` (`SuccessToast` / `ErrorToast` / `WarningToast`) — it enforces a single visible toast at a time.
- Env vars (`VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAP_ID`, `VITE_APP_FIREBASE_*`) live in `.env`, which is gitignored; add new names to `.env.example`. The API base URL is *not* one of them (see API layer).
- Deployment is Vercel with an SPA rewrite (`vercel.json`); route additions need no config change.
- `Epic Rides.postman_collection 9.json` at the repo root is the API reference for endpoint shapes.
