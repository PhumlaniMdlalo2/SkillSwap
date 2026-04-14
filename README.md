# SkillSwap App — Project Structure Guide

A React Native + Expo + Supabase app where users exchange skills using a token-based wallet system.

---

## Root Files

| File | Purpose |
|---|---|
| `App.js` | Entry point. Wraps the app in all Providers (AuthContext, WalletContext) and renders the root navigator. Nothing else goes here. |
| `app.json` | Expo configuration — app name, icons, splash screen, permissions. |
| `package.json` | Dependencies and scripts. |
| `.env` | Supabase project URL and anon key. Never commit this. |

---

## `src/components/`

Reusable UI pieces that are **not full screens**. Grouped by concern so feature-related components stay close to each other.

### `components/ui/`
**What goes here:** Stateless, generic building blocks with no business logic. These could theoretically be copied into any other project.

| File | What it does |
|---|---|
| `Button.js` | Styled touchable with variants (primary, secondary, ghost) and a loading state. |
| `Input.js` | Controlled text input with label, error message, and icon slot. |
| `Card.js` | White rounded container with shadow — used as a wrapper elsewhere. |
| `Modal.js` | Reusable bottom sheet or centred modal wrapper. |
| `LoadingSpinner.js` | Centered activity indicator. Used during async operations. |

**Rule:** Nothing in `ui/` imports from `services/`, `store/`, or `screens/`. Pure presentation only.

---

### `components/auth/`
**What goes here:** Components that are specific to the auth flow but too complex to inline in a screen.

| File | What it does |
|---|---|
| `LoginForm.js` | Email + password inputs with validation UI. Receives `onSubmit` as a prop — no direct Supabase calls. |

---

### `components/sessions/`
**What goes here:** Anything rendered in the context of a session — cards, QR display, status badges.

| File | What it does |
|---|---|
| `SessionCard.js` | Displays session summary (skill, time, status, counterpart). Used in lists. |
| `QRCodeDisplay.js` | Renders a QR code from a token string. Wraps a QR library. |

---

### `components/skills/`
**What goes here:** Skill-specific display components.

| File | What it does |
|---|---|
| `SkillCard.js` | Shows skill name, category, rating, and teacher info. Used in Explore and MySkills. |

---

### `components/wallet/`
**What goes here:** Token and transaction display components.

| File | What it does |
|---|---|
| `TokenBalance.js` | Displays current token count with icon. Reads from WalletContext. |

---

## `src/screens/`

Full screens rendered by the navigator. Each folder maps to a feature domain. Screens are allowed to call hooks, services, and context — they are the integration layer.

### `screens/auth/`
The onboarding and login flow. These screens are only shown when no authenticated user exists.

| File | Purpose |
|---|---|
| `WelcomeScreen.js` | First screen new users see. Links to Login and Register. |
| `LoginScreen.js` | Email/password login. On success, updates AuthContext. |
| `RegisterScreen.js` | New account creation. Calls `auth.signUp()` and redirects. |

---

### `screens/main/`
The core tab screens shown after login. These are the root of the bottom tab navigator.

| File | Purpose |
|---|---|
| `HomeScreen.js` | Dashboard — upcoming sessions, token balance summary, quick actions. |
| `ExploreScreen.js` | Browse and search available skills and teachers. |
| `ProfileScreen.js` | View and edit own profile — name, bio, avatar, skills offered. |
| `SettingsScreen.js` | Notifications, account preferences, logout. |

---

### `screens/sessions/`
Everything related to booking, viewing, and completing sessions.

| File | Purpose |
|---|---|
| `MySessionsScreen.js` | List of the user's upcoming and past sessions. |
| `SessionDetailScreen.js` | Full detail view for a single session — status, participants, actions. |
| `BookSessionScreen.js` | Form to book a session with a teacher. Deducts tokens on confirm. |
| `QRScanScreen.js` | Camera view to scan a QR code at session start. Triggers `completeSession`. |

---

### `screens/skills/`
Kept as a **standalone folder** (not merged into `main/`). Skills have their own CRUD lifecycle — Add, View, Edit, Delete — and will grow independently as the app scales.

| File | Purpose |
|---|---|
| `MySkillsScreen.js` | List of skills the logged-in user offers. |
| `AddSkillScreen.js` | Form to add a new skill — name, category, description, hourly token rate. |
| `SkillDetailScreen.js` | View a single skill. Allows edit and delete. |

---

### `screens/wallet/`
Token economy screens.

| File | Purpose |
|---|---|
| `WalletScreen.js` | Current balance, top-up options, quick transfer. |
| `TransactionHistoryScreen.js` | Paginated list of all token movements with timestamps and counterparts. |

---

## `src/navigation/`

Kept intentionally lean. Navigation logic is centralised in one file rather than split into Auth/Main/Tab navigators across multiple files.

