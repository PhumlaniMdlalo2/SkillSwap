import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

export default function OnboardingLearnScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams();
  const isFirstTimeOnboarding = from === 'onboarding';
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: existingInterests,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['interests', user?.user_id],
    queryFn: () => api.getLearningInterests(user.user_id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!existingInterests) return;
    setSelected(existingInterests.map((i) => i.category));
  }, [existingInterests]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading your interests…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const customEntries = selected.filter((item) => !SKILL_CATEGORIES.includes(item));

  const toggle = (category) => {
    setSelected((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
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
      await queryClient.invalidateQueries({ queryKey: ['interests'] });
      if (isFirstTimeOnboarding) {
        router.push({ pathname: '/(onboarding)/style', params: { from: 'onboarding' } });
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      notify('Could not save your interests', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          )
        }
      >
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.title} accessibilityRole="header">
          What do you want to learn?
        </Text>
        <Text style={styles.subtitle}>
          Pick a few categories — we'll use them to recommend skills to you. You can change this
          anytime.
        </Text>

        <View style={styles.grid}>
          {SKILL_CATEGORIES.map((category) => {
            const active = selected.includes(category);
            return (
              <Pressable
                key={category}
                onPress={() => toggle(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
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
              <Pressable
                key={item}
                onPress={() => removeCustom(item)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item}`}
                style={[styles.chip, styles.chipActive]}
              >
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
            title={
              selected.length > 0
                ? `${isFirstTimeOnboarding ? 'Continue' : 'Save'} (${selected.length} selected)`
                : isFirstTimeOnboarding
                  ? 'Skip for now'
                  : 'Save'
            }
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
