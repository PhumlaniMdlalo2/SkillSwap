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
