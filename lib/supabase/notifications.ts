import { supabase } from "./index";
import { Platform } from "react-native";

export const registerPushToken = async (token: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notification_tokens").upsert(
    {
      user_id: user.id,
      expo_push_token: token,
      platform: Platform.OS === "ios" ? "ios" : "android",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,expo_push_token" },
  );
};

export const addNotificationPreference = async (
  reTeamId: number,
  teamNumber: string,
  programId: number,
): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      re_team_id: reTeamId,
      team_number: teamNumber,
      program_id: programId,
    },
    { onConflict: "user_id,re_team_id" },
  );
};

export const removeNotificationPreference = async (reTeamId: number): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notification_preferences")
    .delete()
    .eq("user_id", user.id)
    .eq("re_team_id", reTeamId);
};

export const fetchNotificationPreferenceIds = async (): Promise<number[]> => {
  const { data } = await supabase.from("notification_preferences").select("re_team_id");
  return (data ?? []).map((r: any) => r.re_team_id as number);
};
