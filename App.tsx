// STEP 7: Full App (All components integrated)
// IMPORTANT: Polyfills MUST be imported first, before any @dfinity imports
import './src/polyfills';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  try {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  } catch (error: any) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Crash in Full App</Text>
        <Text style={styles.errorDetails}>
          {String(error?.message || error || 'Unknown error')}
        </Text>
        {error?.stack && (
          <Text style={[styles.errorDetails, { fontSize: 12, marginTop: 10 }]}>
            {error.stack.split('\n').slice(0, 10).join('\n')}
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#42C0FB',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
});
