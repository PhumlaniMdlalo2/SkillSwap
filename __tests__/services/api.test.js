import { supabase } from '../../src/services/supabase';
import {
  getSkills,
  getSkillById,
  getSkillsByUser,
  addSkill,
  deleteSkill,
  getAvailabilityForSkill,
  getSessionsForUser,
  getTransactions,
  setLearningInterests,
  uploadAvatar,
} from '../../src/services/api';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    storage: { from: jest.fn() },
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

describe('api service', () => {
  beforeAll(() => {
    // quiet the storage helper used by uploadAvatar
    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/avatar.png' } }),
    });
  });

  beforeEach(() => {
    builderCalls.length = 0;
    resolveValue = { data: null, error: null };
    supabase.from.mockReset();
    supabase.rpc.mockReset();
    supabase.rpc.mockResolvedValue({ data: null, error: null });
    supabase.storage.from.mockClear();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getSkills', () => {
    it('returns skills when the query succeeds', async () => {
      const skills = [{ id: 1 }, { id: 2 }];
      mockFromResult({ data: skills, error: null });
      await expect(getSkills()).resolves.toEqual(skills);
      expect(supabase.from).toHaveBeenCalledWith('skills');
    });

    it('throws when the query has an error', async () => {
      mockFromResult({ data: null, error: { message: 'boom' } });
      await expect(getSkills()).rejects.toEqual({ message: 'boom' });
    });

    it('applies a category filter when provided', async () => {
      mockFromResult({ data: [], error: null });
      await getSkills({ category: 'Music' });
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['category', 'Music'] });
    });

    it('applies a search filter when provided', async () => {
      mockFromResult({ data: [], error: null });
      await getSkills({ search: 'guitar' });
      expect(builderCalls).toContainEqual({ method: 'ilike', args: ['title', '%guitar%'] });
    });
  });

  describe('getSkillById', () => {
    it('queries with maybeSingle and returns data', async () => {
      const skill = { skill_id: 's1', title: 'Piano' };
      mockFromResult({ data: skill, error: null });
      await expect(getSkillById('s1')).resolves.toEqual(skill);
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['skill_id', 's1'] });
      expect(builderCalls.some((c) => c.method === 'maybeSingle')).toBe(true);
    });
  });

  describe('getSkillsByUser', () => {
    it('filters by user_id', async () => {
      mockFromResult({ data: [], error: null });
      await getSkillsByUser('u1');
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['user_id', 'u1'] });
    });
  });

  describe('addSkill', () => {
    it('inserts a skill and returns the created row', async () => {
      const created = { skill_id: 'new', title: 'Guitar' };
      mockFromResult({ data: created, error: null });
      await expect(addSkill({ userId: 'u1', title: 'Guitar', description: 'D', category: 'Music' })).resolves.toEqual(created);
      const insert = builderCalls.find((c) => c.method === 'insert');
      expect(insert.args[0]).toEqual({
        user_id: 'u1',
        title: 'Guitar',
        description: 'D',
        category: 'Music',
      });
    });
  });

  describe('deleteSkill', () => {
    it('returns true on success', async () => {
      mockFromResult({ data: null, error: null });
      await expect(deleteSkill('s1')).resolves.toBe(true);
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['skill_id', 's1'] });
    });

    it('throws on error', async () => {
      mockFromResult({ data: null, error: { message: 'nope' } });
      await expect(deleteSkill('s1')).rejects.toEqual({ message: 'nope' });
    });
  });

  describe('getAvailabilityForSkill', () => {
    it('filters unbooked slots ordered by start_time', async () => {
      mockFromResult({ data: ['slot'], error: null });
      await getAvailabilityForSkill('s1');
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['skill_id', 's1'] });
      expect(builderCalls).toContainEqual({ method: 'eq', args: ['booked', false] });
      expect(builderCalls).toContainEqual({ method: 'order', args: ['start_time', { ascending: true }] });
    });
  });

  describe('getSessionsForUser', () => {
    it('flattens availability -> skill title into skill_title', async () => {
      const rows = [
        {
          session_id: '1',
          availability: { skill: { title: 'Piano Lessons' } },
        },
        { session_id: '2', availability: null },
      ];
      mockFromResult({ data: rows, error: null });
      const result = await getSessionsForUser('u1');
      expect(result[0].skill_title).toBe('Piano Lessons');
      expect(result[1].skill_title).toBe('Skill session');
      expect(result[0].availability).toBeUndefined();
    });

    it('throws on error', async () => {
      mockFromResult({ data: null, error: { message: 'bad' } });
      await expect(getSessionsForUser('u1')).rejects.toEqual({ message: 'bad' });
    });
  });

  describe('getTransactions', () => {
    it('orders transactions newest first', async () => {
      mockFromResult({ data: [], error: null });
      await getTransactions('u1');
      expect(builderCalls).toContainEqual({
        method: 'order',
        args: ['created_at', { ascending: false }],
      });
    });
  });

  describe('setLearningInterests', () => {
    it('returns an empty array when no categories are given', async () => {
      mockFromResult({ data: [], error: null });
      await expect(setLearningInterests('u1', [])).resolves.toEqual([]);
      expect(builderCalls.filter((c) => c.method === 'insert')).toHaveLength(0);
    });

    it('deletes then inserts the given categories', async () => {
      mockFromResult({ data: [], error: null });
      await setLearningInterests('u1', ['Music', 'Cooking']);
      const insert = builderCalls.find((c) => c.method === 'insert');
      expect(insert.args[0]).toEqual([
        { user_id: 'u1', category: 'Music' },
        { user_id: 'u1', category: 'Cooking' },
      ]);
      expect(builderCalls.filter((c) => c.method === 'delete')).toHaveLength(1);
    });
  });

  describe('uploadAvatar', () => {
    it('uploads the fetched file, generates a timestamped URL, and updates the user', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      mockFromResult({ data: { user_id: 'u1' }, error: null });
      const result = await uploadAvatar({ userId: 'u1', uri: 'file:///tmp/me.jpg' });

      expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
      const update = builderCalls.find((c) => c.method === 'update');
      expect(update.args[0].avatar).toMatch(/^https:\/\/cdn\.example\/avatar\.png\?t=\d+$/);

      expect(result).toEqual({ user_id: 'u1' });
      delete global.fetch;
    });
  });
});