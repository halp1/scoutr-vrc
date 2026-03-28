import { useRef } from 'react';
import {
	View,
	Text,
	ScrollView,
	Modal,
	Pressable,
	StyleSheet,
	PanResponder,
	TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, eventFont as font, radius, spacing } from '../../theme';

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
	open: boolean;
	onClose: () => void;
	row: ScheduleRow | null;
	rankingRows: RankingRow[];
	onTeamSelect?: (teamNumber: string) => void;
}

const parseScores = (score: string): [number, number] => {
	const [l = '0', r = '0'] = score.split('-');
	const left = parseInt(l.trim(), 10);
	const right = parseInt(r.trim(), 10);
	return [isNaN(left) ? 0 : left, isNaN(right) ? 0 : right];
};

const normalize = (v: string) => v.trim().toLowerCase();

export const MatchDrawer = ({ open, onClose, row, rankingRows, onTeamSelect }: Props) => {
	const insets = useSafeAreaInsets();
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
			onPanResponderRelease: (_, g) => {
				if (g.dy > 50) onClose();
			}
		})
	).current;
	if (!row) return null;

	const [redScore, blueScore] = parseScores(row.score);
	const getTeamRanking = (teamNumber: string) =>
		rankingRows.find((r) => normalize(r.team) === normalize(teamNumber)) ?? null;

	const AllianceTeam = ({ teamNumber, color }: { teamNumber: string; color: string }) => {
		const ranking = getTeamRanking(teamNumber);
		return (
			<TouchableOpacity
				style={styles.allianceTeamRow}
				onPress={() => onTeamSelect?.(teamNumber)}
				activeOpacity={onTeamSelect ? 0.6 : 1}
			>
				<Text style={styles.rankLabel}>{ranking?.rank ?? ''}</Text>
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={[styles.teamNum, { color }]}>{teamNumber}</Text>
					{ranking?.name ? <Text style={styles.teamName}>{ranking.name}</Text> : null}
				</View>
				{ranking && (
					<View style={styles.rankStats}>
						<View style={styles.statGroup}>
							<Text style={styles.statLine}>
								{ranking.wins}-{ranking.losses}-{ranking.ties}
							</Text>
							<Text style={styles.statMuted}>{ranking.wp} WP</Text>
						</View>
						<View style={styles.divider} />
						<View style={styles.statGroupRight}>
							<Text style={styles.statLine}>{ranking.ap} AP</Text>
							<Text style={styles.statMuted}>{ranking.sp} SP</Text>
						</View>
					</View>
				)}
			</TouchableOpacity>
		);
	};

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
						<Text style={styles.heading}>Game Info</Text>

						<View style={styles.matchCard}>
							<Text style={styles.matchName}>{row.match}</Text>
							<Text style={styles.matchStatus}>{row.played ? 'Played' : 'Scheduled'}</Text>
							<View style={styles.matchMeta}>
								<Text style={styles.matchMetaLabel}>Start Time</Text>
								<Text style={styles.matchMetaVal}>{row.time}</Text>
							</View>
							{row.field && (
								<View style={[styles.matchMeta, { marginTop: 4 }]}>
									<Text style={styles.matchMetaLabel}>Field</Text>
									<Text style={styles.matchMetaVal}>{row.field}</Text>
								</View>
							)}
						</View>

						<View style={styles.allianceSection}>
							<View style={styles.allianceHeader}>
								<Text style={styles.allianceTitle}>Red Alliance</Text>
								<Text style={styles.bigScore}>{redScore}</Text>
							</View>
							{row.red.map((team, i) => (
								<AllianceTeam key={i} teamNumber={team} color="#fca5a5" />
							))}
						</View>

						<View style={styles.allianceSection}>
							<View style={styles.allianceHeader}>
								<Text style={styles.allianceTitle}>Blue Alliance</Text>
								<Text style={styles.bigScore}>{blueScore}</Text>
							</View>
							{row.blue.map((team, i) => (
								<AllianceTeam key={i} teamNumber={team} color="#93c5fd" />
							))}
							<View style={{ height: 1, backgroundColor: colors.border }} />
						</View>

						<View style={{ height: 32 }} />
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
	heading: { fontSize: font['2xl'], fontWeight: '600', color: colors.foreground, marginBottom: 16 },
	matchCard: {
		backgroundColor: colors.background,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.lg,
		marginBottom: 20
	},
	matchName: { fontSize: font['5xl'], fontWeight: '500', color: colors.foreground, lineHeight: 56 },
	matchStatus: { fontSize: font.sm, color: colors.mutedForeground, marginBottom: 16 },
	matchMeta: { flexDirection: 'row', justifyContent: 'space-between' },
	matchMetaLabel: { fontSize: font.sm, color: colors.mutedForeground },
	matchMetaVal: { fontSize: font.sm, fontWeight: '500', color: colors.foreground },
	allianceSection: { marginBottom: 16 },
	allianceHeader: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	allianceTitle: { fontSize: font.xl, fontWeight: '500', color: colors.foreground },
	bigScore: {
		fontSize: font['5xl'],
		fontWeight: '500',
		color: colors.foreground,
		fontVariant: ['tabular-nums']
	},
	allianceTeamRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		paddingVertical: 12
	},
	rankLabel: {
		width: 24,
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'right',
		fontVariant: ['tabular-nums']
	},
	teamNum: {
		fontSize: font['3xl'],
		fontWeight: '500',
		fontVariant: ['tabular-nums'],
		lineHeight: 36
	},
	teamName: { fontSize: font.xs, color: colors.mutedForeground, marginTop: 2 },
	rankStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	statGroup: { alignItems: 'flex-start', gap: 2 },
	statGroupRight: { alignItems: 'flex-end', gap: 2 },
	statLine: { fontSize: font.xs, color: colors.foreground, fontVariant: ['tabular-nums'] },
	statMuted: { fontSize: font.xs, color: colors.mutedForeground, fontVariant: ['tabular-nums'] },
	divider: { width: 1, height: 28, backgroundColor: colors.border }
});
