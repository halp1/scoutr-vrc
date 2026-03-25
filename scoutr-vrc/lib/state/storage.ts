import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';

export interface AppStorage {
	team: string | null;
	program: number | null;
	auth: Session | null;
	onboarding: {
		intro: boolean;
		team: boolean;
		account: boolean;
	};
	current: {
		event: number | null;
	};
	favorites: {
		teams: number[];
		events: number[];
	};
	notes: Record<string, string>;
	scoutingTeam: { id: string; name: string } | null;
}

interface AppState extends AppStorage {
	_hydrated: boolean;
	setTeam: (team: string | null) => void;
	setProgram: (program: number | null) => void;
	setAuth: (auth: Session | null) => void;
	setOnboarding: (key: keyof AppStorage['onboarding'], value: boolean) => void;
	setCurrentEvent: (event: number | null) => void;
	addFavoriteTeam: (id: number) => void;
	removeFavoriteTeam: (id: number) => void;
	addFavoriteEvent: (id: number) => void;
	removeFavoriteEvent: (id: number) => void;
	setNote: (teamNumber: string, note: string) => void;
	setAllNotes: (notes: Record<string, string>) => void;
	setScoutingTeam: (team: { id: string; name: string } | null) => void;
}

export const useStorage = create<AppState>()(
	persist(
		(set) => ({
			team: null,
			program: null,
			auth: null,
			onboarding: { intro: false, team: false, account: false },
			current: { event: null },
			favorites: { teams: [], events: [] },
			notes: {},
			scoutingTeam: null,
			_hydrated: false,

			setTeam: (team) => set({ team }),
			setProgram: (program) => set({ program }),
			setAuth: (auth) => set({ auth }),
			setOnboarding: (key, value) =>
				set((s) => ({ onboarding: { ...s.onboarding, [key]: value } })),
			setCurrentEvent: (event) => set((s) => ({ current: { ...s.current, event } })),
			addFavoriteTeam: (id) =>
				set((s) => ({
					favorites: { ...s.favorites, teams: [...new Set([...s.favorites.teams, id])] }
				})),
			removeFavoriteTeam: (id) =>
				set((s) => ({
					favorites: { ...s.favorites, teams: s.favorites.teams.filter((t) => t !== id) }
				})),
			addFavoriteEvent: (id) =>
				set((s) => ({
					favorites: { ...s.favorites, events: [...new Set([...s.favorites.events, id])] }
				})),
			removeFavoriteEvent: (id) =>
				set((s) => ({
					favorites: { ...s.favorites, events: s.favorites.events.filter((e) => e !== id) }
				})),
			setNote: (teamNumber, note) => set((s) => ({ notes: { ...s.notes, [teamNumber]: note } })),
			setAllNotes: (notes) => set({ notes }),
			setScoutingTeam: (scoutingTeam) => set({ scoutingTeam })
		}),
		{
			name: 'scoutr-storage',
			storage: createJSONStorage(() => AsyncStorage),
			onRehydrateStorage: () => (state) => {
				if (state) state._hydrated = true;
			}
		}
	)
);
