import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { useNavigation } from '@react-navigation/native';
import { PressableScale } from './motion';

export const AppHeader = memo(function AppHeader() {
    const navigation = useNavigation<any>();

    return (
        <View style={styles.container}>
            {/* Left: Brand / Logo */}
            <View style={styles.left}>
                <View style={styles.logoBadge}>
                    <Image source={require('../../assets/icon.png')} style={styles.logoImage} />
                </View>
                <Text style={styles.brandText}>BIKERA RIDE</Text>
            </View>

            {/* Right: Actions */}
            <View style={styles.right}>
                <PressableScale
                    onPress={() => navigation.navigate('More', { screen: 'Profile' })}
                    style={styles.avatarButton}
                    scaleTo={0.92}
                    accessibilityLabel="Profile"
                    accessibilityRole="button"
                >
                    <View style={styles.avatarFallback}>
                        <Ionicons name="person" size={16} color="#fff" />
                    </View>
                </PressableScale>
            </View>
        </View>
    );
});
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginTop: 4,
        marginBottom: 8,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderAccent,
    },
    logoImage: {
        width: 32,
        height: 32,
    },
    brandText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.brandBlue100,
        borderWidth: 1,
        borderColor: colors.surface1,
    },
    avatarButton: {
        minWidth: 44,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.brandPurple,
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatarFallback: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceCard,
        borderWidth: 1,
        borderColor: colors.borderAccent,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
