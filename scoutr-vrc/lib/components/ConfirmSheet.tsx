import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Props {
	visible: boolean;
	title: string;
	body: string;
	cancelLabel?: string;
	confirmLabel?: string;
	destructive?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export const ConfirmSheet = ({
	visible,
	title,
	body,
	cancelLabel = 'Cancel',
	confirmLabel = 'Confirm',
	destructive = false,
	onCancel,
	onConfirm
}: Props) => (
	<Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
		<Pressable style={styles.overlay} onPress={onCancel}>
			<Pressable style={styles.sheet}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.body}>{body}</Text>
				<View style={styles.actions}>
					<Pressable style={styles.cancelBtn} onPress={onCancel}>
						<Text style={styles.cancelText}>{cancelLabel}</Text>
					</Pressable>
					<Pressable
						style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
						onPress={onConfirm}
					>
						<Text style={[styles.confirmText, destructive && styles.confirmTextDestructive]}>
							{confirmLabel}
						</Text>
					</Pressable>
				</View>
			</Pressable>
		</Pressable>
	</Modal>
);

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end'
	},
	sheet: {
		backgroundColor: colors.card,
		borderTopLeftRadius: radius.xl,
		borderTopRightRadius: radius.xl,
		padding: spacing.xl,
		gap: spacing.md
	},
	title: {
		fontSize: font.lg,
		fontWeight: '700',
		color: colors.foreground
	},
	body: {
		fontSize: font.base,
		color: colors.mutedForeground,
		lineHeight: 22
	},
	actions: {
		flexDirection: 'row',
		gap: spacing.sm
	},
	cancelBtn: {
		flex: 1,
		paddingVertical: spacing.md,
		backgroundColor: colors.muted,
		borderRadius: radius.md,
		alignItems: 'center'
	},
	cancelText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground
	},
	confirmBtn: {
		flex: 1,
		paddingVertical: spacing.md,
		backgroundColor: colors.primary,
		borderRadius: radius.md,
		alignItems: 'center'
	},
	confirmBtnDestructive: {
		backgroundColor: colors.destructive
	},
	confirmText: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.primaryForeground
	},
	confirmTextDestructive: {
		color: '#fff'
	}
});