| File | Purpose |
|---|---|
| `AppNavigator.js` | Root navigator. Reads `AuthContext` to decide whether to show the auth stack or the main tab+stack navigator. All navigation logic lives here. |
| `navigation.types.js` | Route name constants (`ROUTES.HOME`, `ROUTES.SESSION_DETAIL`, etc.) and TypeScript/JSDoc param types for each route. Import these instead of hardcoding string names. |

**Why one navigator file?** At this app's scale, splitting into `AuthNavigator.js` + `MainNavigator.js` + `AppNavigator.js` adds indirection without benefit. When the app grows past ~15 screens, split `AppNavigator.js` into sub-navigators at that point.

---

## `src/store/`

All global state in one folder. Combines what would otherwise be split across `context/` and `hooks/`.

| File | Purpose |
|---|---|
| `AuthContext.js` | Stores the current user object and auth status. Provides `login`, `logout`, and `user`. Listens to Supabase's `onAuthStateChange`. |
| `WalletContext.js` | Stores the user's token balance. Provides `balance`, `refreshBalance`, and `deductTokens`. |
| `useAppHooks.js` | Consolidates smaller hooks (`useSessions`, `useWallet`, `useProfile`) that don't need their own file. When any hook exceeds ~60 lines or is used in 3+ screens, extract it into its own `useX.js` file. |

---

## `src/services/`

All communication with Supabase. Screens and hooks should never import from `supabase.js` directly — always go through a service function.

| File | Purpose |
|---|---|
| `supabase.js` | Initialises and exports the Supabase client using `.env` credentials. No logic here. |
| `auth.js` | `signIn(email, password)`, `signUp(...)`, `signOut()`, `getCurrentUser()`. Thin wrappers around Supabase Auth. |
| `api.js` | All CRUD operations for Skills, Sessions, Users, and Wallet transactions. Keeps Supabase query logic out of screens and hooks. |

**Scaling rule for `api.js`:** Once this file exceeds ~300 lines, split it into:
```
services/
  api.sessions.js
  api.skills.js
  api.wallet.js
  api.users.js
```
Don't pre-split before it's needed — premature splitting just creates import noise.

---

## `src/utils/`

Stateless helper functions and app-wide constants. No imports from `services/`, `store/`, or `screens/`.

| File | Purpose |
|---|---|
| `helpers.js` | Pure functions: `formatDate()`, `formatTokens()`, `validateEmail()`, `truncateName()`, etc. |
| `constants.js` | App-wide enumerations and config values: session statuses (`PENDING`, `CONFIRMED`, `COMPLETED`), user roles, token cost config, API timeout values. |

---

## `src/assets/`

Static files only.

```
assets/
  images/    # App logo, onboarding illustrations, placeholder avatars
  fonts/     # Custom font files (.ttf / .otf), loaded in App.js via expo-font
```

---

## `supabase/`

Supabase backend config. Follows the standard Supabase project layout — don't restructure this.

| Path | Purpose |
|---|---|
| `migrations/schema.sql` | Single merged schema file. Defines all tables, RLS policies, and indexes. Keep migrations merged early — only split when using Supabase CLI with sequential migration files. |
| `functions/generateQRToken.js` | Edge Function: generates a signed, time-limited QR token for a session. |
| `functions/completeSession.js` | Edge Function: validates QR token, marks session complete, and transfers tokens between wallets. |
| `seed.sql` | Sample data for local development — test users, skills, sessions, wallet balances. |

---

## `__tests__/`

Root test folder. Mirror the `src/` structure for test files.

```
__tests__/
  utils/
    helpers.test.js
  services/
    auth.test.js
  components/
    ui/
      Button.test.js
```

Start with `utils/` and `services/` tests — they're pure functions with no React Native rendering overhead. Add component tests with `@testing-library/react-native` as the app stabilises.

---

## Quick Reference: Where Does New Code Go?

| What you're building | Where it goes |
|---|---|
| A new screen | `screens/<feature>/YourScreen.js` |
| A reusable UI piece with no business logic | `components/ui/` |
| A component tied to one feature | `components/<feature>/` |
| A Supabase query or mutation | `services/api.js` (or `api.<feature>.js` after split) |
| A new auth method | `services/auth.js` |
| Global state shared across 2+ screens | `store/AuthContext.js` or `store/WalletContext.js` |
| A hook used in 1-2 places | `store/useAppHooks.js` |
| A hook used in 3+ places or > 60 lines | `store/useYourHook.js` (own file) |
| A pure formatting or validation function | `utils/helpers.js` |
| A new status enum or config value | `utils/constants.js` |
| A Supabase Edge Function | `supabase/functions/` |

---

## Dependency Rules

To prevent circular imports and keep layers clean:

```
screens → store → services → supabase.js
screens → components
components/ui → (nothing from this project)
utils → (nothing from this project)
```

`components/ui/` should never know that Supabase exists.
`services/` should never import from `screens/` or `store/`.
`utils/` should have zero imports from anywhere in the project.
