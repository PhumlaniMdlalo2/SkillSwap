// Local demo data so the UI is fully browsable before the Supabase schema/backend is live.
// Shapes mirror the approved ERD (users, skills, availability, sessions, reviews, token_transactions).

export const MOCK_USERS = [
  {
    user_id: 'u1',
    name: 'Amara Ndlovu',
    email: 'amara@example.com',
    bio: 'Jazz pianist and vocal coach with 12 years of teaching experience.',
    avatar: 'https://i.pravatar.cc/300?img=47',
    rating: 4.9,
    review_count: 38,
  },
  {
    user_id: 'u2',
    name: 'Sipho Khumalo',
    email: 'sipho@example.com',
    bio: 'Full-stack developer. I teach React Native and Postgres basics.',
    avatar: 'https://i.pravatar.cc/300?img=12',
    rating: 4.8,
    review_count: 21,
  },
  {
    user_id: 'u3',
    name: 'Lerato Mokoena',
    email: 'lerato@example.com',
    bio: 'Home cook specializing in West-African cuisine. Let’s get cooking!',
    avatar: 'https://i.pravatar.cc/300?img=32',
    rating: 5.0,
    review_count: 15,
  },
  {
    user_id: 'u4',
    name: 'Thabo Dlamini',
    email: 'thabo@example.com',
    bio: 'Certified yoga & breathwork instructor.',
    avatar: 'https://i.pravatar.cc/300?img=51',
    rating: 4.7,
    review_count: 29,
  },
  {
    user_id: 'u5',
    name: 'Naledi Botha',
    email: 'naledi@example.com',
    bio: 'Watercolour painter, teaching beginner-friendly art sessions.',
    avatar: 'https://i.pravatar.cc/300?img=25',
    rating: 4.95,
    review_count: 44,
  },
  {
    user_id: 'u6',
    name: 'Kagiso Molefe',
    email: 'kagiso@example.com',
    bio: 'Spanish & French tutor, 8 years abroad.',
    avatar: 'https://i.pravatar.cc/300?img=60',
    rating: 4.85,
    review_count: 33,
  },
];

export const MOCK_SKILLS = [
  {
    skill_id: 's1',
    user_id: 'u1',
    title: 'Jazz Piano Fundamentals',
    description: 'Learn chord voicings, improvisation and jazz standards on piano.',
    category: 'Music',
    created_at: '2026-05-02T10:00:00Z',
  },
  {
    skill_id: 's2',
    user_id: 'u2',
    title: 'React Native for Beginners',
    description: 'Build your first mobile app with Expo and React Native.',
    category: 'Technology',
    created_at: '2026-05-10T10:00:00Z',
  },
  {
    skill_id: 's3',
    user_id: 'u3',
    title: 'West-African Cooking',
    description: 'Master jollof rice, suya spice blends and plantain dishes.',
    category: 'Cooking',
    created_at: '2026-04-20T10:00:00Z',
  },
  {
    skill_id: 's4',
    user_id: 'u4',
    title: 'Beginner Yoga & Breathwork',
    description: 'Gentle flows and breathing techniques for stress relief.',
    category: 'Wellness',
    created_at: '2026-06-01T10:00:00Z',
  },
  {
    skill_id: 's5',
    user_id: 'u5',
    title: 'Watercolour Painting Basics',
    description: 'Colour theory, brush control and your first landscape painting.',
    category: 'Art & Design',
    created_at: '2026-06-12T10:00:00Z',
  },
  {
    skill_id: 's6',
    user_id: 'u6',
    title: 'Conversational Spanish',
    description: 'Build confidence speaking Spanish through real conversation practice.',
    category: 'Languages',
    created_at: '2026-06-18T10:00:00Z',
  },
  {
    skill_id: 's7',
    user_id: 'u2',
    title: 'Postgres for App Developers',
    description: 'Schema design, RLS policies and querying with Supabase.',
    category: 'Technology',
    created_at: '2026-06-20T10:00:00Z',
  },
];

export const MOCK_AVAILABILITY = [
  { availability_id: 'a1', skill_id: 's1', user_id: 'u1', start_time: '2026-08-02T14:00:00Z', end_time: '2026-08-02T15:00:00Z', booked: false },
  { availability_id: 'a2', skill_id: 's1', user_id: 'u1', start_time: '2026-08-04T16:00:00Z', end_time: '2026-08-04T17:00:00Z', booked: false },
  { availability_id: 'a3', skill_id: 's2', user_id: 'u2', start_time: '2026-08-03T09:00:00Z', end_time: '2026-08-03T10:00:00Z', booked: false },
  { availability_id: 'a4', skill_id: 's3', user_id: 'u3', start_time: '2026-08-05T11:00:00Z', end_time: '2026-08-05T12:30:00Z', booked: false },
  { availability_id: 'a5', skill_id: 's4', user_id: 'u4', start_time: '2026-08-01T07:00:00Z', end_time: '2026-08-01T08:00:00Z', booked: true },
  { availability_id: 'a6', skill_id: 's5', user_id: 'u5', start_time: '2026-08-06T13:00:00Z', end_time: '2026-08-06T14:30:00Z', booked: false },
];

