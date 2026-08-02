# SkillSwap

A skill-exchange app where people teach and learn from each other using **time tokens** instead of money — 1 hour taught ≈ 1 token, spendable on learning from someone else. Built with React Native (Expo) and Supabase.

## How it works

- **Browse** skills other people teach.
- **Request** to book one. The teacher **accepts or declines** your request.
- Once accepted, you **pick a time** from the teacher's open availability — that's the moment a token actually leaves your wallet.
- After the session, the teacher marks it **complete** and earns a token. Both sides can leave a review.
- There's also a **Skill Match** tab — a swipe-based discovery mode for finding people to trade skills with, separate from the browse/book flow above.

## Tech stack

- **App:** React Native + [Expo](https://expo.dev) (SDK 54), file-based routing via `expo-router`
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security
- **State:** React Context (auth, wallet) + Zustand (Skill Match)

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Run it — no backend required

The app works out of the box with local mock data if no Supabase credentials are set, so you can get the UI running immediately:

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `w` for web. You'll be able to register, browse the seeded mock skills, book sessions, etc. — none of it persists anywhere, it just lives in memory for that session.

> **If `expo start` crashes immediately** with a `TypeError: fetch failed` right after "Starting Metro Bundler," your network is blocking Expo's update-check request. Run `npx expo start --offline` instead.

### 3. Connect it to a real Supabase project (optional)

To get persistent accounts, real bookings, and shared data across devices:

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **Authentication → Providers → Email** and turn **off** "Confirm email" for local development — the free tier's built-in email sender has a very low rate limit and will start rejecting signups otherwise. (Turn it back on, with your own SMTP provider configured, before shipping this for real.)
3. Open the **SQL Editor** and run these files in order:
   - `supabase/migrations/schema.sql`
   - `supabase/seed.sql` *(optional — adds 6 demo teachers with skills, open availability, and a review, so the app isn't empty on first browse)*
4. Copy `.env.example` to `.env` and fill in your project's URL and anon/publishable key (**Settings → API** in the dashboard):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart the dev server: `npx expo start --clear`

`.env` is gitignored — never commit real credentials. The anon/publishable key is safe to put in a client app by design (it relies on Row Level Security, not secrecy), but there's no reason to check it into git either.

If you already ran `schema.sql` before pulling the latest changes, you'll also need to run the incremental migrations in `supabase/migrations/` in numeric order (`002_...`, `003_...`, etc.) — each one documents what it adds at the top of the file.

---

## Project structure

```
app/                  expo-router routes — thin files that just re-export a screen
  (auth)/             welcome, login, register — shown when logged out
  (onboarding)/        post-signup "what do you teach / want to learn" flow
  (tabs)/              Home, Explore, Skill Match, Wallet, Profile
  skills/, sessions/, requests/, swap/, wallet/, profile/
                        stack routes pushed on top of the tabs (detail screens, modals)

src/
  screens/            the actual screen components, one folder per feature domain
  components/
    ui/               generic building blocks (Button, Card, Input, Badge, Avatar…)
    <feature>/        components tied to one feature (skills, sessions, wallet, swap)
  services/           all Supabase/mock data access — screens never call Supabase directly
    supabase.js       client init; isSupabaseConfigured is false until .env is set
    auth.js           sign up/in/out, session restore
    api.js            skills, availability, sessions, requests, reviews, wallet
    swapService.js    Skill Match candidates/swipes (separate mock pool)
  store/              AuthContext, WalletContext (React Context) + swapStore (Zustand)
  utils/
    mockData.js       the in-memory data used when Supabase isn't configured
    constants.js      colors, spacing, category list, etc.
    helpers.js         formatting helpers
    alert.js          cross-platform confirm/notify — react-native-web has no real Alert

supabase/
  migrations/schema.sql   full schema: tables, RLS policies, RPC functions
  migrations/00N_*.sql    incremental migrations, apply in order if schema.sql already ran
  seed.sql                optional demo data
```

### Mock mode vs. live mode

Every function in `src/services/api.js` and `auth.js` checks `isSupabaseConfigured` and branches: real Supabase query if `.env` is set, otherwise reads/writes an in-memory copy of `mockData.js`. This means:

- The app is fully clickable with zero setup.
- Mock mode is **per browser tab / app instance** — it doesn't persist across reloads and two mock sessions can't see each other's data. Testing a real interaction between two people (e.g. one account requesting a session from another) requires a real Supabase project.

### Why bookings go through the database, not the client

Token balances are never written directly from the app. Booking, completing, cancelling, and the request/accept/schedule flow are all Postgres functions (`supabase/migrations/schema.sql`) that run as a single transaction and validate everything server-side (ownership, balance, status transitions) — a client can't spend tokens it doesn't have or mark someone else's session complete, even by calling the API directly. Row Level Security is on for every table.

---

## Known limitations

- Supabase's free-tier email sender allows only a handful of signups per hour — see step 2 above.
- No push notifications — the "requests waiting on you" banner on Home only updates when the app is open.
- The Skill Match (swipe) feature isn't part of the core browse/book data model — it's a separate, self-contained discovery mode with its own mock candidate pool.
