import { View, Text, ScrollView, Modal, Pressable, StyleSheet } from 'react-native';
import { Gamepad2, Terminal, Trophy } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../../lib/theme';
import { MatchRow } from './MatchRow';

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
	if (!team) return null;

	const total = team.wins + team.losses + team.ties;
	const awps = team.wp - (team.wins * 2 + team.ties * 2);
	const awpRate = total > 0 ? (awps / total) * 100 : 0;

	const winPct = total > 0 ? team.wins / total : 0;
	const tiePct = total > 0 ? team.ties / total : 0;
	const lossPct = total > 0 ? team.losses / total : 0;

	return (
		<Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose} />
			<View style={styles.sheet}>
				<View style={styles.handle} />
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
								<View style={[styles.barSegment, { flex: lossPct, backgroundColor: '#fca5a5' }]} />
							</View>
							<Text style={styles.wlt}>
								{team.wins}-{team.losses}-{team.ties}
							</Text>
						</View>

						<View style={styles.subRow}>
							<View style={styles.awpGroup}>
								<Text style={styles.statVal}>{awps.toFixed(0)}</Text>
								<Text style={styles.statLabel}>AWP</Text>
								<Text style={[styles.statVal, { marginTop: 8 }]}>{awpRate.toFixed(1)}%</Text>
								<Text style={styles.statLabel}>AWP %</Text>
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
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.lg,
		paddingBottom: 0,
		maxHeight: '85%'
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
		alignSelf: 'center',
		marginBottom: 16
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
	awpGroup: { width: 80 },
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
	noMatches: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.xl,
		padding: spacing.md
	},
	noMatchesText: { fontSize: font.sm, color: colors.mutedForeground }
});
