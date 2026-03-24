import { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	ScrollView,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ArrowRight } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../lib/theme';
import { re } from '../lib/robotevents';
import type { Program, Team } from '../lib/robotevents/robotevents/models';
import { supabase } from '../lib/supabase';
import { useStorage } from '../lib/state/storage';
import { CONSTANTS } from '../lib/const';

WebBrowser.maybeCompleteAuthSession();

export default function OnboardingScreen() {
	const { onboarding, setOnboarding, setTeam, setProgram, setAuth } = useStorage();
	const [programs, setPrograms] = useState<Program[]>([]);
	const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
	const [teamNumber, setTeamNumber] = useState('');
	const [foundTeam, setFoundTeam] = useState<Team | null>(null);
	const [searchingTeam, setSearchingTeam] = useState(false);

	useEffect(() => {
		re.depaginate(
			re.program.programGetPrograms({}, re.custom.maxPages),
			re.models.PaginatedProgramFromJSON
		).then((all) => {
			const filtered = all.filter((p) => CONSTANTS.SUPPORTED_PROGRAMS.includes(p.abbr ?? ''));
			setPrograms(filtered);
			setSelectedProgram(filtered.find((p) => p.abbr === 'V5RC') ?? filtered[0] ?? null);
		});
	}, []);

	useEffect(() => {
		if (!selectedProgram || teamNumber.length < 2) {
			setFoundTeam(null);
			return;
		}
		const timeout = setTimeout(async () => {
			setSearchingTeam(true);
			try {
				const res = await re.depaginate(
				re.team.teamGetTeams({ number: [teamNumber], program: [selectedProgram.id!] }),
				re.models.PaginatedTeamFromJSON
			);
				const match =
					res.find((t) => t.number.toLowerCase() === teamNumber.toLowerCase()) ?? res[0] ?? null;
				setFoundTeam(match);
			} catch {
				setFoundTeam(null);
			} finally {
				setSearchingTeam(false);
			}
		}, 500);
		return () => clearTimeout(timeout);
	}, [teamNumber, selectedProgram]);

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
			if (access_token && refresh_token) {
				const { data: sessionData } = await supabase.auth.setSession({
					access_token,
					refresh_token
				});
				if (sessionData.session) {
					setAuth(sessionData.session);
					setOnboarding('account', true);
				}
			}
		}
	};

	if (!onboarding.intro) {
		return (
			<SafeAreaView style={styles.container}>
				<Text style={styles.heading}>Welcome!</Text>
				<Text style={styles.subtitle}>Your VRC scouting companion</Text>
				<TouchableOpacity style={styles.btn} onPress={() => setOnboarding('intro', true)}>
					<Text style={styles.btnText}>Get Started</Text>
					<ArrowRight size={18} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	if (!onboarding.team) {
		return (
			<SafeAreaView style={styles.container}>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					style={{ width: '100%', alignItems: 'center' }}
				>
					<Text style={styles.heading}>Find your team</Text>

					<Text style={styles.label}>Program</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.programRow}
						contentContainerStyle={{ gap: 8 }}
					>
						{programs.map((p) => (
							<TouchableOpacity
								key={p.id}
								style={[styles.pill, selectedProgram?.id === p.id && styles.pillActive]}
								onPress={() => setSelectedProgram(p)}
							>
								<Text
									style={[styles.pillText, selectedProgram?.id === p.id && styles.pillTextActive]}
								>
									{p.abbr}
								</Text>
							</TouchableOpacity>
						))}
					</ScrollView>

					<TextInput
						style={styles.input}
						placeholder="Team Number (e.g. 3796B)"
						placeholderTextColor={colors.mutedForeground}
						value={teamNumber}
						onChangeText={setTeamNumber}
						autoCapitalize="characters"
					/>

					{searchingTeam && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}

					{foundTeam && (
						<View style={styles.card}>
							<Text style={styles.cardTitle}>{foundTeam.number}</Text>
							<Text style={styles.cardSubtitle}>{foundTeam.teamName}</Text>
							<Text style={styles.cardSubtitle}>{foundTeam.organization}</Text>
						</View>
					)}

					<TouchableOpacity
						style={[styles.btn, !foundTeam && styles.btnDisabled]}
						disabled={!foundTeam}
						onPress={() => {
							if (foundTeam) {
								setTeam(foundTeam.number);
								setProgram(selectedProgram?.id ?? null);
							}
							setOnboarding('team', true);
						}}
					>
						<Text style={styles.btnText}>Next</Text>
						<ArrowRight size={18} color={colors.primaryForeground} style={{ marginLeft: 6 }} />
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.skipBtn}
						onPress={() => {
							setTeam(null);
							setOnboarding('team', true);
						}}
					>
						<Text style={styles.skipText}>Skip this step</Text>
					</TouchableOpacity>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Text style={styles.heading}>Create an account</Text>
			<Text
				style={[styles.subtitle, { textAlign: 'center', marginHorizontal: 32, marginBottom: 16 }]}
			>
				Save scouting information to the cloud and share it with your team
			</Text>

			<TouchableOpacity
				style={[styles.btn, { backgroundColor: '#5d6af2', marginBottom: 12 }]}
				onPress={() => handleOAuth('discord')}
			>
				<Text style={styles.btnText}>Sign Up With Discord</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={[styles.btn, { backgroundColor: '#505b67' }]}
				onPress={() => handleOAuth('github')}
			>
				<Text style={styles.btnText}>Sign Up With GitHub</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.skipBtn}
				onPress={() => {
					setAuth(null);
					setOnboarding('account', true);
				}}
			>
				<Text style={styles.skipText}>Skip this step</Text>
			</TouchableOpacity>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.lg
	},
	heading: {
		fontSize: font['3xl'],
		fontWeight: '700',
		color: colors.foreground,
		marginBottom: 8
	},
	subtitle: {
		fontSize: font.md,
		color: colors.mutedForeground,
		marginBottom: 24
	},
	label: {
		alignSelf: 'flex-start',
		fontSize: font.sm,
		color: colors.mutedForeground,
		marginBottom: 6,
		marginTop: 16
	},
	programRow: {
		flexGrow: 0,
		marginBottom: 8
	},
	pill: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: radius.full,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.card
	},
	pillActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary
	},
	pillText: {
		color: colors.mutedForeground,
		fontSize: font.base
	},
	pillTextActive: {
		color: colors.primaryForeground,
		fontWeight: '600'
	},
	input: {
		width: '100%',
		maxWidth: 320,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm + 2,
		color: colors.foreground,
		fontSize: font.base,
		marginTop: 12
	},
	card: {
		width: '100%',
		maxWidth: 320,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		marginTop: 12
	},
	cardTitle: {
		fontSize: font.lg,
		fontWeight: '700',
		color: colors.foreground
	},
	cardSubtitle: {
		fontSize: font.base,
		color: colors.mutedForeground,
		marginTop: 2
	},
	btn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		maxWidth: 320,
		backgroundColor: colors.primary,
		borderRadius: radius.md,
		paddingVertical: spacing.md,
		marginTop: 16
	},
	btnDisabled: {
		opacity: 0.4
	},
	btnText: {
		color: colors.primaryForeground,
		fontSize: font.base,
		fontWeight: '600'
	},
	skipBtn: {
		marginTop: 12,
		padding: spacing.sm
	},
	skipText: {
		color: colors.mutedForeground,
		fontSize: font.sm,
		textDecorationLine: 'underline'
	}
});
