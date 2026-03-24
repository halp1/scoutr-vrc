import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../../lib/theme';

type MatchRowData = {
	match: string;
	time: string;
	score: string;
	red: string[];
	blue: string[];
};

interface Props {
	row: MatchRowData;
	highlightTeam?: string | null;
}

const parseScore = (score: string): [number, number] => {
	const [l = '0', r = '0'] = score.split('-');
	const left = parseInt(l.trim(), 10);
	const right = parseInt(r.trim(), 10);
	return [isNaN(left) ? 0 : left, isNaN(right) ? 0 : right];
};

const winner = (score: string): 'red' | 'blue' | 'tie' => {
	const [l, r] = parseScore(score);
	if (l > r) return 'red';
	if (l < r) return 'blue';
	return 'tie';
};

const normalize = (v: string) => v.trim().toLowerCase();

export const MatchRow = ({ row, highlightTeam = null }: Props) => {
	const isHighlighted = (team: string) =>
		highlightTeam !== null && normalize(team) === normalize(highlightTeam);

	const highlightedAlliance = row.red.some(isHighlighted)
		? 'red'
		: row.blue.some(isHighlighted)
			? 'blue'
			: null;

	const w = winner(row.score);
	const [redScore, blueScore] = parseScore(row.score);

	const matchColor = highlightedAlliance
		? w === highlightedAlliance
			? '#86efac'
			: w === (highlightedAlliance === 'red' ? 'blue' : 'red')
				? '#fca5a5'
				: colors.foreground
		: w === 'red'
			? '#fca5a5'
			: w === 'blue'
				? '#93c5fd'
				: colors.foreground;

	return (
		<View style={styles.row}>
			<Text style={[styles.matchLabel, { color: matchColor }]}>{row.match}</Text>

			<View style={styles.scoreCol}>
				<Text style={styles.timeTxt}>{row.time}</Text>
				<View style={styles.scoreRow}>
					<Text style={styles.redScore}>{redScore}</Text>
					<Text style={styles.dash}>-</Text>
					<Text style={styles.blueScore}>{blueScore}</Text>
				</View>
			</View>

			<View style={styles.teamsCol}>
				<View style={styles.allianceCol}>
					{row.red.map((team, i) => (
						<Text key={i} style={[styles.redTeam, isHighlighted(team) && styles.highlighted]}>
							{team}
						</Text>
					))}
				</View>
				<View style={styles.allianceColRight}>
					{row.blue.map((team, i) => (
						<Text key={i} style={[styles.blueTeam, isHighlighted(team) && styles.highlighted]}>
							{team}
						</Text>
					))}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		paddingBottom: 8,
		marginBottom: 2
	},
	matchLabel: { width: 40, fontSize: font.xl, fontWeight: '500' },
	scoreCol: { width: 72 },
	timeTxt: { fontSize: 10, color: colors.mutedForeground },
	scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
	redScore: { fontSize: 12, color: '#fca5a5', fontVariant: ['tabular-nums'] },
	dash: { fontSize: 14, color: colors.mutedForeground },
	blueScore: { fontSize: 12, color: '#93c5fd', fontVariant: ['tabular-nums'] },
	teamsCol: {
		flex: 1,
		flexDirection: 'row',
		borderLeftWidth: 1,
		borderLeftColor: colors.border,
		paddingLeft: 8,
		gap: 8
	},
	allianceCol: { flex: 1, gap: 2 },
	allianceColRight: { flex: 1, gap: 2, alignItems: 'flex-end' },
	redTeam: { fontSize: 11, color: '#fca5a5', fontVariant: ['tabular-nums'] },
	blueTeam: { fontSize: 11, color: '#93c5fd', fontVariant: ['tabular-nums'] },
	highlighted: { fontWeight: '700', textDecorationLine: 'underline' }
});
