import { supabase } from './supabase';

export async function getSkills({ category, search } = {}) {
  let query = supabase
    .from('skills')
    .select('*, teacher:user_id(name, avatar, rating, review_count)');
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
  const { data, error } = await supabase.from('skills').select('*').eq('user_id', userId);
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
  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('availability_id', availabilityId);
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

export async function getSessionById(sessionId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, availability:availability_id(skill:skill_id(title))')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { availability, ...session } = data;
  return { ...session, skill_title: availability?.skill?.title ?? 'Skill session' };
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
    .select(
      '*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)',
    )
    .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getRequestById(requestId) {
  const { data, error } = await supabase
    .from('session_requests')
    .select(
      '*, skill:skill_id(title, category), teacher:teacher_id(name, avatar), learner:learner_id(name, avatar)',
    )
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

// Step 4: each party scans the other's QR to confirm attendance. ownerRole is
// the role encoded in the scanned code (the partner's), so the server records
// the caller as present and rejects a scan of the caller's own code. codeExp
// is the scanned payload's unix-seconds expiry, which the server validates so
// screenshotted codes can't be reused.
export async function checkInSession({ sessionId, ownerRole, codeExp }) {
  const { data, error } = await supabase.rpc('check_in_session', {
    p_session_id: sessionId,
    p_owner_role: ownerRole,
    p_code_exp: codeExp,
  });
  if (error) throw error;
  return data;
}

// Step 5: each participant explicitly confirms the trade happened.
export async function confirmSessionSide(sessionId) {
  const { data, error } = await supabase.rpc('confirm_session_side', {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data;
}

// Lazy 72h sweep: completes any of the caller's pending sessions that have
// met their confirmation deadline. Idempotent; returns the count completed.
export async function finalizeStaleSessions() {
  const { data, error } = await supabase.rpc('finalize_stale_sessions');
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
    .insert({
      session_id: sessionId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment,
    })
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

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) table[BASE64_CHARS.charCodeAt(i)] = i;
  return table;
})();

// Decodes a base64 payload into the underlying ArrayBuffer. We take the image
// as base64 straight from the image picker instead of fetching the local
// file:// URI — on Android that fetch resolves with a tiny, non-image body.
function base64ToArrayBuffer(base64) {
  const comma = base64.indexOf(',');
  const clean = (comma === -1 ? base64 : base64.slice(comma + 1)).replace(/\s/g, '');
  const length = clean.length;
  let bufferLength = Math.floor(length / 4) * 3;
  if (clean[length - 1] === '=') bufferLength -= 1;
  if (clean[length - 2] === '=') bufferLength -= 2;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < length; i += 4) {
    const e1 = BASE64_LOOKUP[clean.charCodeAt(i)];
    const e2 = BASE64_LOOKUP[clean.charCodeAt(i + 1)];
    const e3 = BASE64_LOOKUP[clean.charCodeAt(i + 2)];
    const e4 = BASE64_LOOKUP[clean.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes.buffer;
}

// Uploads to the same path every time (upsert) so a user only ever has one
// avatar file, then stamps the stored URL with a cache-busting query param —
// otherwise the browser/Image cache would keep showing the old photo forever
// since the underlying file path never changes.
export async function uploadAvatar({ userId, uri, base64, mimeType = 'image/jpeg' }) {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const arrayBuffer = base64
    ? base64ToArrayBuffer(base64)
    : await (await fetch(uri)).arrayBuffer();

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
