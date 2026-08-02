import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SwipeCard from '../../components/swap/SwipeCard';
import SwipeActions from '../../components/swap/SwipeActions';
import SwapEmptyState from '../../components/swap/SwapEmptyState';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useSwipeAnimation } from '../../hooks/useSwipeAnimation';
import { useMatchingLogic } from '../../hooks/useMatchingLogic';
import { useSwapStore } from '../../store/swapStore';
import { swapService } from '../../services/swapService';
import { COLORS, SPACING, FONT_SIZES } from '../../utils/constants';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = height * 0.55;

export default function SwapScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const {
    candidates,
    currentIndex,
    preferences,
    setCandidates,
    setCurrentIndex,
    addSwipe,
    addMatch,
  } = useSwapStore();

  const { filteredCandidates } = useMatchingLogic({ allCandidates: candidates, preferences });

  const currentCandidate =
    filteredCandidates && currentIndex < filteredCandidates.length
      ? filteredCandidates[currentIndex]
      : null;

  const handleSwipe = async (direction) => {
    if (!currentCandidate || isSwiping) return;
    setIsSwiping(true);
    try {
      await swapService.handleSwipe(currentCandidate.id, direction);
      addSwipe({ targetUserId: currentCandidate.id, direction });

      if (direction === 'right') {
        const isMatch = await swapService.checkMutualMatch(currentCandidate.id);
        if (isMatch) {
          addMatch({ userId2: currentCandidate.id, matchedAt: new Date().toISOString() });
          resetAnimation();
          setCurrentIndex(currentIndex + 1);
          router.push({ pathname: '/swap/results', params: { candidateId: currentCandidate.id } });
          return;
        }
      }

      resetAnimation();
      setCurrentIndex(currentIndex + 1);
    } catch (err) {
      setError(err.message ?? 'Swipe failed');
    } finally {
      setIsSwiping(false);
    }
  };

  const { gesture, translateX, translateY } = useSwipeGesture({
    onSwipeLeft: () => handleSwipe('left'),
    onSwipeRight: () => handleSwipe('right'),
    onSwipeMaybe: () => handleSwipe('maybe'),
    cardWidth: CARD_WIDTH,
  });

  const { animatedStyle, likeOpacityStyle, nopeOpacityStyle, resetAnimation } = useSwipeAnimation({
    gestureState: { translateX, translateY },
    cardWidth: CARD_WIDTH,
  });

  const loadCandidates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await swapService.getNextCandidates(10);
      setCandidates(data);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message ?? 'Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (candidates.length === 0) loadCandidates();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !candidates.length) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner label="Finding people to swap skills with…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentCandidate) {
    return (
      <SafeAreaView style={styles.container}>
        <SwapEmptyState onRefresh={loadCandidates} />
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
        <Ionicons
          name="options-outline"
          size={22}
          color={COLORS.textMuted}
          onPress={() => router.push('/swap/settings')}
        />
      </View>

      <View style={styles.cardContainer}>
        {filteredCandidates &&
          currentIndex + 1 < filteredCandidates.length && (
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

      <SwipeActions
        onDecline={() => handleSwipe('left')}
        onMaybe={() => handleSwipe('maybe')}
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
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    textAlign: 'center',
  },
});
