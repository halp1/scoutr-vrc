import { useRef } from 'react';
import {
	Modal,
	View,
	Text,
	ScrollView,
	Pressable,
	Image,
	StyleSheet,
	PanResponder,
	Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import type { ManualEntry } from './gameManual';

interface Props {
	entry: ManualEntry | null;
	visible: boolean;
	onClose: () => void;
	onCrossRef: (code: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const DISMISS_THRESHOLD = 80;
const INLINE_RULE_SPLIT = /(<[A-Z]+\d+[A-Za-z]*>)/g;

const renderBody = (body: string, onCrossRef: (code: string) => void): React.ReactNode[] => {
	const parts = body.split(INLINE_RULE_SPLIT);
	return parts.map((part, i) => {
		const match = part.match(/^<([A-Z]+\d+[A-Za-z]*)>$/);
		if (match) {
			return (
				<Text key={i} style={styles.crossRef} onPress={() => onCrossRef(match[1])}>
					{part}
				</Text>
			);
		}
		return (
			<Text key={i} style={styles.bodyText}>
				{part}
			</Text>
		);
	});
};

export const RuleDrawer = ({ entry, visible, onClose, onCrossRef }: Props) => {
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

	const label = entry?.code ?? entry?.term ?? '';
	const isRule = !!entry?.code;

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
					{label ? (
						<View style={[styles.badge, isRule ? styles.badgeRule : styles.badgeTerm]}>
							<Text style={styles.badgeText}>{label}</Text>
						</View>
					) : null}
					<Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
						<X size={20} color={colors.mutedForeground} strokeWidth={2} />
					</Pressable>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{entry?.summary ? <Text style={styles.summary}>{entry.summary}</Text> : null}

					{entry?.body ? (
						<Text style={styles.bodyContainer}>{renderBody(entry.body, onCrossRef)}</Text>
					) : null}

					{entry?.images?.map((img, i) => (
						<View key={i} style={styles.imageContainer}>
							<Image source={{ uri: img.src }} style={styles.image} resizeMode="contain" />
							{img.caption ? <Text style={styles.caption}>{img.caption}</Text> : null}
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
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.sm,
		gap: spacing.sm
	},
	badge: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: radius.full,
		flex: 1
	},
	badgeRule: {
		backgroundColor: colors.primary
	},
	badgeTerm: {
		backgroundColor: colors.muted
	},
	badgeText: {
		fontSize: font.base,
		fontWeight: '700',
		color: colors.foreground
	},
	closeBtn: {
		padding: spacing.xs
	},
	scroll: {
		flex: 1
	},
	scrollContent: {
		paddingHorizontal: spacing['2xl'],
		paddingBottom: spacing['2xl'],
		gap: spacing.md
	},
	summary: {
		fontSize: font.md,
		fontWeight: '600',
		color: colors.foreground,
		lineHeight: 24
	},
	bodyContainer: {
		fontSize: font.base,
		color: colors.foreground,
		lineHeight: 22
	},
	bodyText: {
		fontSize: font.base,
		color: colors.foreground,
		lineHeight: 22
	},
	crossRef: {
		fontSize: font.base,
		color: colors.primary,
		fontWeight: '600'
	},
	imageContainer: {
		marginTop: spacing.sm,
		alignItems: 'center'
	},
	image: {
		width: '100%',
		height: 200
	},
	caption: {
		fontSize: font.sm,
		color: colors.mutedForeground,
		textAlign: 'center',
		marginTop: spacing.xs
	}
});
