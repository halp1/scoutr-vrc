import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, Star } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { re } from '../../lib/robotevents';
import type { Event, Team } from '../../lib/robotevents/robotevents/models';
import { useStorage } from '../../lib/state/storage';

export default function FavoritesScreen() {
  const { favorites } = useStorage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (favorites.teams.length === 0 && favorites.events.length === 0) {
      setTeams([]);
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const [teamResults, eventResults] = await Promise.allSettled([
        Promise.all(favorites.teams.map((id) => re.team.teamGetTeam({ id }))),
        Promise.all(favorites.events.map((id) => re.events.eventGetEvent({ id }))),
      ]);

      if (cancelled) return;

      if (teamResults.status === 'fulfilled') setTeams(teamResults.value);
      if (eventResults.status === 'fulfilled') setEvents(eventResults.value);
      setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [favorites.teams.join(','), favorites.events.join(',')]);

  const isEmpty = favorites.teams.length === 0 && favorites.events.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Favorites</Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

        {!loading && isEmpty && (
          <View style={styles.emptyBox}>
            <Star size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Save teams and events to find them here.
            </Text>
          </View>
        )}

        {!loading && events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Events</Text>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, { marginBottom: 8 }]}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
                    <Text style={styles.eventMeta}>
                      {event.location?.city}, {event.location?.region}
                    </Text>
                  </View>
                  <ArrowRight size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && teams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Teams</Text>
            {teams.map((team) => (
              <View key={team.id} style={[styles.card, { marginBottom: 8 }]}>
                <Text style={styles.teamNum}>{team.number}</Text>
                <Text style={styles.teamName}>{team.teamName ?? team.organization ?? ''}</Text>
              </View>
            ))}
          </View>
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
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: font.sm,
    fontWeight: '500',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventName: { fontSize: font.base, fontWeight: '500', color: colors.foreground },
  eventMeta: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  teamNum: { fontSize: font.xl, fontWeight: '600', color: colors.foreground },
  teamName: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  emptyBox: { alignItems: 'center', marginTop: 64, gap: 8 },
  emptyText: { fontSize: font.lg, fontWeight: '500', color: colors.foreground },
  emptySubtext: { fontSize: font.sm, color: colors.mutedForeground, textAlign: 'center' },
});
