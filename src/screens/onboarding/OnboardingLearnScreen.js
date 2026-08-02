import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';

export default function OnboardingLearnScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams();
  const isFirstTimeOnboarding = from === 'onboarding';
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getLearningInterests(user.user_id).then((existing) => {
      setSelected(existing.map((i) => i.category));
    });
  }, [user]);

  const customEntries = selected.filter((item) => !SKILL_CATEGORIES.includes(item));

  const toggle = (category) => {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const addCustom = () => {
    const value = customInput.trim();
    if (!value) return;
    const alreadyAdded = selected.some((item) => item.toLowerCase() === value.toLowerCase());
    if (!alreadyAdded) {
      setSelected((prev) => [...prev, value]);
    }
    setCustomInput('');
  };

  const removeCustom = (value) => {
    setSelected((prev) => prev.filter((item) => item !== value));
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.setLearningInterests(user.user_id, selected);
    } finally {
      setSaving(false);
      if (isFirstTimeOnboarding) {
        router.replace('/(tabs)');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>Step 2 of 2</Text>
        <Text style={styles.title}>What do you want to learn?</Text>
        <Text style={styles.subtitle}>
          Pick a few categories — we'll use them to recommend skills to you. You can change this anytime.
        </Text>

        <View style={styles.grid}>
          {SKILL_CATEGORIES.map((category) => {
            const active = selected.includes(category);
            return (
              <Pressable
                key={category}
                onPress={() => toggle(category)}
                style={[styles.chip, active && styles.chipActive]}
              >
                {active ? <Ionicons name="checkmark" size={16} color={COLORS.white} /> : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>

        {customEntries.length > 0 && (
          <View style={styles.grid}>
            {customEntries.map((item) => (
              <Pressable key={item} onPress={() => removeCustom(item)} style={[styles.chip, styles.chipActive]}>
                <Text style={[styles.chipText, styles.chipTextActive]}>{item}</Text>
                <Ionicons name="close" size={14} color={COLORS.white} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.customLabel}>Don't see it? Add your own</Text>
        <View style={styles.customRow}>
          <Input
            placeholder="e.g. Woodworking, Mandarin…"
            value={customInput}
            onChangeText={setCustomInput}
            onSubmitEditing={addCustom}
            returnKeyType="done"
            containerStyle={styles.customInput}
          />
          <Button
            title="Add"
            variant="secondary"
            fullWidth={false}
            onPress={addCustom}
            disabled={!customInput.trim()}
            style={styles.customAddButton}
          />
        </View>

        <View style={styles.footer}>
          <Button
            title={selected.length > 0 ? `Finish (${selected.length} selected)` : 'Skip for now'}
            onPress={finish}
            loading={saving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  step: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  customLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  customInput: {
    flex: 1,
    marginBottom: 0,
  },
  customAddButton: {
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    marginTop: SPACING.xl,
  },
});
