import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
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

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastData, 'id'>) => {
      const id = Math.random().toString(36).substring(7);
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      if (toast.duration !== 0) {
        setTimeout(() => {
          hideToast(id);
        }, toast.duration || 5000);
      }
    },
    [hideToast]
  );

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [showToast, hideToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
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

export const useToastHelpers = () => {
  const { showToast } = useToast();

  return useMemo(
    () => ({
      success: (title: string, message?: string) =>
        showToast({ type: 'success', title, message }),
      error: (title: string, message?: string) =>
        showToast({ type: 'error', title, message }),
      warning: (title: string, message?: string) =>
        showToast({ type: 'warning', title, message }),
      info: (title: string, message?: string) =>
        showToast({ type: 'info', title, message }),
    }),
    [showToast]
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
});
