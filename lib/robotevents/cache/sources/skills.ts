export interface SkillsLeaderboardEntry {
	rank: number;
	team: {
		id: number;
		program: string;
		teamRegId: number;
		team: string;
		teamName: string;
		organization: string;
		city: string;
		region: string;
		country: string;
		gradeLevel: string;
		link: string;
		eventRegion: string;
		affiliations: unknown[];
		eventRegionId: number;
	};
	event: {
		sku: string;
		startDate: string;
		seasonName: string;
	};
	scores: {
		score: number;
		programming: number;
		driver: number;
		combinedStopTime: number;
		maxProgramming: number;
		maxDriver: number;
		progStopTime: number;
		driverStopTime: number;
		progScoredAt: string;
		driverScoredAt: string;
	};
	eligible: boolean;
}

export const defaultSkillsEntry: SkillsLeaderboardEntry = {
	rank: Infinity,
	team: {
		id: 0,
		program: '',
		teamRegId: 0,
		team: '',
		teamName: '',
		organization: '',
		city: '',
		region: '',
		country: '',
		gradeLevel: '',
		link: '',
		eventRegion: '',
		affiliations: [],
		eventRegionId: 0
	},
	event: {
		sku: '',
		startDate: '',
		seasonName: ''
	},
	scores: {
		score: 0,
		programming: 0,
		driver: 0,
		combinedStopTime: 0,
		maxProgramming: 0,
		maxDriver: 0,
		progStopTime: 0,
		driverStopTime: 0,
		progScoredAt: '',
		driverScoredAt: ''
	},
	eligible: false
};

export const skillsLeaderboard = async (season: number): Promise<SkillsLeaderboardEntry[]> => {
	return await fetch(`https://www.robotevents.com/api/seasons/${season}/skills`).then((res) =>
		res.json()
	);
};
