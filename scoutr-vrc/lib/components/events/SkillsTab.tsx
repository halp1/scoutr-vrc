import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gamepad2, Terminal } from 'lucide-react-native';
import { colors, font, radius } from '../../theme';

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

type MetricTab = 'rank' | 'driver' | 'auton';

const metricTabs: { key: MetricTab; label: string }[] = [
	{ key: 'rank', label: 'Rank' },
	{ key: 'driver', label: 'Driver' },
	{ key: 'auton', label: 'Auton' }
];

export const SkillsTab = ({ rows }: { rows: SkillsRow[] }) => {
	const [metric, setMetric] = useState<MetricTab>('rank');

	const sorted = [...rows].sort((a, b) => {
		if (metric === 'rank') return a.rank - b.rank;
		if (metric === 'driver') return b.driver - a.driver;
		return b.auton - a.auton;
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
				<View
					key={row.team}
					style={[styles.skillRow, i < sorted.length - 1 && styles.skillRowBorder]}
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
							<Text style={styles.statLine}>Rank {row.rank}</Text>
							<Text style={styles.statLine}>{row.points} pts</Text>
						</View>
						<View style={styles.divider} />
						<View style={styles.statGroupRight}>
							<View style={styles.iconRow}>
								<Text style={styles.statLine}>{row.driver}</Text>
								<Gamepad2 size={11} color={colors.foreground} />
								<Text style={styles.statLine}>{row.driverRuns}</Text>
							</View>
							<View style={styles.iconRow}>
								<Text style={styles.statLine}>{row.auton}</Text>
								<Terminal size={11} color={colors.foreground} />
								<Text style={styles.statLine}>{row.autonRuns}</Text>
							</View>
						</View>
					</View>
				</View>
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
	skillRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		gap: 12
	},
	skillRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
	rankNum: { width: 36, fontSize: font['2xl'], fontWeight: '500', color: colors.foreground },
	teamInfo: { flex: 1, minWidth: 0 },
	teamNum: { fontSize: font.lg, fontWeight: '600', color: colors.foreground },
	teamName: { fontSize: font.base, color: colors.mutedForeground, marginTop: 2 },
	statsGrid: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	statGroup: { alignItems: 'flex-start', gap: 4 },
	statGroupRight: { alignItems: 'flex-end', gap: 4 },
	iconRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
	statLine: { fontSize: font.xs, color: colors.foreground, fontVariant: ['tabular-nums'] },
	divider: { width: 1, height: 36, backgroundColor: colors.border }
});
