import { useRef, useState, useEffect } from 'react';
import {
	View,
	Text,
	ScrollView,
	Modal,
	Pressable,
	StyleSheet,
	PanResponder,
	TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gamepad2, Terminal, Trophy } from 'lucide-react-native';
import { colors, eventFont as font, radius, spacing } from '../../theme';
import { MatchRow } from './MatchRow';
import { useStorage } from '../../state/storage';
import { upsertNote } from '../../supabase/notes';
import { fetchTeammateNotes } from '../../supabase/teams';

type TeamSummary = {
	rank: number;
	team: string;
	name: string;
	wins: number;
	losses: number;
	ties: number;
	wp: number;
	ap: number;
	sp: number;
};

type TeamSkills = {
	rank: number;
	points: number;
	driver: number;
	driverRuns: number;
	auton: number;
	autonRuns: number;
};

type TeamMatch = {
	match: string;
	time: string;
	score: string;
	red: string[];
	blue: string[];
};

interface Props {
	open: boolean;
	onClose: () => void;
	team: TeamSummary | null;
	skills: TeamSkills | null;
	matches: TeamMatch[];
	opr?: number | null;
	dpr?: number | null;
	ccwm?: number | null;
}

const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));

export const TeamDrawer = ({
	open,
	onClose,
	team,
	skills,
	matches,
	opr = null,
	dpr = null,
	ccwm = null
}: Props) => {
	const insets = useSafeAreaInsets();
	const { notes, setNote, auth, scoutingTeam } = useStorage();
	const [noteText, setNoteText] = useState(notes[team?.team ?? ''] ?? '');
	const [teammateNotes, setTeammateNotes] = useState<{ displayName: string; note: string }[]>([]);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setNoteText(notes[team?.team ?? ''] ?? '');
		if (team?.team && auth && scoutingTeam) {
			fetchTeammateNotes(team.team).then(setTeammateNotes);
		} else {
			setTeammateNotes([]);
		}
	}, [team?.team]);

	const handleNoteChange = (value: string) => {
		setNoteText(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			if (!team) return;
			setNote(team.team, value);
			if (auth) upsertNote(team.team, value);
		}, 1000);
	};

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
			onPanResponderRelease: (_, g) => {
				if (g.dy > 50) onClose();
			}
		})
	).current;
	if (!team) return null;

	const total = team.wins + team.losses + team.ties;
	const awps = team.wp - (team.wins * 2 + team.ties * 2);
	const awpRate = total > 0 ? (awps / total) * 100 : 0;

	const winPct = total > 0 ? team.wins / total : 0;
	const tiePct = total > 0 ? team.ties / total : 0;
	const lossPct = total > 0 ? team.losses / total : 0;

	return (
		<Modal
			visible={open}
			transparent
			statusBarTranslucent
			animationType="slide"
			onRequestClose={onClose}
		>
			<View style={styles.modalContainer}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
					<View style={styles.handleZone} {...panResponder.panHandlers}>
						<View style={styles.handle} />
					</View>
					<ScrollView showsVerticalScrollIndicator={false}>
						<Text style={styles.teamNum}>{team.team}</Text>
						<Text style={styles.teamName}>{team.name || 'No team name available'}</Text>

						<View style={styles.card}>
							<View style={styles.rankRow}>
								<View>
									<Text style={styles.rankVal}>{team.rank}</Text>
									<Text style={styles.statLabel}>Rank</Text>
								</View>
								<View style={styles.rankStats}>
									<View style={styles.statCol}>
										<Text style={styles.statVal}>{team.wp}</Text>
										<Text style={styles.statLabel}>WP</Text>
									</View>
									<View style={styles.statCol}>
										<Text style={styles.statVal}>{team.ap}</Text>
										<Text style={styles.statLabel}>AP</Text>
									</View>
									<View style={styles.statCol}>
										<Text style={styles.statVal}>{team.sp}</Text>
										<Text style={styles.statLabel}>SP</Text>
									</View>
								</View>
							</View>

							<View style={styles.barContainer}>
								<View style={styles.bar}>
									<View style={[styles.barSegment, { flex: winPct, backgroundColor: '#86efac' }]} />
									<View style={[styles.barSegment, { flex: tiePct, backgroundColor: '#fde047' }]} />
									<View
										style={[styles.barSegment, { flex: lossPct, backgroundColor: '#fca5a5' }]}
									/>
								</View>
								<Text style={styles.wlt}>
									{team.wins}-{team.losses}-{team.ties}
								</Text>
							</View>

							<View style={styles.subRow}>
								<View style={styles.awpGroup}>
									<View style={styles.awpRow}>
										<View style={styles.statCol}>
											<Text style={styles.statVal}>{awps.toFixed(0)}</Text>
											<Text style={styles.statLabel}>AWP</Text>
										</View>
										<View style={styles.statCol}>
											<Text style={styles.statVal}>{awpRate.toFixed(1)}%</Text>
											<Text style={styles.statLabel}>AWP %</Text>
										</View>
									</View>
								</View>
								<View style={styles.ratingGroup}>
									{(
										[
											['OPR', opr],
											['DPR', dpr],
											['CCWM', ccwm]
										] as [string, number | null][]
									).map(([label, val]) => (
										<View key={label} style={styles.ratingItem}>
											<Text style={styles.statVal}>{fmt(val)}</Text>
											<Text style={styles.statLabel}>{label}</Text>
										</View>
									))}
								</View>
							</View>
						</View>

						<View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
							<View style={{ flex: 1 }}>
								<Text style={styles.skillsScore}>{skills?.points ?? 0}</Text>
								<Text style={styles.statLabel}>Skills score</Text>
							</View>
							<View style={styles.skillsRight}>
								{(
									[
										[Trophy, 'Rank', skills?.rank ?? 0],
										[Gamepad2, 'Driver', skills?.driver ?? 0],
										[Terminal, 'Auto', skills?.auton ?? 0]
									] as const
								).map(([Icon, label, val]) => (
									<View key={label} style={styles.skillItem}>
										<View style={styles.iconRow}>
											<Icon size={13} color={colors.foreground} />
											<Text style={styles.skillVal}>{val}</Text>
										</View>
										<Text style={styles.statLabel}>{label}</Text>
									</View>
								))}
							</View>
						</View>
						<View style={styles.card}>
							<Text style={styles.notesLabel}>Scout Notes</Text>
							<TextInput
								style={styles.notesInput}
								multiline
								value={noteText}
								onChangeText={handleNoteChange}
								placeholder="Add notes about this team..."
								placeholderTextColor={colors.mutedForeground}
							/>
						</View>
						{scoutingTeam && (
							<View style={styles.card}>
								<Text style={styles.notesLabel}>Team Notes</Text>
								{teammateNotes.length === 0 ? (
									<Text style={styles.noTeammateText}>No teammates have noted this team yet.</Text>
								) : (
									<View style={{ gap: 10 }}>
										{teammateNotes.map((n, i) => (
											<View key={i} style={styles.teammateNote}>
												<Text style={styles.teammateNoteName}>{n.displayName}</Text>
												<Text style={styles.teammateNoteText}>{n.note}</Text>
											</View>
										))}
									</View>
								)}
							</View>
						)}
						<Text style={styles.matchesTitle}>Matches</Text>
						{matches.length === 0 ? (
							<View style={styles.noMatches}>
								<Text style={styles.noMatchesText}>No matches found for this team.</Text>
							</View>
						) : (
							<View style={{ gap: 4 }}>
								{matches.map((row, i) => (
									<MatchRow key={i} row={row} highlightTeam={team.team} />
								))}
							</View>
						)}

						<View style={{ height: 24 }} />
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalContainer: { flex: 1, justifyContent: 'flex-end' as const },
	backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.lg,
		maxHeight: '85%'
	},
	handleZone: {
		alignItems: 'center',
		paddingVertical: 12,
		marginBottom: 4
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border
	},
	teamNum: { fontSize: font['3xl'], fontWeight: '600', color: colors.foreground, lineHeight: 36 },
	teamName: { fontSize: font.base, color: colors.mutedForeground, marginTop: 4, marginBottom: 16 },
	card: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		marginBottom: 12,
		backgroundColor: colors.background
	},
	rankRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: 12,
		marginBottom: 12
	},
	rankVal: { fontSize: font['3xl'], fontWeight: '500', color: colors.foreground },
	rankStats: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
	statCol: { alignItems: 'center' },
	statVal: { fontSize: font.lg, color: colors.foreground, fontVariant: ['tabular-nums'] },
	statLabel: { fontSize: font.xs, color: colors.mutedForeground, marginTop: 2 },
	barContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
	bar: {
		flex: 1,
		height: 6,
		borderRadius: 3,
		flexDirection: 'row',
		overflow: 'hidden',
		backgroundColor: colors.border
	},
	barSegment: { height: '100%' },
	wlt: { fontSize: font.sm, color: colors.foreground },
	subRow: { flexDirection: 'row', alignItems: 'flex-start' },
	awpGroup: { width: 120 },
	awpRow: { flexDirection: 'row' as const, gap: 16 },
	ratingGroup: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
	ratingItem: { alignItems: 'center' },
	skillsScore: { fontSize: font['3xl'], fontWeight: '600', color: colors.foreground },
	skillsRight: { flexDirection: 'row', gap: 16 },
	skillItem: { alignItems: 'flex-end' },
	iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	skillVal: { fontSize: font.base, color: colors.foreground },
	matchesTitle: {
		fontSize: font.xl,
		fontWeight: '500',
		color: colors.foreground,
		marginBottom: 12
	},
	notesLabel: {
		fontSize: font.sm,
		fontWeight: '500',
		color: colors.mutedForeground,
		marginBottom: 8
	},
	notesInput: {
		color: colors.foreground,
		fontSize: font.sm,
		minHeight: 80,
		textAlignVertical: 'top'
	},
	noTeammateText: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		fontStyle: 'italic'
	},
	teammateNote: {
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingTop: 8
	},
	teammateNoteName: {
		fontSize: font.xs,
		fontWeight: '600',
		color: colors.mutedForeground,
		marginBottom: 2
	},
	teammateNoteText: {
		fontSize: font.sm,
		color: colors.foreground
	},
	noMatches: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.xl,
		padding: spacing.md
	},
	noMatchesText: { fontSize: font.sm, color: colors.mutedForeground }
});
