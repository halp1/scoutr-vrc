import { View, Text, StyleSheet } from 'react-native';
import { colors, eventFont as font, radius, spacing } from '../../theme';
import { RankStatsCard, SkillsStatsCard } from './StatsCards';
import { MatchRow } from './MatchRow';
import { useStorage } from '../../state/storage';
import type { RatingsResult } from '../../robotevents/ratings';

type RankingRow = {
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

type ScheduleRow = {
	group: 'practice' | 'qualifier' | 'elimination';
	match: string;
	time: string;
	score: string;
	red: string[];
	blue: string[];
	field?: string;
	played: boolean;
};

type SkillsRow = {
	rank: number;
	team: string;
	name: string;
	points: number;
	driver: number;
	driverRuns: number;
	auton: number;
	autonRuns: number;
};

interface Props {
	rankingRows: RankingRow[];
	scheduleRows: ScheduleRow[];
	skillsRows: SkillsRow[];
	divisionRatings: RatingsResult | null;
	teamNumberToId: Map<string, number>;
	loading?: boolean;
	onMatchPress?: (row: ScheduleRow) => void;
}

export const MyTeamTab = ({
	rankingRows,
	scheduleRows,
	skillsRows,
	divisionRatings,
	teamNumberToId,
	loading = false,
	onMatchPress
}: Props) => {
	const { team: teamNumber } = useStorage();

	if (!teamNumber) {
		return (
			<View style={styles.emptyWrap}>
				<Text style={styles.emptyTitle}>No team set</Text>
				<Text style={styles.emptyBody}>
					Set your team number in the Account tab to use this feature.
				</Text>
			</View>
		);
	}

	if (loading) {
		return <View />;
	}

	const key = teamNumber.trim().toLowerCase();
	const myRanking = rankingRows.find((r) => r.team.trim().toLowerCase() === key) ?? null;
	const mySkills = skillsRows.find((r) => r.team.trim().toLowerCase() === key) ?? null;
	const myMatches = scheduleRows.filter(
		(r) =>
			r.red.some((t) => t.trim().toLowerCase() === key) ||
			r.blue.some((t) => t.trim().toLowerCase() === key)
	);

	const myTeamId = teamNumberToId.get(key);
	const opr = myTeamId != null ? (divisionRatings?.opr[myTeamId] ?? null) : null;
	const dpr = myTeamId != null ? (divisionRatings?.dpr[myTeamId] ?? null) : null;
	const ccwm = myTeamId != null ? (divisionRatings?.ccwm[myTeamId] ?? null) : null;

	if (!myRanking) {
		return (
			<View style={styles.emptyWrap}>
				<Text style={styles.emptyTitle}>{teamNumber}</Text>
				<Text style={styles.emptyBody}>
					Your team is not registered for this event, or rankings have not been posted yet.
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.teamNum}>{myRanking.team}</Text>
			<Text style={styles.teamName}>{myRanking.name || 'No team name available'}</Text>

			<RankStatsCard team={myRanking} opr={opr} dpr={dpr} ccwm={ccwm} />
			<SkillsStatsCard skills={mySkills} />

			<Text style={styles.matchesTitle}>My Matches</Text>
			{myMatches.length === 0 ? (
				<View style={styles.noMatches}>
					<Text style={styles.noMatchesText}>No matches found for your team.</Text>
				</View>
			) : (
				<View style={{ gap: 4 }}>
					{myMatches.map((row, i) => (
						<MatchRow
							key={i}
							row={row}
							highlightTeam={myRanking.team}
							onPress={onMatchPress ? () => onMatchPress(row) : undefined}
						/>
					))}
				</View>
			)}
			<View style={{ height: 24 }} />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	emptyWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing['2xl'],
		gap: 8
	},
	emptyTitle: {
		fontSize: font['2xl'],
		fontWeight: '600',
		color: colors.foreground,
		textAlign: 'center'
	},
	emptyBody: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'center',
		lineHeight: 20
	},
	teamNum: { fontSize: font['3xl'], fontWeight: '600', color: colors.foreground, lineHeight: 36 },
	teamName: { fontSize: font.base, color: colors.mutedForeground, marginTop: 4, marginBottom: 16 },
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
