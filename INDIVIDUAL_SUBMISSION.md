# SkillSwap — Individual Submission

## Table of Contents

1. [Coding Progress](#1-coding-progress)
2. [Improved User Interface Design](#2-improved-user-interface-design)
3. [Updated Data Design](#3-updated-data-design)
4. [Testing the System/Subsystem](#4-testing-the-systemsubsystem)

---

## 1. Coding Progress

### 1.1 Project Overview

SkillSwap is a React Native (Expo SDK 57) mobile application that allows users to exchange skills through a time-token economy. Users teach skills to earn tokens and spend tokens to learn from others. The platform includes a Tinder-style "Skill Match" feature for discovering compatible skill partners, a reverse "Bounty Board" for urgent learning requests, an in-app match chat, and a gamified "Skill Passport" with XP, levels and streaks.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.86 + Expo SDK 57 (React 19) |
| Routing | expo-router (file-based) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Realtime, Storage) |
| Server State | TanStack React Query |
| Client State | React Context + Zustand |
| Animations | react-native-reanimated 4, gesture-handler |
| Device APIs | expo-image-picker, expo-camera, AsyncStorage |
| Icons / SVG | @expo/vector-icons, react-native-svg, react-native-qrcode-svg |
| Testing | Jest + @testing-library/react-native |

### 1.2 Implemented Features

#### Authentication, Recovery & Onboarding
- **Welcome Screen** — Entry point with login/register navigation
- **Registration** — Email/password signup with Supabase Auth; triggers automatic profile creation + 5-token welcome bonus
- **Login** — Email/password authentication with session persistence
- **Password Recovery** — "Forgot password" sends a 6-digit email OTP (`signInWithOtp`, `shouldCreateUser: false`); a **Verify Code** screen exchanges it via `verifyOtp({ type: 'recovery' })`, and a **Reset Password** screen sets the new password. Deep-link recovery (`skillswap://reset-password`) is also handled for both implicit (`#access_token`) and PKCE (`?code=`) flows
- **Onboarding Flow** — Three-step wizard:
  1. **Teach** — Select skills to teach from 10 categories (Music, Cooking, Languages, Technology, Fitness, Art & Design, Business, Academics, Crafts, Wellness)
  2. **Learn** — Select learning interests by category
  3. **Style Preferences** — Set teaching/learning pace (1–5), structure (1–5), and preferred formats for compatibility matching

#### Core Skill Features
- **Home Screen** — Greeting, streak card, token balance, pending-request banner, quick actions, and upcoming sessions
- **Explore Screen** — Tabbed browsing of skills and bounties with category filtering and search
- **Skill Detail Screen** — View skill information, teacher profile, rating, availability, and reviews
- **Add Skill** — Create new skill listings with title, description, and category
- **My Skills** — Manage personal skill listings (view/delete)

#### Booking & Sessions
- **Request System** — Learners request to book a skill; teachers accept/decline
- **Availability Management** — Teachers set weekly recurring availability hours per skill; the system auto-generates 1-hour booking slots for a rolling 14-day window
- **Session Scheduling** — Learners select contiguous time slots (supports multi-hour sessions); tokens deducted at 1 token per hour
- **Session Management** — View upcoming, completed, and cancelled sessions
- **Session Detail** — View session information with QR code display for verification
- **QR Check-In** — Both parties scan each other's (time-limited, ~15s expiry) QR code to confirm attendance; a participant cannot scan their own code
- **Mutual Trade Confirmation** — After check-in, each side explicitly confirms the trade; a **72-hour auto-finalize** window lets the eager side complete if the partner never confirms
- **Session Completion** — Teachers mark sessions complete; tokens awarded to teacher (matching the real spend)
- **Session Cancellation** — Either party can cancel pending sessions with full token refund
- **Calendar Export** — Add a session to Google Calendar, Outlook, or download an `.ics` file
- **Leave Review** — Rate and review after session completion (1–5 stars + comment), plus optional **endorsement badges**

#### Token Wallet
- **Wallet Screen** — Display current token balance
- **Transaction History** — Chronological list of all token earns/spends with descriptions
- **Welcome Bonus** — 5 tokens credited on account creation

#### Skill Match (Swipe Discovery)
- **Swipe Deck** — Tinder-style card swiping through compatible skill partners
- **Server-Side Matching** — Mutual right-swipes create matches via PostgreSQL RPC (`record_swipe()`); eliminates client-side prediction
- **Compatibility Scoring** — Candidates ranked by learning-style compatibility (pace, structure, format preferences) using server-side computation
- **Match Results & Details** — Display matched users with skill overlap details
- **Match History** — View all past and current matches
- **In-App Match Chat** — Real-time peer messaging on a match, via Supabase Realtime
- **Messages Inbox** — A dedicated Messages tab listing every conversation with the counterpart, latest message preview, and relative time; tapping opens the chat, and the list re-sorts by most recent activity
- **Unmatch** — Remove a match and clear swipe history for both parties
- **Undo Last Swipe** — Reverse the most recent swipe action
- **Block Users** — Prevent specific users from appearing in discovery

#### Bounty Board (Reverse Requests)
- **Create Bounty** — Post a learning request with a title, description, category, reward type (token or skill swap), token amount, and urgency (urgent / this week / flexible)
- **Offer to Help** — Other users send an offer (with an optional note) to help
- **Accept an Offer** — For **skill-swap** bounties, accepting an offer opens a verified `trade`
- **Two-Sided Trade Confirmation** — Both participants confirm they did their side; the trade (and bounty) completes when both confirm, or 72 hours after acceptance if only one side confirms
- **Guard** — A swap-reward bounty can only reach "completed" through a confirmed trade (enforced by a DB trigger)

#### Gamification & Skill Passport
- **XP & Levels** — Earn XP per completed session (100) and bounty help (150); levels 1–5 from Novice to Master Polymath
- **Weekly Streaks** — ISO-week streak tracking with active / at-risk / lapsed states, a week-end countdown, and a "perfect week" bonus (3+ sessions in a week = +200 XP)
- **Endorsement Badges** — Six badge types (e.g. Explains Simply, Infinite Patience, Super Punctual) awarded by session partners
- **Skill Passport** — A dedicated screen showing collected badge stamps and rewards history

#### Profile & Settings
- **Profile Screen** — View/edit own profile (name, bio, avatar), stats, and passport preview
- **Public Profile** — View other users' profiles with ratings, skills, and reviews
- **Avatar Upload** — Upload profile images to Supabase Storage with per-user folder isolation and cache-busting
- **Settings** — Application settings management (persistent via AsyncStorage)

### 1.3 Project Structure

```
SkillSwap/
├── app/                              # expo-router file-based routes
│   ├── _layout.jsx                   # Root Stack + Auth/Wallet/Query providers
│   ├── index.jsx                     # Entry redirect
│   ├── settings.jsx                  # Settings page
│   ├── passport.jsx                  # Skill Passport page
│   ├── reset-password.jsx            # Set a new password
│   ├── verify-code.jsx               # Enter emailed recovery code
│   ├── (auth)/                       # Authentication group
│   │   ├── welcome.jsx, login.jsx, register.jsx
│   ├── (onboarding)/                 # Onboarding group
│   │   ├── teach.jsx, learn.jsx, style.jsx
│   ├── (tabs)/                       # Main tab navigation
│   │   ├── index.jsx (Home), explore.jsx, swap.jsx, messages.jsx,
│   │   │   wallet.jsx, profile.jsx
│   ├── skills/                       # Skill management
│   │   ├── [id].jsx, add.jsx, my-skills.jsx
│   ├── sessions/                     # Session management
│   │   ├── index.jsx, [id]/index.jsx, [id]/check-in.jsx, [id]/review.jsx
│   ├── requests/                     # Booking requests
│   │   ├── index.jsx, [id]/schedule.jsx
│   ├── swap/                         # Skill Match feature
│   │   ├── [id].jsx, results.jsx, history.jsx, settings.jsx
│   ├── chat/[id].jsx                 # In-app match chat
│   ├── wallet/transactions.jsx       # Transaction history
│   └── profile/[id].jsx              # Public profile view
├── src/
│   ├── services/                     # Backend integration layer
│   │   ├── supabase.js              # Supabase client initialization
│   │   ├── auth.js                  # Auth + password recovery functions
│   │   ├── recovery.js              # Password-recovery deep-link handling
│   │   ├── api.js                   # CRUD + booking/session RPCs
│   │   ├── swapService.js           # Swipe/match RPCs
│   │   ├── chatService.js           # Match messaging + Realtime subscription
│   │   ├── bountyService.js         # Bounty board + trade RPCs
│   │   └── gamificationService.js   # XP, streaks, endorsements, rewards history
│   ├── store/                       # State management
│   │   ├── AuthContext.js           # Auth state + user session
│   │   ├── WalletContext.js         # Token balance + transactions (React Query)
│   │   ├── swapStore.js             # Zustand store for Skill Match
│   │   ├── queryClient.js           # React Query client + AppState wiring
│   │   └── useAppHooks.js           # useAuth / useWallet hooks
│   ├── hooks/                       # Custom React hooks
│   │   ├── useMatchingLogic.js      # Candidate filtering by preferences
│   │   ├── useSwipeGesture.js       # Pan gesture handling
│   │   ├── useSwipeAnimation.js     # Card slide animations
│   │   ├── useFocusRefetch.js       # Refetch a query while screen is focused
│   │   └── usePersistentSetting.js  # AsyncStorage-backed setting hook
│   ├── utils/
│   │   ├── constants.js             # Design tokens, categories, XP, badges
│   │   ├── helpers.js               # Formatting, date, duration utilities
│   │   ├── calendar.js              # Google/Outlook/.ics link builders
│   │   ├── errors.js                # Backend-to-UI error message mapping
│   │   ├── streakHelpers.js         # ISO week / streak / perfect-week logic
│   │   └── alert.js                 # Cross-platform confirm/notify wrapper
│   ├── components/
│   │   ├── ui/                      # Reusable UI kit (8 components)
│   │   │   ├── Button.js, Card.js, Input.js, Badge.js
│   │   │   ├── Avatar.js, LoadingSpinner.js, Modal.js, ErrorState.js
│   │   ├── wallet/                  # TokenBalance component
│   │   ├── swap/                    # SwipeCard, SwipeActions, MatchCard, SwapEmptyState
│   │   ├── skills/                  # SkillCard component
│   │   ├── sessions/                # SessionCard, QRCodeDisplay, AddToCalendarModal
│   │   ├── bounties/                # BountyCard, CreateBountyModal
│   │   ├── gamification/            # SkillPassport, BadgeGrid, StreakCard,
│   │   │                            #   StreakBanner, XPProgressBar, RewardsHistory
│   │   └── auth/                    # LoginForm component
│   └── screens/                     # Screen implementations (32 route screens)
├── supabase/
│   ├── migrations/
│   │   ├── schema.sql               # Consolidated database schema (all folded in)
│   │   └── 002–017                  # Incremental migration history
│   └── seed.sql                     # Demo data (6 teachers, 7 skills)
├── __tests__/                       # Jest test suite (20 test files)
└── __mocks__/                       # Module mocks for testing
```

### 1.4 Services Layer Architecture

The application follows a clean service-layer pattern for backend communication; screens never call Supabase directly:

- **`supabase.js`** — Initializes the Supabase client with URL and anon key from environment variables; includes configuration detection and error screen fallback
- **`auth.js`** — Wraps Supabase Auth: `signUp()`, `signIn()`, `signOut()`, `getStoredUser()`, `onAuthStateChange()`, plus `requestPasswordReset()`, `verifyResetCode()` and `updatePassword()`
- **`recovery.js`** — Parses recovery deep links (`parseRecoveryUrl()`) and exchanges tokens/codes for a session (`completeRecoveryFromUrl()`)
- **`api.js`** — CRUD and RPC operations: skills, availability, availability hours, requests, sessions, reviews, wallet, learning interests, style preferences, avatar upload, and the session lifecycle (`requestSession`, `respondToRequest`, `scheduleSession`, `checkInSession`, `confirmSessionSide`, `finalizeStaleSessions`, `completeSession`, `cancelSession`)
- **`swapService.js`** — Server-side RPCs for Skill Match: `getNextCandidates()`, `swipe()`, `fetchSwipeHistory()`, `fetchMatches()`, preferences, `blockUser()`, `undoLastSwipe()`, `unmatch()`
- **`chatService.js`** — Match messaging: `fetchMessages()`, `sendMessage()`, `getMatchDetails()`, `findMatchIdBetweenUsers()`, and `subscribeToMessages()` (Supabase Realtime)
- **`bountyService.js`** — Bounty board: `getBounties()`, `createBounty()`, `makeOffer()`, `respondToOffer()`, plus trade RPCs (`acceptOffer()`, `confirmTradeSide()`)
- **`gamificationService.js`** — `getUserStats()`, `awardXpAndStreak()`, `getSessionsThisWeek()`, endorsements, and a unified rewards history feed

All service functions use Supabase's query builder pattern with error propagation via throw-on-error semantics.

### 1.5 State Management

| Store | Technology | Purpose |
|-------|-----------|---------|
| AuthContext | React Context | User session, login/logout, profile updates |
| WalletContext | React Context + React Query | Token balance, transaction history, spend/earn tracking |
| swapStore | Zustand | Swipe candidates, current index, matches, swipe history, preferences |
| queryClient | TanStack React Query | Server cache for skills, sessions, requests, stats; cache cleared on user change |

React Query is wired to React Native's `AppState` so queries refetch when the app foregrounds and retry is paused while backgrounded.

---

## 2. Improved User Interface Design

### 2.1 Design System

A centralized design token system ensures visual consistency across all screens. All tokens are defined in `src/utils/constants.js`:

#### Color Palette

| Token | Hex Value | Purpose |
|-------|-----------|---------|
| `primary` | #6C5CE7 | Primary brand color (buttons, links, active states) |
| `primaryDark` | #5849C2 | Pressed/hover state variant |
| `primaryLight` | #EDEBFC | Light background tint |
| `secondary` | #00B894 | Success/confirmation actions |
| `secondaryLight` | #E3FBF5 | Light success background |
| `token` | #F5A623 | Token/wallet accent (gold) |
| `tokenLight` | #FEF3DE | Light token background |
| `danger` | #D64034 | Destructive actions, errors |
| `dangerLight` | #FDECEA | Light danger background |
| `success` | #00B894 | Success states |
| `background` | #F7F7FB | Screen background |
| `surface` | #FFFFFF | Card/surface background |
| `border` | #E8E8ED | Borders and dividers |
| `text` | #1A1A1A | Primary text |
| `textMuted` | #5A6270 | Secondary/muted text (WCAG AA on background/surface) |
| `textFaint` | #6F6F79 | Placeholder/hint text (WCAG AA on background/surface) |
| `white` | #FFFFFF | On-color text (e.g. on primary/danger) |
| `overlay` | rgba(26,26,26,0.5) | Modal overlays |

Muted/faint tones were darkened from earlier values (and `danger` adjusted to #D64034) so that all text pairs clear the WCAG AA 4.5:1 contrast ratio — this is asserted by a test.

#### Typography Scale

| Token | Size | Usage |
|-------|------|-------|
| `xs` | 12px | Captions, labels |
| `sm` | 14px | Secondary text |
| `md` | 16px | Body text (base) |
| `lg` | 18px | Subheadings |
| `xl` | 22px | Section headings |
| `xxl` | 28px | Page titles |
| `xxxl` | 34px | Hero text |

#### Spacing Scale

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `xxl` | 48px |

#### Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Small elements (badges) |
| `md` | 12px | Cards, inputs |
| `lg` | 16px | Modals, large cards |
| `xl` | 24px | Feature containers |
| `round` | 999px | Pill buttons, avatars |

#### Shadow System

```javascript
{
  shadowColor: '#1A1A1A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3
}
```

### 2.2 Reusable Component Library

Eight reusable UI components form the foundation of the interface:

| Component | File | Description |
|-----------|------|-------------|
| **Button** | `ui/Button.js` | Primary/secondary/outline/danger variants with loading state |
| **Card** | `ui/Card.js` | Surface container with optional press handler and shadow |
| **Input** | `ui/Input.js` | Text input with label, error state, icon support, and a password show/hide toggle |
| **Badge** | `ui/Badge.js` | Status indicator with 4 tones: neutral, success, warning, danger |
| **Avatar** | `ui/Avatar.js` | Profile image with automatic initials fallback when no URI provided |
| **LoadingSpinner** | `ui/LoadingSpinner.js` | Activity indicator wrapper |
| **Modal** | `ui/Modal.js` | Overlay dialog with backdrop |
| **ErrorState** | `ui/ErrorState.js` | Standard error display with retry action |

### 2.3 Feature-Specific Components

| Component | Purpose |
|-----------|---------|
| `TokenBalance` | Displays wallet balance with singular/plural token text |
| `SkillCard` | Skill listing card with title, category badge, teacher info |
| `SwipeCard` | Tinder-style swipeable profile card for Skill Match |
| `SwipeActions` | Like/dislike/undo action buttons |
| `MatchCard` | Displays matched user with skill overlap details |
| `SwapEmptyState` | Empty state when no candidates are available |
| `SessionCard` | Session summary card with status badge and role label |
| `QRCodeDisplay` | Compact, time-limited QR code for session check-in |
| `AddToCalendarModal` | Google Calendar / Outlook / `.ics` export options |
| `LoginForm` | Authentication form with validation |
| `BountyCard` | Bounty listing with offers, accept, and trade-confirmation UI |
| `CreateBountyModal` | Form to post a new bounty with live validation |
| `SkillPassport` | Grid of endorsement badge stamps |
| `BadgeGrid`, `StreakCard`, `StreakBanner`, `XPProgressBar`, `RewardsHistory` | Gamification widgets |

### 2.4 Screen Inventory (32 route screens)

| Module | Screens |
|--------|---------|
| **Auth** (5) | Welcome, Login, Register, Reset Password, Verify Code |
| **Onboarding** (3) | Teach, Learn, Style Preferences |
| **Main Tabs** (6) | Home, Explore, Swap, Messages, Wallet, Profile |
| **Skills** (3) | Skill Detail, Add Skill, My Skills |
| **Sessions** (4) | Session List, Session Detail, Check-In, Leave Review |
| **Requests** (2) | Request List, Book Appointment |
| **Swap** (4) | Swap Details, Swap Results, Swap History, Swap Settings |
| **Wallet** (1) | Transaction History |
| **Profile** (1) | Public Profile |
| **Chat** (1) | Match Chat |
| **Passport** (1) | Skill Passport |
| **Settings** (1) | App Settings |

(Plus `ConfigErrorScreen`, a fallback shown when Supabase isn't configured — 33 screen components in total.)

### 2.5 UI Improvements Implemented

1. **Consistent Design Tokens** — All colors, spacing, typography, and radii centralized in `constants.js`; no hardcoded values in components
2. **WCAG AA Contrast** — Muted/faint text and on-color text verified to meet the 4.5:1 contrast ratio
3. **Avatar Fallback System** — Automatic initials rendering when no profile image exists (handles single-word, multi-word, and empty names)
4. **Semantic Badge Tones** — Four distinct visual tones (neutral, success, warning, danger) for status indicators throughout the app
5. **Token Wallet Integration** — Real-time balance display with proper singular/plural grammar ("1 time token" vs "5 time tokens")
6. **Swipe Card Animations** — Smooth card slide and rotation via `react-native-reanimated` with gesture-driven interactions
7. **Session Status Labels** — User-friendly status mapping (pending → "Upcoming", completed → "Completed", cancelled → "Cancelled")
8. **QR Check-In** — Compact, auto-refreshing, time-limited QR codes for session verification
9. **Gamification Surfaces** — XP progress bar, streak card/banner with countdown, badge grid, and passport stamps
10. **Bounty Urgency Badges** — Colour-coded urgent / this-week / flexible labels and token vs swap reward pills
11. **Category-Based Discovery** — 10 skill categories with visual filtering in the Explore screen
12. **Responsive Card Layouts** — Consistent card structure across skill, session, match, and bounty cards
13. **Loading & Error States** — Dedicated `LoadingSpinner` and `ErrorState` components for async operations
14. **Configuration Error Screen** — `ConfigErrorScreen` for missing Supabase configuration
15. **Messages Inbox** — Conversation list with avatar, last-message preview, relative timestamp, and pull-to-refresh; refetches on screen focus and re-sorts by recent activity

---

## 3. Updated Data Design

### 3.1 Database Platform

**Supabase** — A hosted PostgreSQL platform providing:
- PostgreSQL 15+ database with pgcrypto extension
- Supabase Auth for authentication (including email OTP recovery)
- Row-Level Security (RLS) for data access control
- Supabase Realtime for match messaging
- Supabase Storage for file uploads (avatars)
- RPC functions for server-side business logic

### 3.2 Complete Entity-Relationship Design

#### 3.2.1 Core Entities

##### `users` — User Profiles
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → auth.users(id) ON DELETE CASCADE | Matches Supabase Auth user ID |
| `name` | TEXT | NOT NULL | Display name |
| `email` | TEXT | NOT NULL, UNIQUE | Contact email |
| `avatar` | TEXT | NULLABLE | Profile image URL |
| `bio` | TEXT | NULLABLE | User biography |
| `rating` | NUMERIC(3,2) | NOT NULL, DEFAULT 0 | Computed average rating |
| `review_count` | INTEGER | NOT NULL, DEFAULT 0 | Computed review count |
| `is_admin` | BOOLEAN | NOT NULL, DEFAULT false | Admin flag |
| `xp` | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Gamification experience points |
| `streak_weeks` | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Consecutive active ISO weeks |
| `last_active_week` | TEXT | NULLABLE | ISO week string, e.g. "2026-W41" |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |

**Trigger:** `on_auth_user_created` — Automatically creates profile + wallet + welcome bonus when a new user signs up via Supabase Auth.

##### `token_wallet` — Token Balances
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `wallet_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → users ON DELETE CASCADE | Owner |
| `balance` | INTEGER | NOT NULL, DEFAULT 0, CHECK (balance >= 0) | Current token count |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last balance change |

##### `skills` — Skill Listings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `skill_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Teacher/owner |
| `title` | TEXT | NOT NULL, CHECK (char_length >= 3) | Skill name |
| `description` | TEXT | NULLABLE | Detailed description |
| `category` | TEXT | NOT NULL | One of 10 predefined categories |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

##### `availability` — Bookable Time Slots
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `availability_id` | UUID | PK | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Teacher |
| `skill_id` | UUID | NOT NULL, FK → skills ON DELETE CASCADE | Related skill |
| `start_time` | TIMESTAMPTZ | NOT NULL | Slot start |
| `end_time` | TIMESTAMPTZ | NOT NULL, CHECK (end > start) | Slot end |
| `booked` | BOOLEAN | NOT NULL, DEFAULT false | Booking status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Constraints:** UNIQUE(skill_id, start_time) — prevents duplicate slots.

##### `availability_hours` — Weekly Recurring Template
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `hours_id` | UUID | PK | Unique identifier |
| `skill_id` | UUID | NOT NULL, FK → skills ON DELETE CASCADE | Related skill |
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Teacher |
| `day_of_week` | SMALLINT | NOT NULL, CHECK (0–6) | 0=Sunday, 6=Saturday |
| `start_time` | TIME | NOT NULL | Daily start time |
| `end_time` | TIME | NOT NULL, CHECK (end > start) | Daily end time |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Function:** `generate_availability_slots()` — Expands weekly hours into concrete 1-hour availability rows for a rolling 14-day window.

#### 3.2.2 Session & Booking Entities

##### `sessions` — Confirmed Bookings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `session_id` | UUID | PK | Unique identifier |
| `availability_id` | UUID | NOT NULL, UNIQUE, FK → availability ON DELETE CASCADE | Primary slot |
| `teacher_id` | UUID | NOT NULL, FK → users(user_id) | Teacher |
| `learner_id` | UUID | NOT NULL, FK → users(user_id) | Learner |
| `session_date` | TIMESTAMPTZ | NOT NULL | Scheduled date/time |
| `duration` | INTEGER | NOT NULL, DEFAULT 60, CHECK > 0 | Duration in minutes |
| `status` | session_status | NOT NULL, DEFAULT 'pending' | pending/completed/cancelled |
| `teacher_checked_in_at` | TIMESTAMPTZ | NULLABLE | Teacher QR check-in time |
| `learner_checked_in_at` | TIMESTAMPTZ | NULLABLE | Learner QR check-in time |
| `teacher_confirmed_at` | TIMESTAMPTZ | NULLABLE | Teacher trade confirmation |
| `learner_confirmed_at` | TIMESTAMPTZ | NULLABLE | Learner trade confirmation |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Constraint:** CHECK (teacher_id <> learner_id) — prevents self-booking.

##### `session_availability` — Multi-Slot Linking
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `session_id` | UUID | NOT NULL, FK → sessions ON DELETE CASCADE | Session |
| `availability_id` | UUID | NOT NULL, FK → availability ON DELETE CASCADE | Consumed slot |

**Primary Key:** (session_id, availability_id) — Junction table for multi-hour sessions spanning multiple contiguous slots.

##### `session_requests` — Booking Request Pipeline
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `request_id` | UUID | PK | Unique identifier |
| `skill_id` | UUID | NOT NULL, FK → skills ON DELETE CASCADE | Requested skill |
| `teacher_id` | UUID | NOT NULL, FK → users(user_id) | Skill owner |
| `learner_id` | UUID | NOT NULL, FK → users(user_id) | Requester |
| `message` | TEXT | NULLABLE | Request message |
| `status` | request_status | NOT NULL, DEFAULT 'pending' | pending/accepted/declined/scheduled |
| `session_id` | UUID | NULLABLE, FK → sessions ON DELETE SET NULL | Created session |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Request timestamp |
| `responded_at` | TIMESTAMPTZ | NULLABLE | Teacher response time |

**Constraint:** CHECK (teacher_id <> learner_id)

#### 3.2.3 Token Economy Entities

##### `token_transactions` — Token Ledger
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `transaction_id` | UUID | PK | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Account holder |
| `session_id` | UUID | NULLABLE, FK → sessions ON DELETE SET NULL | Related session |
| `type` | transaction_type | NOT NULL | 'earn' or 'spend' |
| `amount` | INTEGER | NOT NULL | Positive for earn, negative for spend |
| `description` | TEXT | NULLABLE | Human-readable description |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Transaction timestamp |

**Constraint:** Sign check — earn must be positive, spend must be negative.

#### 3.2.4 Social & Discovery Entities

##### `reviews` — Session Reviews
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `review_id` | UUID | PK | Unique identifier |
| `session_id` | UUID | NOT NULL, FK → sessions ON DELETE CASCADE | Reviewed session |
| `reviewer_id` | UUID | NOT NULL, FK → users(user_id) | Review author |
| `reviewee_id` | UUID | NOT NULL, FK → users(user_id) | Review subject |
| `rating` | INTEGER | NOT NULL, CHECK (1–5) | Star rating |
| `comment` | TEXT | NULLABLE | Written review |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Review timestamp |

**Constraints:** One review per reviewer per session; reviewer ≠ reviewee.

**Trigger:** `reviews_refresh_rating` — Automatically recalculates `users.rating` and `users.review_count` on review insert/update/delete.

##### `endorsements` — Skill Passport Badges
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `endorsement_id` | UUID | PK | Unique identifier |
| `session_id` | UUID | NOT NULL, FK → sessions ON DELETE CASCADE | Source session |
| `reviewer_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Endorser |
| `reviewee_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Endorsed user |
| `badge_key` | TEXT | NOT NULL | One of 6 endorsement badges |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Timestamp |

**Constraints:** UNIQUE(session_id, reviewer_id, badge_key); reviewer ≠ reviewee.

##### `learning_interests` — Onboarding Preferences
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `interest_id` | UUID | PK | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | User |
| `category` | TEXT | NOT NULL | Skill category |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Constraint:** UNIQUE(user_id, category) — one interest per category per user.

##### `swipes` — Swipe Actions
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `swipe_id` | UUID | PK | Unique identifier |
| `swiper_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Swiper |
| `target_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Swiped user |
| `direction` | swipe_direction | NOT NULL | 'left', 'right', or 'maybe' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Swipe timestamp |

**Constraints:** UNIQUE(swiper_id, target_id); swiper ≠ target.

##### `matches` — Mutual Matches
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `match_id` | UUID | PK | Unique identifier |
| `user_id_1` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Lower UUID (ordered) |
| `user_id_2` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Higher UUID (ordered) |
| `matched_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Match timestamp |

**Constraints:** UNIQUE(user_id_1, user_id_2); CHECK (user_id_1 < user_id_2) — canonical ordering.

##### `messages` — Match Chat
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `message_id` | UUID | PK | Unique identifier |
| `match_id` | UUID | NOT NULL, FK → matches ON DELETE CASCADE | Conversation |
| `sender_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Author |
| `content` | TEXT | NOT NULL, CHECK (1–2000 chars, non-empty) | Message body |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Sent timestamp |

**Realtime:** Added to the `supabase_realtime` publication so both participants receive new messages live.

##### `blocked_users` — User Blocking
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Blocker |
| `blocked_user_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Blocked user |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Block timestamp |

**Primary Key:** (user_id, blocked_user_id)

##### `swap_preferences` — Match Settings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users ON DELETE CASCADE | User |
| `skill_category` | TEXT | NULLABLE | Preferred category filter |
| `notifications_enabled` | BOOLEAN | NOT NULL, DEFAULT true | Notification toggle |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

##### `style_preferences` — Teaching/Learning Style
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | UUID | PK, FK → users ON DELETE CASCADE | User |
| `teach_pace` | SMALLINT | CHECK (1–5) | Preferred teaching speed |
| `teach_structure` | SMALLINT | CHECK (1–5) | Preferred lesson structure |
| `teach_formats` | TEXT[] | DEFAULT '{}' | Preferred teaching formats |
| `learn_pace` | SMALLINT | CHECK (1–5) | Preferred learning speed |
| `learn_structure` | SMALLINT | CHECK (1–5) | Preferred lesson structure |
| `learn_formats` | TEXT[] | DEFAULT '{}' | Preferred learning formats |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last update |

#### 3.2.5 Bounty Board Entities

##### `bounties` — Reverse Learning Requests
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `bounty_id` | UUID | PK | Unique identifier |
| `creator_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Poster |
| `title` | TEXT | NOT NULL, CHECK (5–120 chars) | Request title |
| `description` | TEXT | NOT NULL, CHECK (≥ 10 chars) | Details |
| `category` | TEXT | NOT NULL | Skill category |
| `reward_type` | TEXT | NOT NULL, DEFAULT 'token', CHECK (token/swap) | Reward kind |
| `token_amount` | INTEGER | NOT NULL, DEFAULT 1, CHECK ≥ 1 | Tokens offered |
| `urgency` | TEXT | NOT NULL, DEFAULT 'flexible', CHECK (urgent/this_week/flexible) | Urgency |
| `status` | TEXT | NOT NULL, DEFAULT 'open', CHECK (open/in_progress/completed/cancelled) | State |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Updated |

**Trigger:** `bounties_guard_completion` — a `swap`-reward bounty can only become `completed` once a `completed` trade exists for it.

##### `bounty_offers` — Offers to Help
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `offer_id` | UUID | PK | Unique identifier |
| `bounty_id` | UUID | NOT NULL, FK → bounties ON DELETE CASCADE | Target bounty |
| `helper_id` | UUID | NOT NULL, FK → users ON DELETE CASCADE | Helper |
| `message` | TEXT | NULLABLE | Optional note |
| `status` | TEXT | NOT NULL, DEFAULT 'pending', CHECK (pending/accepted/declined) | Offer state |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Created |

**Constraint:** UNIQUE(bounty_id, helper_id) — one offer per helper per bounty.

##### `trades` — Verified Skill Swaps
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `trade_id` | UUID | PK | Unique identifier |
| `bounty_id` | UUID | NOT NULL, UNIQUE, FK → bounties ON DELETE CASCADE | Source bounty |
| `creator_id` | UUID | NOT NULL, FK → users(user_id) | Bounty creator |
| `helper_id` | UUID | NOT NULL, FK → users(user_id) | Accepted helper |
| `status` | TEXT | NOT NULL, DEFAULT 'in_progress', CHECK (in_progress/completed/cancelled) | State |
| `creator_confirmed_at` | TIMESTAMPTZ | NULLABLE | Creator confirmation |
| `helper_confirmed_at` | TIMESTAMPTZ | NULLABLE | Helper confirmation |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Created |
| `updated_at` | TIMESTAMPTZ | NULLABLE | Updated |

**Constraint:** CHECK (creator_id <> helper_id).

### 3.3 Enum Types

```sql
CREATE TYPE session_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('earn', 'spend');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'scheduled');
CREATE TYPE swipe_direction AS ENUM ('left', 'right', 'maybe');
```

(Bounties, offers and trades use text columns with CHECK constraints rather than enum types.)

### 3.4 Database Indexes

**21 tables** are covered by **~33 indexes**, including:

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `skills_user_id_idx` | skills | user_id | Lookup skills by teacher |
| `skills_category_idx` | skills | category | Category filtering |
| `availability_skill_id_idx` | availability | skill_id | Slot lookup by skill |
| `availability_unbooked_idx` | availability | skill_id WHERE NOT booked | Fast unbooked slot query |
| `availability_hours_*_idx` | availability_hours | skill_id, user_id | Hours template lookup |
| `sessions_teacher_id_idx` / `sessions_learner_id_idx` | sessions | teacher_id / learner_id | A user's sessions |
| `session_availability_session_id_idx` | session_availability | session_id | Slot links per session |
| `session_requests_*_idx` | session_requests | teacher_id, learner_id | Incoming/outgoing requests |
| `reviews_reviewee_id_idx` | reviews | reviewee_id | Reviews for a user |
| `token_transactions_user_id_idx` | token_transactions | user_id | Wallet history |
| `learning_interests_user_id_idx` | learning_interests | user_id | Interest lookup |
| `swipes_swiper_id_idx` / `swipes_target_id_idx` | swipes | swiper_id / target_id | Swipe history |
| `matches_user_id_1_idx` / `matches_user_id_2_idx` | matches | user_id_1 / user_id_2 | Match lookup |
| `messages_match_id_idx`, `messages_sender_id_idx`, `messages_match_created_idx` | messages | match_id, sender_id, (match_id, created_at) | Chat history & live feed |
| `bounties_creator_id_idx`, `bounties_category_idx`, `bounties_status_idx`, `bounties_created_at_idx` | bounties | creator_id, category, status, created_at | Bounty browsing |
| `bounty_offers_bounty_id_idx`, `bounty_offers_helper_id_idx` | bounty_offers | bounty_id, helper_id | Offers per bounty/helper |
| `endorsements_reviewee_id_idx`, `endorsements_badge_key_idx` | endorsements | reviewee_id, badge_key | Passport badge tally |
| `trades_status_idx`, `trades_creator_id_idx`, `trades_helper_id_idx` | trades | status, creator_id, helper_id | Trade lookup |

### 3.5 Server-Side Functions (RPCs) & Triggers

| Function | Purpose | Parameters |
|----------|---------|------------|
| `handle_new_user()` | Trigger: create profile + wallet + bonus on signup | (auto via trigger) |
| `refresh_user_rating()` | Trigger: recalculate user rating from reviews | (auto via trigger) |
| `bounties_guard_completion()` | Trigger: block swap-bounty completion without a confirmed trade | (auto via trigger) |
| `request_session()` | Learner requests to book a skill | p_skill_id, p_message |
| `respond_to_request()` | Teacher accepts/declines a request | p_request_id, p_accept |
| `schedule_session()` | Learner picks contiguous slots, spends tokens, creates session | p_request_id, p_availability_ids[] |
| `check_in_session()` | Record a party's QR check-in (validates code expiry) | p_session_id, p_owner_role, p_code_exp |
| `confirm_session_side()` | A participant confirms the trade happened | p_session_id |
| `complete_session()` | Teacher marks session complete, earns tokens | p_session_id |
| `finalize_stale_sessions()` | Lazy 72h sweep: auto-complete eligible sessions | (none) |
| `cancel_session()` | Cancel pending session, refund tokens | p_session_id |
| `generate_availability_slots()` | Expand weekly hours into 1-hour slots | p_skill_id, p_days_ahead |
| `set_availability_hours()` | Replace weekly hours template + regenerate slots | p_skill_id, p_hours (jsonb) |
| `record_swipe()` | Record swipe, create match on mutual right-swipe | p_target_id, p_direction |
| `get_swap_candidates()` | Discovery pool with compatibility scoring | p_limit |
| `undo_last_swipe()` | Reverse most recent swipe | (none) |
| `unmatch()` | Break match, clear swipe history for both | p_match_id |
| `award_xp_and_streak()` | Add XP and advance/refresh the weekly streak | p_user_id, p_xp_amount |
| `accept_bounty_offer()` | Accept an offer, open a verified trade | p_bounty_id, p_offer_id |
| `confirm_trade_side()` | Confirm one side of a trade; completes when both do | p_trade_id |

### 3.6 Row-Level Security (RLS)

RLS is enabled on every table (21). Key policies:

| Table | Read Policy | Write Policy |
|-------|-------------|--------------|
| `users` | Public directory | Self-edit; admin moderate |
| `token_wallet` | Own wallet only | Admin view |
| `skills` | Public browse | Owner CRUD |
| `availability` | Public browse | Owner CRUD |
| `availability_hours` | Public browse | Owner CRUD |
| `sessions` | Participants + admin | Via SECURITY DEFINER functions |
| `session_requests` | Participants only | Via SECURITY DEFINER functions |
| `reviews` | Public read | Participants after completion |
| `endorsements` | Public read | Reviewer insert only |
| `token_transactions` | Own transactions only | Admin view |
| `learning_interests` | Public read | Owner insert/delete |
| `swipes` | Own swipes only | Via SECURITY DEFINER functions |
| `matches` | Both participants | Via SECURITY DEFINER functions |
| `messages` | Match participants only | Match participants (sender = self) |
| `blocked_users` | Self only | Self-managed |
| `swap_preferences` | Self only | Self-managed |
| `style_preferences` | Public read | Owner write |
| `bounties` | Public read | Creator CRUD |
| `bounty_offers` | Creator + helper | Helper insert (non-creator); creator updates status |
| `trades` | Participants only | Via SECURITY DEFINER functions |

### 3.7 Storage — Avatar Bucket

- **Bucket:** `avatars` (public)
- **Structure:** `avatars/<user_id>/avatar.<ext>` (single file per user, uploaded with `upsert`)
- **Policies:** Public read; owner-only write/update/delete
- **Upload Flow:** Client converts the picked image to an ArrayBuffer (from base64 on Android to avoid a broken `file://` fetch) → uploads to Supabase Storage → stamps the public URL with a cache-busting `?t=` param → updates `users.avatar`

### 3.8 Entity-Relationship Summary

```
auth.users ──(1:1)──► users ──(1:1)──► token_wallet
                        │
                        ├──(1:N)──► skills ──(1:N)──► availability
                        │              │                  │
                        │              │                  ├──(M:N)──► session_availability
                        │              │                  │
                        │              ├──(1:N)──► availability_hours
                        │              │
                        │              └──(1:N)──► session_requests
                        │                              │
                        ├──(1:N)──► sessions ◄──────────┘
                        │              │
                        │              ├──(1:N)──► token_transactions
                        │              ├──(1:N)──► reviews ──(1:N)──► endorsements
                        │              └──(1:N)──► session_availability
                        │
                        ├──(1:N)──► learning_interests
                        ├──(1:N)──► swipes
                        ├──(1:N)──► blocked_users
                        ├──(1:N)──► bounties ──(1:N)──► bounty_offers
                        │                    └──(1:1)──► trades
                        ├──(1:1)──► swap_preferences
                        └──(1:1)──► style_preferences

matches ──(1:N)──► messages
```

---

## 4. Testing the System/Subsystem

### 4.1 Testing Framework & Configuration

| Component | Tool |
|-----------|------|
| Test Runner | Jest (via jest-expo preset) |
| React Native Testing | @testing-library/react-native |
| Mocking | Jest built-in mocks + Proxy-based Supabase mock |
| Module Mocks | `__mocks__/@expo/vector-icons.js`, `__mocks__/react-native-qrcode-svg` (inline) |

**Configuration:** Jest is configured with the `jest-expo` preset, enabling proper handling of React Native modules and Expo-specific imports. The test suite runs with `npx jest`.

### 4.2 Test Suite Overview

**20 test files** covering 5 subsystems:

| Subsystem | Test Files | Test Cases |
|-----------|------------|------------|
| Utilities | `helpers`, `constants`, `alert`, `calendar` | 70 |
| Store | `swapStore`, `WalletContext` | 13 |
| Components | `uiComponents`, `featureCards`, `Button`, `Input`, `bountyCard`, `createBountyModal`, `qrCodeDisplay` | 39 |
| Services | `api`, `swapService`, `bountyService`, `chatService`, `recovery`, `auth` | 77 |
| Hooks | `useMatchingLogic` | 6 |
| **Total** | **20 files** | **~212 test cases** |

### 4.3 Test Categories & Case Descriptions

#### 4.3.1 Utility Function Tests

**`helpers.test.js`** (39 tests) — `getInitials`, `capitalize`, `formatTokens` (singular/plural, sign handling, coercion, non-numeric fallback, decimals), `formatDate`, `formatTime`, `formatDateTime`, `timeAgo` (just now → years), `groupSlotsByDay`, `formatDuration`.

**`constants.test.js`** (16 tests) — `COLORS` values and hex format, a **WCAG AA contrast** check across 7 text/background pairs, ascending `SPACING`/`FONT_SIZES` scales, `RADII`, `SHADOW`, `SKILL_CATEGORIES` (non-empty, expected, no duplicates), `SESSION_STATUS` + labels, `TRANSACTION_TYPE`, `DEFAULT_SESSION_TOKEN_COST`.

**`alert.test.js`** (7 tests) — `confirmAction` and `notify` on both web (`window.confirm`/`window.alert`) and native (`Alert.alert`), including destructive styling, empty title/message filtering, and dismiss callbacks.

**`calendar.test.js`** (8 tests) — `formatToUtcCompact`, `getCalendarEventData` (end time from duration, teacher/learner roles), `generateGoogleCalendarUrl`, `generateOutlookCalendarUrl`, RFC-5545 `generateIcsContent`, and `openGoogleCalendar` calling `Linking.openURL`.

#### 4.3.2 State Management Tests

**`swapStore.test.js`** (8 tests) — Initial state; `setCandidates`, `setCurrentIndex`, `addMatch` (prepends), `addSwipe` (LIFO), `setPreferences` (merge), `resetSwipeQueue` (preserves matches/history).

**`WalletContext.test.js`** (5 tests) — Wallet balance/transaction loading, refresh and error paths.

#### 4.3.3 Component Tests

**`uiComponents.test.js`** (13 tests) — `Badge` (label, unknown-tone fallback, all tones), `Avatar` (initials, URI suppresses initials, single-word, empty name), `Card` (children, pressable, static), `TokenBalance` (value, singular/plural).

**`featureCards.test.js`** (11 tests) — `SessionCard` (title, "Upcoming" mapping, Teaching/Learning roles, onPress, unknown-status fallback) and `SkillCard` (title/description/category, teacher name + rating, missing-teacher fallback, missing-rating em dash, onPress).

**`Button.test.js`** (5 tests) — Variants and pressed/disabled/loading behaviour.

**`Input.test.js`** (3 tests) — Password field hides by default, the show/hide toggle works and updates the accessibility label, and non-password fields render no toggle.

**`bountyCard.test.js`** (4 tests) — Creator can accept a pending swap offer; "Mark Completed" is hidden for swap bounties; a trade participant can confirm their side; a completed badge shows once both sides confirm.

**`createBountyModal.test.js`** (2 tests) — "Post Bounty" stays disabled with an explanatory message until minimums are met, then enables and submits with the expected payload.

**`qrCodeDisplay.test.js`** (1 test) — The QR payload encodes `sessionId`, `ownerRole`, `type: 'skillswap-session-checkin'`, and a future `codeExp` timestamp.

#### 4.3.4 Service Layer Tests

**`api.test.js`** (21 tests) — Uses a Proxy-based Supabase mock. Covers `getSkills` (success, error, category filter, search filter), `getSkillById`, `getSkillsByUser`, `addSkill`, `deleteSkill`, `getAvailabilityForSkill`, `getSessionsForUser` (availability→skill flattening), `getTransactions`, `setLearningInterests` (early return + delete-then-insert), `checkInSession`, `confirmSessionSide`, `finalizeStaleSessions`, and `uploadAvatar` (fetched file + base64-decode paths, timestamped URL).

**`swapService.test.js`** (15 tests) — `getNextCandidates` mapping/defaults/errors, `swipe` match reporting, `fetchSwipeHistory` (direction filter), `fetchMatches` (counterpart selection), swap preferences get/update, and `blockUser`/`undoLastSwipe`/`unmatch`.

**`bountyService.test.js`** (11 tests) — `getBounties` (mapping, verified trade mapping, errors), `createBounty` validation + insert, `deleteBounty`, `makeOffer`, `acceptOffer` (RPC), and `confirmTradeSide` (RPC).

**`chatService.test.js`** (17 tests) — `fetchMessages` (missing-id, mapping, error), `sendMessage` (empty rejection, trimming), `getMatchDetails` (both sides), `findMatchIdBetweenUsers` (ID ordering), `fetchConversations` (missing-id, no matches, counterpart/last-message mapping + newest-first sort, no-message fallback, matches/messages query errors), and `subscribeToMessages` (Realtime channel, listener, unsubscribe).

**`recovery.test.js`** (9 tests) — `parseRecoveryUrl` (hash tokens, PKCE code, error redirect, non-recovery URL) and `completeRecoveryFromUrl` (setSession, code exchange, friendly failures, ignore non-recovery).

**`auth.test.js`** (4 tests) — `requestPasswordReset` (OTP with `shouldCreateUser: false`, error) and `verifyResetCode` (recovery-type verification returning the profile, rejection).

#### 4.3.5 Hook Tests

**`useMatchingLogic.test.js`** (6 tests) — Undefined/null candidates → empty; no category filter → all; category filtering; no-match → empty; dynamic re-filtering on preference change.

### 4.4 Test Mocking Strategy

| Mock | File | Purpose |
|------|------|---------|
| `@expo/vector-icons` | `__mocks__/@expo/vector-icons.js` | Prevents native module errors in Jest |
| `react-native-qrcode-svg` | Inline mock in `qrCodeDisplay.test.js` | Captures the encoded QR payload |
| Supabase client | Inline `jest.mock()` | Replaces Supabase with a Proxy-based mock that records method calls |
| React Native modules | jest-expo preset | Auto-maps RN modules to Jest-compatible implementations |

### 4.5 Running Tests

```bash
# Run full test suite
npx jest

# Run with coverage
npm run coverage

# Run specific test file
npx jest __tests__/helpers.test.js

# Run tests matching a pattern
npx jest --testNamePattern="getSkills"
```

### 4.6 Test Results Summary

| Metric | Value |
|--------|-------|
| Total Test Files | 20 |
| Total Test Cases | ~212 |
| Subsystems Covered | Utilities, Store, Components, Services, Hooks |
| Mock Strategy | Proxy-based Supabase mock + RN module mocks |
| Framework | Jest + jest-expo + @testing-library/react-native |

### 4.7 Coverage Areas

| Area | Covered | Notes |
|------|---------|-------|
| Utility functions | ✅ Full | All helpers + calendar + alert + design tokens |
| Design tokens | ✅ Full | Colors (incl. WCAG AA contrast), spacing, typography, radii, shadows, categories, statuses |
| Zustand store | ✅ Full | All store actions verified |
| React Context | ✅ Partial | WalletContext tested |
| UI components | ✅ Core | Badge, Avatar, Card, TokenBalance, Button, Input, feature cards, bounty components, QR code |
| API service | ✅ Full | Skill/availability/session/wallet/avatar + check-in & confirmation RPCs |
| Swap service | ✅ Full | Candidate mapping, swipe, matches, preferences, block/undo/unmatch |
| Bounty service | ✅ Full | Bounties, offers, and trade RPCs |
| Chat service | ✅ Full | Conversation inbox, messaging + Realtime subscription |
| Recovery & auth | ✅ Full | OTP reset, code verification, deep-link recovery |
| Custom hooks | ✅ Full | useMatchingLogic filtering logic |
| Screen-level | ❌ Not yet | Screens use components that are individually tested |
| Integration/E2E | ❌ Not yet | Would require Detox or similar framework |

### 4.8 Testing Decisions & Rationale

1. **Proxy-based Supabase Mock** — Supabase's fluent query builder (`.from().select().eq().maybeSingle()`) is difficult to mock with simple `jest.fn()`. A `Proxy` intercepts any method call and chains them, recording calls for assertion while resolving with a configurable result.

2. **jest-expo Preset** — Required for proper React Native + Expo module resolution in Jest. Handles platform-specific imports and native module stubs.

3. **Component-Level Testing over E2E** — Unit tests for individual components provide faster feedback and more precise failure isolation. E2E tests (e.g. Detox) could be added later for full user-flow validation.

4. **Contrast Assertions** — Rather than only eyeballing colours, the design tokens are tested against the WCAG AA 4.5:1 ratio so future palette tweaks can't silently break readability.

5. **Test File Organization** — Mirrors the source structure (`__tests__/components/`, `__tests__/services/`, `__tests__/store/`) for easy navigation.

---

*Document generated from the SkillSwap codebase — latest commit: `8ec3224 "final touches"`*
