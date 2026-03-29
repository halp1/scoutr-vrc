import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, font, spacing } from '../../lib/theme';
import { TeamProfileView } from '../../lib/components/TeamProfileView';

export default function TeamProfilePage() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const teamId = Number(id);

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} hitSlop={8}>
					<ArrowLeft size={22} color={colors.foreground} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Team Profile</Text>
				<View style={{ width: 22 }} />
			</View>
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<TeamProfileView teamId={teamId} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderBottomWidth: 1,
		borderBottomColor: colors.border
	},
	headerTitle: { fontSize: font.base, fontWeight: '600', color: colors.foreground },
	scroll: { flex: 1 },
	content: { padding: spacing.md, paddingBottom: spacing['3xl'] }
});
