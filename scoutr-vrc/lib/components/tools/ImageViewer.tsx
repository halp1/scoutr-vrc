import { useEffect } from 'react';
import { BackHandler, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
	Extrapolation,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../../theme';

interface Props {
	src: string;
	alt: string;
	caption?: string;
	onClose: () => void;
}

export const ImageViewerModal = ({ src, alt, caption, onClose }: Props) => {
	const insets = useSafeAreaInsets();
	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const tx = useSharedValue(0);
	const ty = useSharedValue(0);
	const savedTx = useSharedValue(0);
	const savedTy = useSharedValue(0);
	const dismissY = useSharedValue(0);

	useEffect(() => {
		scale.value = 1;
		savedScale.value = 1;
		tx.value = 0;
		ty.value = 0;
		savedTx.value = 0;
		savedTy.value = 0;
		dismissY.value = 0;
	}, [src]);

	useEffect(() => {
		const sub = BackHandler.addEventListener('hardwareBackPress', () => {
			onClose();
			return true;
		});
		return () => sub.remove();
	}, [onClose]);

	const pinch = Gesture.Pinch()
		.onUpdate((e) => {
			scale.value = savedScale.value * e.scale;
		})
		.onEnd(() => {
			const clamped = Math.max(1, Math.min(5, scale.value));
			savedScale.value = clamped;
			scale.value = withSpring(clamped);
			if (clamped <= 1) {
				tx.value = withSpring(0);
				ty.value = withSpring(0);
				savedTx.value = 0;
				savedTy.value = 0;
			}
		});

	const pan = Gesture.Pan()
		.averageTouches(true)
		.onUpdate((e) => {
			if (savedScale.value <= 1) {
				dismissY.value = Math.max(0, e.translationY);
				return;
			}
			tx.value = savedTx.value + e.translationX;
			ty.value = savedTy.value + e.translationY;
		})
		.onEnd((e) => {
			if (savedScale.value <= 1) {
				if (e.translationY > 100 || e.velocityY > 800) {
					runOnJS(onClose)();
				} else {
					dismissY.value = withSpring(0);
				}
				return;
			}
			savedTx.value = tx.value;
			savedTy.value = ty.value;
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.maxDistance(20)
		.onEnd(() => {
			scale.value = withSpring(1);
			savedScale.value = 1;
			tx.value = withSpring(0);
			ty.value = withSpring(0);
			savedTx.value = 0;
			savedTy.value = 0;
		});

	const singleTap = Gesture.Tap()
		.maxDistance(10)
		.onEnd(() => {
			runOnJS(onClose)();
		});

	const gesture = Gesture.Exclusive(doubleTap, singleTap, Gesture.Simultaneous(pan, pinch));

	const animStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: tx.value },
			{ translateY: ty.value + dismissY.value },
			{ scale: scale.value }
		]
	}));

	const bgStyle = useAnimatedStyle(() => ({
		opacity: interpolate(dismissY.value, [0, 300], [1, 0], Extrapolation.CLAMP)
	}));

	return (
		<Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
			<GestureHandlerRootView style={styles.root}>
				<Animated.View style={[StyleSheet.absoluteFill, styles.bg, bgStyle]} />
				<GestureDetector gesture={gesture}>
					<Animated.View style={[StyleSheet.absoluteFill, animStyle]} collapsable={false}>
						<Image
							source={{ uri: src }}
							style={styles.image}
							resizeMode="contain"
							accessibilityLabel={alt}
						/>
					</Animated.View>
				</GestureDetector>

				{caption ? (
					<View
						style={[styles.captionBar, { paddingBottom: insets.bottom + spacing.sm }]}
						pointerEvents="none"
					>
						<Text style={styles.captionText} numberOfLines={2}>
							{caption}
						</Text>
					</View>
				) : null}

				<Pressable
					style={[styles.closeBtn, { top: insets.top + spacing.sm }]}
					onPress={onClose}
					hitSlop={12}
				>
					<X size={20} color={colors.foreground} strokeWidth={2} />
				</Pressable>
			</GestureHandlerRootView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	bg: {
		backgroundColor: 'rgba(0,0,0,0.95)'
	},
	image: {
		flex: 1
	},
	captionBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: spacing['2xl'],
		paddingTop: spacing.sm,
		backgroundColor: 'rgba(0,0,0,0.5)'
	},
	captionText: {
		color: colors.foreground,
		fontSize: font.sm,
		textAlign: 'center'
	},
	closeBtn: {
		position: 'absolute',
		right: spacing['2xl'],
		padding: spacing.sm,
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: radius.full
	}
});
