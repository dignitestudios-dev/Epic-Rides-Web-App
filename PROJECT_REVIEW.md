# Epic Rides Web App — Project Review

Full read-through of `src/` on branch `staging` (2026-09-02). Companion to `CLAUDE.md`:
that file describes how the app is *meant* to work; this one records what the code
actually does, what is broken, and the order I'd fix it in.

Verified state at time of review:
- `npm run build` — **passes** (31s, single 685 kB JS chunk, no code splitting)
- `npm run lint` — **108 errors, 11 warnings**
- No tests, no test runner.

---

## 1. What actually ships

Two unrelated surfaces behind one SPA (`src/App.jsx`):

| Surface | Routes | Auth | State |
|---|---|---|---|
| Driver onboarding | `/`, `/verification`, `/signup`, 4 document steps, `/subscription`, `/verified-account`, `/complete-setup` | phone OTP → JWT cookie | redux + cookies + localStorage |
| Public ride tracking | `/share`, `/ride-ended`, `/ride-cancelled`, `/ride-not-found` | none | socket only |
| Template leftovers (live!) | `/app/dashboard`, `/auth/login` | none | — |

Real code: `src/pages/authentication`, `src/pages/tracking`, `src/redux`, `src/utils`, `src/axios.js`.
Everything else under `src/pages/app`, `src/layouts`, `src/components/layout`, `src/static`,
`src/context`, `src/firebase`, `src/hooks/api`, `src/init`, `src/schema` is dead template code.

### Intended onboarding flow

```
/  (phone)  →  /verification  (OTP)  →  resolvePostLoginRoute()
                                            ↓
/signup → /license-information → /vehicle-details → /insurance-information
        → /add-vehicle-details → /subscription → [Stripe] → /complete-setup
        → /verified-account  (polls account status every 10s)
```

Rejected documents re-enter the wizard from `/verified-account` via a `rejectedFlow`
array carried in router state, prefilling forms from S3 URLs.

### Three sources of truth for "where is the user"

1. **`localStorage.completedSteps`** — `src/utils/stepValidation.js`, purely local.
2. **Server payload** — `stepToComplete` / `rejectedDocuments` / `pendingDocuments`, interpreted by `src/utils/onboardingRedirect.js`.
3. **Per-page ad-hoc guards** — each document page has its own 5-priority `useEffect` that can override both of the above.

Most of the bugs below come from these three disagreeing.

---

## 2. Findings

Ordered by what I'd fix first. IDs are stable — reference them when assigning work.

### P0 — flow correctness

**F1. ✅ FIXED — a driver was sent to the pay screen with documents outstanding.**
Confirmed against staging: `POST /api/auth/verify-otp` returns a full user object with
`isOnboarded: true` and `stepToComplete: "driverLicense"` for a driver who has only finished
"Your Details". The old first branch of `resolvePostLoginRoute` was
`needsSubscriptionPurchase(user)` → `/subscription`, and because that user has no
`subscription` field it matched before `stepToComplete` was ever read. `Subscription.jsx`
then deliberately kept them there.

Fixed by reordering `resolvePostLoginRoute` so subscription is reachable only once every
document is in, and by adding the `isOnboarded` check the API already provides:

1. `isOnboarded === false` → `/signup` (no profile exists yet)
2. rejected documents → `/verified-account` (rejected summary)
3. API `stepToComplete` → that document step
4. first document still needing upload → that step
5. subscription not active → `/subscription`
6. documents submitted, awaiting review → `/verified-account`

`Subscription.jsx` gained a matching guard, and `Verification.jsx` now forwards `isOnboarded`
and falls back to `user.stepToComplete` when the top-level field is absent.

**F2. ✅ FIXED — `syncCompletedStepsFromUser` lied about progress.**
It marked signup + all four document steps complete for **any** user, with no check that
anything was uploaded, and it ran on the F1 path. The resulting `localStorage.completedSteps`
made every `arePreviousStepsCompleted` guard pass and pinned `getFirstIncompleteStep()` at
`/subscription` permanently, surviving reloads and logouts.

Now `computeCompletedStepsFromUser` derives progress from actual document status and stops at
the first incomplete step, and sync *overwrites* rather than adds (new `setCompletedSteps` in
`stepValidation.js`). Overwriting matters: it repairs the bad progress already sitting in
existing users' browsers on their next login — otherwise they would stay stuck after the fix.

