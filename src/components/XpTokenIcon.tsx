import React, { memo } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const xpToken = require('../../assets/xp-token.png');

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Circular XP token mark (gradient double-diamond). */
export const XpTokenIcon = memo(function XpTokenIcon({ size = 18, style }: Props) {
  return (
    <Image
      source={xpToken}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      resizeMode="cover"
      accessibilityLabel="XP"
    />
  );
});

export default XpTokenIcon;
