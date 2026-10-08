import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../ui/Button';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';

const URGENCY_OPTIONS = [
  { key: 'urgent', label: '🔥 Urgent (24-48h)' },
  { key: 'this_week', label: '⚡ This Week' },
  { key: 'flexible', label: '☕ Flexible' },
];

export default function CreateBountyModal({ visible, onClose, onSubmit, submitting }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(SKILL_CATEGORIES[0]);
  const [rewardType, setRewardType] = useState('token');
  const [tokenAmount, setTokenAmount] = useState(1);
  const [urgency, setUrgency] = useState('this_week');

  const isValid = title.trim().length >= 5 && description.trim().length >= 10 && category;

  const handleCreate = () => {
    if (!isValid || submitting) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      rewardType,
      tokenAmount: rewardType === 'token' ? tokenAmount : 1,
      urgency,
    });
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setCategory(SKILL_CATEGORIES[0]);
    setRewardType('token');
    setTokenAmount(1);
    setUrgency('this_week');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleReset}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Post a Bounty 🎯</Text>
              <Text style={styles.subtitle}>Ask the community for urgent or tailored help.</Text>
            </View>
            <Pressable onPress={handleReset} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close-circle-outline" size={28} color={COLORS.textFaint} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Title */}
            <Text style={styles.label}>What do you need help with? *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Debug a React hook, French pronunciation…"
              placeholderTextColor={COLORS.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            {/* Category */}
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chipsRow}>
                {SKILL_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[styles.chip, category === cat && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Description */}
            <Text style={styles.label}>Details & current skill level *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Explain what you are trying to accomplish and what you need assistance with…"
              placeholderTextColor={COLORS.textFaint}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            {/* Reward Type */}
            <Text style={styles.label}>Reward Offered</Text>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setRewardType('token')}
                style={[styles.segmentBtn, rewardType === 'token' && styles.segmentBtnActive]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    rewardType === 'token' && styles.segmentBtnTextActive,
                  ]}
                >
                  🪙 Time Tokens
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRewardType('swap')}
                style={[styles.segmentBtn, rewardType === 'swap' && styles.segmentBtnActive]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    rewardType === 'swap' && styles.segmentBtnTextActive,
                  ]}
                >
                  🔄 Skill Trade
                </Text>
              </Pressable>
            </View>

            {rewardType === 'token' && (
              <View style={styles.tokenPickerRow}>
                <Text style={styles.sublabel}>Amount:</Text>
                {[1, 2, 3].map((amount) => (
                  <Pressable
                    key={amount}
                    onPress={() => setTokenAmount(amount)}
                    style={[styles.amountPill, tokenAmount === amount && styles.amountPillActive]}
                  >
                    <Text
                      style={[
                        styles.amountPillText,
                        tokenAmount === amount && styles.amountPillTextActive,
                      ]}
                    >
                      {amount} Token{amount > 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Urgency */}
            <Text style={styles.label}>Urgency</Text>
            <View style={styles.urgencyRow}>
              {URGENCY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setUrgency(opt.key)}
                  style={[styles.urgencyPill, urgency === opt.key && styles.urgencyPillActive]}
                >
                  <Text
                    style={[
                      styles.urgencyPillText,
                      urgency === opt.key && styles.urgencyPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Post Bounty"
              onPress={handleCreate}
              loading={submitting}
              disabled={!isValid || submitting}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  body: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  sublabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    marginBottom: SPACING.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  segmentBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  segmentBtnTextActive: {
    color: COLORS.primary,
  },
  tokenPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  amountPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs - 2,
    borderRadius: RADII.round,
  },
  amountPillActive: {
    backgroundColor: COLORS.tokenLight,
    borderColor: COLORS.token,
  },
  amountPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  amountPillTextActive: {
    color: COLORS.token,
  },
  urgencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  urgencyPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.round,
  },
  urgencyPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  urgencyPillText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  urgencyPillTextActive: {
    color: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
