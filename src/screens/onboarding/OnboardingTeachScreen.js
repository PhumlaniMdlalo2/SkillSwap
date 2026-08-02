import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';

export default function OnboardingTeachScreen() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(SKILL_CATEGORIES[0]);
  const [addedSkills, setAddedSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canAdd = title.trim().length > 0 && description.trim().length > 0;

  const handleAddSkill = async () => {
    if (!canAdd) return;
    setSaving(true);
    setError(null);
    try {
      const skill = await api.addSkill({
        userId: user.user_id,
        title: title.trim(),
        description: description.trim(),
        category,
      });
      setAddedSkills((prev) => [skill, ...prev]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.message ?? 'Could not add this skill. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (skillId) => {
    setAddedSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
    try {
      await api.deleteSkill(skillId);
    } catch {
      // Non-critical during onboarding — the list already reflects the user's intent.
    }
  };

  const goNext = () => router.push({ pathname: '/(onboarding)/learn', params: { from: 'onboarding' } });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>Step 1 of 2</Text>
        <Text style={styles.title}>What can you teach?</Text>
        <Text style={styles.subtitle}>
          Add at least one skill to start earning tokens. You can always add more later.
        </Text>

        {addedSkills.length > 0 && (
          <View style={styles.addedList}>
            {addedSkills.map((skill) => (
              <Card key={skill.skill_id} style={styles.addedCard}>
                <View style={{ flex: 1 }}>
                  <Badge label={skill.category} />
                  <Text style={styles.addedTitle}>{skill.title}</Text>
                </View>
                <Pressable onPress={() => handleRemove(skill.skill_id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={COLORS.textFaint} />
                </Pressable>
              </Card>
            ))}
          </View>
        )}

        <Input label="Skill title" placeholder="e.g. Jazz Piano Fundamentals" value={title} onChangeText={setTitle} />
        <Input
          label="Description"
          placeholder="What will learners get out of a session with you?"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {SKILL_CATEGORIES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[styles.categoryChip, category === item && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, category === item && styles.categoryChipTextActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Add Skill"
          variant="secondary"
          onPress={handleAddSkill}
          disabled={!canAdd}
          loading={saving}
          icon={<Ionicons name="add" size={16} color={COLORS.primary} />}
        />

        <View style={styles.footer}>
          <Button title={addedSkills.length > 0 ? 'Continue' : 'Skip for now'} onPress={goNext} />
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
  addedList: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  addedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addedTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  footer: {
    marginTop: SPACING.xl,
  },
});
