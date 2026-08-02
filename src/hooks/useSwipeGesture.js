import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';

export function useSwipeGesture({ onSwipeLeft, onSwipeRight, onSwipeMaybe, cardWidth }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const threshold = cardWidth * 0.35;

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        translateX.value = withTiming(cardWidth * 1.5, { duration: 220 }, (finished) => {
          if (finished && onSwipeRight) runOnJS(onSwipeRight)();
        });
      } else if (event.translationX < -threshold) {
        translateX.value = withTiming(-cardWidth * 1.5, { duration: 220 }, (finished) => {
          if (finished && onSwipeLeft) runOnJS(onSwipeLeft)();
        });
      } else if (event.translationY < -threshold) {
        translateY.value = withTiming(-cardWidth * 1.5, { duration: 220 }, (finished) => {
          if (finished && onSwipeMaybe) runOnJS(onSwipeMaybe)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  return { gesture, translateX, translateY };
}
