import React from 'react';
import { Text, View, Image, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';
import { Feather } from '@expo/vector-icons';

export function ComingSoonScreen() {
  return (
    <Screen showHeader={false} contentClassName="p-4">
      <SectionHeader title="Coming Soon" subtitle="Exciting features are on the way!" />
      <LinearGradient
        colors={[colors.brandPurple, colors.brandBlue100]}
        style={{ borderRadius: 20, padding: 20, marginTop: 20 }}
      >
        <View style={{ alignItems: 'center' }}>
          <Feather name="clock" size={48} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 18, marginTop: 12, textAlign: 'center' }}>
            We're working hard to bring new experiences.
          </Text>
          <TouchableOpacity style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Notify Me</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Screen>
  );
}
