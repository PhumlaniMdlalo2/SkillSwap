import { supabase } from './supabase';

function mapCandidate(row) {
  return {
    id: row.user_id,
    userId: row.user_id,
    name: row.name,
    photo: row.avatar,
    bio: row.bio,
    rating: row.rating,
    reviewCount: row.review_count,
    memberSince: row.member_since,
    teaches: row.teaches ?? 'Skill exchange',
    teachesSkillId: row.teaches_skill_id ?? null,
    category: row.category ?? 'General',
    wantsToLearn: row.wants_to_learn ?? 'Something new',
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    compatPace: row.compat_pace ?? false,
    compatStructure: row.compat_structure ?? false,
    compatFormats: row.compat_formats ?? [],
  };
}

export const swapService = {
  async getNextCandidates(count = 10) {
    const { data, error } = await supabase.rpc('get_swap_candidates', { p_limit: count });
    if (error) throw error;
    return data.map(mapCandidate);
  },

  // Records the swipe and, if it completes a mutual right-swipe, reports
  // the match — the real replacement for the old client-side coin flip.
  async swipe(targetId, direction) {
    const { data, error } = await supabase.rpc('record_swipe', {
      p_target_id: targetId,
      p_direction: direction,
    });
    if (error) throw error;
    const row = data?.[0];
    return { matched: Boolean(row?.matched), matchId: row?.match_id ?? null };
  },

  async fetchSwipeHistory(direction) {
    let query = supabase
      .from('swipes')
      .select('*, target:target_id(name, avatar)')
      .order('created_at', { ascending: false });
    if (direction) query = query.eq('direction', direction);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((s) => ({
      id: s.swipe_id,
      targetUserId: s.target_id,
      direction: s.direction,
      createdAt: s.created_at,
      target: s.target,
    }));
  },

  async fetchMatches(userId) {
    const { data, error } = await supabase
      .from('matches')
      .select('*, user1:user_id_1(name, avatar), user2:user_id_2(name, avatar)')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('matched_at', { ascending: false });
    if (error) throw error;
    return data.map((m) => {
      const isUser1 = m.user_id_1 === userId;
      return {
        id: m.match_id,
        userId2: isUser1 ? m.user_id_2 : m.user_id_1,
        matchedAt: m.matched_at,
        counterpart: isUser1 ? m.user2 : m.user1,
      };
    });
  },

  async getSwapPreferences(userId) {
    const { data, error } = await supabase
      .from('swap_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { skillCategory: null, notificationsEnabled: true };
    return {
      skillCategory: data.skill_category,
      notificationsEnabled: data.notifications_enabled,
    };
  },

  async updateSwapPreferences(userId, prefs) {
    const { data, error } = await supabase
      .from('swap_preferences')
      .upsert({
        user_id: userId,
        skill_category: prefs.skillCategory ?? null,
        notifications_enabled: prefs.notificationsEnabled,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async blockUser(userId, blockedUserId) {
    const { error } = await supabase
      .from('blocked_users')
      .insert({ user_id: userId, blocked_user_id: blockedUserId });
    if (error) throw error;
    return true;
  },

  // Reverses the caller's most recent swipe (and any match it formed).
  async undoLastSwipe() {
    const { error } = await supabase.rpc('undo_last_swipe');
    if (error) throw error;
    return true;
  },

  // Breaks an existing match and clears both sides' swipe history
  // toward each other, so they can reappear in either deck later.
  async unmatch(matchId) {
    const { error } = await supabase.rpc('unmatch', { p_match_id: matchId });
    if (error) throw error;
    return true;
  },
};
