import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';
import { notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

export default function SwapSettingsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, setPreferences } = useSwapStore();
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: stored,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['swap-preferences', user?.user_id],
    queryFn: () => swapService.getSwapPreferences(user.user_id),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (stored) setPreferences(stored);
  }, [stored, setPreferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await swapService.updateSwapPreferences(user.user_id, preferences);
      await queryClient.invalidateQueries({ queryKey: ['swap-preferences'] });
      router.back();
    } catch (err) {
      notify('Could not save your settings', toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  if (isPending) return <LoadingSpinner label="Loading preferences…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <Text style={styles.title} accessibilityRole="header">
          Skill Match Settings
        </Text>

        <Text style={styles.sectionLabel}>Skill category</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setPreferences({ skillCategory: null })}
            accessibilityRole="button"
            accessibilityState={{ selected: !preferences.skillCategory }}
            style={[styles.chip, !preferences.skillCategory && styles.chipActive]}
          >
            <Text style={[styles.chipText, !preferences.skillCategory && styles.chipTextActive]}>
              Any
            </Text>
          </Pressable>
          {SKILL_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => setPreferences({ skillCategory: category })}
              accessibilityRole="button"
              accessibilityState={{ selected: preferences.skillCategory === category }}
              style={[styles.chip, preferences.skillCategory === category && styles.chipActive]}
            >
              <Text
                style={[
                  styles.chipText,
                  preferences.skillCategory === category && styles.chipTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notify me about new matches</Text>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={(value) => setPreferences({ notificationsEnabled: value })}
            accessibilityLabel="Notify me about new matches"
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={preferences.notificationsEnabled ? COLORS.primary : COLORS.surface}
          />
        </View>

        <Button
          title="Save Preferences"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: SPACING.lg }}
        />
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
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    padding: SPACING.md,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    flex: 1,
  },
});
