import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, font, radius, spacing } from '../../theme';

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

interface Props {
	rows: RankingRow[];
	onTeamSelect?: (row: RankingRow) => void;
}

type MetricTab = 'rank' | 'ap' | 'sp';

const metricTabs: { key: MetricTab; label: string }[] = [
	{ key: 'rank', label: 'Rank' },
	{ key: 'ap', label: 'AP' },
	{ key: 'sp', label: 'SP' }
];

export const RankingsTab = ({ rows, onTeamSelect }: Props) => {
	const [metric, setMetric] = useState<MetricTab>('rank');

	const sorted = [...rows].sort((a, b) => {
		if (metric === 'rank') return a.rank - b.rank;
		if (metric === 'ap') return b.ap - a.ap;
		return b.sp - a.sp;
	});

	return (
		<View style={styles.container}>
			<View style={styles.metricRow}>
				{metricTabs.map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={[styles.metricBtn, metric === tab.key && styles.metricBtnActive]}
						onPress={() => setMetric(tab.key)}
					>
						<Text style={[styles.metricText, metric === tab.key && styles.metricTextActive]}>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{sorted.map((row, i) => (
				<TouchableOpacity
					key={row.team}
					style={[styles.rankRow, i < sorted.length - 1 && styles.rankRowBorder]}
					onPress={() => onTeamSelect?.(row)}
				>
					<Text style={styles.rankNum}>{row.rank}</Text>
					<View style={styles.teamInfo}>
						<Text style={styles.teamNum} numberOfLines={1}>
							{row.team}
						</Text>
						<Text style={styles.teamName} numberOfLines={1}>
							{row.name}
						</Text>
					</View>
					<View style={styles.statsGrid}>
						<View style={styles.statGroup}>
							<Text style={styles.statLine}>
								{row.wins}-{row.losses}-{row.ties}
							</Text>
							<Text style={styles.statLine}>{row.wp} WP</Text>
						</View>
						<View style={styles.divider} />
						<View style={styles.statGroupRight}>
							<Text style={styles.statLine}>{row.ap} AP</Text>
							<Text style={styles.statLine}>{row.sp} SP</Text>
						</View>
					</View>
				</TouchableOpacity>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: { gap: 0 },
	metricRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
	metricBtn: {
		paddingHorizontal: 16,
		paddingVertical: 7,
		borderRadius: radius.full,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.background
	},
	metricBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
	metricText: { fontSize: font.sm, color: colors.foreground },
	metricTextActive: { color: '#fff', fontWeight: '500' },
	rankRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		gap: 12
	},
	rankRowBorder: {
		borderBottomWidth: 1,
		borderBottomColor: colors.border
	},
	rankNum: {
		width: 36,
		fontSize: font['2xl'],
		fontWeight: '500',
		color: colors.foreground,
		fontVariant: ['tabular-nums']
	},
	teamInfo: { flex: 1, minWidth: 0 },
	teamNum: { fontSize: font.lg, fontWeight: '600', color: colors.foreground },
	teamName: { fontSize: font.base, color: colors.mutedForeground, marginTop: 2 },
	statsGrid: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		fontVariant: ['tabular-nums'] as any
	},
	statGroup: { alignItems: 'flex-start', gap: 4 },
	statGroupRight: { alignItems: 'flex-end', gap: 4 },
	statLine: { fontSize: font.xs, color: colors.foreground, fontVariant: ['tabular-nums'] },
	divider: { width: 1, height: 36, backgroundColor: colors.border }
});
