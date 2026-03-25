import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { LogOut, User } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useStorage } from '../../lib/state/storage';

export default function AccountScreen() {
	const { auth, setAuth } = useStorage();

	const handleSignOut = () => {
		Alert.alert('Sign out', 'Are you sure you want to sign out?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Sign out',
				style: 'destructive',
				onPress: async () => {
					await supabase.auth.signOut();
					setAuth(null);
					router.replace('/onboarding');
				}
			}
		]);
	};

	const handleOAuth = async (provider: 'discord' | 'github') => {
		const redirectTo = Linking.createURL('auth-callback');
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo, skipBrowserRedirect: true }
		});
		if (error || !data.url) return;
		const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
		if (result.type === 'success') {
			const fragment = result.url.split('#')[1] ?? '';
			const params = new URLSearchParams(fragment);
			const access_token = params.get('access_token');
			const refresh_token = params.get('refresh_token');
			const code =
				params.get('code') ?? new URLSearchParams(result.url.split('?')[1] ?? '').get('code');
			if (access_token && refresh_token) {
				const { data: sessionData } = await supabase.auth.setSession({
					access_token,
					refresh_token
				});
				if (sessionData.session) setAuth(sessionData.session);
			} else if (code) {
				const { data: exchangeData } = await supabase.auth.exchangeCodeForSession(code);
				if (exchangeData.session) setAuth(exchangeData.session);
			}
		}
	};

	if (!auth) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<View style={styles.centered}>
					<Text style={styles.heading}>Not signed in</Text>
					<Text style={styles.subtitle}>Sign in to save scouting data and sync with your team</Text>
					<TouchableOpacity
						style={[styles.btn, { backgroundColor: '#5d6af2', marginBottom: 12 }]}
						onPress={() => handleOAuth('discord')}
					>
						<Svg viewBox="0 0 24 24" width={18} height={18} style={{ marginRight: 8 }}>
							<Path
								fill="#fff"
								d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
							/>
						</Svg>
						<Text style={styles.btnText}>Sign In With Discord</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.btn, { backgroundColor: '#505b67' }]}
						onPress={() => handleOAuth('github')}
					>
						<Svg viewBox="0 0 24 24" width={18} height={18} style={{ marginRight: 8 }}>
							<Path
								fill="#fff"
								d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
							/>
						</Svg>
						<Text style={styles.btnText}>Sign In With GitHub</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}
	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<Text style={styles.heading}>Account</Text>

				<View style={styles.card}>
					<View style={styles.avatar}>
						<User size={28} color={colors.foreground} />
					</View>
					<View style={styles.info}>
						<Text style={styles.name}>
							{auth.user.user_metadata?.full_name ?? auth.user.email ?? 'User'}
						</Text>
						<Text style={styles.email}>{auth.user.email}</Text>
					</View>
				</View>

				<TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
					<LogOut size={18} color={colors.destructive} />
					<Text style={styles.signOutText}>Sign out</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg
	},
	subtitle: {
		fontSize: font.base,
		color: colors.mutedForeground,
		textAlign: 'center',
		marginBottom: 16,
		marginHorizontal: 16
	},
	btn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		maxWidth: 320,
		borderRadius: radius.md,
		paddingVertical: spacing.md
	},
	btnText: {
		color: '#fff',
		fontSize: font.base,
		fontWeight: '600'
	},
	scroll: { flex: 1 },
	content: { padding: spacing.md, paddingBottom: spacing['3xl'] },
	heading: {
		fontSize: font['2xl'],
		fontWeight: '600',
		color: colors.foreground,
		marginBottom: spacing.lg
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: colors.muted,
		alignItems: 'center',
		justifyContent: 'center'
	},
	info: { flex: 1 },
	name: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
	email: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	noAccount: { color: colors.mutedForeground },
	signOutBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: spacing.md,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
	},
	signOutText: { fontSize: font.base, color: colors.destructive }
});
