import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Button from '../../components/ui/Button';
import { useAuth } from '../../store/useAppHooks';
import { useSwapStore } from '../../store/swapStore';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';

const SCALE = [1, 2, 3, 4, 5];
const FORMAT_OPTIONS = [
  { value: 'hands_on', label: 'Hands-on' },
  { value: 'visual', label: 'Visual' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'reading', label: 'Reading' },
];

export default function OnboardingStyleScreen() {
  const { user } = useAuth();
  const { from } = useLocalSearchParams();
  const isFirstTimeOnboarding = from === 'onboarding';

  const [teachPace, setTeachPace] = useState(3);
  const [teachStructure, setTeachStructure] = useState(3);
  const [teachFormats, setTeachFormats] = useState([]);
  const [learnPace, setLearnPace] = useState(3);
  const [learnStructure, setLearnStructure] = useState(3);
  const [learnFormats, setLearnFormats] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getStylePreferences(user.user_id).then((existing) => {
      if (!existing) return;
      setTeachPace(existing.teach_pace ?? 3);
      setTeachStructure(existing.teach_structure ?? 3);
      setTeachFormats(existing.teach_formats ?? []);
      setLearnPace(existing.learn_pace ?? 3);
      setLearnStructure(existing.learn_structure ?? 3);
      setLearnFormats(existing.learn_formats ?? []);
    });
  }, [user]);

  const toggleFormat = (formats, setFormats, value) => {
    setFormats(formats.includes(value) ? formats.filter((f) => f !== value) : [...formats, value]);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.setStylePreferences(user.user_id, {
        teach_pace: teachPace,
        teach_structure: teachStructure,
        teach_formats: teachFormats,
        learn_pace: learnPace,
        learn_structure: learnStructure,
        learn_formats: learnFormats,
      });
      // Compatibility is scored fresh on every fetch, but the swipe deck
      // is cached in the store for the app session — clear it so the
      // next visit to Skill Match picks up these updated preferences.
      useSwapStore.getState().resetSwipeQueue();
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
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>What's your style?</Text>
        <Text style={styles.subtitle}>
          This helps Skill Match find teachers who actually fit how you like to learn — and learners who fit how you
          like to teach.
        </Text>

        <ScaleRow
          title="Pace, as a teacher"
          lowLabel="Relaxed & patient"
          highLabel="Fast & intense"
          value={teachPace}
          onChange={setTeachPace}
        />
        <ScaleRow
          title="Pace, as a learner"
          lowLabel="Relaxed & patient"
          highLabel="Fast & intense"
          value={learnPace}
          onChange={setLearnPace}
        />

        <ScaleRow
          title="Structure, as a teacher"
          lowLabel="Flexible, go with it"
          highLabel="Step-by-step"
          value={teachStructure}
          onChange={setTeachStructure}
        />
        <ScaleRow
          title="Structure, as a learner"
          lowLabel="Flexible, go with it"
          highLabel="Step-by-step"
          value={learnStructure}
          onChange={setLearnStructure}
        />

        <Text style={styles.sectionLabel}>How you teach (pick any)</Text>
        <View style={styles.grid}>
          {FORMAT_OPTIONS.map((option) => {
            const active = teachFormats.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleFormat(teachFormats, setTeachFormats, option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>How you like to learn (pick any)</Text>
        <View style={styles.grid}>
          {FORMAT_OPTIONS.map((option) => {
            const active = learnFormats.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggleFormat(learnFormats, setLearnFormats, option.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Button title={isFirstTimeOnboarding ? 'Finish' : 'Save'} onPress={finish} loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScaleRow({ title, lowLabel, highLabel, value, onChange }) {
  return (
    <View style={styles.scaleRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.scaleChipRow}>
        {SCALE.map((n) => {
          const active = n === value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.scaleChip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleLabelRow}>
        <Text style={styles.scaleEndLabel}>{lowLabel}</Text>
        <Text style={styles.scaleEndLabel}>{highLabel}</Text>
      </View>
    </View>
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
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  scaleRow: {
    marginBottom: SPACING.lg,
  },
  scaleChipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  scaleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  scaleLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleEndLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  footer: {
    marginTop: SPACING.md,
  },
});
