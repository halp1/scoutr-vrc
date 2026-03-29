import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import { colors, font, spacing, radius } from '../theme';
import { re } from '../robotevents';
import type { Team } from '../robotevents/robotevents/models';

interface Props {
	teamId: number;
	drag: () => void;
	isActive: boolean;
}

export const DragTeamRow = ({ teamId, drag, isActive }: Props) => {
	const [team, setTeam] = useState<Team | null>(null);

	useEffect(() => {
		re.team.teamGetTeam({ id: teamId }).then(setTeam);
	}, [teamId]);

	return (
		<ScaleDecorator>
			<View style={[styles.row, isActive && styles.rowActive]}>
				<View style={styles.info}>
					<Text style={styles.number}>{team?.number ?? '…'}</Text>
					{team?.teamName ? (
						<Text style={styles.name} numberOfLines={1}>
							{team.teamName}
						</Text>
					) : null}
				</View>
				<TouchableOpacity onPressIn={drag} hitSlop={8} style={styles.handle}>
					<GripVertical size={20} color={colors.mutedForeground} />
				</TouchableOpacity>
			</View>
		</ScaleDecorator>
	);
};

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		gap: 8
	},
	rowActive: {
		borderColor: colors.primary,
		shadowColor: colors.primary,
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4
	},
	info: { flex: 1 },
	number: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
	name: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	handle: { padding: 4 }
});
