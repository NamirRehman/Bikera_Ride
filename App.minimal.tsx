// MINIMAL TEST VERSION - Use this to isolate the crash
// Rename this to App.tsx temporarily to test

import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.container}>
            <Text style={styles.text}>✅ App Loaded Successfully!</Text>
            <Text style={styles.subtext}>
              If you see this, the basic setup works.
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  } catch (error: any) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Crash in App()</Text>
        <Text style={styles.errorDetails}>
          {String(error?.message || error || 'Unknown error')}
        </Text>
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


