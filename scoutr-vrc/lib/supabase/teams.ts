import { supabase } from './index';

export type ScoutingTeam = { id: string; name: string };

export const createScoutingTeam = async (
	name: string
): Promise<{ team: ScoutingTeam | null; error: string | null }> => {
	const { data, error } = await supabase.rpc('create_scouting_team', {
		p_name: name
	});
	if (error) return { team: null, error: error.message };
	if (!data) return { team: null, error: 'Unknown error' };
	return { team: { id: data.id, name: data.name }, error: null };
};

export const joinScoutingTeam = async (
	code: string
): Promise<{ team: ScoutingTeam | null; error: string | null }> => {
	const { data, error } = await supabase.rpc('join_scouting_team', {
		p_code: code.toUpperCase().replace(/\s/g, '')
	});
	if (error) return { team: null, error: error.message };
	if (!data) return { team: null, error: 'Unknown error' };
	return { team: { id: data.id, name: data.name }, error: null };
};

export const fetchMyScoutingTeam = async (): Promise<ScoutingTeam | null> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return null;
	const { data, error } = await supabase
		.from('scouting_team_members')
		.select('team_id, scouting_teams(id, name)')
		.eq('user_id', user.id)
		.single();
	if (error || !data) return null;
	const t = data.scouting_teams as unknown as { id: string; name: string };
	return { id: t.id, name: t.name };
};

export const fetchMyInviteCode = async (): Promise<string | null> => {
	const { data, error } = await supabase.rpc('get_my_invite_code');
	if (error || !data) return null;
	return data as string;
};

export const fetchTeamMembers = async (
	teamId: string
): Promise<{ userId: string; displayName: string }[]> => {
	const { data, error } = await supabase
		.from('scouting_team_members')
		.select('user_id, display_name')
		.eq('team_id', teamId);
	if (error || !data) return [];
	return data.map((r) => ({ userId: r.user_id, displayName: r.display_name }));
};

export const fetchTeammateNotes = async (
	teamNumber: string
): Promise<{ displayName: string; note: string }[]> => {
	const { data, error } = await supabase.rpc('get_teammate_notes', {
		p_team_number: teamNumber
	});
	if (error || !data) return [];
	return (data as { display_name: string; note: string }[]).map((r) => ({
		displayName: r.display_name,
		note: r.note
	}));
};

export const leaveScoutingTeam = async (teamId: string): Promise<void> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return;
	await supabase
		.from('scouting_team_members')
		.delete()
		.eq('team_id', teamId)
		.eq('user_id', user.id);
};
