import { supabase } from './supabase';

function mapBounty(row) {
  return {
    id: row.bounty_id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    category: row.category,
    rewardType: row.reward_type,
    tokenAmount: row.token_amount,
    urgency: row.urgency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creator: row.creator ?? null,
    offers: (row.bounty_offers || []).map((o) => ({
      id: o.offer_id,
      bountyId: o.bounty_id,
      helperId: o.helper_id,
      message: o.message,
      status: o.status,
      createdAt: o.created_at,
      helper: o.helper ?? null,
    })),
  };
}

export const bountyService = {
  async getBounties({ category, search, status = 'open' } = {}) {
    let query = supabase
      .from('bounties')
      .select('*, creator:creator_id(user_id, name, avatar, rating), bounty_offers(*)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search?.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapBounty);
  },

  async getBountyById(bountyId) {
    if (!bountyId) return null;
    const { data, error } = await supabase
      .from('bounties')
      .select(
        '*, creator:creator_id(user_id, name, avatar, rating), bounty_offers(*, helper:helper_id(user_id, name, avatar))',
      )
      .eq('bounty_id', bountyId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return mapBounty(data);
  },

  async createBounty({
    creatorId,
    title,
    description,
    category,
    rewardType = 'token',
    tokenAmount = 1,
    urgency = 'flexible',
  }) {
    const trimmedTitle = title?.trim();
    const trimmedDesc = description?.trim();

    if (!trimmedTitle || trimmedTitle.length < 5) {
      throw new Error('Title must be at least 5 characters');
    }
    if (!trimmedDesc || trimmedDesc.length < 10) {
      throw new Error('Description must be at least 10 characters');
    }
    if (!category) {
      throw new Error('Category is required');
    }

    const { data, error } = await supabase
      .from('bounties')
      .insert({
        creator_id: creatorId,
        title: trimmedTitle,
        description: trimmedDesc,
        category,
        reward_type: rewardType,
        token_amount: Number(tokenAmount) || 1,
        urgency,
      })
      .select('*, creator:creator_id(user_id, name, avatar, rating)')
      .single();

    if (error) throw error;
    return mapBounty(data);
  },

  async deleteBounty(bountyId) {
    const { error } = await supabase.from('bounties').delete().eq('bounty_id', bountyId);
    if (error) throw error;
    return true;
  },

  async updateBountyStatus(bountyId, status) {
    const { data, error } = await supabase
      .from('bounties')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('bounty_id', bountyId)
      .select()
      .single();

    if (error) throw error;
    return mapBounty(data);
  },

  async makeOffer({ bountyId, helperId, message }) {
    const { data, error } = await supabase
      .from('bounty_offers')
      .insert({
        bounty_id: bountyId,
        helper_id: helperId,
        message: message?.trim() || null,
      })
      .select('*, helper:helper_id(user_id, name, avatar)')
      .single();

    if (error) throw error;
    return {
      id: data.offer_id,
      bountyId: data.bounty_id,
      helperId: data.helper_id,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
      helper: data.helper ?? null,
    };
  },

  async respondToOffer({ offerId, status }) {
    const { data, error } = await supabase
      .from('bounty_offers')
      .update({ status })
      .eq('offer_id', offerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
