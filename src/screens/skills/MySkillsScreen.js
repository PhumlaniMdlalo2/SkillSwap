import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

export default function MySkillsScreen() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await api.getSkillsByUser(user.user_id);
    setSkills(data);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingSpinner label="Loading your skills…" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Skills</Text>
        <Button
          title="Add"
          variant="secondary"
          fullWidth={false}
          icon={<Ionicons name="add" size={16} color={COLORS.primary} />}
          onPress={() => router.push('/skills/add')}
        />
      </View>

      <FlatList
        data={skills}
        keyExtractor={(item) => item.skill_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't listed any skills yet.</Text>
            <Button title="List your first skill" fullWidth={false} onPress={() => router.push('/skills/add')} />
          </View>
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/skills/${item.skill_id}`)} style={styles.card}>
            <Badge label={item.category} />
            <Text style={styles.skillTitle}>{item.title}</Text>
            <Text style={styles.skillDescription} numberOfLines={2}>{item.description}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  card: {
    marginBottom: SPACING.md,
    gap: 6,
  },
  skillTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  skillDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  empty: {
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
