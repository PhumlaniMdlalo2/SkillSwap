import { supabase } from '../../src/services/supabase';
import { chatService } from '../../src/services/chatService';

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
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

describe('chatService', () => {
  beforeEach(() => {
    builderCalls.length = 0;
    resolveValue = { data: null, error: null };
    supabase.from.mockReset();
    supabase.channel.mockReset();
    supabase.removeChannel.mockReset();
  });

  describe('fetchMessages', () => {
    it('returns empty array when matchId is missing', async () => {
      const messages = await chatService.fetchMessages(null);
      expect(messages).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('fetches and maps messages ordered by created_at', async () => {
      mockFromResult({
        data: [
          {
            message_id: 'm1',
            match_id: 'match-123',
            sender_id: 'u1',
            content: 'Hello!',
            created_at: '2026-10-07T12:00:00Z',
            sender: { name: 'Alice', avatar: 'alice.png' },
          },
        ],
        error: null,
      });

      const messages = await chatService.fetchMessages('match-123');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(messages).toEqual([
        {
          id: 'm1',
          matchId: 'match-123',
          senderId: 'u1',
          content: 'Hello!',
          createdAt: '2026-10-07T12:00:00Z',
          sender: { name: 'Alice', avatar: 'alice.png' },
        },
      ]);
    });

    it('throws error if supabase query fails', async () => {
      mockFromResult({
        data: null,
        error: new Error('Failed to fetch messages'),
      });

      await expect(chatService.fetchMessages('match-123')).rejects.toThrow(
        'Failed to fetch messages',
      );
    });
  });

  describe('sendMessage', () => {
    it('throws error if content is empty or only whitespace', async () => {
      await expect(chatService.sendMessage('match-123', 'u1', '   ')).rejects.toThrow(
        'Message cannot be empty',
      );
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('inserts trimmed content and returns mapped message', async () => {
      mockFromResult({
        data: {
          message_id: 'm2',
          match_id: 'match-123',
          sender_id: 'u1',
          content: 'Hey there',
          created_at: '2026-10-07T12:01:00Z',
          sender: { name: 'Alice', avatar: null },
        },
        error: null,
      });

      const result = await chatService.sendMessage('match-123', 'u1', '  Hey there  ');

      expect(supabase.from).toHaveBeenCalledWith('messages');
      expect(result).toEqual({
        id: 'm2',
        matchId: 'match-123',
        senderId: 'u1',
        content: 'Hey there',
        createdAt: '2026-10-07T12:01:00Z',
        sender: { name: 'Alice', avatar: null },
      });
    });
  });

  describe('getMatchDetails', () => {
    it('returns null if matchId is missing', async () => {
      const details = await chatService.getMatchDetails(null, 'u1');
      expect(details).toBeNull();
    });

    it('returns formatted counterpart details when current user is user_id_1', async () => {
      mockFromResult({
        data: {
          match_id: 'match-123',
          matched_at: '2026-10-07T10:00:00Z',
          user_id_1: 'u1',
          user_id_2: 'u2',
          user1: { user_id: 'u1', name: 'Alice', avatar: 'alice.png', bio: 'Coder' },
          user2: { user_id: 'u2', name: 'Bob', avatar: 'bob.png', bio: 'Chef' },
        },
        error: null,
      });

      const details = await chatService.getMatchDetails('match-123', 'u1');

      expect(details).toEqual({
        matchId: 'match-123',
        matchedAt: '2026-10-07T10:00:00Z',
        counterpart: {
          id: 'u2',
          name: 'Bob',
          avatar: 'bob.png',
          bio: 'Chef',
        },
      });
    });

    it('returns formatted counterpart details when current user is user_id_2', async () => {
      mockFromResult({
        data: {
          match_id: 'match-123',
          matched_at: '2026-10-07T10:00:00Z',
          user_id_1: 'u1',
          user_id_2: 'u2',
          user1: { user_id: 'u1', name: 'Alice', avatar: 'alice.png', bio: 'Coder' },
          user2: { user_id: 'u2', name: 'Bob', avatar: 'bob.png', bio: 'Chef' },
        },
        error: null,
      });

      const details = await chatService.getMatchDetails('match-123', 'u2');

      expect(details).toEqual({
        matchId: 'match-123',
        matchedAt: '2026-10-07T10:00:00Z',
        counterpart: {
          id: 'u1',
          name: 'Alice',
          avatar: 'alice.png',
          bio: 'Coder',
        },
      });
    });
  });

  describe('findMatchIdBetweenUsers', () => {
    it('returns null if either user ID is missing', async () => {
      expect(await chatService.findMatchIdBetweenUsers(null, 'u2')).toBeNull();
      expect(await chatService.findMatchIdBetweenUsers('u1', null)).toBeNull();
    });

    it('orders user IDs alphabetically to match table constraint', async () => {
      mockFromResult({
        data: { match_id: 'match-xyz' },
        error: null,
      });

      const matchId = await chatService.findMatchIdBetweenUsers('u9', 'u2');
      expect(matchId).toBe('match-xyz');

      const eqCalls = builderCalls.filter((c) => c.method === 'eq');
      expect(eqCalls).toEqual([
        { method: 'eq', args: ['user_id_1', 'u2'] },
        { method: 'eq', args: ['user_id_2', 'u9'] },
      ]);
    });
  });

  describe('subscribeToMessages', () => {
    it('subscribes to postgres_changes and returns unsubscribe function', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };
      supabase.channel.mockReturnValue(mockChannel);

      const callback = jest.fn();
      const unsubscribe = chatService.subscribeToMessages('match-123', callback);

      expect(supabase.channel).toHaveBeenCalledWith('match_messages_match-123');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'match_id=eq.match-123',
        }),
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Trigger listener
      const listener = mockChannel.on.mock.calls[0][2];
      listener({
        new: {
          message_id: 'm-live',
          match_id: 'match-123',
          sender_id: 'u2',
          content: 'Live message!',
          created_at: '2026-10-07T12:05:00Z',
        },
      });

      expect(callback).toHaveBeenCalledWith({
        id: 'm-live',
        matchId: 'match-123',
        senderId: 'u2',
        content: 'Live message!',
        createdAt: '2026-10-07T12:05:00Z',
        sender: null,
      });

      // Unsubscribe cleanup
      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
