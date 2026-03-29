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

export const fetchMyScoutingTeams = async (): Promise<ScoutingTeam[]> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return [];
	const { data, error } = await supabase
		.from('scouting_team_members')
		.select('team_id, scouting_teams(id, name)')
		.eq('user_id', user.id);
	if (error || !data) return [];
	return data.flatMap((r) => {
		const t = r.scouting_teams as unknown as { id: string; name: string } | null;
		return t ? [{ id: t.id, name: t.name }] : [];
	});
};

export const fetchMyInviteCode = async (teamId: string): Promise<string | null> => {
	const { data, error } = await supabase.rpc('get_my_invite_code', { p_team_id: teamId });
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
): Promise<{ displayName: string; note: string; sharedTeams: string[] }[]> => {
	const { data, error } = await supabase.rpc('get_teammate_notes', {
		p_team_number: teamNumber
	});
	if (error || !data) return [];
	return (data as { display_name: string; note: string; shared_teams: string[] }[]).map((r) => ({
		displayName: r.display_name,
		note: r.note,
		sharedTeams: r.shared_teams ?? []
	}));
};

export const updateDisplayName = async (displayName: string): Promise<string | null> => {
	const { error: rpcError } = await supabase.rpc('update_my_display_name', {
		p_display_name: displayName
	});
	if (rpcError) return rpcError.message;
	const { error: authError } = await supabase.auth.updateUser({
		data: { full_name: displayName }
	});
	if (authError) return authError.message;
	return null;
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
