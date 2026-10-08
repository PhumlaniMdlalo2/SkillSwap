import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { timeAgo } from '../../utils/helpers';
import { notify, confirmAction } from '../../utils/alert';

const URGENCY_CONFIG = {
  urgent: { label: '🔥 Urgent', bg: COLORS.dangerLight, color: COLORS.danger },
  this_week: { label: '⚡ This Week', bg: COLORS.tokenLight, color: COLORS.token },
  flexible: { label: '☕ Flexible', bg: COLORS.primaryLight, color: COLORS.primary },
};

export default function BountyCard({
  bounty,
  currentUserId,
  onMakeOffer,
  onDeleteBounty,
  onCloseBounty,
}) {
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const isOwner = bounty.creatorId === currentUserId;
  const hasOffered = bounty.offers?.some((o) => o.helperId === currentUserId);
  const urgencyStyle = URGENCY_CONFIG[bounty.urgency] ?? URGENCY_CONFIG.flexible;

  const handleSubmitOffer = async () => {
    if (submittingOffer) return;
    setSubmittingOffer(true);
    try {
      await onMakeOffer?.(bounty.id, offerMessage);
      setShowOfferInput(false);
      setOfferMessage('');
      notify('Offer Sent! 🎉', 'The creator has been notified of your offer to help.');
    } catch (err) {
      notify('Could not send offer', err.message || 'Please try again.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleDelete = () => {
    confirmAction(
      'Delete Bounty?',
      'Are you sure you want to remove this learning request?',
      {
        confirmText: 'Delete',
        destructive: true,
        onConfirm: () => onDeleteBounty?.(bounty.id),
      },
    );
  };

  return (
    <Card style={styles.card}>
      {/* Header: Creator & Badges */}
      <View style={styles.header}>
        <View style={styles.creatorRow}>
          <Avatar uri={bounty.creator?.avatar} name={bounty.creator?.name} size={36} />
          <View style={styles.creatorMeta}>
            <Text style={styles.creatorName} numberOfLines={1}>
              {bounty.creator?.name ?? 'Member'}
            </Text>
            <Text style={styles.timeText}>{timeAgo(bounty.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyStyle.bg }]}>
            <Text style={[styles.urgencyText, { color: urgencyStyle.color }]}>
              {urgencyStyle.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <Text style={styles.title}>{bounty.title}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {bounty.description}
      </Text>

      {/* Tags row */}
      <View style={styles.tagsRow}>
        <View style={styles.categoryPill}>
          <Ionicons name="folder-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.categoryText}>{bounty.category}</Text>
        </View>

        <View style={styles.rewardPill}>
          {bounty.rewardType === 'token' ? (
            <>
              <Text style={styles.tokenIcon}>🪙</Text>
              <Text style={styles.rewardText}>
                {bounty.tokenAmount} Token{bounty.tokenAmount === 1 ? '' : 's'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={14} color={COLORS.secondary} />
              <Text style={[styles.rewardText, { color: COLORS.secondary }]}>Skill Trade</Text>
            </>
          )}
        </View>

        {bounty.offers?.length > 0 && (
          <View style={styles.offersPill}>
            <Ionicons name="people-outline" size={12} color={COLORS.primary} />
            <Text style={styles.offersText}>
              {bounty.offers.length} offer{bounty.offers.length === 1 ? '' : 's'}
            </Text>
          </View>
        )}
      </View>

      {/* Offer Input Box */}
      {showOfferInput && (
        <View style={styles.offerInputSection}>
          <TextInput
            style={styles.offerTextInput}
            placeholder="Add an optional note (e.g. your experience or availability)…"
            placeholderTextColor={COLORS.textFaint}
            value={offerMessage}
            onChangeText={setOfferMessage}
            multiline
            maxLength={300}
          />
          <View style={styles.offerBtnRow}>
            <Button
              title="Cancel"
              variant="secondary"
              fullWidth={false}
              size="sm"
              onPress={() => setShowOfferInput(false)}
            />
            <Button
              title={submittingOffer ? 'Sending…' : 'Submit Offer'}
              fullWidth={false}
              size="sm"
              loading={submittingOffer}
              onPress={handleSubmitOffer}
            />
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {!showOfferInput && (
        <View style={styles.actionRow}>
          {isOwner ? (
            <View style={styles.ownerActions}>
              <Pressable
                onPress={handleDelete}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel="Delete bounty"
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
              {bounty.status === 'open' && (
                <Pressable
                  onPress={() => onCloseBounty?.(bounty.id)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                >
                  <Text style={styles.closeText}>Mark Completed</Text>
                </Pressable>
              )}
            </View>
          ) : hasOffered ? (
            <View style={styles.offeredBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.offeredText}>You offered to help</Text>
            </View>
          ) : (
            <Button
              title="I Can Help 🤝"
              variant="primary"
              size="sm"
              style={styles.helpButton}
              onPress={() => setShowOfferInput(true)}
            />
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    flex: 1,
  },
  creatorMeta: {
    flex: 1,
  },
  creatorName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  timeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs - 1,
    borderRadius: RADII.round,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: 22,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs - 2,
    borderRadius: RADII.round,
  },
  categoryText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.tokenLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs - 2,
    borderRadius: RADII.round,
  },
  tokenIcon: {
    fontSize: 12,
  },
  rewardText: {
    fontSize: 11,
    color: COLORS.token,
    fontWeight: '700',
  },
  offersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs - 2,
    borderRadius: RADII.round,
  },
  offersText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: SPACING.xs,
  },
  helpButton: {
    marginTop: SPACING.xs,
  },
  offeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
  },
  offeredText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  deleteText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.danger,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: SPACING.xs,
  },
  closeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  offerInputSection: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  offerTextInput: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: SPACING.sm,
  },
  offerBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
  },
});
