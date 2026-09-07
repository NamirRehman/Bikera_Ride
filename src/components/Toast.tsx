import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../theme/tokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    onDismiss: (id: string) => void;
    style?: any;
}

const getToastConfig = (type: ToastType) => {
    switch (type) {
        case 'success':
            return {
                icon: 'checkmark-circle' as const,
                color: '#22c55e', // green-500
                bg: 'rgba(34, 197, 94, 0.1)',
                border: 'rgba(34, 197, 94, 0.3)',
            };
        case 'error':
            return {
                icon: 'alert-circle' as const,
                color: '#ef4444', // red-500
                bg: 'rgba(239, 68, 68, 0.1)',
                border: 'rgba(239, 68, 68, 0.3)',
            };
        case 'warning':
            return {
                icon: 'warning' as const,
                color: '#eab308', // yellow-500
                bg: 'rgba(234, 179, 8, 0.1)',
                border: 'rgba(234, 179, 8, 0.3)',
            };
        case 'info':
            return {
                icon: 'information-circle' as const,
                color: '#8b5cf6', // brand-purple (using brand color for info)
                bg: 'rgba(139, 92, 246, 0.1)',
                border: 'rgba(139, 92, 246, 0.3)',
            };
    }
};

export const Toast: React.FC<ToastProps> = ({ id, type, title, message, onDismiss, style }) => {
    const config = getToastConfig(type);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(id);
        });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: '#27272a', // Surface 2
                    borderColor: config.border,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
                style,
            ]}
        >
            <View style={styles.contentContainer}>
                <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon} size={24} color={config.color} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {message && <Text style={styles.message}>{message}</Text>}
                </View>

                <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={20} color="#a1a1aa" />
                </TouchableOpacity>
            </View>

            {/* Type indicator bar */}
            <View style={[styles.indicator, { backgroundColor: config.color }]} />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: Dimensions.get('window').width - 32,
        maxWidth: 400,
        alignSelf: 'center',
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        color: '#a1a1aa',
        lineHeight: 20,
    },
    indicator: {
        height: 3,
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
});
