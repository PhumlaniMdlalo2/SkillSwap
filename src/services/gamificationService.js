import { supabase } from './supabase';
import { ENDORSEMENT_BADGES, getLevelInfo, XP_REWARDS } from '../utils/constants';

export const gamificationService = {
  async getUserStats(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('user_id, xp, streak_weeks, last_active_week')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const xp = Number(data.xp) || 0;
    const streakWeeks = Number(data.streak_weeks) || 0;

    return {
      userId: data.user_id,
      xp,
      streakWeeks,
      lastActiveWeek: data.last_active_week,
      levelInfo: getLevelInfo(xp),
    };
  },

  async getUserEndorsements(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('endorsements')
      .select('badge_key')
      .eq('reviewee_id', userId);

    if (error) throw error;

    const tally = {};
    for (const item of data || []) {
      tally[item.badge_key] = (tally[item.badge_key] || 0) + 1;
    }

    return ENDORSEMENT_BADGES.map((badge) => ({
      ...badge,
      count: tally[badge.key] || 0,
    }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count);
  },

  async giveEndorsements({ sessionId, reviewerId, revieweeId, badgeKeys = [] }) {
    if (!badgeKeys || badgeKeys.length === 0) return [];

    const rows = badgeKeys.map((badgeKey) => ({
      session_id: sessionId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      badge_key: badgeKey,
    }));

    const { data, error } = await supabase
      .from('endorsements')
      .upsert(rows, { onConflict: 'session_id,reviewer_id,badge_key' })
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Count completed sessions for a user in the current ISO week.
   * Used for the "perfect week" bonus check.
   */
  async getSessionsThisWeek(userId) {
    if (!userId) return 0;

    // Calculate ISO week boundaries (Mon 00:00 → next Mon 00:00 UTC)
    const now = new Date();
    const dayOfWeek = now.getUTCDay() || 7; // Mon=1 … Sun=7
    const monday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek + 1),
    );
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);

    const { count, error } = await supabase
      .from('sessions')
      .select('session_id', { count: 'exact', head: true })
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .eq('status', 'completed')
      .gte('completed_at', monday.toISOString())
      .lt('completed_at', nextMonday.toISOString());

    if (error) throw error;
    return count || 0;
  },

  /**
   * Build a unified rewards-history feed from endorsements, completed
   * sessions, and streak data.  Returns most-recent-first.
   */
  async getRewardsHistory(userId) {
    if (!userId) return [];
    const events = [];

    // 1. Endorsements received → badge events
    const { data: endorsements, error: endErr } = await supabase
      .from('endorsements')
      .select('endorsement_id, badge_key, created_at')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!endErr && endorsements) {
      const badgeMap = {};
      for (const b of ENDORSEMENT_BADGES) badgeMap[b.key] = b;
      for (const e of endorsements) {
        const badge = badgeMap[e.badge_key];
        events.push({
          id: `badge-${e.endorsement_id}`,
          type: 'badge',
          title: `Earned "${badge?.label ?? e.badge_key}" badge`,
          description: 'Endorsement from a session partner',
          emoji: badge?.emoji ?? '🏅',
          createdAt: e.created_at,
        });
      }
    }

    // 2. Completed sessions → XP events
    const { data: sessions, error: sessErr } = await supabase
      .from('sessions')
      .select('session_id, completed_at')
      .or(`teacher_id.eq.${userId},learner_id.eq.${userId}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(30);

    if (!sessErr && sessions) {
      for (const s of sessions) {
        events.push({
          id: `xp-${s.session_id}`,
          type: 'xp',
          title: 'Session completed',
          description: `+${XP_REWARDS.SESSION_COMPLETE} XP earned`,
          xpAmount: XP_REWARDS.SESSION_COMPLETE,
          createdAt: s.completed_at,
        });
      }
    }

    // Sort by most recent first
    events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return events;
  },
};
