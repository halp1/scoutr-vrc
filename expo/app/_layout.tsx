import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useStorage } from '../lib/state/storage';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export default function RootLayout() {
  const { _hydrated, auth, onboarding, setAuth, setOnboarding } = useStorage();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuth(session);
        setOnboarding('account', true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
      if (session) setOnboarding('account', true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!_hydrated) return;

    const onboardingComplete = Object.values(onboarding).every(Boolean);
    if (onboardingComplete) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [_hydrated]);

  if (!_hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="events/[id]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
