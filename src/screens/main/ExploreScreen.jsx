import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import SkillCard from '../../components/skills/SkillCard';
import BountyCard from '../../components/bounties/BountyCard';
import CreateBountyModal from '../../components/bounties/CreateBountyModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import { useAuth } from '../../store/useAppHooks';
import * as api from '../../services/api';
import { bountyService } from '../../services/bountyService';
import { COLORS, SPACING, FONT_SIZES, RADII, SKILL_CATEGORIES } from '../../utils/constants';
import { notify } from '../../utils/alert';

export default function ExploreScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('skills'); // 'skills' | 'bounties'
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submittingBounty, setSubmittingBounty] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Skills Query
  const {
    data: skills,
    isPending: isSkillsPending,
    error: skillsError,
    isFetching: isSkillsFetching,
    refetch: refetchSkills,
  } = useQuery({
    queryKey: ['skills', category ?? 'all', search ?? ''],
    queryFn: () => api.getSkills({ category, search: search.trim() || undefined }),
    enabled: Boolean(user && mode === 'skills'),
    placeholderData: keepPreviousData,
  });

  // Bounties Query
  const {
    data: bounties = [],
    isPending: isBountiesPending,
    error: bountiesError,
    isFetching: isBountiesFetching,
    refetch: refetchBounties,
  } = useQuery({
    queryKey: ['bounties', category ?? 'all', search ?? ''],
    queryFn: () => bountyService.getBounties({ category, search: search.trim() || undefined }),
    enabled: Boolean(user && mode === 'bounties'),
    placeholderData: keepPreviousData,
  });

  const handleCreateBounty = async (bountyData) => {
    if (!user) return;
    setSubmittingBounty(true);
    try {
      await bountyService.createBounty({
        creatorId: user.user_id,
        ...bountyData,
      });
      await queryClient.invalidateQueries({ queryKey: ['bounties'] });
      setIsCreateModalOpen(false);
      notify('Bounty Posted! 🎯', 'Your learning request is now visible to mentors in the community.');
    } catch (err) {
      notify('Could not post bounty', err.message || 'Please check the details and try again.');
    } finally {
      setSubmittingBounty(false);
    }
  };

  const handleMakeOffer = async (bountyId, message) => {
    if (!user) return;
    await bountyService.makeOffer({
      bountyId,
      helperId: user.user_id,
      message,
    });
    await queryClient.invalidateQueries({ queryKey: ['bounties'] });
  };

  const handleDeleteBounty = async (bountyId) => {
    try {
      await bountyService.deleteBounty(bountyId);
      await queryClient.invalidateQueries({ queryKey: ['bounties'] });
      notify('Bounty Deleted', 'Your request has been removed.');
    } catch (err) {
      notify('Error', err.message || 'Could not delete bounty.');
    }
  };

  const handleCloseBounty = async (bountyId) => {
    try {
      await bountyService.updateBountyStatus(bountyId, 'completed');
      await queryClient.invalidateQueries({ queryKey: ['bounties'] });
      notify('Bounty Completed! 🎉', 'Marked this request as completed.');
    } catch (err) {
      notify('Error', err.message || 'Could not update bounty.');
    }
  };

  const isBountiesMode = mode === 'bounties';
  const currentError = isBountiesMode ? bountiesError : skillsError;
  const currentRefetch = isBountiesMode ? refetchBounties : refetchSkills;
  const isFetching = isBountiesMode ? isBountiesFetching : isSkillsFetching;
  const isPending = isBountiesMode ? isBountiesPending && bounties.length === 0 : isSkillsPending && !skills;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {/* Top Header Row with Mode Selector & Post Button */}
        <View style={styles.topRow}>
          <Text style={styles.title}>
            {isBountiesMode ? 'Bounty Board 🎯' : 'Explore Skills'}
          </Text>

          {isBountiesMode && (
            <Pressable
              style={styles.postBountyBtn}
              onPress={() => setIsCreateModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Post a Bounty"
            >
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.postBountyBtnText}>Post Request</Text>
            </Pressable>
          )}
        </View>

        {/* Mode Switcher Tabs */}
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segment, !isBountiesMode && styles.segmentActive]}
            onPress={() => setMode('skills')}
            accessibilityRole="tab"
            accessibilityState={{ selected: !isBountiesMode }}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={!isBountiesMode ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.segmentText, !isBountiesMode && styles.segmentTextActive]}>
              Skills Offered
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segment, isBountiesMode && styles.segmentActive]}
            onPress={() => setMode('bounties')}
            accessibilityRole="tab"
            accessibilityState={{ selected: isBountiesMode }}
          >
            <Ionicons
              name="help-buoy"
              size={16}
              color={isBountiesMode ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.segmentText, isBountiesMode && styles.segmentTextActive]}>
              Bounty Board 🎯
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textFaint} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isBountiesMode
                ? 'Search requests, e.g. React help, cooking…'
                : 'Search skills, e.g. piano, Spanish…'
            }
            placeholderTextColor={COLORS.textFaint}
            value={searchInput}
            onChangeText={setSearchInput}
          />
        </View>

        {/* Category Filter Chips */}
        <FlatList
          data={SKILL_CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCategory(category === item ? null : item)}
              style={[styles.chip, category === item && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Main Content Area */}
      {currentError ? (
        <ErrorState error={currentError} onRetry={currentRefetch} />
      ) : isPending ? (
        <LoadingSpinner label={isBountiesMode ? 'Loading bounties…' : 'Finding skills…'} />
      ) : isBountiesMode ? (
        <FlatList
          data={bounties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => refetchBounties()}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="trophy-outline" size={32} color={COLORS.token} />
              </View>
              <Text style={styles.emptyTitle}>No open bounties yet</Text>
              <Text style={styles.emptySubtitle}>
                Need help with something? Post a bounty with a token or skill reward!
              </Text>
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => setIsCreateModalOpen(true)}
              >
                <Text style={styles.emptyActionText}>+ Post the First Bounty</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <BountyCard
              bounty={item}
              currentUserId={user?.user_id}
              onMakeOffer={handleMakeOffer}
              onDeleteBounty={handleDeleteBounty}
              onCloseBounty={handleCloseBounty}
            />
          )}
        />
      ) : (
        <FlatList
          data={skills}
          keyExtractor={(item) => item.skill_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => refetchSkills()}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No skills match your search yet. Try another term.</Text>
          }
          renderItem={({ item }) => (
            <SkillCard skill={item} onPress={() => router.push(`/skills/${item.skill_id}`)} />
          )}
        />
      )}

      {/* Modal for posting new bounty */}
      <CreateBountyModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateBounty}
        submitting={submittingBounty}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  postBountyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
  },
  postBountyBtnText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.primaryLight,
  },
  segmentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm + 4,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  chipsRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADII.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: RADII.round,
    backgroundColor: COLORS.tokenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADII.round,
  },
  emptyActionText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