**F3. Step order contradicts itself.** (cosmetic after F1/F2 — routing now settles the order)
`stepValidation.js` declares `VERIFIED_ACCOUNT` before `SUBSCRIPTION` in the `STEPS` object
(lines 10–11) and in `STEP_ROUTES`, matching the `App.jsx` comments (STEP 6 verified, STEP 7
subscription). But both `arePreviousStepsCompleted` (lines 47–55) and `getFirstIncompleteStep`
(lines 72–80) hard-code the **opposite** order — subscription before verified. The actual
navigation code (`AddVehicleDetails.jsx:352`) goes documents → subscription → verified, so the
array is right and the object/comments are wrong. Pick one and delete the other.

**F4. Stripe return can silently discard a completed payment.**
`src/pages/authentication/Completesetup.jsx:51` calls `resolveDriverId()` **with no argument**,
so it depends entirely on the `user` cookie being intact after the round-trip to Stripe. If
that cookie is missing or unparseable, `detailsPath` is null and the paid driver is bounced to
`/subscription` with no error. Pass the redux user (or `hydrateAuthFromCookies` first).

### P1 — data loss and stuck states

**F5. License number is truncated on resubmit.**
`LicenseInformation.jsx` prefill does `String(meta.licenseNumber).replace(/[^a-zA-Z0-9]/g,'').slice(0, 9)`
while `LICENSE_NUMBER_REGEX` accepts 6–15 and the input caps at 15. A rejected license with a
10+ character number comes back silently cut to 9, and the driver resubmits a wrong number
that will be rejected again. `slice(0, 9)` should be `slice(0, 15)`.

**F6. Double-submit recovery exists on one step only.**
`LicenseInformation.jsx` catches "already submitted / pending approval" and moves the user
forward — necessary because the 30s axios timeout fires while the upload succeeds server-side.
The other three upload pages have no such branch, so a timed-out-but-succeeded registration,
insurance, or vehicle-details upload leaves the driver on a page that will keep rejecting them.

**F7. Mid-wizard 401 leaves the user stranded.**
`src/axios.js:96-118` deliberately skips the logout redirect on onboarding paths. Correct
intent, but there is no fallback: an expired token during the wizard produces only the thunk's
error toast, and every subsequent action fails the same way. There's no path back to `/` except
the Logout modal. Consider a "session expired, sign in again" state on those pages.

**F8. Back button is trapped in four places, inconsistently.**
`Subscription.jsx:104`, `VerifiedAccount.jsx:93`, and the doc pages each `pushState` and
re-push on `popstate`; `handleBack` additionally toasts *"You cannot go back to completed steps"*.
Net effect: browser back is broken across onboarding, with different behaviour per page. If
this is a product requirement, it belongs in one shared hook.

### P2 — API contract drift

**F9. Endpoints used by the app that the Postman collection doesn't document:**
- `GET /api/auth/account-status/:userId` (`VerifiedAccount.jsx:152`, polled every 10s)
- `GET /api/admin/vehicle-types` (`vehicleTypes.slice.jsx:14`)
- `GET /api/subscription/details/:driverId` — collection shows `/api/subscription/details/` with no id
- `POST /api/subscription/purchase/:planId/:driverId` — collection shows `/api/subscription/purchase/:priceId` only
- `POST /api/subscription/cancel` sent with **no body and no driver id** (`Subscription.jsx:307`), unlike every other driver-scoped call

Either the collection (`Epic Rides.postman_collection 9.json`) is stale or some of these calls
are wrong. Worth one pass with the backend owner.

**F10. Cancelled rides never reach `/ride-cancelled`.**
`RideTracking.jsx:186` routes both `cancelled` and `completed` to `/ride-ended`. The
`/ride-cancelled` route and page exist and are unreachable from the tracking socket.

**F11. Two Google Maps loaders with different library sets.**
`loadGoogleMapsPlaces.js` loads `libraries=places`; the tracking pages load
`libraries=geometry,marker&v=beta` inline. Both guard with "is there already a maps script on
the page?", so whichever loads first wins and the second silently gets a maps object missing
its libraries. Only bites when one tab visits both surfaces, but it's a real trap.

### P3 — hygiene, security, and cost of change

