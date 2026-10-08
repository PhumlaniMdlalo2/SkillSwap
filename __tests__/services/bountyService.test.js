import { supabase } from '../../src/services/supabase';
import { bountyService } from '../../src/services/bountyService';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
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
    },
  );
}

function mockFromResult(result) {
  resolveValue = result;
  supabase.from.mockReturnValue(makeBuilder());
}

describe('bountyService', () => {
  beforeEach(() => {
    builderCalls.length = 0;
    resolveValue = { data: null, error: null };
    supabase.from.mockReset();
  });

  describe('getBounties', () => {
    it('fetches and maps bounties with creator and offers', async () => {
      mockFromResult({
        data: [
          {
            bounty_id: 'b1',
            creator_id: 'u1',
            title: 'Help with Python Async',
            description: 'Need help understanding async await in Python',
            category: 'Technology',
            reward_type: 'token',
            token_amount: 1,
            urgency: 'urgent',
            status: 'open',
            created_at: '2026-10-07T12:00:00Z',
            updated_at: '2026-10-07T12:00:00Z',
            creator: { user_id: 'u1', name: 'John', avatar: null, rating: 5.0 },
            bounty_offers: [
              {
                offer_id: 'o1',
                bounty_id: 'b1',
                helper_id: 'u2',
                message: 'I can help',
                status: 'pending',
                created_at: '2026-10-07T12:30:00Z',
              },
            ],
          },
        ],
        error: null,
      });

      const bounties = await bountyService.getBounties({ category: 'Technology', search: 'Python' });

      expect(supabase.from).toHaveBeenCalledWith('bounties');
      expect(bounties).toHaveLength(1);
      expect(bounties[0].title).toBe('Help with Python Async');
      expect(bounties[0].offers).toHaveLength(1);
      expect(bounties[0].offers[0].helperId).toBe('u2');
    });

    it('throws error when supabase query fails', async () => {
      mockFromResult({
        data: null,
        error: new Error('Database error'),
      });

      await expect(bountyService.getBounties()).rejects.toThrow('Database error');
    });
  });

  describe('createBounty', () => {
    it('validates minimum title length', async () => {
      await expect(
        bountyService.createBounty({
          creatorId: 'u1',
          title: 'Hi',
          description: 'Valid description that is long enough',
          category: 'Technology',
        }),
      ).rejects.toThrow('Title must be at least 5 characters');
    });

    it('validates minimum description length', async () => {
      await expect(
        bountyService.createBounty({
          creatorId: 'u1',
          title: 'Valid Title Here',
          description: 'Short',
          category: 'Technology',
        }),
      ).rejects.toThrow('Description must be at least 10 characters');
    });

    it('validates category is required', async () => {
      await expect(
        bountyService.createBounty({
          creatorId: 'u1',
          title: 'Valid Title Here',
          description: 'Valid description that is long enough',
          category: '',
        }),
      ).rejects.toThrow('Category is required');
    });

    it('inserts and returns mapped bounty', async () => {
      mockFromResult({
        data: {
          bounty_id: 'b2',
          creator_id: 'u1',
          title: 'Learn Guitar Scales',
          description: 'Looking for a guitarist to guide me through pentatonic scales',
          category: 'Music',
          reward_type: 'token',
          token_amount: 2,
          urgency: 'this_week',
          status: 'open',
          created_at: '2026-10-07T13:00:00Z',
          updated_at: '2026-10-07T13:00:00Z',
          creator: { user_id: 'u1', name: 'John', avatar: null, rating: 5.0 },
          bounty_offers: [],
        },
        error: null,
      });

      const result = await bountyService.createBounty({
        creatorId: 'u1',
        title: 'Learn Guitar Scales',
        description: 'Looking for a guitarist to guide me through pentatonic scales',
        category: 'Music',
        tokenAmount: 2,
        urgency: 'this_week',
      });

      expect(supabase.from).toHaveBeenCalledWith('bounties');
      expect(result.id).toBe('b2');
      expect(result.title).toBe('Learn Guitar Scales');
      expect(result.tokenAmount).toBe(2);
    });
  });

  describe('deleteBounty', () => {
    it('deletes the bounty row', async () => {
      mockFromResult({ data: null, error: null });

      const ok = await bountyService.deleteBounty('b2');
      expect(ok).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('bounties');
    });
  });

  describe('makeOffer', () => {
    it('inserts an offer and returns it', async () => {
      mockFromResult({
        data: {
          offer_id: 'o9',
          bounty_id: 'b2',
          helper_id: 'u3',
          message: 'Happy to help you with guitar!',
          status: 'pending',
          created_at: '2026-10-07T14:00:00Z',
          helper: { user_id: 'u3', name: 'Sarah', avatar: 'sarah.jpg' },
        },
        error: null,
      });

      const offer = await bountyService.makeOffer({
        bountyId: 'b2',
        helperId: 'u3',
        message: 'Happy to help you with guitar!',
      });

      expect(supabase.from).toHaveBeenCalledWith('bounty_offers');
      expect(offer.id).toBe('o9');
      expect(offer.helperId).toBe('u3');
      expect(offer.message).toBe('Happy to help you with guitar!');
    });
  });
});
