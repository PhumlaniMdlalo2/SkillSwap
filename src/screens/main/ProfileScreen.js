import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';
import { confirmAction } from '../../utils/alert';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [skillCount, setSkillCount] = useState(0);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getReviewsForUser(user.user_id),
      api.getSkillsByUser(user.user_id),
      api.getLearningInterests(user.user_id),
    ])
      .then(([reviewData, skills, learningInterests]) => {
        setReviews(reviewData);
        setSkillCount(skills.length);
        setInterests(learningInterests);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    confirmAction('Log out', 'Are you sure you want to log out?', {
      confirmText: 'Log out',
      destructive: true,
      onConfirm: logout,
    });
  };

  if (loading) return <LoadingSpinner label="Loading your profile…" />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar uri={user?.avatar} name={user?.name} size={84} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <Stat value={user?.rating ?? '—'} label="Rating" icon="star" />
          <Stat value={reviews.length} label="Reviews" icon="chatbubble-ellipses" />
          <Stat value={skillCount} label="Skills taught" icon="ribbon" />
        </View>

        <View style={styles.interestsSection}>
          <View style={styles.interestsHeader}>
            <Text style={styles.interestsTitle}>Wants to learn</Text>
            <Pressable onPress={() => router.push('/(onboarding)/learn')} hitSlop={8}>
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
            </Pressable>
          </View>
          {interests.length === 0 ? (
            <Text style={styles.interestsEmpty}>
              You haven't picked any learning interests yet.
            </Text>
          ) : (
            <View style={styles.interestsRow}>
              {interests.map((interest) => (
                <Badge key={interest.interest_id ?? interest.category} label={interest.category} tone="success" />
              ))}
            </View>
          )}
        </View>

        <View style={styles.menu}>
          <MenuRow icon="ribbon-outline" label="My Skills" onPress={() => router.push('/skills/my-skills')} />
          <MenuRow icon="mail-outline" label="Requests" onPress={() => router.push('/requests')} />
          <MenuRow icon="wallet-outline" label="Wallet" onPress={() => router.push('/(tabs)/wallet')} />
          <MenuRow icon="star-outline" label="Reviews about me" onPress={() => {}} />
          <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>

        <Button title="Log out" variant="danger" onPress={handleLogout} style={{ marginTop: SPACING.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }) {
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function MenuRow({ icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <Ionicons name={icon} size={20} color={COLORS.text} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
    </Pressable>
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
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  email: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  bio: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  interestsSection: {
    marginBottom: SPACING.lg,
  },
  interestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  interestsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  interestsEmpty: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textFaint,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  menu: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
});