export const MOCK_SESSIONS = [
  {
    session_id: 'sess1',
    availability_id: 'a5',
    teacher_id: 'u4',
    learner_id: 'me',
    skill_title: 'Beginner Yoga & Breathwork',
    session_date: '2026-08-01T07:00:00Z',
    duration: 60,
    status: 'pending',
  },
  {
    session_id: 'sess2',
    availability_id: 'a2',
    teacher_id: 'u1',
    learner_id: 'me',
    skill_title: 'Jazz Piano Fundamentals',
    session_date: '2026-07-20T16:00:00Z',
    duration: 60,
    status: 'completed',
  },
  {
    session_id: 'sess3',
    availability_id: 'a3',
    teacher_id: 'me',
    learner_id: 'u6',
    skill_title: 'React Native for Beginners',
    session_date: '2026-07-15T09:00:00Z',
    duration: 60,
    status: 'completed',
  },
];

export const MOCK_REVIEWS = [
  {
    review_id: 'r1',
    session_id: 'sess2',
    reviewer_id: 'me',
    reviewee_id: 'u1',
    rating: 5,
    comment: 'Amara is a fantastic teacher, super patient with beginners!',
    created_at: '2026-07-20T18:00:00Z',
  },
  {
    review_id: 'r2',
    session_id: 'sess3',
    reviewer_id: 'u6',
    reviewee_id: 'me',
    rating: 5,
    comment: 'Clear explanations and a great first project to build.',
    created_at: '2026-07-15T11:00:00Z',
  },
];

export const MOCK_WALLET = {
  wallet_id: 'w1',
  user_id: 'me',
  balance: 12,
};

export const MOCK_TRANSACTIONS = [
  { transaction_id: 't1', user_id: 'me', session_id: 'sess3', type: 'earn', amount: 1, created_at: '2026-07-15T10:00:00Z', description: 'Taught React Native for Beginners' },
  { transaction_id: 't2', user_id: 'me', session_id: 'sess2', type: 'spend', amount: -1, created_at: '2026-07-20T17:00:00Z', description: 'Booked Jazz Piano Fundamentals' },
  { transaction_id: 't3', user_id: 'me', session_id: null, type: 'earn', amount: 5, created_at: '2026-06-01T09:00:00Z', description: 'Welcome bonus' },
  { transaction_id: 't4', user_id: 'me', session_id: 'sess1', type: 'spend', amount: -1, created_at: '2026-07-28T07:00:00Z', description: 'Booked Beginner Yoga & Breathwork' },
];

export const CURRENT_USER = {
  user_id: 'me',
  name: 'You',
  email: 'you@example.com',
  bio: 'Learning to cook and teaching React Native on the side.',
  avatar: 'https://i.pravatar.cc/300?img=68',
  rating: 4.9,
  review_count: 6,
};

// Onboarding: categories a user said they want to learn. Empty by default —
// populated once someone actually completes the "what do you want to learn"
// step, mirroring a freshly registered account with nothing set yet.
export const MOCK_LEARNING_INTERESTS = [];

// Skill wishlists for the swap pool — what each candidate wants to learn in
// return, to keep the card framed as a two-way trade rather than a profile.
const WANTS_TO_LEARN = [
  'Conversational Spanish',
  'React Native for Beginners',
  'Beginner Yoga & Breathwork',
  'Watercolour Painting Basics',
  'West-African Cooking',
  'Jazz Piano Fundamentals',
];

// Swap (swipe-matching) demo pool — candidates to discover, distinct from browse/book flow.
export const MOCK_SWAP_CANDIDATES = MOCK_USERS.map((user, index) => ({
  id: `cand-${user.user_id}`,
  userId: user.user_id,
  name: user.name,
  photo: user.avatar,
  bio: user.bio,
  teaches: MOCK_SKILLS.find((s) => s.user_id === user.user_id)?.title ?? 'Skill exchange',
  wantsToLearn: WANTS_TO_LEARN[index % WANTS_TO_LEARN.length],
  category: MOCK_SKILLS.find((s) => s.user_id === user.user_id)?.category ?? 'General',
  rating: user.rating,
  distanceKm: 2 + index * 3,
  createdAt: new Date().toISOString(),
}));
