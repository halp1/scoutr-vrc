import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Session } from "@supabase/supabase-js";

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
  scoutingTeams: { id: string; name: string }[];
  qnaPrograms: string[];
  notifications: {
    myTeam: boolean;
    favorites: number[];
  };
}

interface AppState extends AppStorage {
  _hydrated: boolean;
  setTeam: (team: string | null) => void;
  setProgram: (program: number | null) => void;
  setAuth: (auth: Session | null) => void;
  setOnboarding: (key: keyof AppStorage["onboarding"], value: boolean) => void;
  setCurrentEvent: (event: number | null) => void;
  addFavoriteTeam: (id: number) => void;
  removeFavoriteTeam: (id: number) => void;
  addFavoriteEvent: (id: number) => void;
  removeFavoriteEvent: (id: number) => void;
  reorderFavoriteTeams: (ids: number[]) => void;
  setNote: (teamNumber: string, note: string) => void;
  setAllNotes: (notes: Record<string, string>) => void;
  setScoutingTeams: (teams: { id: string; name: string }[]) => void;
  addScoutingTeam: (team: { id: string; name: string }) => void;
  removeScoutingTeam: (teamId: string) => void;
  setQnaPrograms: (programs: string[]) => void;
  setNotificationMyTeam: (enabled: boolean) => void;
  toggleNotificationFavorite: (teamId: number) => void;
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
      scoutingTeams: [],
      qnaPrograms: ["v5rc", "vurc", "judging"],
      notifications: { myTeam: false, favorites: [] },
      _hydrated: false,

      setTeam: (team) => set({ team }),
      setProgram: (program) => set({ program }),
      setAuth: (auth) => set({ auth }),
      setOnboarding: (key, value) =>
        set((s) => ({ onboarding: { ...s.onboarding, [key]: value } })),
      setCurrentEvent: (event) => set((s) => ({ current: { ...s.current, event } })),
      addFavoriteTeam: (id) =>
        set((s) => ({
          favorites: { ...s.favorites, teams: [...new Set([...s.favorites.teams, id])] },
        })),
      removeFavoriteTeam: (id) =>
        set((s) => ({
          favorites: { ...s.favorites, teams: s.favorites.teams.filter((t) => t !== id) },
        })),
      addFavoriteEvent: (id) =>
        set((s) => ({
          favorites: {
            ...s.favorites,
            events: [...new Set([...s.favorites.events, id])],
          },
        })),
      removeFavoriteEvent: (id) =>
        set((s) => ({
          favorites: {
            ...s.favorites,
            events: s.favorites.events.filter((e) => e !== id),
          },
        })),
      reorderFavoriteTeams: (ids) =>
        set((s) => ({ favorites: { ...s.favorites, teams: ids } })),
      setNote: (teamNumber, note) =>
        set((s) => ({ notes: { ...s.notes, [teamNumber]: note } })),
      setAllNotes: (notes) => set({ notes }),
      setScoutingTeams: (scoutingTeams) => set({ scoutingTeams }),
      addScoutingTeam: (team) =>
        set((s) => ({
          scoutingTeams: s.scoutingTeams.some((t) => t.id === team.id)
            ? s.scoutingTeams
            : [...s.scoutingTeams, team],
        })),
      removeScoutingTeam: (teamId) =>
        set((s) => ({ scoutingTeams: s.scoutingTeams.filter((t) => t.id !== teamId) })),
      setQnaPrograms: (programs) => set({ qnaPrograms: programs }),
      setNotificationMyTeam: (enabled) =>
        set((s) => ({ notifications: { ...s.notifications, myTeam: enabled } })),
      toggleNotificationFavorite: (teamId) =>
        set((s) => ({
          notifications: {
            ...s.notifications,
            favorites: s.notifications.favorites.includes(teamId)
              ? s.notifications.favorites.filter((id) => id !== teamId)
              : [...s.notifications.favorites, teamId],
          },
        })),
    }),
    {
      name: "scoutr-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    },
  ),
);
