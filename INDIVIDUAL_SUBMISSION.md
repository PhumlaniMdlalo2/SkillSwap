# SkillSwap — Individual Submission

## Table of Contents

1. [Coding Progress](#1-coding-progress)
2. [Improved User Interface Design](#2-improved-user-interface-design)
3. [Updated Data Design](#3-updated-data-design)
4. [Testing the System/Subsystem](#4-testing-the-systemsubsystem)

---

## 1. Coding Progress

### 1.1 Project Overview

SkillSwap is a React Native (Expo SDK 54) mobile application that allows users to exchange skills through a time-token economy. Users teach skills to earn tokens and spend tokens to learn from others. The platform includes a Tinder-style "Skill Match" feature for discovering compatible skill partners.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 54 |
| Routing | expo-router (file-based) |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| State Management | React Context + Zustand |
| Animations | react-native-reanimated, gesture-handler |
| Icons | @expo/vector-icons |
| Testing | Jest + @testing-library/react-native |

### 1.2 Implemented Features

#### Authentication & Onboarding
- **Welcome Screen** — Entry point with login/register navigation
- **Registration** — Email/password signup with Supabase Auth; triggers automatic profile creation + 5-token welcome bonus
- **Login** — Email/password authentication with session persistence
- **Onboarding Flow** — Three-step wizard:
  1. **Teach** — Select skills to teach from 10 categories (Music, Cooking, Languages, Technology, Fitness, Art & Design, Business, Academics, Crafts, Wellness)
  2. **Learn** — Select learning interests by category
  3. **Style Preferences** — Set teaching/learning pace (1–5), structure (1–5), and preferred formats for compatibility matching

#### Core Skill Features
- **Home Screen** — Featured skills, quick actions, token balance display
- **Explore Screen** — Browse all available skills with category filtering and search
- **Skill Detail Screen** — View skill information, teacher profile, rating, availability, and reviews
- **Add Skill** — Create new skill listings with title, description, and category
- **My Skills** — Manage personal skill listings (view/delete)

#### Booking & Sessions
- **Request System** — Learners request to book a skill; teachers accept/decline
- **Availability Management** — Teachers set weekly recurring availability hours per skill; system auto-generates 1-hour booking slots for a rolling 14-day window
- **Session Scheduling** — Learners select contiguous time slots (supports multi-hour sessions); tokens deducted at 1 token per hour
- **Session Management** — View upcoming, completed, and cancelled sessions
- **Session Detail** — View session information with QR code display for verification
- **Session Completion** — Teachers mark sessions complete; tokens awarded to teacher
- **Session Cancellation** — Either party can cancel pending sessions with full token refund
- **Leave Review** — Rate and review after session completion (1–5 stars + comment)

#### Token Wallet
- **Wallet Screen** — Display current token balance
- **Transaction History** — Chronological list of all token earns/spends with descriptions
- **Welcome Bonus** — 5 tokens credited on account creation

#### Skill Match (Swipe Discovery)
- **Swipe Deck** — Tinder-style card swiping through compatible skill partners
- **Server-Side Matching** — Mutual right-swipes create matches via PostgreSQL RPC (`record_swipe()`); eliminates client-side prediction
- **Compatibility Scoring** — Candidates ranked by learning-style compatibility (pace, structure, format preferences) using server-side computation
- **Match Results** — Display matched users with skill overlap details
- **Match History** — View all past and current matches
- **Unmatch** — Remove a match and clear swipe history for both parties
- **Undo Last Swipe** — Reverse the most recent swipe action
- **Block Users** — Prevent specific users from appearing in discovery

#### Profile & Settings
- **Profile Screen** — View/edit own profile (name, bio, avatar)
- **Public Profile** — View other users' profiles with ratings, skills, and reviews
- **Avatar Upload** — Upload profile images to Supabase Storage with per-user folder isolation
- **Settings** — Application settings management

### 1.3 Project Structure

```
SkillSwap/
├── app/                              # expo-router file-based routes
│   ├── _layout.jsx                   # Root Stack navigator + providers
│   ├── index.jsx                     # Entry redirect
│   ├── settings.jsx                  # Settings page
│   ├── (auth)/                       # Authentication group
│   │   ├── welcome.jsx, login.jsx, register.jsx
│   ├── (onboarding)/                 # Onboarding group
│   │   ├── teach.jsx, learn.jsx, style.jsx
│   ├── (tabs)/                       # Main tab navigation
│   │   ├── index.jsx (Home), explore.jsx, swap.jsx, wallet.jsx, profile.jsx
│   ├── skills/                       # Skill management
│   │   ├── [id].jsx, add.jsx, my-skills.jsx
│   ├── sessions/                     # Session management
│   │   ├── index.jsx, [id]/index.jsx, [id]/review.jsx
│   ├── requests/                     # Booking requests
│   │   ├── index.jsx, [id]/schedule.jsx
│   ├── swap/                         # Skill Match feature
│   │   ├── [id].jsx, results.jsx, history.jsx, settings.jsx
│   ├── wallet/transactions.jsx       # Transaction history
│   └── profile/[id].jsx              # Public profile view
├── src/
│   ├── services/                     # Backend integration layer
│   │   ├── supabase.js              # Supabase client initialization
│   │   ├── auth.js                  # Authentication functions
│   │   ├── api.js                   # CRUD operations (skills, sessions, wallet)
│   │   └── swapService.js           # Swipe/match RPCs
│   ├── store/                       # State management
│   │   ├── AuthContext.jsx          # Auth state + user session
│   │   ├── WalletContext.jsx        # Token balance + transactions
│   │   ├── swapStore.js             # Zustand store for Skill Match
│   │   └── useAppHooks.js           # Shared app-level hooks
│   ├── hooks/                       # Custom React hooks
│   │   ├── useMatchingLogic.js      # Candidate filtering by preferences
│   │   ├── useSwipeGesture.js       # Pan gesture handling
│   │   └── useSwipeAnimation.js     # Card slide animations
│   ├── utils/
│   │   ├── constants.js             # Design tokens, categories, enums
│   │   ├── helpers.js               # Formatting, date, duration utilities
│   │   └── alert.js                 # Alert helper wrapper
│   ├── components/
│   │   ├── ui/                      # Reusable UI kit (7 components)
│   │   │   ├── Button.js, Card.js, Input.js, Badge.js
│   │   │   ├── Avatar.js, LoadingSpinner.js, Modal.js
│   │   ├── wallet/                  # TokenBalance component
│   │   ├── swap/                    # SwipeCard, SwipeActions, MatchCard, SwapEmptyState
│   │   ├── skills/                  # SkillCard component
│   │   ├── sessions/                # SessionCard, QRCodeDisplay
│   │   └── auth/                    # LoginForm component
│   └── screens/                     # Screen implementations (27 screens)
├── supabase/
│   ├── migrations/
│   │   ├── schema.sql               # Consolidated database schema
│   │   └── 002–011                  # Incremental migration history
│   └── seed.sql                     # Demo data (6 teachers, 7 skills)
├── __tests__/                       # Jest test suite (11 test files)
└── __mocks__/                       # Module mocks for testing
```

### 1.4 Services Layer Architecture

The application follows a clean service-layer pattern for backend communication:

- **`supabase.js`** — Initializes the Supabase client with URL and anon key from environment variables; includes configuration detection and error screen fallback
- **`auth.js`** — Wraps Supabase Auth methods: `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`, `updateProfile()`
- **`api.js`** — CRUD operations for core entities: `getSkills()`, `getSkillById()`, `addSkill()`, `deleteSkill()`, `getAvailabilityForSkill()`, `getSessionsForUser()`, `getTransactions()`, `setLearningInterests()`, `uploadAvatar()`
- **`swapService.js`** — Server-side RPCs for the Skill Match feature: `recordSwipe()`, `getCandidates()`, `undoLastSwipe()`, `unmatch()`

All service functions use Supabase's query builder pattern with error propagation via throw-on-error semantics.

### 1.5 State Management

| Store | Technology | Purpose |
|-------|-----------|---------|
| AuthContext | React Context | User session, login/logout, profile updates |
| WalletContext | React Context | Token balance, transaction history, spend/earn tracking |
| swapStore | Zustand | Swipe candidates, current index, matches, swipe history, preferences |

---

## 2. Improved User Interface Design

### 2.1 Design System

A centralized design token system ensures visual consistency across all 27 screens. All tokens are defined in `src/utils/constants.js`:

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
| `danger` | #E74C3C | Destructive actions, errors |
| `dangerLight` | #FDECEA | Light danger background |
| `success` | #00B894 | Success states |
| `background` | #F7F7FB | Screen background |
| `surface` | #FFFFFF | Card/surface background |
| `border` | #E8E8ED | Borders and dividers |
| `text` | #1A1A1A | Primary text |
| `textMuted` | #6B7280 | Secondary/muted text |
| `textFaint` | #A0A0AB | Placeholder/hint text |
| `overlay` | rgba(26,26,26,0.5) | Modal overlays |

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

Seven reusable UI components form the foundation of the interface:

| Component | File | Description |
|-----------|------|-------------|
| **Button** | `ui/Button.js` | Primary/secondary/outline/danger variants with loading state |
| **Card** | `ui/Card.js` | Surface container with optional press handler and shadow |
| **Input** | `ui/Input.js` | Text input with label, error state, and icon support |
| **Badge** | `ui/Badge.js` | Status indicator with 4 tones: neutral, success, warning, danger |
| **Avatar** | `ui/Avatar.js` | Profile image with automatic initials fallback when no URI provided |
| **LoadingSpinner** | `ui/LoadingSpinner.js` | Activity indicator wrapper |
| **Modal** | `ui/Modal.js` | Overlay dialog with backdrop |

### 2.3 Feature-Specific Components

| Component | Purpose |
|-----------|---------|
| `TokenBalance` | Displays wallet balance with singular/plural token text |
| `SkillCard` | Skill listing card with title, category badge, teacher info |
| `SwipeCard` | Tinder-style swipeable profile card for Skill Match |
| `SwipeActions` | Like/dislike/undo action buttons |
| `MatchCard` | Displays matched user with skill overlap details |
| `SwapEmptyState` | Empty state when no candidates are available |
| `SessionCard` | Session summary card with status badge |
| `QRCodeDisplay` | QR code for session verification |
| `LoginForm` | Authentication form with validation |

### 2.4 Screen Inventory (27 Screens)

| Module | Screens |
|--------|---------|
| **Auth** (3) | Welcome, Login, Register |
| **Onboarding** (3) | Teach, Learn, Style Preferences |
| **Main Tabs** (5) | Home, Explore, Swap, Wallet, Profile |
| **Skills** (3) | Skill Detail, Add Skill, My Skills |
| **Sessions** (4) | Session List, Session Detail, Leave Review, Book Appointment |
| **Requests** (2) | Request List, Schedule |
| **Swap** (4) | Swap Deck, Swap Results, Swap History, Swap Settings |
| **Wallet** (1) | Transaction History |
| **Profile** (1) | Public Profile |
| **Settings** (1) | App Settings |

### 2.5 UI Improvements Implemented

1. **Consistent Design Tokens** — All colors, spacing, typography, and radii centralized in `constants.js`; no hardcoded values in components
2. **Avatar Fallback System** — Automatic initials rendering when no profile image exists (handles single-word, multi-word, and empty names)
3. **Semantic Badge Tones** — Four distinct visual tones (neutral, success, warning, danger) for status indicators throughout the app
4. **Token Wallet Integration** — Real-time balance display with proper singular/plural grammar ("1 time token" vs "5 time tokens")
5. **Swipe Card Animations** — Smooth card slide and rotation via `react-native-reanimated` with gesture-driven interactions
6. **Session Status Labels** — User-friendly status mapping (pending → "Upcoming", completed → "Completed", cancelled → "Cancelled")
7. **QR Code Display** — Generated QR codes for session verification
8. **Category-Based Discovery** — 10 skill categories with visual filtering in the Explore screen
9. **Responsive Card Layouts** — Consistent card structure across skill listings, session cards, and match cards
10. **Loading States** — Dedicated `LoadingSpinner` component for async operations
11. **Error Handling Screen** — `ConfigErrorScreen` for Supabase configuration issues

---

## 3. Updated Data Design

### 3.1 Database Platform

**Supabase** — A hosted PostgreSQL platform providing:
- PostgreSQL 15+ database with pgcrypto extension
- Supabase Auth for authentication
- Row-Level Security (RLS) for data access control
- Supabase Storage for file uploads (avatars)
- Edge Functions / RPC for server-side business logic

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
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Account creation timestamp |

**Trigger:** `on_auth_user_created` — Automatically creates profile + wallet + welcome bonus when a new user signs up via Supabase Auth.

##### `token_wallet` — Token Balances
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `wallet_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, UNIQUE, FK → users(user_id) ON DELETE CASCADE | Owner |
| `balance` | INTEGER | NOT NULL, DEFAULT 0, CHECK (balance >= 0) | Current token count |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last balance change |

##### `skills` — Skill Listings
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `skill_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → users(user_id) ON DELETE CASCADE | Teacher/owner |
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

### 3.3 Enum Types

```sql
CREATE TYPE session_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('earn', 'spend');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined', 'scheduled');
CREATE TYPE swipe_direction AS ENUM ('left', 'right', 'maybe');
```

### 3.4 Database Indexes

| Index | Table | Column(s) | Purpose |
|-------|-------|-----------|---------|
| `skills_user_id_idx` | skills | user_id | Lookup skills by teacher |
| `skills_category_idx` | skills | category | Category filtering |
| `availability_skill_id_idx` | availability | skill_id | Slot lookup by skill |
| `availability_user_id_idx` | availability | user_id | Slot lookup by teacher |
| `availability_unbooked_idx` | availability | skill_id WHERE NOT booked | Fast unbooked slot query |
| `availability_hours_skill_id_idx` | availability_hours | skill_id | Hours template lookup |
| `availability_hours_user_id_idx` | availability_hours | user_id | Hours by teacher |
| `sessions_teacher_id_idx` | sessions | teacher_id | Teacher's sessions |
| `sessions_learner_id_idx` | sessions | learner_id | Learner's sessions |
| `session_availability_session_id_idx` | session_availability | session_id | Slot links per session |
| `session_requests_teacher_id_idx` | session_requests | teacher_id | Incoming requests |
| `session_requests_learner_id_idx` | session_requests | learner_id | Outgoing requests |
| `reviews_reviewee_id_idx` | reviews | reviewee_id | Reviews for a user |
| `token_transactions_user_id_idx` | token_transactions | user_id | Wallet history |
| `learning_interests_user_id_idx` | learning_interests | user_id | Interest lookup |
| `swipes_swiper_id_idx` | swipes | swiper_id | Swipe history |
| `swipes_target_id_idx` | swipes | target_id | Who swiped on me |
| `matches_user_id_1_idx` | matches | user_id_1 | Match lookup (left) |
| `matches_user_id_2_idx` | matches | user_id_2 | Match lookup (right) |

**Total: 19 indexes** — covering all foreign key relationships and frequently queried columns.

### 3.5 Server-Side Functions (RPCs)

| Function | Purpose | Parameters |
|----------|---------|------------|
| `handle_new_user()` | Trigger: create profile + wallet + bonus on signup | (auto via trigger) |
| `refresh_user_rating()` | Trigger: recalculate user rating from reviews | (auto via trigger) |
| `request_session()` | Learner requests to book a skill | p_skill_id, p_message |
| `respond_to_request()` | Teacher accepts/declines a request | p_request_id, p_accept |
| `schedule_session()` | Learner picks slots, spends tokens, creates session | p_request_id, p_availability_ids[] |
| `complete_session()` | Teacher marks session complete, earns tokens | p_session_id |
| `cancel_session()` | Cancel pending session, refund tokens | p_session_id |
| `generate_availability_slots()` | Expand weekly hours into 1-hour slots | p_skill_id, p_days_ahead |
| `set_availability_hours()` | Replace weekly hours template + regenerate slots | p_skill_id, p_hours (jsonb) |
| `record_swipe()` | Record swipe, create match on mutual right-swipe | p_target_id, p_direction |
| `get_swap_candidates()` | Discovery pool with compatibility scoring | p_limit |
| `undo_last_swipe()` | Reverse most recent swipe | (none) |
| `unmatch()` | Break match, clear swipe history for both | p_match_id |

### 3.6 Row-Level Security (RLS)

All 16 tables have RLS enabled. Key policies:

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
| `token_transactions` | Own transactions only | Admin view |
| `learning_interests` | Public read | Owner insert/delete |
| `swipes` | Own swipes only | Via SECURITY DEFINER functions |
| `matches` | Both participants | Via SECURITY DEFINER functions |
| `blocked_users` | Self only | Self-managed |
| `swap_preferences` | Self only | Self-managed |
| `style_preferences` | Public read | Owner write |

### 3.7 Storage — Avatar Bucket

- **Bucket:** `avatars` (public)
- **Structure:** `avatars/<user_id>/<filename>`
- **Policies:** Public read; owner-only write/update/delete
- **Upload Flow:** Client fetches file → uploads to Supabase Storage → generates timestamped public URL → updates `users.avatar`

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
                        │              ├──(1:N)──► reviews
                        │              └──(1:N)──► session_availability
                        │
                        ├──(1:N)──► learning_interests
                        ├──(1:N)──► swipes
                        ├──(1:N)──► blocked_users
                        ├──(1:1)──► swap_preferences
                        └──(1:1)──► style_preferences
```

---

## 4. Testing the System/Subsystem

### 4.1 Testing Framework & Configuration

| Component | Tool |
|-----------|------|
| Test Runner | Jest (via jest-expo preset) |
| React Native Testing | @testing-library/react-native |
| Mocking | Jest built-in mocks + Proxy-based Supabase mock |
| Module Mocks | `__mocks__/@expo/vector-icons.js` |

**Configuration:** Jest is configured with the `jest-expo` preset, enabling proper handling of React Native modules and Expo-specific imports.

### 4.2 Test Suite Overview

**11 test files** covering 4 subsystems:

| Subsystem | Test Files | Test Cases |
|-----------|------------|------------|
| Utilities | `helpers.test.js`, `constants.test.js`, `alert.test.js` | 38 |
| Store | `swapStore.test.js`, `WalletContext.test.js` | 14 |
| Components | `uiComponents.test.js`, `featureCards.test.js`, `Button.test.js` | 18 |
| Services | `api.test.js`, `swapService.test.js` | 20 |
| Hooks | `useMatchingLogic.test.js` | 6 |
| **Total** | **11 files** | **~96 test cases** |

### 4.3 Test Categories & Case Descriptions

#### 4.3.1 Utility Function Tests

**`helpers.test.js`** — Tests for 8 utility functions:

| Function | Tests | Coverage |
|----------|-------|----------|
| `getInitials()` | 6 | Empty input, single name, multi-word, extra whitespace, truncation to 2, case handling |
| `capitalize()` | 5 | Empty/falsy input, first-letter capitalization, already capitalized, preserves rest, single char |
| `formatTokens()` | 7 | Positive/negative amounts, singular/plural, zero, string coercion, non-numeric fallback, decimals |
| `formatDate()` | 2 | Valid date formatting, invalid date handling |
| `formatTime()` | 2 | Valid time formatting, invalid date handling |
| `formatDateTime()` | 2 | Combined date+time, invalid date |
| `timeAgo()` | 8 | Just now, minutes, hours, days, weeks, months, years, invalid date |
| `groupSlotsByDay()` | 4 | Empty input, same-day grouping, different-day separation, order preservation |
| `formatDuration()` | 3 | Sub-hour minutes, exact hours, hours+minutes |

**`constants.test.js`** — Tests for all design tokens:

| Token Group | Tests | Coverage |
|-------------|-------|----------|
| `COLORS` | 3 | Primary color value, semantic colors, hex format validation |
| `SPACING` | 2 | Ascending scale, xs=4 starting value |
| `RADII` | 1 | Key radius values |
| `FONT_SIZES` | 2 | Ascending scale, md=16 base size |
| `SHADOW` | 1 | Required shadow properties present |
| `SKILL_CATEGORIES` | 3 | Non-empty string array, expected categories, no duplicates |
| `SESSION_STATUS` | 2 | Correct status values, all statuses mapped to labels |
| `TRANSACTION_TYPE` | 1 | Earn and spend values |
| `DEFAULT_SESSION_TOKEN_COST` | 1 | Positive number value |

**`alert.test.js`** — Tests for the alert helper wrapper (1 test file).

#### 4.3.2 State Management Tests

**`swapStore.test.js`** — Zustand store for Skill Match (7 tests):

| Test | Description |
|------|-------------|
| Initial state | Verifies all default values (empty arrays, null preferences, loading=false) |
| `setCandidates()` | Replaces candidate list entirely |
| `setCurrentIndex()` | Updates the current swipe index |
| `addMatch()` | Prepends new match to the front of the array |
| `addSwipe()` | Prepends new swipe to history (LIFO order) |
| `setPreferences()` | Merges partial preferences without overwriting unset fields |
| `resetSwipeQueue()` | Clears candidates and resets index while preserving matches and history |

**`WalletContext.test.js`** — Tests for the wallet state context (test file).

#### 4.3.3 Component Tests

**`uiComponents.test.js`** — Reusable UI component tests (12 tests):

| Component | Tests | Coverage |
|-----------|-------|----------|
| `Badge` | 3 | Label rendering, unknown tone fallback, all defined tones render without crash |
| `Avatar` | 4 | Initials from full name, image URI suppresses initials, single-word name, empty name produces no initials |
| `Card` | 3 | Children rendering, pressable with onPress, static without onPress |
| `TokenBalance` | 3 | Balance value display, singular "token" for 1, plural "tokens" otherwise |

**`featureCards.test.js`** — Feature card component tests (test file).

**`Button.test.js`** — Button component tests (test file).

#### 4.3.4 Service Layer Tests

**`api.test.js`** — API service tests using Proxy-based Supabase mock (15 tests):

| Function | Tests | Coverage |
|----------|-------|----------|
| `getSkills()` | 4 | Success returns data, error throws, category filter, search filter |
| `getSkillById()` | 1 | Queries with maybeSingle and returns data |
| `getSkillsByUser()` | 1 | Filters by user_id |
| `addSkill()` | 1 | Inserts and returns created row with correct payload |
| `deleteSkill()` | 2 | Returns true on success, throws on error |
| `getAvailabilityForSkill()` | 1 | Filters unbooked slots ordered by start_time |
| `getSessionsForUser()` | 2 | Flattens nested availability→skill title, throws on error |
| `getTransactions()` | 1 | Orders transactions newest first |
| `setLearningInterests()` | 2 | Empty array returns early, full flow deletes-then-inserts |
| `uploadAvatar()` | 1 | Uploads file, generates timestamped URL, updates user profile |

**Mock Strategy:** The API tests use a `Proxy`-based mock that intercepts method calls (`.eq()`, `.select()`, `.insert()`, etc.) and records them for assertion, then resolves with the predefined result value. This allows testing the Supabase query builder chain without a live connection.

**`swapService.test.js`** — Swap service RPC tests (test file).

#### 4.3.5 Hook Tests

**`useMatchingLogic.test.js`** — Custom hook tests (6 tests):

| Test | Description |
|------|-------------|
| Undefined candidates | Returns empty list when input is undefined |
| Null candidates | Returns empty list when input is null |
| No category filter | Returns all candidates when skillCategory is null |
| Category filtering | Filters to only matching category |
| No matches | Returns empty list when no candidates match preference |
| Dynamic refiltering | Re-filters when category preference changes mid-lifecycle |

### 4.4 Test Mocking Strategy

| Mock | File | Purpose |
|------|------|---------|
| `@expo/vector-icons` | `__mocks__/@expo/vector-icons.js` | Prevents native module errors in Jest |
| Supabase client | Inline `jest.mock()` | Replaces Supabase with a Proxy-based mock that records method calls |
| React Native modules | jest-expo preset | Auto-maps RN modules to Jest-compatible implementations |

### 4.5 Running Tests

```bash
# Run full test suite
npx jest

# Run with coverage
npx jest --coverage

# Run specific test file
npx jest __tests__/helpers.test.js

# Run tests matching a pattern
npx jest --testNamePattern="getSkills"
```

### 4.6 Test Results Summary

| Metric | Value |
|--------|-------|
| Total Test Files | 11 |
| Total Test Cases | ~96 |
| Subsystems Covered | Utilities, Store, Components, Services, Hooks |
| Mock Strategy | Proxy-based Supabase mock + RN module mocks |
| Framework | Jest + jest-expo + @testing-library/react-native |

### 4.7 Coverage Areas

| Area | Covered | Notes |
|------|---------|-------|
| Utility functions | ✅ Full | All 8 helpers + all design tokens |
| Design tokens | ✅ Full | Colors, spacing, typography, radii, shadows, categories, statuses |
| Zustand store | ✅ Full | All store actions verified |
| React Context | ✅ Partial | WalletContext tested |
| UI components | ✅ Core 7 | Badge, Avatar, Card, TokenBalance, Button, feature cards |
| API service | ✅ Full | All 10 exported functions tested |
| Swap service | ✅ Full | RPC wrapper tests |
| Custom hooks | ✅ Full | useMatchingLogic filtering logic |
| Screen-level | ❌ Not yet | Screens use components that are individually tested |
| Integration/E2E | ❌ Not yet | Would require Detox or similar framework |

### 4.8 Testing Decisions & Rationale

1. **Proxy-based Supabase Mock** — Supabase's fluent query builder (`.from().select().eq().maybeSingle()`) is difficult to mock with simple `jest.fn()`. A `Proxy` intercepts any method call and chains them, recording calls for assertion while resolving with a configurable result.

2. **jest-expo Preset** — Required for proper React Native + Expo module resolution in Jest. Handles platform-specific imports and native module stubs.

3. **Component-Level Testing over E2E** — Unit tests for individual components provide faster feedback and more precise failure isolation. E2E tests (e.g., Detox) could be added later for full user-flow validation.

4. **Test File Organization** — Mirrors the source structure (`__tests__/components/`, `__tests__/services/`, `__tests__/store/`) for easy navigation.

---

*Document generated from the SkillSwap codebase — latest commit: `43807ed "Updated database and UI and added tests"`*
