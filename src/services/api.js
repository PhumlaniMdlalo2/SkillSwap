import { supabase, isSupabaseConfigured } from './supabase';
import {
  MOCK_SKILLS,
  MOCK_AVAILABILITY,
  MOCK_SESSIONS,
  MOCK_USERS,
  MOCK_REVIEWS,
  MOCK_WALLET,
  MOCK_TRANSACTIONS,
  MOCK_LEARNING_INTERESTS,
  CURRENT_USER,
} from '../utils/mockData';

// In-memory mutable copies so the demo (mock) mode reflects bookings/new skills
// for the lifetime of the app session, without a live backend.
const state = {
  skills: [...MOCK_SKILLS],
  availability: [...MOCK_AVAILABILITY],
  sessions: [...MOCK_SESSIONS],
  reviews: [...MOCK_REVIEWS],
  wallet: { ...MOCK_WALLET },
  transactions: [...MOCK_TRANSACTIONS],
  users: [...MOCK_USERS, CURRENT_USER],
  learningInterests: [...MOCK_LEARNING_INTERESTS],
  requests: [],
};

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

function findUser(userId) {
  return state.users.find((u) => u.user_id === userId) ?? null;
}

export async function getSkills({ category, search } = {}) {
  if (isSupabaseConfigured) {
    let query = supabase.from('skills').select('*, teacher:user_id(name, avatar, rating, review_count)');
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('title', `%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  await delay();
  return state.skills
    .filter((s) => !category || s.category === category)
    .filter(
      (s) =>
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
    )
    .map((s) => ({ ...s, teacher: findUser(s.user_id) }));
}

export async function getSkillById(skillId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('skills')
      .select('*, teacher:user_id(*)')
      .eq('skill_id', skillId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  await delay();
  const skill = state.skills.find((s) => s.skill_id === skillId);
  if (!skill) return null;
  return { ...skill, teacher: findUser(skill.user_id) };
}

export async function getSkillsByUser(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  await delay();
  return state.skills.filter((s) => s.user_id === userId);
}

export async function addSkill({ userId, title, description, category }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('skills')
      .insert({ user_id: userId, title, description, category })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  await delay();
  const skill = {
    skill_id: `s-${Date.now()}`,
    user_id: userId,
    title,
    description,
    category,
    created_at: new Date().toISOString(),
  };
  state.skills.unshift(skill);
  return skill;
}

export async function deleteSkill(skillId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('skills').delete().eq('skill_id', skillId);
    if (error) throw error;
    return true;
  }

  await delay(120);
  state.skills = state.skills.filter((s) => s.skill_id !== skillId);
  return true;
}

export async function getAvailabilityForSkill(skillId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('skill_id', skillId)
      .eq('booked', false);
    if (error) throw error;
    return data;
  }

  await delay();
  return state.availability.filter((a) => a.skill_id === skillId && !a.booked);
}

// Includes booked slots too — for the owning teacher managing their own calendar.
export async function getAllAvailabilityForSkill(skillId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('availability')
      .select('*')
      .eq('skill_id', skillId)
      .order('start_time', { ascending: true });
    if (error) throw error;
    return data;
  }

  await delay();
  return state.availability
    .filter((a) => a.skill_id === skillId)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

export async function addAvailability({ userId, skillId, startTime, endTime }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('availability')
      .insert({ user_id: userId, skill_id: skillId, start_time: startTime, end_time: endTime })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  await delay();
  const slot = {
    availability_id: `a-${Date.now()}`,
    user_id: userId,
    skill_id: skillId,
    start_time: startTime,
    end_time: endTime,
    booked: false,
  };
  state.availability.push(slot);
  return slot;
}

export async function deleteAvailability(availabilityId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('availability').delete().eq('availability_id', availabilityId);
    if (error) throw error;
    return true;
  }

  await delay(120);
  state.availability = state.availability.filter((a) => a.availability_id !== availabilityId);
  return true;
}

export async function getWallet(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('token_wallet')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  await delay();
  return { ...state.wallet, user_id: userId };
}

export async function getTransactions(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  await delay();
  return [...state.transactions].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export async function getSessionsForUser(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`);
    if (error) throw error;
    return data;
  }

  await delay();
  return state.sessions.filter(
    (s) => s.teacher_id === userId || s.learner_id === userId
  );
}

// Step 1: learner asks to book a skill — no time attached yet.
export async function requestSession({ skillId, learnerId, message }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('request_session', {
      p_skill_id: skillId,
      p_message: message ?? null,
    });
    if (error) throw error;
    return data;
  }

  await delay();
  const skill = state.skills.find((s) => s.skill_id === skillId);
  if (!skill) throw new Error('Skill not found.');
  if (skill.user_id === learnerId) throw new Error('You cannot request your own skill.');

  const request = {
    request_id: `req-${Date.now()}`,
    skill_id: skillId,
    skill_title: skill.title,
    teacher_id: skill.user_id,
    learner_id: learnerId,
    message: message ?? null,
    status: 'pending',
    session_id: null,
    created_at: new Date().toISOString(),
    responded_at: null,
  };
  state.requests.unshift(request);
  return request;
}

