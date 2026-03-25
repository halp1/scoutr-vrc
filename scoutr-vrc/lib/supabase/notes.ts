import { supabase } from './index';

export const upsertNote = async (teamNumber: string, note: string): Promise<void> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return;
	await supabase
		.from('team_notes')
		.upsert(
			{ user_id: user.id, team_number: teamNumber, note, updated_at: new Date().toISOString() },
			{ onConflict: 'user_id,team_number' }
		);
};

export const fetchAllNotes = async (): Promise<Record<string, string>> => {
	const {
		data: { user }
	} = await supabase.auth.getUser();
	if (!user) return {};
	const { data, error } = await supabase
		.from('team_notes')
		.select('team_number, note')
		.eq('user_id', user.id);
	if (error || !data) return {};
	return Object.fromEntries(data.map((r) => [r.team_number, r.note]));
};
