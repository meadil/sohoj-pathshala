import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AlertProvider } from './components/CustomAlert';
import { UserProvider } from './contexts/UserContext';
import RootNavigator from './navigation/RootNavigator';
import { colors } from './theme/theme';

/**
 * App Root.
 * Loads Hind Siliguri fonts, then mounts providers and target-specific RootNavigator.
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    'HindSiliguri-Regular': require('./assets/fonts/HindSiliguri-Regular.ttf'),
    'HindSiliguri-SemiBold': require('./assets/fonts/HindSiliguri-SemiBold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlertProvider>
          <UserProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </UserProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
