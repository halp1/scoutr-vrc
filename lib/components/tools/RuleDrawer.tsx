import { useRef, useState } from 'react';
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
import { X, BookOpen } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';
import type { ManualEntry } from './gameManual';
import { BlocksView, InlineText } from './BlockRenderer';
import { ImageViewerModal } from './ImageViewer';

interface Props {
	entry: ManualEntry | null;
	visible: boolean;
	onClose: () => void;
	onCrossRef: (code: string) => void;
	onQnaRef?: (id: string) => void;
	onNavigateToSource?: (entry: ManualEntry) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const DISMISS_THRESHOLD = 80;

export const RuleDrawer = ({
	entry,
	visible,
	onClose,
	onCrossRef,
	onQnaRef,
	onNavigateToSource
}: Props) => {
	const insets = useSafeAreaInsets();
	const dragY = useRef(0);
	const [imageViewer, setImageViewer] = useState<{
		src: string;
		alt: string;
		caption?: string;
	} | null>(null);

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
					{entry?.sourceId && onNavigateToSource ? (
						<Pressable
							onPress={() => onNavigateToSource(entry!)}
							hitSlop={12}
							style={styles.iconBtn}
						>
							<BookOpen size={18} color={colors.mutedForeground} strokeWidth={2} />
						</Pressable>
					) : null}
					<Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
						<X size={20} color={colors.mutedForeground} strokeWidth={2} />
					</Pressable>
				</View>

				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{entry?.summary ? <Text style={styles.summary}>{entry.summary}</Text> : null}

					{entry && entry.leadSpans.length > 0 ? (
						<InlineText
							spans={entry.leadSpans}
							onCrossRef={onCrossRef}
							onQnaRef={onQnaRef}
							style={styles.bodyContainer}
						/>
					) : null}

					{entry ? (
						<BlocksView
							blocks={entry.blocks}
							onCrossRef={onCrossRef}
							onQnaRef={onQnaRef}
							onImagePress={(src, alt, caption) => setImageViewer({ src, alt, caption })}
						/>
					) : null}
				</ScrollView>
			</View>
			{imageViewer ? (
				<ImageViewerModal
					src={imageViewer.src}
					alt={imageViewer.alt}
					caption={imageViewer.caption}
					onClose={() => setImageViewer(null)}
				/>
			) : null}
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
	iconBtn: {
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
