import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';

export default function Avatar({ uri, name, size = 48 }) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimensionStyle]} />;
  }

  return (
    <View style={[styles.fallback, dimensionStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.border,
  },
  fallback: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
