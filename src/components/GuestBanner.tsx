import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/tokens';

export function GuestBanner({ message, compact }: { message: string; compact?: boolean }) {
  const { isGuest } = useAuth();
  if (!isGuest) return null;

  return (
    <View style={[styles.banner, compact && styles.compact]} accessibilityRole="text">
      <Text style={styles.title}>Browsing as guest</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 192, 251, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(66, 192, 251, 0.28)',
  },
  compact: {
    marginHorizontal: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
