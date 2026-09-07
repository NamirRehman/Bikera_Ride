import React from 'react';
import { Pressable, Text, View, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { useAuth } from '../contexts/AuthContext';
import { colors, radii, shadows } from '../theme/tokens';

const { width } = Dimensions.get('window');
const H_PAD = 16;
const GAP = 14;
const CARD_WIDTH = (width - H_PAD * 2 - GAP) / 2;

type MenuItem = {
  title: string;
  subtitle?: string;
  icon: string;
  to: string;
  color: string;
};

const SECTIONS: { label: string; items: MenuItem[] }[] = [
  {
    label: 'Progress',
    items: [
      { title: 'Leaderboard', icon: 'trophy', to: 'Leaderboard', color: colors.brandBlue300, subtitle: 'See top riders' },
      { title: 'Wallet', icon: 'wallet', to: 'Wallet', color: colors.brandPurple, subtitle: 'Balances and rewards' },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Profile', icon: 'person-circle', to: 'Profile', color: colors.brandViolet },
      { title: 'Settings', icon: 'settings', to: 'Profile', color: colors.textTertiary },
    ],
  },
];

function MenuCard({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityLabel={item.title}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['rgba(11,15,35,0.98)', 'rgba(13,18,40,0.94)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.cardSubtitle}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function MoreHomeScreen() {
  const navigation = useNavigation<any>();
  const { logout, username, principal } = useAuth();

  return (
    <Screen>
      <SectionHeader title="More" subtitle="Wallet, leaderboard, and profile." />

      <View style={styles.content}>
        {/* Profile summary card */}
        <LinearGradient
          colors={['rgba(66,192,251,0.22)', 'rgba(26,159,224,0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>
                {(username || 'B').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileTextCol}>
              <Text style={styles.profileTitle}>{username || 'Rider'}</Text>
              {principal && (
                <Text style={styles.profileSubtitle}>
                  {principal.slice(0, 5)}…{principal.slice(-4)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Status</Text>
              <Text style={styles.profileStatValue}>Connected</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStat}>
              <Text style={styles.profileStatLabel}>Mode</Text>
              <Text style={styles.profileStatValue}>Mobile app</Text>
            </View>
          </View>
        </LinearGradient>

        {SECTIONS.map((section) => (
          <View key={section.label} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <MenuCard
                  key={item.title}
                  item={item}
                  onPress={() => {
                    navigation.navigate(item.to);
                  }}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.logoutSection}>
          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
            accessibilityLabel="Log out"
            accessibilityRole="button"
          >
            <View style={styles.logoutRow}>
              <View style={styles.logoutIconWrap}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
              </View>
              <Text style={styles.logoutText}>Log out</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.error} />
            </View>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
  },
  section: {
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: radii['3xl'],
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    ...shadows.soft,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileTextCol: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  profileSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textTertiary,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profileStat: {
    flex: 1,
  },
  profileStatLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  profileStatValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border1,
    marginHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 10,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'column',
    gap: GAP,
  },
  card: {
    width: '100%',
    borderRadius: radii['3xl'],
    overflow: 'hidden',
    ...shadows.soft,
    marginBottom: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardGradient: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border1,
    borderRadius: radii['3xl'],
    minHeight: 64,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  logoutSection: {
    marginTop: 8,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border2,
  },
  logoutButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  logoutPressed: {
    opacity: 0.9,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoutIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    marginRight: 10,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
});
