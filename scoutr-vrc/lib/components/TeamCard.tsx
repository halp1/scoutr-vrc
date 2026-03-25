import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Star } from 'lucide-react-native';
import { re } from '../robotevents';
import type { Team, MatchObj } from '../robotevents/robotevents/models';
import type { SkillsLeaderboardEntry } from '../robotevents/cache/sources/skills';
import { PaginatedMatchFromJSON } from '../robotevents/robotevents/models';
import { useStorage } from '../state/storage';
import { getVDAStatsByTeamNum, type VDAStats } from '../data/vda';
import { colors, font, radius, spacing } from '../theme';

interface Props {
	id: number;
	season: number;
	currentSeason: number;
}

interface MatchData {
	wins: number;
	losses: number;
	ties: number;
}

const StatCol = ({
	label,
	value,
	loading
}: {
	label: string;
	value: string | number | null | undefined;
	loading: boolean;
}) => (
	<View style={styles.statCol}>
		<Text style={styles.statValue}>
			{loading || value == null ? (
				<ActivityIndicator size="small" color={colors.mutedForeground} />
			) : (
				String(value)
			)}
		</Text>
		<Text style={styles.statLabel}>{label}</Text>
	</View>
);

export const TeamCard = ({ id, season, currentSeason }: Props) => {
	const { addFavoriteTeam, removeFavoriteTeam, favorites } = useStorage();
	const isFav = favorites.teams.includes(id);

	const [details, setDetails] = useState<Team | null>(null);
	const [matches, setMatches] = useState<MatchObj[] | null>(null);
	const [skills, setSkills] = useState<SkillsLeaderboardEntry | null>(null);
	const [vda, setVda] = useState<VDAStats | null>(null);
	const [loadingVda, setLoadingVda] = useState(true);

	useEffect(() => {
		re.team
			.teamGetTeam({ id })
			.then(setDetails)
			.catch(() => {});

		re.depaginate(
			re.team.teamGetMatches({ id, season: [season] }, re.custom.maxPages),
			PaginatedMatchFromJSON
		)
			.then(setMatches)
			.catch(() => {});

		re.custom.cache
			.load('skills.leaderboard', season)
			.then((lb) => {
				const entry = lb.find((e) => e.team.id === id) ?? null;
				setSkills(entry);
			})
			.catch(() => {});
	}, [id, season]);

	useEffect(() => {
		if (!details?.number) return;
		setLoadingVda(true);
		getVDAStatsByTeamNum(season, currentSeason, details.number)
			.then(setVda)
			.catch(() => setVda(null))
			.finally(() => setLoadingVda(false));
	}, [details?.number, season, currentSeason]);

	const matchData: MatchData | null = matches
		? (() => {
				const res = { wins: 0, losses: 0, ties: 0 };
				for (const match of matches) {
					const alliance = match.alliances.find((a) => a.teams.some((t) => t.team?.id === id));
					const opposite = match.alliances.find((a) => a.color !== alliance?.color);
					if (!alliance || !opposite) continue;
					if (alliance.score > opposite.score) res.wins++;
					else if (alliance.score < opposite.score) res.losses++;
					else res.ties++;
				}
				return res;
			})()
		: null;

	const winRate =
		matchData && matchData.wins + matchData.losses + matchData.ties > 0
			? ((matchData.wins / (matchData.wins + matchData.losses + matchData.ties)) * 100).toFixed(1) +
				'%'
			: null;

	const toggleFav = () => {
		if (isFav) removeFavoriteTeam(id);
		else addFavoriteTeam(id);
	};

	return (
		<View style={styles.wrapper}>
			{/* Header */}
			<View style={styles.card}>
				<View style={styles.cardHeaderRow}>
					<View style={{ flex: 1 }}>
						{details ? (
							<Text style={styles.teamNum}>{details.number}</Text>
						) : (
							<View style={[styles.skeletonLg, { width: 80 }]} />
						)}
						{details ? (
							<Text style={styles.teamName}>{details.teamName}</Text>
						) : (
							<View style={[styles.skeletonSm, { width: 120, marginTop: 4 }]} />
						)}
					</View>
					<TouchableOpacity onPress={toggleFav} hitSlop={8}>
						<Star
							size={20}
							color={colors.foreground}
							fill={isFav ? colors.foreground : 'transparent'}
						/>
					</TouchableOpacity>
				</View>
				<View style={styles.metaRow}>
					<Text style={styles.metaText}>
						{details
							? [details.location?.city, details.location?.region].filter(Boolean).join(', ') || '—'
							: ''}
					</Text>
					<Text style={styles.metaText}>{details?.organization ?? ''}</Text>
				</View>
			</View>

			{/* Skills */}
			<View style={styles.card}>
				<View style={styles.rowCard}>
					<View>
						<Text style={styles.bigNum}>{skills?.scores.score ?? '—'}</Text>
						<Text style={styles.bigLabel}>Skills record</Text>
					</View>
					<View style={styles.statRow}>
						<StatCol label="Driver" value={skills?.scores.driver} loading={skills === null} />
						<StatCol label="Auto" value={skills?.scores.programming} loading={skills === null} />
						<StatCol label="Rank" value={skills?.rank} loading={skills === null} />
					</View>
				</View>
			</View>

			{/* TrueSkill / VDA */}
			<View style={styles.card}>
				<View style={styles.rowCard}>
					<View>
						<Text style={styles.bigNum}>
							{loadingVda ? '…' : (vda?.trueSkill?.toFixed(1) ?? '—')}
						</Text>
						<Text style={styles.bigLabel}>TrueSkill</Text>
					</View>
					<View style={styles.statRow}>
						<StatCol label="Rank" value={vda?.trueSkillGlobalRank} loading={loadingVda} />
						<StatCol
							label="OPR"
							value={vda?.opr != null ? vda.opr.toFixed(1) : null}
							loading={loadingVda}
						/>
						<StatCol
							label="DPR"
							value={vda?.dpr != null ? vda.dpr.toFixed(1) : null}
							loading={loadingVda}
						/>
						<StatCol
							label="CCWM"
							value={vda?.ccwm != null ? vda.ccwm.toFixed(1) : null}
							loading={loadingVda}
						/>
					</View>
				</View>
			</View>

			{/* Match record */}
			<View style={styles.card}>
				<View style={styles.rowCard}>
					<View>
						<Text style={styles.bigNum}>{winRate ?? (matches === null ? '…' : '—')}</Text>
						<Text style={styles.bigLabel}>Win rate</Text>
					</View>
					<View style={styles.statRow}>
						<StatCol label="Wins" value={matchData?.wins} loading={matches === null} />
						<StatCol label="Losses" value={matchData?.losses} loading={matches === null} />
						<StatCol label="Ties" value={matchData?.ties} loading={matches === null} />
					</View>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	wrapper: { gap: 12 },
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
	},
	cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
	teamNum: { fontSize: font['3xl'], fontWeight: '700', color: colors.foreground },
	teamName: { fontSize: font.base, color: colors.foreground, marginTop: 2 },
	metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
	metaText: { fontSize: font.sm, color: colors.mutedForeground },
	rowCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
	bigNum: { fontSize: font['3xl'], fontWeight: '700', color: colors.foreground },
	bigLabel: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	statRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 },
	statCol: { alignItems: 'flex-end' },
	statValue: { fontSize: font.base, fontWeight: '600', color: colors.foreground, minHeight: 20 },
	statLabel: { fontSize: font.xs, color: colors.mutedForeground },
	skeletonLg: { height: 32, backgroundColor: colors.border, borderRadius: 4 },
	skeletonSm: { height: 14, backgroundColor: colors.border, borderRadius: 4 }
});
