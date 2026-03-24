import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useStorage } from '../../lib/state/storage';

export default function AccountScreen() {
  const { auth, setAuth } = useStorage();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setAuth(null);
          router.replace('/onboarding');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Account</Text>

        {auth ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <User size={28} color={colors.foreground} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>
                {auth.user.user_metadata?.full_name ?? auth.user.email ?? 'User'}
              </Text>
              <Text style={styles.email}>{auth.user.email}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.noAccount}>Not signed in</Text>
          </View>
        )}

        {auth && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={18} color={colors.destructive} />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing['3xl'] },
  heading: { fontSize: font['2xl'], fontWeight: '600', color: colors.foreground, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
  email: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  noAccount: { color: colors.mutedForeground },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  signOutText: { fontSize: font.base, color: colors.destructive },
});
