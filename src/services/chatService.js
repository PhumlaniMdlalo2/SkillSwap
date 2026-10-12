import { supabase } from './supabase';

function mapMessage(row) {
  return {
    id: row.message_id,
    matchId: row.match_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    sender: row.sender ?? null,
  };
}

export const chatService = {
  async fetchMessages(matchId) {
    if (!matchId) return [];
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(name, avatar)')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapMessage);
  },

  async fetchConversations(userId) {
    if (!userId) return [];

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*, user1:user_id_1(user_id, name, avatar), user2:user_id_2(user_id, name, avatar)')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (matchesError) throw matchesError;
    if (!matches || matches.length === 0) return [];

    const matchIds = matches.map((m) => m.match_id);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('match_id, sender_id, content, created_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false });

    if (messagesError) throw messagesError;

    // Query is newest-first, so the first row seen per match is the latest.
    const lastByMatch = new Map();
    for (const msg of messages || []) {
      if (!lastByMatch.has(msg.match_id)) lastByMatch.set(msg.match_id, msg);
    }

    const conversations = matches.map((m) => {
      const isUser1 = m.user_id_1 === userId;
      const counterpart = isUser1 ? m.user2 : m.user1;
      const last = lastByMatch.get(m.match_id) ?? null;
      return {
        id: m.match_id,
        matchedAt: m.matched_at,
        counterpart: counterpart
          ? { id: counterpart.user_id, name: counterpart.name, avatar: counterpart.avatar }
          : null,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.created_at,
              senderId: last.sender_id,
              fromMe: last.sender_id === userId,
            }
          : null,
      };
    });

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.matchedAt;
      const bTime = b.lastMessage?.createdAt ?? b.matchedAt;
      return new Date(bTime) - new Date(aTime);
    });

    return conversations;
  },

  async sendMessage(matchId, senderId, content) {
    const trimmed = content?.trim();
    if (!trimmed) {
      throw new Error('Message cannot be empty');
    }
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: senderId,
        content: trimmed,
      })
      .select('*, sender:sender_id(name, avatar)')
      .single();

    if (error) throw error;
    return mapMessage(data);
  },

  async getMatchDetails(matchId, currentUserId) {
    if (!matchId) return null;
    const { data, error } = await supabase
      .from('matches')
      .select('*, user1:user_id_1(user_id, name, avatar, bio), user2:user_id_2(user_id, name, avatar, bio)')
      .eq('match_id', matchId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const isUser1 = data.user_id_1 === currentUserId;
    const counterpart = isUser1 ? data.user2 : data.user1;

    return {
      matchId: data.match_id,
      matchedAt: data.matched_at,
      counterpart: counterpart
        ? {
            id: counterpart.user_id,
            name: counterpart.name,
            avatar: counterpart.avatar,
            bio: counterpart.bio,
          }
        : null,
    };
  },

  async findMatchIdBetweenUsers(userId1, userId2) {
    if (!userId1 || !userId2) return null;
    const u1 = userId1 < userId2 ? userId1 : userId2;
    const u2 = userId1 < userId2 ? userId2 : userId1;

    const { data, error } = await supabase
      .from('matches')
      .select('match_id')
      .eq('user_id_1', u1)
      .eq('user_id_2', u2)
      .maybeSingle();

    if (error) throw error;
    return data?.match_id ?? null;
  },

  subscribeToMessages(matchId, onNewMessage) {
    if (!supabase?.channel) {
      return () => {};
    }

    const channel = supabase
      .channel(`match_messages_${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload?.new && onNewMessage) {
            onNewMessage(mapMessage(payload.new));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
