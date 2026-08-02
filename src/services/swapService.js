import { supabase, isSupabaseConfigured } from './supabase';
import { MOCK_SWAP_CANDIDATES } from '../utils/mockData';

// Swipe-matching is not part of the approved ERD (browse -> book -> token
// exchange). This talks to `candidates`/`swipes`/`matches` tables if they
// exist in the backend; otherwise it runs entirely against local mock data
// so the discovery UI is demoable on its own.

const state = {
  pool: [...MOCK_SWAP_CANDIDATES],
  swipeHistory: [],
  matches: [],
};

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export const swapService = {
  async getNextCandidates(count = 10) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .limit(count);
      if (error) throw error;
      return data;
    }

    await delay();
    const alreadySwiped = new Set(state.swipeHistory.map((s) => s.targetUserId));
    return state.pool.filter((c) => !alreadySwiped.has(c.id)).slice(0, count);
  },

  async handleSwipe(targetId, direction) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('swipes')
        .insert({ target_user_id: targetId, direction })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    await delay(120);
    const swipe = {
      id: `swipe-${Date.now()}`,
      targetUserId: targetId,
      direction,
      createdAt: new Date().toISOString(),
    };
    state.swipeHistory.unshift(swipe);
    return swipe;
  },

  async checkMutualMatch(targetId) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .contains('user_ids', [targetId])
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    }

    await delay(150);
    // Demo heuristic: ~50% of right-swipes turn into a mutual match.
    const isMatch = Math.random() > 0.5;
    if (isMatch) {
      state.matches.unshift({
        id: `match-${Date.now()}`,
        userId2: targetId,
        matchedAt: new Date().toISOString(),
      });
    }
    return isMatch;
  },

  async fetchSwipeHistory(type) {
    if (isSupabaseConfigured) {
      let query = supabase.from('swipes').select('*');
      if (type) query = query.eq('direction', type);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }

    await delay();
    return type
      ? state.swipeHistory.filter((s) => s.direction === type)
      : state.swipeHistory;
  },

  async fetchMatches() {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('matches').select('*');
      if (error) throw error;
      return data;
    }
    await delay();
    return state.matches;
  },

  async updateSwapPreferences(prefs) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('swap_preferences')
        .upsert(prefs)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    await delay();
    return prefs;
  },

  async blockUser(blockedUserId) {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocked_user_id: blockedUserId });
      if (error) throw error;
      return true;
    }
    await delay();
    state.pool = state.pool.filter((c) => c.userId !== blockedUserId);
    return true;
  },
};
