import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, gradients, radii } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

export const StatsHero = memo(function StatsHero({
  distance = '0.0 km',
  xp = '0',
}: { distance?: string; xp?: string }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surface3, colors.surface1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      />

      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.label}>Today</Text>
          <Text style={styles.smallLabel}>Distance</Text>
          <Text style={styles.value}>{distance}</Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.smallLabel}>XP</Text>
          <Text style={styles.value}>{xp}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: radii['3xl'],
    overflow: 'hidden',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border2,
    padding: 0,
    backgroundColor: colors.surfaceCard,
  },
  bg: { ...StyleSheet.absoluteFillObject },
  inner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, justifyContent: 'space-between' },
  left: { flex: 1 },
  right: { width: 110, alignItems: 'flex-end' },
  label: { color: colors.textTertiary, fontSize: 13, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  smallLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  value: { color: colors.textPrimary, fontSize: 36, fontWeight: '900', marginTop: 8, letterSpacing: -1 },
});

export default StatsHero;
