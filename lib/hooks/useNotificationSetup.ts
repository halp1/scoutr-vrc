import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { useStorage } from "../state/storage";
import { re } from "../robotevents";
import {
  requestNotificationPermission,
  getExpoPushToken,
  setupNotificationChannels,
} from "../notifications";
import {
  registerPushToken,
  addNotificationPreference,
  removeNotificationPreference,
  fetchNotificationPreferenceIds,
} from "../supabase/notifications";

export const useNotificationSetup = () => {
  const auth = useStorage((s) => s.auth);
  const team = useStorage((s) => s.team);
  const program = useStorage((s) => s.program);
  const notifications = useStorage((s) => s.notifications);

  const prevNotificationsRef = useRef(notifications);
  const tokenRef = useRef<string | null>(null);
  const teamIdCacheRef = useRef<{ number: string; id: number } | null>(null);

  useEffect(() => {
    setupNotificationChannels();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  const resolveMyTeamId = async (): Promise<{
    id: number;
    number: string;
    programId: number;
  } | null> => {
    if (!team || !program) return null;
    if (teamIdCacheRef.current?.number === team) {
      return { id: teamIdCacheRef.current.id, number: team, programId: program };
    }
    try {
      const results = await re.depaginate(
        re.team.teamGetTeams({ number: [team], program: [program] }),
        re.models.PaginatedTeamFromJSON,
      );
      const found =
        results.find((t) => t.number.toLowerCase() === team.toLowerCase()) ?? results[0];
      if (!found) return null;
      teamIdCacheRef.current = { number: team, id: found.id };
      return { id: found.id, number: found.number, programId: program };
    } catch {
      return null;
    }
  };

  const ensureToken = async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current;
    const token = await getExpoPushToken();
    if (token) {
      tokenRef.current = token;
      await registerPushToken(token);
    }
    return token;
  };

  useEffect(() => {
    if (!auth) return;

    const prev = prevNotificationsRef.current;
    const curr = notifications;
    prevNotificationsRef.current = curr;

    const sync = async () => {
      const myTeamEnabled = curr.myTeam;
      const prevMyTeamEnabled = prev.myTeam;

      if (myTeamEnabled !== prevMyTeamEnabled) {
        if (myTeamEnabled) {
          const resolved = await resolveMyTeamId();
          if (resolved) {
            await ensureToken();
            await addNotificationPreference(
              resolved.id,
              resolved.number,
              resolved.programId,
            );
          }
        } else {
          const resolved = await resolveMyTeamId();
          if (resolved) await removeNotificationPreference(resolved.id);
        }
      }

      const added = curr.favorites.filter((id) => !prev.favorites.includes(id));
      const removed = prev.favorites.filter((id) => !curr.favorites.includes(id));

      if (added.length > 0 || removed.length > 0) {
        await ensureToken();
      }

      for (const id of removed) {
        await removeNotificationPreference(id);
      }
    };

    sync();
  }, [auth, notifications]);

  useEffect(() => {
    if (!auth) return;

    const reconcile = async () => {
      try {
        const serverIds = await fetchNotificationPreferenceIds();
        const localIds: number[] = [...notifications.favorites];

        const myTeamResolved = notifications.myTeam ? await resolveMyTeamId() : null;
        if (myTeamResolved) localIds.push(myTeamResolved.id);

        const missing = localIds.filter((id) => !serverIds.includes(id));
        if (missing.length > 0) {
          await ensureToken();
        }

        for (const id of missing) {
          if (myTeamResolved && id === myTeamResolved.id) {
            await addNotificationPreference(
              id,
              myTeamResolved.number,
              myTeamResolved.programId,
            );
          } else {
            const favIdx = notifications.favorites.indexOf(id);
            if (favIdx !== -1) {
              try {
                const teamData = await re.team.teamGetTeam({ id });
                await addNotificationPreference(id, teamData.number, teamData.program.id);
              } catch {}
            }
          }
        }
      } catch {}
    };

    reconcile();
  }, [auth?.user?.id]);
};

export const requestAndStoreToken = async (): Promise<boolean> => {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  const token = await getExpoPushToken();
  if (token) await registerPushToken(token);
  return true;
};
