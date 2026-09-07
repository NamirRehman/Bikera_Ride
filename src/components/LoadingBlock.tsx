import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThreeDotLoader } from './ThreeDotLoader';
import { colors } from '../theme/tokens';

interface LoadingBlockProps {
  message?: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Shared loading block: ThreeDotLoader + optional message.
 * Use for consistent loading UX across Dashboard, Groups, History, etc.
 */
export function LoadingBlock({
  message = 'Loading…',
  color = colors.brandPurple,
  size = 'large',
}: LoadingBlockProps) {
  return (
    <View style={styles.container}>
      <ThreeDotLoader color={color} size={size} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  message: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 15,
  },
});
