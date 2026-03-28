import { View, Text, StyleSheet } from 'react-native';
import { Gamepad2, Terminal, Trophy } from 'lucide-react-native';
import { colors, eventFont as font, radius, spacing } from '../../theme';

export type TeamSummary = {
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

export type TeamSkills = {
	rank: number;
	points: number;
	driver: number;
	driverRuns: number;
	auton: number;
	autonRuns: number;
};

interface RankStatsCardProps {
	team: TeamSummary;
	opr?: number | null;
	dpr?: number | null;
	ccwm?: number | null;
}

interface SkillsStatsCardProps {
	skills: TeamSkills | null;
}

const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1));

export const RankStatsCard = ({
	team,
	opr = null,
	dpr = null,
	ccwm = null
}: RankStatsCardProps) => {
	const total = team.wins + team.losses + team.ties;
	const awps = team.wp - (team.wins * 2 + team.ties * 1);
	const awpRate = total > 0 ? (awps / total) * 100 : 0;
	const winPct = total > 0 ? team.wins / total : 0;
	const tiePct = total > 0 ? team.ties / total : 0;
	const lossPct = total > 0 ? team.losses / total : 0;

	return (
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
	);
};

export const SkillsStatsCard = ({ skills }: SkillsStatsCardProps) => (
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
);

const styles = StyleSheet.create({
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
	skillVal: { fontSize: font.base, color: colors.foreground }
});
