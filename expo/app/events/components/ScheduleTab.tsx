import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, font } from '../../../lib/theme';
import { MatchRow } from './MatchRow';

type ScheduleRow = {
  group: 'practice' | 'qualifier' | 'elimination';
  match: string;
  time: string;
  score: string;
  red: string[];
  blue: string[];
  field?: string;
  played: boolean;
};

type ScheduleGroup = ScheduleRow['group'];

interface Props {
  rows: ScheduleRow[];
  onMatchSelect?: (row: ScheduleRow) => void;
}

export const ScheduleTab = ({ rows, onMatchSelect }: Props) => {
  const [expanded, setExpanded] = useState<Record<ScheduleGroup, boolean>>({
    practice: true,
    qualifier: true,
    elimination: true,
  });

  const groups: { key: ScheduleGroup; title: string }[] = [
    { key: 'practice', title: 'Practice' },
    { key: 'qualifier', title: 'Qualifications' },
    { key: 'elimination', title: 'Eliminations' },
  ];

  return (
    <View style={styles.container}>
      {groups.map(({ key, title }) => {
        const sectionRows = rows.filter((r) => r.group === key);
        if (sectionRows.length === 0) return null;
        const isOpen = expanded[key];
        return (
          <View key={key} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              <Text style={styles.sectionTitle}>{title}</Text>
              <ChevronDown
                size={18}
                color={colors.mutedForeground}
                style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}
              />
            </TouchableOpacity>
            {isOpen &&
              sectionRows.map((row, i) => (
                <TouchableOpacity key={i} onPress={() => onMatchSelect?.(row)}>
                  <MatchRow row={row} />
                </TouchableOpacity>
              ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  section: { gap: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: font.lg, fontWeight: '600', color: colors.foreground },
});
