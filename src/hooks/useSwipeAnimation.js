import { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';

export function useSwipeAnimation({ gestureState, cardWidth }) {
  const { translateX, translateY } = gestureState;

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-cardWidth, 0, cardWidth],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, cardWidth * 0.3], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-cardWidth * 0.3, 0], [1, 0], Extrapolation.CLAMP),
  }));

  function resetAnimation() {
    translateX.value = 0;
    translateY.value = 0;
  }

  return { animatedStyle, likeOpacityStyle, nopeOpacityStyle, resetAnimation };
}
