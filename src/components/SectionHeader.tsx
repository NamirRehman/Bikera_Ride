import React, { memo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import GradientText from './GradientText';

export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <GradientText style={styles.title}>{title}</GradientText>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 8, paddingTop: 6 },
  title: { color: colors.brandPurple, fontSize: 44, fontWeight: '900', lineHeight: 48, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  subtitle: { color: colors.textSecondary, marginTop: 6, fontSize: 14 },
});

