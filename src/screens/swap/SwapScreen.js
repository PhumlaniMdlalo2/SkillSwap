import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import SwipeCard from '../../components/swap/SwipeCard';
import SwipeActions from '../../components/swap/SwipeActions';
import SwapEmptyState from '../../components/swap/SwapEmptyState';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useSwipeAnimation } from '../../hooks/useSwipeAnimation';
import { useMatchingLogic } from '../../hooks/useMatchingLogic';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { useAuth } from '../../store/useAppHooks';
import { toUserMessage } from '../../utils/errors';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.55;

export default function SwapScreen() {
  const { user } = useAuth();
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeError, setSwipeError] = useState(null);

  const {
    candidates,
    currentIndex,
    preferences,
    setCandidates,
    setCurrentIndex,
    addSwipe,
    addMatch,
  } = useSwapStore();

  const {
    data: loadedCandidates,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['swap-candidates', user?.user_id],
    queryFn: () => swapService.getNextCandidates(10),
    enabled: Boolean(user),
  });

  // The deck is cached in the store for the session, but a refetch always
  // returns the not-yet-swiped candidates, so index 0 is the next card.
  useEffect(() => {
    if (loadedCandidates) {
      setCandidates(loadedCandidates);
      setCurrentIndex(0);
    }
  }, [loadedCandidates, setCandidates, setCurrentIndex]);

  const { filteredCandidates } = useMatchingLogic({ allCandidates: candidates, preferences });

  const currentCandidate =
    filteredCandidates && currentIndex < filteredCandidates.length
      ? filteredCandidates[currentIndex]
      : null;

  const handleSwipe = async (direction) => {
    if (!currentCandidate || isSwiping) return;
    setIsSwiping(true);
    setSwipeError(null);
    try {
      const { matched, matchId } = await swapService.swipe(currentCandidate.id, direction);
      addSwipe({ targetUserId: currentCandidate.id, direction });

      if (matched) {
        addMatch({ userId2: currentCandidate.id, matchedAt: new Date().toISOString() });
        resetAnimation();
        setCurrentIndex(currentIndex + 1);
        router.push({
          pathname: '/swap/results',
          params: { candidateId: currentCandidate.id, matchId: matchId || '' },
        });
        return;
      }

      resetAnimation();
      setCurrentIndex(currentIndex + 1);
    } catch (err) {
      setSwipeError(toUserMessage(err));
    } finally {
      setIsSwiping(false);
    }
  };

  const handleUndo = async () => {
    if (currentIndex === 0 || isSwiping) return;
    setIsSwiping(true);
    setSwipeError(null);
    try {
      await swapService.undoLastSwipe();
      setCurrentIndex(currentIndex - 1);
    } catch (err) {
      setSwipeError(toUserMessage(err));
    } finally {
      setIsSwiping(false);
    }
  };

  const { gesture, translateX, translateY } = useSwipeGesture({
    onSwipeLeft: () => handleSwipe('left'),
    onSwipeRight: () => handleSwipe('right'),
    cardWidth: CARD_WIDTH,
  });

  const { animatedStyle, likeOpacityStyle, nopeOpacityStyle, resetAnimation } = useSwipeAnimation({
    gestureState: { translateX, translateY },
    cardWidth: CARD_WIDTH,
  });

  if (isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner label="Finding people to swap skills with…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!currentCandidate) {
    return (
      <SafeAreaView style={styles.container}>
        <SwapEmptyState onRefresh={refetch} onUndo={handleUndo} canUndo={currentIndex > 0} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Skill Match</Text>
          <Text style={styles.headerSubtitle}>
            {currentIndex + 1} of {filteredCandidates?.length ?? 0}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons
            name="time-outline"
            size={22}
            color={COLORS.textMuted}
            onPress={() => router.push('/swap/history')}
          />
          <Ionicons
            name="options-outline"
            size={22}
            color={COLORS.textMuted}
            onPress={() => router.push('/swap/settings')}
          />
        </View>
      </View>

      <View style={styles.cardContainer}>
        {filteredCandidates && currentIndex + 1 < filteredCandidates.length && (
          <View style={styles.nextCardPreview}>
            <SwipeCard
              candidate={filteredCandidates[currentIndex + 1]}
              cardWidth={CARD_WIDTH - 10}
              cardHeight={CARD_HEIGHT}
              disabled
            />
          </View>
        )}

        <SwipeCard
          candidate={currentCandidate}
          onPress={() => router.push(`/swap/${currentCandidate.id}`)}
          cardWidth={CARD_WIDTH}
          cardHeight={CARD_HEIGHT}
          gesture={gesture}
          animatedStyle={animatedStyle}
          likeOpacityStyle={likeOpacityStyle}
          nopeOpacityStyle={nopeOpacityStyle}
        />
      </View>

      {swipeError ? <Text style={styles.errorText}>{swipeError}</Text> : null}

      <SwipeActions
        onDecline={() => handleSwipe('left')}
        onUndo={handleUndo}
        canUndo={currentIndex > 0}
        onAccept={() => handleSwipe('right')}
        isLoading={isSwiping}
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
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCardPreview: {
    position: 'absolute',
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    textAlign: 'center',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
});
