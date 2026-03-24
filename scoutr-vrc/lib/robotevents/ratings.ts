import type { MatchObj } from './robotevents/models';

export interface MatchAllianceInput {
	teamIds: readonly number[];
	score: number;
}

export interface MatchScoreInput {
	red: MatchAllianceInput;
	blue: MatchAllianceInput;
}

export interface RatingsOptions {
	ridge?: number;
	tolerance?: number;
	maxIterations?: number;
}

export interface RobotEventsMatchInputOptions {
	includeUnscored?: boolean;
	includeSittingTeams?: boolean;
}

export interface RatingsResult {
	teamIds: number[];
	opr: Record<number, number>;
	dpr: Record<number, number>;
	ccwm: Record<number, number>;
}

const DEFAULT_RIDGE = 1e-6;
const DEFAULT_TOLERANCE = 1e-9;

const dot = (left: Float64Array, right: Float64Array): number => {
	let total = 0;
	for (let i = 0; i < left.length; i += 1) {
		total += left[i] * right[i];
	}
	return total;
};

const sanitizeTeamIds = (teamIds: readonly number[]): number[] => {
	const deduped = new Set<number>();
	for (const teamId of teamIds) {
		if (Number.isFinite(teamId)) {
			deduped.add(teamId);
		}
	}
	return [...deduped];
};

const solveConjugateGradient = (
	gram: Array<Map<number, number>>,
	rightHandSide: Float64Array,
	ridge: number,
	tolerance: number,
	maxIterations: number
): Float64Array => {
	const size = rightHandSide.length;
	const solution = new Float64Array(size);
	const residual = new Float64Array(rightHandSide);
	const direction = new Float64Array(residual);
	const multiplied = new Float64Array(size);

	const multiply = (vector: Float64Array) => {
		for (let row = 0; row < size; row += 1) {
			let sum = ridge * vector[row];
			for (const [column, value] of gram[row]) {
				sum += value * vector[column];
			}
			multiplied[row] = sum;
		}
	};

	let residualSquared = dot(residual, residual);
	if (residualSquared <= tolerance * tolerance) {
		return solution;
	}

	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		multiply(direction);

		const denominator = dot(direction, multiplied);
		if (Math.abs(denominator) <= Number.EPSILON) {
			break;
		}

		const alpha = residualSquared / denominator;

		for (let i = 0; i < size; i += 1) {
			solution[i] += alpha * direction[i];
			residual[i] -= alpha * multiplied[i];
		}

		const nextResidualSquared = dot(residual, residual);
		if (nextResidualSquared <= tolerance * tolerance) {
			break;
		}

		const beta = nextResidualSquared / residualSquared;
		for (let i = 0; i < size; i += 1) {
			direction[i] = residual[i] + beta * direction[i];
		}

		residualSquared = nextResidualSquared;
	}

	return solution;
};

export const calculateOprDprCcwm = (
	matches: readonly MatchScoreInput[],
	options: RatingsOptions = {}
): RatingsResult => {
	const ridge = options.ridge ?? DEFAULT_RIDGE;
	const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

	const teamSet = new Set<number>();
	for (const match of matches) {
		for (const teamId of match.red.teamIds) {
			if (Number.isFinite(teamId)) {
				teamSet.add(teamId);
			}
		}
		for (const teamId of match.blue.teamIds) {
			if (Number.isFinite(teamId)) {
				teamSet.add(teamId);
			}
		}
	}

	const teamIds = [...teamSet].sort((left, right) => left - right);
	if (teamIds.length === 0) {
		return {
			teamIds: [],
			opr: {},
			dpr: {},
			ccwm: {}
		};
	}

	const indexByTeamId = new Map<number, number>();
	for (let i = 0; i < teamIds.length; i += 1) {
		indexByTeamId.set(teamIds[i], i);
	}

	const gram = Array.from({ length: teamIds.length }, () => new Map<number, number>());
	const oprRightHandSide = new Float64Array(teamIds.length);
	const dprRightHandSide = new Float64Array(teamIds.length);

	const processAlliance = (
		teamIdsInput: readonly number[],
		score: number,
		opponentScore: number
	) => {
		if (!Number.isFinite(score) || !Number.isFinite(opponentScore)) {
			return;
		}

		const teams = sanitizeTeamIds(teamIdsInput);
		if (teams.length === 0) {
			return;
		}

		const teamIndexes: number[] = [];
		for (const teamId of teams) {
			const index = indexByTeamId.get(teamId);
			if (index === undefined) {
				continue;
			}
			teamIndexes.push(index);
		}

		if (teamIndexes.length === 0) {
			return;
		}

		for (const row of teamIndexes) {
			oprRightHandSide[row] += score;
			dprRightHandSide[row] += opponentScore;
		}

		for (const row of teamIndexes) {
			const rowMap = gram[row];
			for (const column of teamIndexes) {
				rowMap.set(column, (rowMap.get(column) ?? 0) + 1);
			}
		}
	};

	for (const match of matches) {
		processAlliance(match.red.teamIds, match.red.score, match.blue.score);
		processAlliance(match.blue.teamIds, match.blue.score, match.red.score);
	}

	const maxIterations = options.maxIterations ?? Math.max(100, teamIds.length * 8);
	const oprVector = solveConjugateGradient(gram, oprRightHandSide, ridge, tolerance, maxIterations);
	const dprVector = solveConjugateGradient(gram, dprRightHandSide, ridge, tolerance, maxIterations);

	const opr: Record<number, number> = {};
	const dpr: Record<number, number> = {};
	const ccwm: Record<number, number> = {};

	for (let i = 0; i < teamIds.length; i += 1) {
		const teamId = teamIds[i];
		const oprValue = oprVector[i];
		const dprValue = dprVector[i];

		opr[teamId] = oprValue;
		dpr[teamId] = dprValue;
		ccwm[teamId] = oprValue - dprValue;
	}

	return {
		teamIds,
		opr,
		dpr,
		ccwm
	};
};

export const robotEventsMatchesToScoredMatches = (
	matches: readonly MatchObj[],
	options: RobotEventsMatchInputOptions = {}
): MatchScoreInput[] => {
	const includeUnscored = options.includeUnscored ?? false;
	const includeSittingTeams = options.includeSittingTeams ?? false;

	const getAllianceTeamIds = (match: MatchObj, color: 'red' | 'blue'): number[] => {
		const alliance = match.alliances.find(
			(entry) => (entry.color as string).toLowerCase() === color
		);
		if (!alliance) {
			return [];
		}

		const ids: number[] = [];
		for (const member of alliance.teams ?? []) {
			if (!includeSittingTeams && member.sitting) {
				continue;
			}

			const id = member.team?.id;
			if (id !== undefined && Number.isFinite(id)) {
				ids.push(id);
			}
		}

		return sanitizeTeamIds(ids);
	};

	const scoredMatches: MatchScoreInput[] = [];

	for (const match of matches) {
		if (!includeUnscored && !match.scored) {
			continue;
		}

		const redAlliance = match.alliances.find(
			(entry) => (entry.color as string).toLowerCase() === 'red'
		);
		const blueAlliance = match.alliances.find(
			(entry) => (entry.color as string).toLowerCase() === 'blue'
		);
		if (!redAlliance || !blueAlliance) {
			continue;
		}

		scoredMatches.push({
			red: {
				teamIds: getAllianceTeamIds(match, 'red'),
				score: redAlliance.score
			},
			blue: {
				teamIds: getAllianceTeamIds(match, 'blue'),
				score: blueAlliance.score
			}
		});
	}

	return scoredMatches;
};
