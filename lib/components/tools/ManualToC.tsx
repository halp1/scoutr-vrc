import { useRef } from 'react';
import {
	Modal,
	View,
	Text,
	ScrollView,
	Pressable,
	StyleSheet,
	PanResponder,
	Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import type { ManualSection } from './gameManual';

interface Props {
	visible: boolean;
	onClose: () => void;
	sections: ManualSection[];
	onSelect: (sectionId: string, subsectionId?: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DISMISS_THRESHOLD = 80;

export const ManualToC = ({ visible, onClose, sections, onSelect }: Props) => {
	const insets = useSafeAreaInsets();
	const dragY = useRef(0);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
			onPanResponderMove: (_, gs) => {
				dragY.current = gs.dy;
			},
			onPanResponderRelease: (_, gs) => {
				if (gs.dy > DISMISS_THRESHOLD) {
					onClose();
				}
				dragY.current = 0;
			}
		})
	).current;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<Pressable style={styles.overlay} onPress={onClose} />
			<View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
				<View {...panResponder.panHandlers} style={styles.handleArea}>
					<View style={styles.handle} />
				</View>

				<View style={styles.sheetHeader}>
					<Text style={styles.sheetTitle}>Table of Contents</Text>
					<Pressable onPress={onClose} hitSlop={12}>
						<X size={20} color={colors.mutedForeground} strokeWidth={2} />
					</Pressable>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{sections.map((section) => (
						<View key={section.id} style={styles.sectionGroup}>
							<Pressable
								style={styles.sectionRow}
								onPress={() => {
									onSelect(section.id);
									onClose();
								}}
							>
								<Text style={styles.sectionTitle}>{section.title}</Text>
							</Pressable>

							{section.subsections.map((sub) => (
								<Pressable
									key={sub.id}
									style={styles.subsectionRow}
									onPress={() => {
										onSelect(section.id, sub.id);
										onClose();
									}}
								>
									<Text style={styles.subsectionTitle}>{sub.title}</Text>
								</Pressable>
							))}
						</View>
					))}
				</ScrollView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)'
	},
	sheet: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: SHEET_HEIGHT,
		backgroundColor: colors.card,
		borderTopLeftRadius: radius.xl,
		borderTopRightRadius: radius.xl,
		overflow: 'hidden'
	},
	handleArea: {
		alignItems: 'center',
		paddingTop: spacing.sm,
		paddingBottom: spacing.xs
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: radius.full,
		backgroundColor: colors.muted
	},
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.md
	},
	sheetTitle: {
		fontSize: font.lg,
		fontWeight: '700',
		color: colors.foreground
	},
	scroll: {
		flex: 1
	},
	scrollContent: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing['2xl']
	},
	sectionGroup: {
		marginBottom: spacing.sm
	},
	sectionRow: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: radius.md,
		backgroundColor: colors.muted
	},
	sectionTitle: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	subsectionRow: {
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.lg,
		marginTop: 2
	},
	subsectionTitle: {
		fontSize: font.sm,
		color: colors.mutedForeground
	}
});