// Requests where the user is either the teacher (to review) or the learner (sent).
export async function getRequestsForUser(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)')
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  await delay();
  return state.requests
    .filter((r) => r.teacher_id === userId || r.learner_id === userId)
    .map((r) => ({
      ...r,
      skill: { title: r.skill_title },
      teacher: findUser(r.teacher_id),
      learner: findUser(r.learner_id),
    }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getRequestById(requestId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('session_requests')
      .select('*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)')
      .eq('request_id', requestId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  await delay();
  const request = state.requests.find((r) => r.request_id === requestId);
  if (!request) return null;
  return {
    ...request,
    skill: { title: request.skill_title },
    teacher: findUser(request.teacher_id),
    learner: findUser(request.learner_id),
  };
}

// Step 2: teacher accepts or declines.
export async function respondToRequest({ requestId, accept }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('respond_to_request', {
      p_request_id: requestId,
      p_accept: accept,
    });
    if (error) throw error;
    return data;
  }

  await delay();
  const request = state.requests.find((r) => r.request_id === requestId);
  if (!request) throw new Error('Request not found.');
  if (request.status !== 'pending') throw new Error('This request has already been responded to.');
  request.status = accept ? 'accepted' : 'declined';
  request.responded_at = new Date().toISOString();
  return request;
}

// Step 3: learner picks an open slot on an accepted request — the real
// Book Session -> Spend Tokens moment.
export async function scheduleSession({ requestId, availabilityId, learnerId, cost = 1 }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('schedule_session', {
      p_request_id: requestId,
      p_availability_id: availabilityId,
    });
    if (error) throw error;
    return data;
  }

  await delay();
  const request = state.requests.find((r) => r.request_id === requestId);
  if (!request) throw new Error('Request not found.');
  if (request.status !== 'accepted') throw new Error('This request has not been accepted yet.');

  const slot = state.availability.find((a) => a.availability_id === availabilityId);
  if (!slot) throw new Error('This time slot is no longer available.');
  if (slot.booked) throw new Error('This time slot has already been booked.');
  if (state.wallet.balance < cost) throw new Error('Not enough tokens to book this session.');

  slot.booked = true;

  const session = {
    session_id: `sess-${Date.now()}`,
    availability_id: slot.availability_id,
    teacher_id: request.teacher_id,
    learner_id: learnerId,
    skill_title: request.skill_title,
    session_date: slot.start_time,
    duration: 60,
    status: 'pending',
  };
  state.sessions.unshift(session);

  state.wallet.balance -= cost;
  state.transactions.unshift({
    transaction_id: `t-${Date.now()}`,
    user_id: learnerId,
    session_id: session.session_id,
    type: 'spend',
    amount: -cost,
    created_at: new Date().toISOString(),
    description: `Booked ${session.skill_title}`,
  });

  request.status = 'scheduled';
  request.session_id = session.session_id;

  return session;
}

// Complete Session -> Earn Tokens.
export async function completeSession(sessionId, { reward = 1 } = {}) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('complete_session', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data;
  }

  await delay();
  const session = state.sessions.find((s) => s.session_id === sessionId);
  if (!session) throw new Error('Session not found.');
  session.status = 'completed';

  state.wallet.balance += reward;
  state.transactions.unshift({
    transaction_id: `t-${Date.now()}`,
    user_id: session.teacher_id,
    session_id: session.session_id,
    type: 'earn',
    amount: reward,
    created_at: new Date().toISOString(),
    description: `Taught ${session.skill_title}`,
  });

  return session;
}

export async function cancelSession(sessionId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('cancel_session', {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data;
  }

  await delay();
  const session = state.sessions.find((s) => s.session_id === sessionId);
  if (!session) throw new Error('Session not found.');
  session.status = 'cancelled';
  const slot = state.availability.find((a) => a.availability_id === session.availability_id);
  if (slot) slot.booked = false;
  return session;
}

export async function getReviewsForUser(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(name, avatar)')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  await delay();
  return state.reviews
    .filter((r) => r.reviewee_id === userId)
    .map((r) => ({ ...r, reviewer: findUser(r.reviewer_id) }));
}

export async function addReview({ sessionId, reviewerId, revieweeId, rating, comment }) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({ session_id: sessionId, reviewer_id: reviewerId, reviewee_id: revieweeId, rating, comment })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  await delay();
  const review = {
    review_id: `r-${Date.now()}`,
    session_id: sessionId,
    reviewer_id: reviewerId,
    reviewee_id: revieweeId,
    rating,
    comment,
    created_at: new Date().toISOString(),
  };
  state.reviews.unshift(review);
  return review;
}

export async function getUserById(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  await delay();
  return findUser(userId);
}

export async function getLearningInterests(userId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('learning_interests')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data;
  }

  await delay();
  return state.learningInterests.filter((i) => i.user_id === userId);
}

// Onboarding step 2: replaces the user's full interest set with the given
// categories (simplest mental model for a multi-select "pick a few" step).
export async function setLearningInterests(userId, categories) {
  if (isSupabaseConfigured) {
    const { error: deleteError } = await supabase
      .from('learning_interests')
      .delete()
      .eq('user_id', userId);
    if (deleteError) throw deleteError;

    if (categories.length === 0) return [];

    const { data, error } = await supabase
      .from('learning_interests')
      .insert(categories.map((category) => ({ user_id: userId, category })))
      .select();
    if (error) throw error;
    return data;
  }

  await delay();
  state.learningInterests = [
    ...state.learningInterests.filter((i) => i.user_id !== userId),
    ...categories.map((category) => ({
      interest_id: `li-${userId}-${category}`,
      user_id: userId,
      category,
      created_at: new Date().toISOString(),
    })),
  ];
  return state.learningInterests.filter((i) => i.user_id === userId);
}
