import { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
	TextInput,
	ActivityIndicator,
	Share,
	RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import {
	LogOut,
	User,
	Users,
	UserPlus,
	Share2,
	DoorOpen,
	Copy,
	Check,
	Pencil,
	X,
	Shield
} from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { re } from '../../lib/robotevents';
import { useStorage } from '../../lib/state/storage';
import {
	createScoutingTeam,
	joinScoutingTeam,
	fetchMyInviteCode,
	fetchTeamMembers,
	leaveScoutingTeam,
	updateDisplayName
} from '../../lib/supabase/teams';

type Member = { userId: string; displayName: string };

export default function AccountScreen() {
	const {
		auth,
		setAuth,
		team,
		setTeam,
		program,
		scoutingTeams,
		addScoutingTeam,
		removeScoutingTeam
	} = useStorage();

	// ── VRC team config ─────────────────────────────────────────────────
	const [teamInput, setTeamInput] = useState(team ?? '');
	const [foundTeam, setFoundTeam] = useState<{ number: string; teamName: string } | null>(null);
	const [searchingTeam, setSearchingTeam] = useState(false);

	useEffect(() => {
		if (teamInput.length < 2) {
			setFoundTeam(null);
			return;
		}
		const t = setTimeout(async () => {
			setSearchingTeam(true);
			try {
				const programId = program ?? undefined;
				const res = await re.depaginate(
					re.team.teamGetTeams({
						number: [teamInput],
						...(programId ? { program: [programId] } : {})
					}),
					re.models.PaginatedTeamFromJSON
				);
				const match =
					res.find((r) => r.number.toLowerCase() === teamInput.toLowerCase()) ?? res[0] ?? null;
				setFoundTeam(
					match ? { number: match.number, teamName: (match.teamName ?? '').trim() } : null
				);
			} catch {
				setFoundTeam(null);
			} finally {
				setSearchingTeam(false);
			}
		}, 500);
		return () => clearTimeout(t);
	}, [teamInput]);

	// ── Create form ──────────────────────────────────────────────────────────
	const [createName, setCreateName] = useState('');
	const [creating, setCreating] = useState(false);
	const [createError, setCreateError] = useState('');

	// ── Join form ────────────────────────────────────────────────────────────
	const [joinCode, setJoinCode] = useState('');
	const [joining, setJoining] = useState(false);
	const [joinError, setJoinError] = useState('');

	// ── Per-team state ───────────────────────────────────────────────────────
	const [inviteCodes, setInviteCodes] = useState<Record<string, string | null>>({});
	const [membersMap, setMembersMap] = useState<Record<string, Member[]>>({});
	const [timeRemaining, setTimeRemaining] = useState('');
	const [leavingId, setLeavingId] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// ── Pull to refresh ───────────────────────────────────────────────────
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = async () => {
		setRefreshing(true);
		await Promise.all(
			scoutingTeams.map((t) =>
				Promise.all([
					fetchMyInviteCode(t.id).then((code) =>
						setInviteCodes((prev) => ({ ...prev, [t.id]: code }))
					),
					fetchTeamMembers(t.id).then((members) =>
						setMembersMap((prev) => ({ ...prev, [t.id]: members }))
					)
				])
			)
		);
		setRefreshing(false);
	};

	// ── Display name edit ───────────────────────────────────────────────────
	const [editingName, setEditingName] = useState(false);
	const [nameInput, setNameInput] = useState('');
	const [nameLoading, setNameLoading] = useState(false);
	const [nameError, setNameError] = useState('');

	const handleSaveName = async () => {
		const trimmed = nameInput.trim();
		if (!trimmed) return;
		setNameLoading(true);
		const err = await updateDisplayName(trimmed);
		setNameLoading(false);
		if (err) {
			setNameError(err);
			return;
		}
		setAuth({
			...auth!,
			user: { ...auth!.user, user_metadata: { ...auth!.user.user_metadata, full_name: trimmed } }
		});
		setEditingName(false);
		setNameError('');
	};
	const rotateTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

	const refreshTeam = (teamId: string) => {
		fetchMyInviteCode(teamId).then((code) =>
			setInviteCodes((prev) => ({ ...prev, [teamId]: code }))
		);
		fetchTeamMembers(teamId).then((members) =>
			setMembersMap((prev) => ({ ...prev, [teamId]: members }))
		);
	};

	useEffect(() => {
		if (!auth) return;
		const prevTimers = rotateTimersRef.current;
		Object.values(prevTimers).forEach(clearTimeout);
		rotateTimersRef.current = {};

		const secondsUntilRotation = 3600 - (Math.floor(Date.now() / 1000) % 3600);

		for (const t of scoutingTeams) {
			refreshTeam(t.id);
			rotateTimersRef.current[t.id] = setTimeout(
				() => refreshTeam(t.id),
				secondsUntilRotation * 1000
			);
		}

		return () => {
			Object.values(rotateTimersRef.current).forEach(clearTimeout);
		};
	}, [scoutingTeams, auth]);

	// Countdown timer (shared — all codes rotate at the same time)
	useEffect(() => {
		if (scoutingTeams.length === 0) return;
		const update = () => {
			const secsRemaining = 3600 - (Math.floor(Date.now() / 1000) % 3600);
			const m = Math.floor(secsRemaining / 60);
			const s = secsRemaining % 60;
			setTimeRemaining(`${m}m ${s.toString().padStart(2, '0')}s`);
		};
		update();
		const ticker = setInterval(update, 1000);
		return () => clearInterval(ticker);
	}, [scoutingTeams.length]);

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
		Alert.alert('Debug: redirectTo', redirectTo);
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

	const handleCreate = async () => {
		setCreateError('');
		if (!createName.trim()) {
			setCreateError('Enter a team name.');
			return;
		}
		setCreating(true);
		const { team, error } = await createScoutingTeam(createName.trim());
		setCreating(false);
		if (error) {
			setCreateError(error);
			return;
		}
		if (team) {
			addScoutingTeam(team);
			setCreateName('');
			refreshTeam(team.id);
		}
	};

	const handleJoin = async () => {
		setJoinError('');
		const code = joinCode.trim().toUpperCase().replace(/\s/g, '');
		if (code.length !== 8) {
			setJoinError('Enter the full 8-character code.');
			return;
		}
		setJoining(true);
		const { team, error } = await joinScoutingTeam(code);
		setJoining(false);
		if (error) {
			setJoinError(error);
			return;
		}
		if (team) {
			addScoutingTeam(team);
			setJoinCode('');
			refreshTeam(team.id);
		}
	};

	const handleLeave = (teamId: string, teamName: string) => {
		Alert.alert('Leave team', `Leave "${teamName}"? You can rejoin with the invite code.`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Leave',
				style: 'destructive',
				onPress: async () => {
					setLeavingId(teamId);
					await leaveScoutingTeam(teamId);
					setLeavingId(null);
					removeScoutingTeam(teamId);
					setInviteCodes((prev) => {
						const next = { ...prev };
						delete next[teamId];
						return next;
					});
					setMembersMap((prev) => {
						const next = { ...prev };
						delete next[teamId];
						return next;
					});
				}
			}
		]);
	};

	const handleShareCode = async (teamId: string, teamName: string) => {
		const code = inviteCodes[teamId];
		if (!code) return;
		const formatted = code.slice(0, 4) + ' ' + code.slice(4);
		await Share.share({
			message: `Join my Scoutr scouting team "${teamName}" with invite code: ${formatted}`
		});
	};

	const fmtCode = (code: string) => code.slice(0, 4) + ' ' + code.slice(4);

	const handleCopyCode = async (teamId: string, code: string) => {
		await Clipboard.setStringAsync(code);
		setCopiedId(teamId);
		setTimeout(() => setCopiedId(null), 2000);
	};

	if (!auth) {
		return (
			<SafeAreaView style={styles.safe} edges={['top']}>
				<ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { flexGrow: 1 }]}>
					<Text style={styles.heading}>Account</Text>

					<Text style={styles.sectionLabel}>Sign In</Text>
					<View style={styles.card}>
						<Text style={[styles.email, { marginBottom: spacing.md }]}>
							Sign in to save scouting data to the cloud and sync with your team
						</Text>
						<TouchableOpacity
							style={[
								styles.btn,
								{ backgroundColor: '#5d6af2', marginBottom: 12, maxWidth: undefined, width: '100%' }
							]}
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
							style={[
								styles.btn,
								{ backgroundColor: '#505b67', maxWidth: undefined, width: '100%' }
							]}
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

					<Text style={styles.sectionLabel}>VRC Team</Text>
					<View style={styles.card}>
						<View style={styles.cardTitleRow}>
							<Shield size={16} color={colors.mutedForeground} />
							<Text style={styles.cardTitle}>My Team</Text>
						</View>
						<TextInput
							style={styles.input}
							placeholder="Team number (e.g. 229V)"
							placeholderTextColor={colors.mutedForeground}
							value={teamInput}
							onChangeText={(v) => setTeamInput(v.toUpperCase())}
							autoCapitalize="characters"
							autoCorrect={false}
						/>
						{searchingTeam && (
							<ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
						)}
						{!searchingTeam && foundTeam && (
							<View style={styles.foundTeamRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.foundTeamNumber}>{foundTeam.number}</Text>
									{foundTeam.teamName ? (
										<Text style={styles.foundTeamName}>{foundTeam.teamName}</Text>
									) : null}
								</View>
								<TouchableOpacity
									style={[styles.actionBtn, { marginTop: 0, paddingHorizontal: spacing.md }]}
									onPress={() => setTeam(foundTeam.number)}
								>
									<Text style={styles.actionBtnText}>
										{team === foundTeam.number ? '✓ Saved' : 'Set'}
									</Text>
								</TouchableOpacity>
							</View>
						)}
						{!searchingTeam && teamInput.length >= 2 && !foundTeam && (
							<Text style={styles.errorText}>No team found</Text>
						)}
						{team && <Text style={styles.codeHint}>Current: {team}</Text>}
					</View>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={colors.primary}
					/>
				}
			>
				<Text style={styles.heading}>Account</Text>

				<View style={styles.card}>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<View style={styles.avatar}>
							<User size={28} color={colors.foreground} />
						</View>
						<View style={styles.info}>
							{editingName ? (
								<TextInput
									style={[styles.input, { marginBottom: 0 }]}
									value={nameInput}
									onChangeText={setNameInput}
									placeholder="Display name"
									placeholderTextColor={colors.mutedForeground}
									autoFocus
									autoCorrect={false}
									onSubmitEditing={handleSaveName}
									returnKeyType="done"
								/>
							) : (
								<Text style={styles.name}>
									{auth.user.user_metadata?.full_name ?? auth.user.email ?? 'User'}
								</Text>
							)}
							<Text style={styles.email}>{auth.user.email}</Text>
						</View>
						{editingName ? (
							<View style={{ flexDirection: 'row', gap: 6 }}>
								<TouchableOpacity
									style={styles.shareBtn}
									onPress={handleSaveName}
									disabled={nameLoading}
								>
									{nameLoading ? (
										<ActivityIndicator size="small" color={colors.primary} />
									) : (
										<Check size={16} color={colors.primary} />
									)}
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.shareBtn}
									onPress={() => {
										setEditingName(false);
										setNameError('');
									}}
								>
									<X size={16} color={colors.mutedForeground} />
								</TouchableOpacity>
							</View>
						) : (
							<View style={{ flexDirection: 'row', gap: 6 }}>
								<TouchableOpacity
									style={styles.shareBtn}
									onPress={() => {
										setNameInput(auth.user.user_metadata?.full_name ?? '');
										setEditingName(true);
									}}
								>
									<Pencil size={16} color={colors.mutedForeground} />
								</TouchableOpacity>
								<TouchableOpacity style={styles.shareBtn} onPress={handleSignOut}>
									<LogOut size={16} color={colors.destructive} />
								</TouchableOpacity>
							</View>
						)}
					</View>
					{nameError ? <Text style={[styles.errorText, { marginTop: 6 }]}>{nameError}</Text> : null}
				</View>

				{/* ── VRC Team ─────────────────────────────────────── */}
				<Text style={styles.sectionLabel}>VRC Team</Text>
				<View style={styles.card}>
					<View style={styles.cardTitleRow}>
						<Shield size={16} color={colors.mutedForeground} />
						<Text style={styles.cardTitle}>My Team</Text>
					</View>
					<TextInput
						style={styles.input}
						placeholder="Team number (e.g. 229V)"
						placeholderTextColor={colors.mutedForeground}
						value={teamInput}
						onChangeText={(v) => setTeamInput(v.toUpperCase())}
						autoCapitalize="characters"
						autoCorrect={false}
					/>
					{searchingTeam && (
						<ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
					)}
					{!searchingTeam && foundTeam && (
						<View style={styles.foundTeamRow}>
							<View style={{ flex: 1 }}>
								<Text style={styles.foundTeamNumber}>{foundTeam.number}</Text>
								{foundTeam.teamName ? (
									<Text style={styles.foundTeamName}>{foundTeam.teamName}</Text>
								) : null}
							</View>
							<TouchableOpacity
								style={[styles.actionBtn, { marginTop: 0, paddingHorizontal: spacing.md }]}
								onPress={() => setTeam(foundTeam.number)}
							>
								<Text style={styles.actionBtnText}>
									{team === foundTeam.number ? '✓ Saved' : 'Set'}
								</Text>
							</TouchableOpacity>
						</View>
					)}
					{!searchingTeam && teamInput.length >= 2 && !foundTeam && (
						<Text style={styles.errorText}>No team found</Text>
					)}
					{team && <Text style={styles.codeHint}>Current: {team}</Text>}
				</View>

				{/* ── Scouting Teams ────────────────────────────────── */}
				<Text style={styles.sectionLabel}>Scouting Teams</Text>

				{scoutingTeams.map((t) => {
					const code = inviteCodes[t.id];
					const members = membersMap[t.id] ?? [];
					const isLeaving = leavingId === t.id;
					return (
						<View key={t.id} style={styles.card}>
							<View style={styles.teamHeader}>
								<Users size={18} color={colors.primary} />
								<Text style={styles.teamName}>{t.name}</Text>
							</View>

							{code != null ? (
								<>
									<Text style={styles.fieldLabel}>Invite Code</Text>
									<View style={styles.codeRow}>
										<Text style={styles.codeText} selectable>
											{fmtCode(code)}
										</Text>
										<TouchableOpacity
											style={styles.shareBtn}
											onPress={() => handleCopyCode(t.id, code)}
										>
											{copiedId === t.id ? (
												<Check size={16} color={colors.primary} />
											) : (
												<Copy size={16} color={colors.primary} />
											)}
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.shareBtn}
											onPress={() => handleShareCode(t.id, t.name)}
										>
											<Share2 size={16} color={colors.primary} />
										</TouchableOpacity>
									</View>
									<Text style={styles.codeHint}>Refreshes in {timeRemaining}</Text>
								</>
							) : (
								<ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
							)}

							{members.length > 0 && (
								<>
									<Text style={[styles.fieldLabel, { marginTop: 12 }]}>Members</Text>
									{members.map((m) => (
										<Text key={m.userId} style={styles.memberName}>
											• {m.displayName}
										</Text>
									))}
								</>
							)}

							<TouchableOpacity
								style={styles.leaveBtn}
								onPress={() => handleLeave(t.id, t.name)}
								disabled={isLeaving}
							>
								{isLeaving ? (
									<ActivityIndicator size="small" color={colors.destructive} />
								) : (
									<>
										<DoorOpen size={14} color={colors.destructive} />
										<Text style={styles.leaveBtnText}>Leave Team</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					);
				})}

				{/* ── Create ────────────────────────────────────────── */}
				<View style={styles.card}>
					<View style={styles.cardTitleRow}>
						<Users size={16} color={colors.mutedForeground} />
						<Text style={styles.cardTitle}>Create a Team</Text>
					</View>
					<TextInput
						style={styles.input}
						placeholder="Team name"
						placeholderTextColor={colors.mutedForeground}
						value={createName}
						onChangeText={setCreateName}
					/>
					{createError ? <Text style={styles.errorText}>{createError}</Text> : null}
					<TouchableOpacity
						style={[styles.actionBtn, creating && styles.actionBtnDisabled]}
						onPress={handleCreate}
						disabled={creating}
					>
						{creating ? (
							<ActivityIndicator size="small" color={colors.primaryForeground} />
						) : (
							<Text style={styles.actionBtnText}>Create Team</Text>
						)}
					</TouchableOpacity>
				</View>

				{/* ── Join ──────────────────────────────────────────── */}
				<View style={[styles.card, { marginTop: 0 }]}>
					<View style={styles.cardTitleRow}>
						<UserPlus size={16} color={colors.mutedForeground} />
						<Text style={styles.cardTitle}>Join a Team</Text>
					</View>
					<TextInput
						style={[styles.input, { fontFamily: 'monospace', letterSpacing: 2 }]}
						placeholder="8-character invite code"
						placeholderTextColor={colors.mutedForeground}
						value={joinCode}
						onChangeText={(t) => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
						autoCapitalize="characters"
						autoCorrect={false}
						maxLength={8}
					/>
					{joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}
					<TouchableOpacity
						style={[styles.actionBtn, joining && styles.actionBtnDisabled]}
						onPress={handleJoin}
						disabled={joining}
					>
						{joining ? (
							<ActivityIndicator size="small" color={colors.primaryForeground} />
						) : (
							<Text style={styles.actionBtnText}>Join Team</Text>
						)}
					</TouchableOpacity>
				</View>
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
	content: { padding: spacing.md, paddingBottom: spacing['3xl'], gap: spacing.md },
	heading: {
		fontSize: font['2xl'],
		fontWeight: '600',
		color: colors.foreground,
		marginBottom: 4
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
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
	sectionLabel: {
		fontSize: font.sm,
		fontWeight: '600',
		color: colors.mutedForeground,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginTop: 4,
		marginBottom: -4
	},
	teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
	teamName: { fontSize: font.lg, fontWeight: '600', color: colors.foreground },
	fieldLabel: { fontSize: font.xs, color: colors.mutedForeground, marginBottom: 4 },
	codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	codeText: {
		fontSize: font['2xl'],
		fontWeight: '700',
		color: colors.foreground,
		letterSpacing: 4,
		fontVariant: ['tabular-nums']
	},
	shareBtn: {
		padding: 6,
		borderRadius: radius.sm,
		backgroundColor: colors.muted,
		alignItems: 'center',
		justifyContent: 'center'
	},
	codeHint: { fontSize: font.xs, color: colors.mutedForeground, marginTop: 4 },
	memberName: { fontSize: font.sm, color: colors.foreground, marginTop: 4 },
	leaveBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 14,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border
	},
	leaveBtnText: { fontSize: font.sm, color: colors.destructive },
	foundTeamRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 8
	},
	foundTeamNumber: { fontSize: font.base, fontWeight: '700', color: colors.foreground },
	foundTeamName: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
	cardTitle: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
	input: {
		backgroundColor: colors.background,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.sm,
		color: colors.foreground,
		fontSize: font.base,
		marginBottom: 8
	},
	errorText: { fontSize: font.sm, color: colors.destructive, marginBottom: 8 },
	actionBtn: {
		backgroundColor: colors.primary,
		borderRadius: radius.md,
		padding: spacing.sm,
		alignItems: 'center',
		marginTop: 4
	},
	actionBtnDisabled: { opacity: 0.5 },
	actionBtnText: { color: colors.primaryForeground, fontSize: font.base, fontWeight: '600' }
});
