import React from 'react';
import { Text } from 'react-native';

function Icon({ name, testID, size, color, style }) {
  return (
    <Text testID={testID ?? `icon-${name}`} style={style}>
      {String(name)}
    </Text>
  );
}

export const Ionicons = Icon;
export const MaterialIcons = Icon;
export const FontAwesome = Icon;
export const MaterialCommunityIcons = Icon;

export default { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons };