import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useStorage } from "../lib/state/storage";
import { colors } from "../lib/theme";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
  }>();
  const { setAuth, setOnboarding } = useStorage();

  useEffect(() => {
    const handle = async () => {
      const { code, access_token, refresh_token } = params;

      if (access_token && refresh_token) {
        const { data } = await supabase.auth.setSession({ access_token, refresh_token });
        if (data.session) {
          setAuth(data.session);
          setOnboarding("account", true);
          router.replace("/(tabs)");
        }
        return;
      }

      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        if (data.session) {
          setAuth(data.session);
          setOnboarding("account", true);
          router.replace("/(tabs)");
        }
        return;
      }

      const url = Platform.OS !== "web" ? await Linking.getInitialURL() : null;
      if (!url) return;
      const fragment = url.split("#")[1] ?? "";
      const query = url.split("?")[1]?.split("#")[0] ?? "";
      const p = new URLSearchParams(fragment || query);
      const at = p.get("access_token");
      const rt = p.get("refresh_token");
      const c = p.get("code");
      if (at && rt) {
        const { data } = await supabase.auth.setSession({
          access_token: at,
          refresh_token: rt,
        });
        if (data.session) {
          setAuth(data.session);
          setOnboarding("account", true);
          router.replace("/(tabs)");
        }
      } else if (c) {
        const { data } = await supabase.auth.exchangeCodeForSession(c);
        if (data.session) {
          setAuth(data.session);
          setOnboarding("account", true);
          router.replace("/(tabs)");
        }
      }
    };

    handle();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
