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
const resultQueue = [];
const builderCalls = [];

function makeBuilder() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve) =>
            resolve(resultQueue.length ? resultQueue.shift() : resolveValue);
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

// Queues one result per awaited query, for services that hit the database
// more than once (e.g. fetchConversations: matches, then messages).
function mockFromSequence(results) {
  resultQueue.length = 0;
  resultQueue.push(...results);
  supabase.from.mockReturnValue(makeBuilder());
}

describe('chatService', () => {
  beforeEach(() => {
    builderCalls.length = 0;
    resultQueue.length = 0;
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

  describe('fetchConversations', () => {
    it('returns empty array when userId is missing', async () => {
      const result = await chatService.fetchConversations(null);
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('returns empty array when the user has no matches', async () => {
      mockFromResult({ data: [], error: null });
      const result = await chatService.fetchConversations('u1');
      expect(result).toEqual([]);
    });

    it('maps counterpart, last message, and sorts newest-first', async () => {
      mockFromSequence([
        {
          data: [
            {
              match_id: 'm1',
              user_id_1: 'u1',
              user_id_2: 'u2',
              matched_at: '2026-10-01T10:00:00Z',
              user1: { user_id: 'u1', name: 'Alice', avatar: 'a.png' },
              user2: { user_id: 'u2', name: 'Bob', avatar: 'b.png' },
            },
            {
              match_id: 'm2',
              user_id_1: 'u3',
              user_id_2: 'u1',
              matched_at: '2026-10-05T10:00:00Z',
              user1: { user_id: 'u3', name: 'Zara', avatar: 'z.png' },
              user2: { user_id: 'u1', name: 'Alice', avatar: 'a.png' },
            },
          ],
          error: null,
        },
        {
          data: [
            {
              match_id: 'm2',
              sender_id: 'u3',
              content: 'Newest',
              created_at: '2026-10-07T12:00:00Z',
            },
            {
              match_id: 'm2',
              sender_id: 'u1',
              content: 'Older',
              created_at: '2026-10-06T12:00:00Z',
            },
            {
              match_id: 'm1',
              sender_id: 'u1',
              content: 'Mine to Bob',
              created_at: '2026-10-02T12:00:00Z',
            },
          ],
          error: null,
        },
      ]);

      const result = await chatService.fetchConversations('u1');

      expect(result).toHaveLength(2);
      // Newest conversation first (m2, last message 2026-10-07)
      expect(result[0].id).toBe('m2');
      expect(result[0].counterpart).toEqual({ id: 'u3', name: 'Zara', avatar: 'z.png' });
      expect(result[0].lastMessage).toEqual({
        content: 'Newest',
        createdAt: '2026-10-07T12:00:00Z',
        senderId: 'u3',
        fromMe: false,
      });
      // m1 sorted second; counterpart is the other user
      expect(result[1].id).toBe('m1');
      expect(result[1].counterpart).toEqual({ id: 'u2', name: 'Bob', avatar: 'b.png' });
      expect(result[1].lastMessage.fromMe).toBe(true);
    });

    it('falls back to matchedAt when a match has no messages yet', async () => {
      mockFromSequence([
        {
          data: [
            {
              match_id: 'm1',
              user_id_1: 'u1',
              user_id_2: 'u2',
              matched_at: '2026-10-01T10:00:00Z',
              user1: { user_id: 'u1', name: 'Alice', avatar: 'a.png' },
              user2: { user_id: 'u2', name: 'Bob', avatar: 'b.png' },
            },
          ],
          error: null,
        },
        { data: [], error: null },
      ]);

      const result = await chatService.fetchConversations('u1');

      expect(result).toHaveLength(1);
      expect(result[0].lastMessage).toBeNull();
      expect(result[0].matchedAt).toBe('2026-10-01T10:00:00Z');
    });

    it('throws when the matches query fails', async () => {
      mockFromResult({ data: null, error: new Error('matches boom') });
      await expect(chatService.fetchConversations('u1')).rejects.toThrow('matches boom');
    });

    it('throws when the messages query fails', async () => {
      mockFromSequence([
        {
          data: [
            {
              match_id: 'm1',
              user_id_1: 'u1',
              user_id_2: 'u2',
              matched_at: '2026-10-01T10:00:00Z',
              user1: { user_id: 'u1', name: 'Alice', avatar: null },
              user2: { user_id: 'u2', name: 'Bob', avatar: null },
            },
          ],
          error: null,
        },
        { data: null, error: new Error('messages boom') },
      ]);

      await expect(chatService.fetchConversations('u1')).rejects.toThrow('messages boom');
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
