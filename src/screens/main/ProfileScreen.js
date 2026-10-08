import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import XPProgressBar from '../../components/gamification/XPProgressBar';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { gamificationService } from '../../services/gamificationService';
import { COLORS, SPACING, FONT_SIZES, RADII } from '../../utils/constants';
import { confirmAction, notify } from '../../utils/alert';
import { toUserMessage } from '../../utils/errors';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: userStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['user-stats', user?.user_id],
    queryFn: () => gamificationService.getUserStats(user.user_id),
    enabled: Boolean(user),
  });

  const {
    data: reviews = [],
    isPending: reviewsPending,
    error: reviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['reviews', user?.user_id],
    queryFn: () => api.getReviewsForUser(user.user_id),
    enabled: Boolean(user),
  });

  const {
    data: skillCount = 0,
    isPending: skillsPending,
    error: skillsError,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: ['skills', user?.user_id],
    queryFn: () => api.getSkillsByUser(user.user_id),
    enabled: Boolean(user),
    select: (all) => all.length,
  });

  const {
    data: interests = [],
    isPending: interestsPending,
    error: interestsError,
    refetch: refetchInterests,
  } = useQuery({
    queryKey: ['interests', user?.user_id],
    queryFn: () => api.getLearningInterests(user.user_id),
    enabled: Boolean(user),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchReviews(), refetchSkills(), refetchInterests(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  const retryAll = () => {
    refetchReviews();
    refetchSkills();
    refetchInterests();
  };

  if (reviewsPending || skillsPending || interestsPending)
    return <LoadingSpinner label="Loading your profile…" />;
  if (reviewsError || skillsError || interestsError) {
    return <ErrorState error={reviewsError ?? skillsError ?? interestsError} onRetry={retryAll} />;
  }

  const handleLogout = () => {
    confirmAction('Log out', 'Are you sure you want to log out?', {
      confirmText: 'Log out',
      destructive: true,
      onConfirm: logout,
    });
  };

  const handleChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify(
        'Photo access needed',
        'Allow photo library access in Settings to set a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const updated = await api.uploadAvatar({
        userId: user.user_id,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      updateUser(updated);
      await queryClient.invalidateQueries({ queryKey: ['reviews'] });
      await queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (err) {
      notify('Could not update your photo', toUserMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

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
        <View style={styles.header}>
          <Pressable
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={styles.avatarWrap}
          >
            <Avatar uri={user?.avatar} name={user?.name} size={84} />
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="camera" size={14} color={COLORS.white} />
              )}
            </View>
          </Pressable>
          <Text style={styles.name} accessibilityRole="header">
            {user?.name}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <Stat value={user?.rating ?? '—'} label="Rating" icon="star" />
          <Stat value={reviews.length} label="Reviews" icon="chatbubble-ellipses" />
          <Stat value={skillCount} label="Skills taught" icon="ribbon" />
        </View>

        {/* XP / Level Progress */}
        {userStats && (
          <Card style={styles.xpCard} onPress={() => router.push('/passport')}>
            <View style={styles.xpCardHeader}>
              <View style={styles.xpCardLeft}>
                <Text style={styles.xpCardIcon}>⚡</Text>
                <Text style={styles.xpCardTitle}>{userStats.levelInfo?.title ?? 'Novice'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
            </View>
            <XPProgressBar xp={userStats.xp} levelInfo={userStats.levelInfo} compact />
          </Card>
        )}

        <View style={styles.interestsSection}>
          <View style={styles.interestsHeader}>
            <Text style={styles.interestsTitle}>Wants to learn</Text>
            <Pressable
              onPress={() => router.push('/(onboarding)/learn')}
              accessibilityRole="button"
              accessibilityLabel="Edit learning interests"
              hitSlop={12}
            >
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
            </Pressable>
          </View>
          {interests.length === 0 ? (
            <Text style={styles.interestsEmpty} accessible>
              You haven't picked any learning interests yet.
            </Text>
          ) : (
            <View style={styles.interestsRow}>
              {interests.map((interest) => (
                <Badge
                  key={interest.interest_id ?? interest.category}
                  label={interest.category}
                  tone="success"
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.menu}>
          <MenuRow
            icon="trophy-outline"
            label="Skill Passport"
            onPress={() => router.push('/passport')}
          />
          <MenuRow
            icon="ribbon-outline"
            label="My Skills"
            onPress={() => router.push('/skills/my-skills')}
          />
          <MenuRow
            icon="calendar-outline"
            label="My Sessions"
            onPress={() => router.push('/sessions')}
          />
          <MenuRow icon="mail-outline" label="Requests" onPress={() => router.push('/requests')} />
          <MenuRow
            icon="options-outline"
            label="Skill Match Style"
            onPress={() => router.push('/(onboarding)/style')}
          />
          <MenuRow
            icon="wallet-outline"
            label="Wallet"
            onPress={() => router.push('/(tabs)/wallet')}
          />
          <MenuRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        <Button
          title="Log out"
          variant="danger"
          onPress={handleLogout}
          style={{ marginTop: SPACING.lg }}
        />
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
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.menuRow}>
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
  avatarWrap: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: RADII.round,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  xpCard: {
    marginBottom: SPACING.lg,
  },
  xpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  xpCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  xpCardIcon: {
    fontSize: 16,
  },
  xpCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
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
