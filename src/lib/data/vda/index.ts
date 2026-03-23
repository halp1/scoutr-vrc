import { Cache, time } from '$lib/robotevents/cache';

export interface VDAStats {
	id: number;
	teamNum: string;
	teamName: string | null;
	gradeLevel: string | null;

	opr: number | null;
	dpr: number | null;
	ccwm: number | null;

	wins: number | null;
	losses: number | null;
	ties: number | null;
	matches: number | null;
	winPercent: number | null;

	trueSkill: number | null;
	trueSkillGlobalRank: number | null;
	trueSkillRegionRank: number | null;

	regionalQual: number | null;
	worldsQual: number | null;

	eventRegion: string | null;
	locRegion: string | null;
	locCountry: string | null;

	skillsScore: number | null;
	maxAuto: number | null;
	maxDriver: number | null;

	worldSkillsRank: number | null;
	regionSkillsRank: number | null;
}

const VDA_CURRENT_BASE = 'https://vrc-data-analysis.com/v1';

const VDA_EARLIEST_SEASON = 154;

const fromCurrentJson = (json: Record<string, any>): VDAStats => ({
	id: Math.trunc(json['id']),
	teamNum: json['team_number'],
	teamName: json['team_name'] ?? null,
	gradeLevel: json['grade'] ?? null,
	opr: json['opr'] ?? null,
	dpr: json['dpr'] ?? null,
	ccwm: json['ccwm'] ?? null,
	wins: json['total_wins'] != null ? Math.trunc(json['total_wins']) : null,
	losses: json['total_losses'] != null ? Math.trunc(json['total_losses']) : null,
	ties: json['total_ties'] != null ? Math.trunc(json['total_ties']) : null,
	matches: json['total_matches'] != null ? Math.trunc(json['total_matches']) : null,
	winPercent:
		json['total_winning_percent'] != null
			? parseFloat(json['total_winning_percent'].toFixed(1))
			: null,
	trueSkill: json['trueskill'] ?? null,
	trueSkillGlobalRank: json['ts_ranking'] ?? null,
	trueSkillRegionRank: json['ts_ranking_region'] ?? null,
	regionalQual: json['qualified_for_regionals'] ?? null,
	worldsQual: json['qualified_for_worlds'] ?? null,
	eventRegion:
		json['event_region'] === 'British Columbia'
			? 'British Columbia (BC)'
			: (json['event_region'] ?? null),
	locRegion: json['loc_region'] ?? null,
	locCountry: json['loc_country'] ?? null,
	skillsScore: json['score_total_max'] != null ? Math.trunc(json['score_total_max']) : null,
	maxAuto: json['score_auto_max'] != null ? Math.trunc(json['score_auto_max']) : null,
	maxDriver: json['score_driver_max'] != null ? Math.trunc(json['score_driver_max']) : null,
	worldSkillsRank:
		json['total_skills_ranking'] != null ? Math.trunc(json['total_skills_ranking']) : null,
	regionSkillsRank:
		json['region_grade_skills_rank'] != null ? Math.trunc(json['region_grade_skills_rank']) : null
});

const fromHistoricalJson = (json: Record<string, any>): VDAStats => {
	const wins = Math.trunc((json['total_wins'] ?? 0) + (json['elimination_wins'] ?? 0));
	const losses = Math.trunc((json['total_losses'] ?? 0) + (json['elimination_losses'] ?? 0));
	const ties = Math.trunc((json['total_ties'] ?? 0) + (json['elimination_ties'] ?? 0));
	const total = wins + losses + ties;
	return {
		id: json['team_id'] != null ? Math.trunc(json['team_id']) : 0,
		teamNum: json['team_num'] ?? '',
		teamName: json['team_name'] ?? null,
		gradeLevel: null,
		opr: json['opr'] ?? null,
		dpr: json['dpr'] ?? null,
		ccwm: json['ccwm'] ?? null,
		wins,
		losses,
		ties,
		matches: total,
		winPercent: parseFloat(((wins / (total === 0 ? 1 : total)) * 100).toFixed(1)),
		trueSkill: json['trueskill'] ?? null,
		trueSkillGlobalRank: json['ts_ranking'] != null ? Math.trunc(json['ts_ranking']) : null,
		trueSkillRegionRank: 0,
		regionalQual: 0,
		worldsQual: 0,
		eventRegion: '',
		locRegion: null,
		locCountry: null,
		skillsScore: null,
		maxAuto: null,
		maxDriver: null,
		worldSkillsRank: null,
		regionSkillsRank: null
	};
};

const fetchAllTeams = async (): Promise<VDAStats[]> => {
	const response = await window.fetchCORS(`${VDA_CURRENT_BASE}/allteams`);
	const json: unknown[] = await response.json();
	return json.map((entry) => fromCurrentJson(entry as Record<string, any>));
};

const fetchHistoricalAllTeams = async (seasonId: number): Promise<VDAStats[]> => {
	const response = await window.fetchCORS(`${VDA_CURRENT_BASE}/historical_allteams/${seasonId}`);
	const json: unknown[] = await response.json();
	return json.map((entry) => fromHistoricalJson(entry as Record<string, any>));
};

const vdaCache = new Cache({
	'vda.allteams': {
		loader: fetchAllTeams,
		expiryTime: time(1, 'hour')
	},
	'vda.historical': {
		loader: fetchHistoricalAllTeams,
		expiryTime: time(1, 'hour')
	}
} as const);

export const getTrueSkillData = async (
	seasonId: number,
	currentSeasonId: number
): Promise<VDAStats[]> => {
	if (seasonId < VDA_EARLIEST_SEASON) {
		return [];
	}
	if (seasonId !== currentSeasonId) {
		return vdaCache.load('vda.historical', seasonId);
	}
	return vdaCache.load('vda.allteams');
};

export const getTrueSkillDataForTeam = async (
	seasonId: number,
	currentSeasonId: number,
	teamNum: string
): Promise<VDAStats | null> => {
	const all = await getTrueSkillData(seasonId, currentSeasonId);
	return all.find((t) => t.teamNum === teamNum || t.teamName === teamNum) ?? null;
};

export const getVDAStatsByTeamNum = async (
	seasonId: number,
	teamNum: string
): Promise<VDAStats | null> => {
	if (seasonId < VDA_EARLIEST_SEASON) return null;
	const all = await vdaCache.load('vda.historical', seasonId);
	return all.find((t) => t.teamNum === teamNum || t.teamName === teamNum) ?? null;
};
