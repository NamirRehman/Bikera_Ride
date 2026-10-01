import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../theme/tokens';
import { PressableScale } from './motion';

const ITEM_GAP = 12;

export const QuickActions = memo(function QuickActions({
  actions,
}: {
  actions: { label: string; icon: string; onPress: () => void }[];
}) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {actions.map((a) => (
          <PressableScale key={a.label} onPress={a.onPress} scaleTo={0.96} style={styles.itemWrap}>
            <LinearGradient
              colors={[...gradients.gradientBrand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.item}
            >
              <Ionicons name={a.icon as any} size={32} color="#fff" style={{ marginBottom: 8 }} />
              <Text style={styles.label}>{a.label}</Text>
            </LinearGradient>
          </PressableScale>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginVertical: 6, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  itemWrap: { marginBottom: ITEM_GAP, width: '48%' },
  item: {
    height: 110,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});

export default QuickActions;
