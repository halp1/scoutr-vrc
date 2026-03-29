import { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Linking
} from 'react-native';
import { colors, eventFont as font, radius, spacing } from '../../theme';
import type { Award } from '../../robotevents/robotevents/models';

type EventInfo = {
	name: string;
	locationLine1: string;
	locationLine2: string;
	date: string;
};

type TeamEntry = { id: number; number: string; name: string };

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
	info: EventInfo;
	teams?: TeamEntry[];
	awards?: Award[];
	rankingRows?: RankingRow[];
	hasSchedule?: boolean;
	season?: number;
	onTeamSelect?: (row: RankingRow) => void;
	sku?: string;
}

export const InfoTab = ({
	info,
	teams = [],
	awards = [],
	rankingRows = [],
	hasSchedule = false,
	onTeamSelect,
	sku
}: Props) => {
	const [teamsOpen, setTeamsOpen] = useState(false);

	const handleTeamPress = (team: TeamEntry) => {
		const rankRow = rankingRows.find((r) => r.team.toLowerCase() === team.number.toLowerCase());
		if (hasSchedule && rankRow && onTeamSelect) {
			setTeamsOpen(false);
			onTeamSelect(rankRow);
		} else {
			setTeamsOpen(false);
		}
	};

	const sortedTeams = [...teams].sort((a, b) =>
		a.number.localeCompare(b.number, undefined, { numeric: true })
	);

	return (
		<View style={styles.container}>
			<View style={styles.infoCard}>
				<Text style={styles.fieldLabel}>Tournament Name</Text>
				<Text style={styles.eventName}>{info.name}</Text>

				{sku && (
					<TouchableOpacity
						onPress={() =>
							Linking.openURL(
								`https://www.robotevents.com/robot-competitions/vex-robotics-competition/${sku}.html`
							)
						}
					>
						<Text style={styles.viewLink}>View on RobotEvents</Text>
					</TouchableOpacity>
				)}

				<Text style={[styles.fieldLabel, { marginTop: 16 }]}>Location</Text>
				<Text style={styles.locationLine1}>{info.locationLine1}</Text>
				{info.locationLine2 ? <Text style={styles.locationLine2}>{info.locationLine2}</Text> : null}

				<Text style={[styles.fieldLabel, { marginTop: 16 }]}>Date</Text>
				<Text style={styles.locationLine1}>{info.date}</Text>
			</View>

			<TouchableOpacity style={styles.teamsBtn} onPress={() => setTeamsOpen(true)}>
				<Text style={styles.teamsBtnText}>Teams ({teams.length})</Text>
			</TouchableOpacity>

			<View style={styles.awardsCard}>
				<Text style={styles.awardsTitle}>Awards</Text>
				{awards.length === 0 && <Text style={styles.noAwards}>No awards available</Text>}
				{awards.map((award, i) => (
					<View key={i} style={[styles.awardRow, i < awards.length - 1 && styles.awardRowBorder]}>
						<View style={{ flex: 1 }}>
							<Text style={styles.awardTitle}>
								{(award.title ?? '').replace(/\s*\(.*$/, '').trim()}
							</Text>
							{(award.teamWinners?.length ?? 0) > 0 && (
								<Text style={styles.awardWinner}>
									{award
										.teamWinners!.map((w) => w.team?.name ?? '')
										.filter(Boolean)
										.join(', ')}
								</Text>
							)}
							{(award.teamWinners?.length ?? 0) === 0 &&
								(award.individualWinners?.length ?? 0) > 0 && (
									<Text style={styles.awardWinner}>{award.individualWinners!.join(', ')}</Text>
								)}
						</View>
						{(award.qualifications?.length ?? 0) > 0 && (
							<View style={styles.qualCol}>
								{award.qualifications!.map((q, qi) => (
									<Text key={qi} style={styles.qualText}>
										{q
											.replace('Event Region Championship', 'ERC')
											.replace('World Championship', 'WC')}
									</Text>
								))}
							</View>
						)}
					</View>
				))}
			</View>

			<Modal
				visible={teamsOpen}
				transparent
				animationType="slide"
				onRequestClose={() => setTeamsOpen(false)}
			>
				<Pressable style={styles.backdrop} onPress={() => setTeamsOpen(false)} />
				<View style={styles.sheet}>
					<View style={styles.sheetHandle} />
					<Text style={styles.sheetTitle}>Teams</Text>
					<ScrollView>
						{sortedTeams.map((team) => (
							<TouchableOpacity
								key={team.id}
								style={styles.teamRow}
								onPress={() => handleTeamPress(team)}
							>
								<Text style={styles.teamNum}>{team.number}</Text>
								<Text style={styles.teamName}>{team.name}</Text>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { gap: 12, paddingBottom: 16 },
	infoCard: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.primary,
		padding: spacing.md
	},
	fieldLabel: { fontSize: font.xs, color: colors.mutedForeground, marginBottom: 2 },
	eventName: {
		fontSize: font.xl,
		fontWeight: '600',
		color: colors.foreground,
		lineHeight: 26,
		marginBottom: 4
	},
	viewLink: { fontSize: font.sm, color: colors.primary },
	locationLine1: { fontSize: font.lg, color: colors.foreground, lineHeight: 24 },
	locationLine2: { fontSize: font.base, color: colors.mutedForeground },
	teamsBtn: {
		borderWidth: 1,
		borderColor: colors.border,
		borderRadius: radius.xl,
		padding: spacing.md,
		alignItems: 'center',
		backgroundColor: colors.card
	},
	teamsBtnText: { fontSize: font.base, fontWeight: '500', color: colors.foreground },
	awardsCard: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		backgroundColor: colors.card
	},
	awardsTitle: {
		fontSize: font.base,
		fontWeight: '500',
		color: colors.foreground,
		marginBottom: 8
	},
	noAwards: { color: colors.mutedForeground, fontSize: font.sm },
	awardRow: { paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
	awardRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
	awardTitle: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
	awardWinner: { fontSize: font.sm, color: colors.foreground, marginTop: 2 },
	qualCol: { alignItems: 'flex-end' },
	qualText: { fontSize: font.sm, color: colors.mutedForeground },
	backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.lg,
		paddingBottom: 40,
		maxHeight: '75%'
	},
	sheetHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border,
		alignSelf: 'center',
		marginBottom: 12
	},
	sheetTitle: { fontSize: font.xl, fontWeight: '600', color: colors.foreground, marginBottom: 12 },
	teamRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderRadius: radius.md
	},
	teamNum: { fontSize: font.base, fontWeight: '500', color: colors.foreground },
	teamName: { fontSize: font.sm, color: colors.mutedForeground }
});
