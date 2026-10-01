import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/tokens';
import { XpTokenIcon } from './XpTokenIcon';

const imeraLogo = require('../../assets/imera-token.png');

export const StatsHero = memo(function StatsHero({
  distance = '0.0',
  xp = '0',
  imera = '0.00',
}: {
  distance?: string;
  xp?: string;
  imera?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your stats</Text>
      <View style={styles.row}>
        <View style={styles.cell}>
          <View style={styles.iconWrap}>
            <Ionicons name="bicycle" size={16} color={colors.brandPurple} />
          </View>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {distance}
          </Text>
          <Text style={styles.label}>km today</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cell}>
          <XpTokenIcon size={36} style={styles.xpIcon} />
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {xp}
          </Text>
          <Text style={styles.label}>XP</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cell}>
          <Image source={imeraLogo} style={styles.imeraIcon} resizeMode="contain" accessibilityLabel="iMERA token" />
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {imera}
          </Text>
          <Text style={styles.label}>iMERA</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radii['3xl'],
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surfaceCard,
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  heading: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border1,
    marginVertical: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(66,192,251,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  xpIcon: {
    marginBottom: 8,
  },
  imeraIcon: {
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatsHero;
