import 'react-native-url-polyfill/auto';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useStorage } from '../lib/state/storage';
import { supabase } from '../lib/supabase';
import { fetchAllNotes } from '../lib/supabase/notes';
import { fetchMyScoutingTeam } from '../lib/supabase/teams';
import { colors } from '../lib/theme';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
	const { _hydrated, auth, onboarding, setAuth, setOnboarding, setAllNotes, setScoutingTeam } =
		useStorage();

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				setAuth(session);
				setOnboarding('account', true);
				fetchAllNotes().then(setAllNotes);
				fetchMyScoutingTeam().then(setScoutingTeam);
			}
		});

		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			setAuth(session);
			if (session) {
				setOnboarding('account', true);
				fetchAllNotes().then(setAllNotes);
				fetchMyScoutingTeam().then(setScoutingTeam);
			}
		});

		return () => listener.subscription.unsubscribe();
	}, []);

	useEffect(() => {
		const handleUrl = ({ url }: { url: string }) => {
			if (!url.includes('auth-callback')) return;
			const fragment = url.split('#')[1] ?? '';
			const queryStr = url.split('?')[1]?.split('#')[0] ?? '';
			const params = new URLSearchParams(fragment || queryStr);
			const access_token = params.get('access_token');
			const refresh_token = params.get('refresh_token');
			const code = params.get('code');
			if (access_token && refresh_token) {
				supabase.auth.setSession({ access_token, refresh_token });
			} else if (code) {
				supabase.auth.exchangeCodeForSession(code);
			}
		};
		Linking.getInitialURL().then((url) => {
			if (url) handleUrl({ url });
		});
		const sub = Linking.addEventListener('url', handleUrl);
		return () => sub.remove();
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
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SafeAreaProvider>
					<StatusBar style="light" />
					<Stack
						screenOptions={{
							headerShown: false,
							contentStyle: { backgroundColor: colors.background }
						}}
					>
						<Stack.Screen name="(tabs)" />
						<Stack.Screen name="onboarding" />
						<Stack.Screen name="auth-callback" />
					</Stack>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<StatusBar style="light" />
				<Stack
					screenOptions={{
						headerShown: false,
						contentStyle: { backgroundColor: colors.background }
					}}
				>
					<Stack.Screen name="(tabs)" />
					<Stack.Screen name="onboarding" />
					<Stack.Screen name="auth-callback" />
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
		justifyContent: 'center'
	}
});