**F12. PII in the production console.** 61 `console.log` calls in `src/`, several dumping the
whole user object (`Signup.jsx:256`, `LicenseInformation.jsx:24`, `VehicleDetails.jsx:33`,
`Verification.jsx:103-128`, `VerifiedAccount.jsx:69-73`). That object carries name, email,
address and document metadata, and this is live on a public site.

**F13. Base URL is hardcoded to staging.** `src/axios.js:7` — and `.env` already defines an
unused `VITE_API_BASE_URL`. `CLAUDE.md` claims dev is the default; it isn't. Reading the env
var with the constant as fallback removes a whole class of "shipped pointing at staging" bugs.
(`.env.example` is still the untouched template placeholder and lists none of the three real vars.)

**F14. FingerprintJS is computed and thrown away.** `axios.js:16-43` loads the library, resolves
a visitor id, `console.log`s it, and never attaches it to a request. Either wire it into the
request interceptor or drop the dependency.

**F15. Logout is copy-pasted six times.** The same six-line block (`removeItem('verifiedPhone')`,
`clearAllSteps()`, remove two cookies, `removeItem('persist:root')`, `location.replace('/')`)
appears in Signup, LicenseInformation, VehicleDetails, InsuranceInformation, AddVehicleDetails,
VerifiedAccount and Subscription — and none of them dispatch the `logout()` reducer that already
exists in `auth.slice.jsx:426`.

**F16. ~2,900 lines of near-duplicate document-page code.** The four upload pages repeat the
image picker, the 5 MB/type validation, the field-error state, the logout block, the 5-priority
mount guard, and the rejected-flow navigation with only field names differing. This is the single
biggest drag on every future change — one shared `<DocumentStepPage>` would remove most of it.

**F17. Dead code shipped to production.** Live routes `/app/dashboard` and `/auth/login` render
template dummies. `AddCardModal.jsx`, `AppContext.jsx`, `src/firebase/*`, `src/hooks/api/*`,
`src/init`, `src/schema`, `AuthRoutes.jsx`, `DummySignup.jsx` are unreferenced.
`App.jsx:20-21` imports `Completesetup` twice (`Paymentsuccessfully` is unused), and
`App.jsx:82` hardcodes a `/share/demo-carpool` redirect with real-looking ids.

**F18. Dependency drift.** `package.json` is still named `project-template`;
`@vitejs/plugin-react` is pinned at `^1.3.2` (2022) against Vite 6;
`@react-native-async-storage/async-storage` is a React Native package in a web app;
`crypto-js`, `uuid`, `ua-parser-js`, `formik`, `yup`, `react-modal`, `@tabler/icons*` appear
unused (confirm before removing). `redux-persist`'s `persistor` is exported but no `PersistGate`
is mounted.

**F19. Lint is not a usable signal.** 108 errors — mostly unused imports and `React` unused under
the JSX runtime, plus 11 `react-hooks/exhaustive-deps` warnings that are worth reading
individually (several sit on the redirect effects implicated in F1–F3). One `--fix` pass plus
deleting dead imports would get this to near-zero and make future regressions visible.

---

## 3. Suggested order of work

1. ~~F1, F2~~ — **done.** F3 remains as a cosmetic tidy-up.
2. **F4, F5, F6** — small, isolated, each prevents a concrete user-visible failure.
3. **F12 + F13** — delete the logging, move the base URL to env. An afternoon, removes real risk.
4. **F9** — one sync with the backend on the five drifting endpoints.
5. **F19 then F17/F18** — get lint clean and delete dead code, so step 6 is safe.
6. **F16** — extract the shared document-step component. Do this last; it's the big one and it
   wants a clean lint baseline and settled routing rules underneath it.

F7, F8, F10, F11, F14, F15 fit anywhere; none are urgent.

## 4. Open questions for the team

- ~~Does `POST /api/auth/verify-otp` return a user object for an unknown phone number?~~
  **Answered:** it returns the full user plus `isOnboarded` and `stepToComplete`, both
  top-level and on the user. `isOnboarded: false` means "Your Details" was never completed.
  Still worth confirming: for a phone with *no* record at all, is `user` null or absent?
  The code treats both as `/signup`, so either is safe.
- Is trapping the browser back button (F8) an actual product requirement?
- Is `/api/subscription/cancel` really driver-scoped server-side, or does it read the JWT? (F9)
- Should `/app/dashboard` and `/auth/login` be deleted, or are they placeholders for planned work?
