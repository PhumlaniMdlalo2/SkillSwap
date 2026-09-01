import { supabase } from '../../src/services/supabase';
import { swapService } from '../../src/services/swapService';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

let resolveValue;
const builderCalls = [];

function makeBuilder() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve) => resolve(resolveValue);
        }
        return (...args) => {
          builderCalls.push({ method: prop, args });
          return makeBuilder();
        };
      },
    }
  );
}

function mockFromResult(result) {
  resolveValue = result;
  supabase.from.mockReturnValue(makeBuilder());
}

describe('swapService', () => {
  beforeEach(() => {
    builderCalls.length = 0;
    resolveValue = { data: null, error: null };
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  describe('getNextCandidates', () => {
    it('maps RPC rows into candidate objects', async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          {
            user_id: 'u1',
            name: 'Ada',
            avatar: 'a.png',
            bio: 'bio',
            rating: 4.9,
            review_count: 12,
            member_since: '2024-01-01',
            teaches: 'Piano',
            teaches_skill_id: 'sk1',
            category: 'Music',
            wants_to_learn: 'Cooking',
            skills: ['Piano'],
            interests: ['Jazz'],
            compat_pace: true,
            compat_structure: false,
            compat_formats: ['video'],
          },
        ],
        error: null,
      });

      const candidates = await swapService.getNextCandidates();
      expect(supabase.rpc).toHaveBeenCalledWith('get_swap_candidates', { p_limit: 10 });
      expect(candidates[0]).toMatchObject({
        id: 'u1',
        userId: 'u1',
        name: 'Ada',
        teaches: 'Piano',
        teachesSkillId: 'sk1',
        category: 'Music',
        wantsToLearn: 'Cooking',
        compatPace: true,
        compatStructure: false,
        compatFormats: ['video'],
      });
    });

    it('applies sensible defaults for missing fields', async () => {
      supabase.rpc.mockResolvedValue({
        data: [{ user_id: 'u2', name: 'Nobody' }],
        error: null,
      });

      const [candidate] = await swapService.getNextCandidates(5);
      expect(supabase.rpc).toHaveBeenCalledWith('get_swap_candidates', { p_limit: 5 });
      expect(candidate.teaches).toBe('Skill exchange');
      expect(candidate.teachesSkillId).toBeNull();
      expect(candidate.category).toBe('General');
      expect(candidate.wantsToLearn).toBe('Something new');
      expect(candidate.skills).toEqual([]);
      expect(candidate.interests).toEqual([]);
      expect(candidate.compatFormats).toEqual([]);
      expect(candidate.compatPace).toBe(false);
    });

    it('throws when the RPC errors', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'nope' } });
      await expect(swapService.getNextCandidates()).rejects.toEqual({ message: 'nope' });
    });
  });

  describe('swipe', () => {
    it('reports a match when the RPC returns one', async () => {
      supabase.rpc.mockResolvedValue({
        data: [{ matched: true, match_id: 'm1' }],
        error: null,
      });

      const result = await swapService.swipe('u2', 'right');
      expect(supabase.rpc).toHaveBeenCalledWith('record_swipe', {
        p_target_id: 'u2',
        p_direction: 'right',
      });
      expect(result).toEqual({ matched: true, matchId: 'm1' });
    });

    it('reports no match when no row is returned', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });
      await expect(swapService.swipe('u2', 'left')).resolves.toEqual({
        matched: false,
        matchId: null,
      });
    });
  });

  describe('fetchSwipeHistory', () => {
    it('maps swipe rows and applies a direction filter', async () => {
      mockFromResult({
        data: [
          {
            swipe_id: 's1',
            target_id: 'u3',
            direction: 'right',
            created_at: '2024-01-02',
            target: { name: 'Grace', avatar: 'g.png' },
          },
        ],
        error: null,
      });

      const rows = await swapService.fetchSwipeHistory('right');
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['direction', 'right'] });
      expect(rows[0]).toEqual({
        id: 's1',
        targetUserId: 'u3',
        direction: 'right',
        createdAt: '2024-01-02',
        target: { name: 'Grace', avatar: 'g.png' },
      });
    });

    it('does not filter by direction when none is given', async () => {
      mockFromResult({ data: [], error: null });
      await swapService.fetchSwipeHistory();
      expect(builderCalls.some((c) => c.method === 'eq')).toBe(false);
    });
  });

  describe('fetchMatches', () => {
    it('selects the counterpart based on which side the user is on', async () => {
      mockFromResult({
        data: [
          {
            match_id: 'm1',
            user_id_1: 'me',
            user_id_2: 'other1',
            matched_at: '2024-01-03',
            user1: { name: 'Me' },
            user2: { name: 'Other One' },
          },
          {
            match_id: 'm2',
            user_id_1: 'other2',
            user_id_2: 'me',
            matched_at: '2024-01-04',
            user1: { name: 'Other Two' },
            user2: { name: 'Me' },
          },
        ],
        error: null,
      });

      const matches = await swapService.fetchMatches('me');
      expect(matches[0]).toMatchObject({ id: 'm1', userId2: 'other1', counterpart: { name: 'Other One' } });
      expect(matches[1]).toMatchObject({ id: 'm2', userId2: 'other2', counterpart: { name: 'Other Two' } });
    });
  });

  describe('getSwapPreferences', () => {
    it('returns defaults when no stored preferences exist', async () => {
      mockFromResult({ data: null, error: null });
      await expect(swapService.getSwapPreferences('u1')).resolves.toEqual({
        skillCategory: null,
        notificationsEnabled: true,
      });
    });

    it('maps stored snake_case fields', async () => {
      mockFromResult({
        data: { skill_category: 'Music', notifications_enabled: false },
        error: null,
      });
      await expect(swapService.getSwapPreferences('u1')).resolves.toEqual({
        skillCategory: 'Music',
        notificationsEnabled: false,
      });
    });
  });

  describe('updateSwapPreferences', () => {
    it('upserts with mapped fields', async () => {
      mockFromResult({ data: { user_id: 'u1' }, error: null });
      await swapService.updateSwapPreferences('u1', { skillCategory: 'Music', notificationsEnabled: false });

      const upsert = builderCalls.find((c) => c.method === 'upsert');
      expect(upsert.args[0]).toMatchObject({
        user_id: 'u1',
        skill_category: 'Music',
        notifications_enabled: false,
      });
      expect(typeof upsert.args[0].updated_at).toBe('string');
    });
  });

  describe('blockUser / undoLastSwipe / unmatch', () => {
    it('blockUser inserts and returns true', async () => {
      mockFromResult({ data: null, error: null });
      await expect(swapService.blockUser('u1', 'u2')).resolves.toBe(true);
      const insert = builderCalls.find((c) => c.method === 'insert');
      expect(insert.args[0]).toEqual({ user_id: 'u1', blocked_user_id: 'u2' });
    });

    it('undoLastSwipe calls the RPC and returns true', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });
      await expect(swapService.undoLastSwipe()).resolves.toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('undo_last_swipe');
    });

    it('unmatch calls the RPC with the match id and returns true', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: null });
      await expect(swapService.unmatch('m1')).resolves.toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('unmatch', { p_match_id: 'm1' });
    });

    it('propagates errors', async () => {
      supabase.rpc.mockResolvedValue({ data: null, error: { message: 'db down' } });
      await expect(swapService.undoLastSwipe()).rejects.toEqual({ message: 'db down' });
    });
  });
});