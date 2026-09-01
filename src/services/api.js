import { supabase } from './supabase';

export async function getSkills({ category, search } = {}) {
  let query = supabase.from('skills').select('*, teacher:user_id(name, avatar, rating, review_count)');
  if (category) query = query.eq('category', category);
  if (search) query = query.ilike('title', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getSkillById(skillId) {
  const { data, error } = await supabase
    .from('skills')
    .select('*, teacher:user_id(*)')
    .eq('skill_id', skillId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSkillsByUser(userId) {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function addSkill({ userId, title, description, category }) {
  const { data, error } = await supabase
    .from('skills')
    .insert({ user_id: userId, title, description, category })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSkill(skillId) {
  const { error } = await supabase.from('skills').delete().eq('skill_id', skillId);
  if (error) throw error;
  return true;
}

export async function getAvailabilityForSkill(skillId) {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('skill_id', skillId)
    .eq('booked', false)
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

// Includes booked slots too — for the owning teacher managing their own calendar.
export async function getAllAvailabilityForSkill(skillId) {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('skill_id', skillId)
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addAvailability({ userId, skillId, startTime, endTime }) {
  const { data, error } = await supabase
    .from('availability')
    .insert({ user_id: userId, skill_id: skillId, start_time: startTime, end_time: endTime })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAvailability(availabilityId) {
  const { error } = await supabase.from('availability').delete().eq('availability_id', availabilityId);
  if (error) throw error;
  return true;
}

export async function getAvailabilityHours(skillId) {
  const { data, error } = await supabase
    .from('availability_hours')
    .select('*')
    .eq('skill_id', skillId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
}

export async function setAvailabilityHours({ skillId, hours }) {
  const { data, error } = await supabase.rpc('set_availability_hours', {
    p_skill_id: skillId,
    p_hours: hours,
  });
  if (error) throw error;
  return data;
}

export async function generateAvailabilitySlots(skillId) {
  const { error } = await supabase.rpc('generate_availability_slots', {
    p_skill_id: skillId,
  });
  if (error) throw error;
  return true;
}

export async function getWallet(userId) {
  const { data, error } = await supabase
    .from('token_wallet')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTransactions(userId) {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSessionsForUser(userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, availability:availability_id(skill:skill_id(title))')
    .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`);
  if (error) throw error;
  // sessions has no skill_id of its own — it's reached via availability ->
  // skills, so flatten that here rather than making every screen do it.
  return data.map(({ availability, ...session }) => ({
    ...session,
    skill_title: availability?.skill?.title ?? 'Skill session',
  }));
}

// Step 1: learner asks to book a skill — no time attached yet.
export async function requestSession({ skillId, message }) {
  const { data, error } = await supabase.rpc('request_session', {
    p_skill_id: skillId,
    p_message: message ?? null,
  });
  if (error) throw error;
  return data;
}

// Requests where the user is either the teacher (to review) or the learner (sent).
export async function getRequestsForUser(userId) {
  const { data, error } = await supabase
    .from('session_requests')
    .select('*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)')
    .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRequestById(requestId) {
  const { data, error } = await supabase
    .from('session_requests')
    .select('*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)')
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Step 2: teacher accepts or declines.
export async function respondToRequest({ requestId, accept }) {
  const { data, error } = await supabase.rpc('respond_to_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}

// Step 3: learner picks one or more contiguous open slots on an accepted
// request — the real Book Session -> Spend Tokens moment. Cost is 1 token
// per hour, so a 3-hour session is 3 contiguous slot ids.
export async function scheduleSession({ requestId, availabilityIds }) {
  const { data, error } = await supabase.rpc('schedule_session', {
    p_request_id: requestId,
    p_availability_ids: availabilityIds,
  });
  if (error) throw error;
  return data;
}

// Complete Session -> Earn Tokens.
export async function completeSession(sessionId) {
  const { data, error } = await supabase.rpc('complete_session', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
}

export async function cancelSession(sessionId) {
  const { data, error } = await supabase.rpc('cancel_session', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
}

export async function getReviewsForUser(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:reviewer_id(name, avatar)')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addReview({ sessionId, reviewerId, revieweeId, rating, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ session_id: sessionId, reviewer_id: reviewerId, reviewee_id: revieweeId, rating, comment })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Uploads to the same path every time (upsert) so a user only ever has one
// avatar file, then stamps the stored URL with a cache-busting query param —
// otherwise the browser/Image cache would keep showing the old photo forever
// since the underlying file path never changes.
export async function uploadAvatar({ userId, uri, mimeType = 'image/jpeg' }) {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { data, error } = await supabase
    .from('users')
    .update({ avatar: avatarUrl })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLearningInterests(userId) {
  const { data, error } = await supabase
    .from('learning_interests')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

// Onboarding step 2: replaces the user's full interest set with the given
// categories (simplest mental model for a multi-select "pick a few" step).
export async function setLearningInterests(userId, categories) {
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

// Onboarding step 3: teaching-style / learning-style preferences that
// drive Skill Match's compatibility scoring (see get_swap_candidates).
export async function getStylePreferences(userId) {
  const { data, error } = await supabase
    .from('style_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setStylePreferences(userId, prefs) {
  const { data, error } = await supabase
    .from('style_preferences')
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}
