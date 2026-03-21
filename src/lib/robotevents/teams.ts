import { writable, type Writable } from 'svelte/store';
import { re } from '.';
import { maxPages } from './custom-wrapper';

export const lazyTeamDetail = (
	id: number,
	season: number,
	stores: [
		Writable<null | re.models.Team>,
		Writable<null | re.models.MatchObj[]>,
		Writable<null | re.custom.cache.sources.SkillsLeaderboardEntry>,
		Writable<null | re.models.Award[]>
	]
) => {
	const raw = [
		re.team.teamGetTeam({ id }),
		re.depaginate(
			re.team.teamGetMatches({ id, season: [season] }, maxPages),
			re.models.PaginatedMatchFromJSON
		),
		re.custom.cache
			.load('skills.leaderboard', season)
			.then(
				(leaderboard) =>
					leaderboard.filter((entry) => entry.team.id === id)[0] ??
					re.custom.cache.sources.defaultSkillsEntry
			),
		re.depaginate(
			re.team.teamGetAwards({ id, season: [season] }, maxPages),
			re.models.PaginatedAwardFromJSON
		)
	] as const;

	raw.forEach(async (promise, i) => {
		const data = await promise;
		stores[i].set(data as any);
	});
};
