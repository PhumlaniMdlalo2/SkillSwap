import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Button from '../../components/ui/Button';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';

const DISTANCES = [10, 25, 50, 100];

export default function SwapSettingsScreen() {
  const { preferences, setPreferences } = useSwapStore();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await swapService.updateSwapPreferences(preferences);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Skill Match Settings</Text>

        <Text style={styles.sectionLabel}>Skill category</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setPreferences({ skillCategory: null })}
            style={[styles.chip, !preferences.skillCategory && styles.chipActive]}
          >
            <Text style={[styles.chipText, !preferences.skillCategory && styles.chipTextActive]}>Any</Text>
          </Pressable>
          {SKILL_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => setPreferences({ skillCategory: category })}
              style={[styles.chip, preferences.skillCategory === category && styles.chipActive]}
            >
              <Text style={[styles.chipText, preferences.skillCategory === category && styles.chipTextActive]}>
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Maximum distance</Text>
        <View style={styles.chipRow}>
          {DISTANCES.map((distance) => (
            <Pressable
              key={distance}
              onPress={() => setPreferences({ maxDistance: distance })}
              style={[styles.chip, preferences.maxDistance === distance && styles.chipActive]}
            >
              <Text style={[styles.chipText, preferences.maxDistance === distance && styles.chipTextActive]}>
                {distance} km
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notify me about new matches</Text>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={(value) => setPreferences({ notificationsEnabled: value })}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor={preferences.notificationsEnabled ? COLORS.primary : COLORS.surface}
          />
        </View>

        <Button title="Save Preferences" onPress={handleSave} loading={saving} style={{ marginTop: SPACING.lg }} />
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
