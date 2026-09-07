import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastType } from '../components/Toast';

interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<ToastData, 'id'>) => void;
    hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const insets = useSafeAreaInsets();

    const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { ...toast, id };

        setToasts((prev) => [...prev, newToast]);

        // Auto dismiss after duration (default 5s)
        if (toast.duration !== 0) {
            setTimeout(() => {
                hideToast(id);
            }, toast.duration || 5000);
        }
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}

            {/* Toast Container - absolute position over content */}
            <View style={[styles.container, { top: insets.top + 10 }]}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        id={toast.id}
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        onDismiss={hideToast}
                    />
                ))}
            </View>
        </ToastContext.Provider>
    );
};

// Helper hooks for common toast types
export const useToastHelpers = () => {
    const { showToast } = useToast();

    return {
        success: (title: string, message?: string) => showToast({ type: 'success', title, message }),
        error: (title: string, message?: string) => showToast({ type: 'error', title, message }),
        warning: (title: string, message?: string) => showToast({ type: 'warning', title, message }),
        info: (title: string, message?: string) => showToast({ type: 'info', title, message }),
    };
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9999, // Ensure it sits above everything
        alignItems: 'center',
    },
});
