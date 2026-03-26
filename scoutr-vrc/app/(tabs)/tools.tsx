import { useRef, useCallback } from 'react';
import {
	Animated,
	View,
	Text,
	Pressable,
	ScrollView,
	StyleSheet,
	Dimensions,
	NativeScrollEvent,
	NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Calculator, Timer } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { GameManualTab } from '../../lib/components/tools/GameManualTab';
import { ScoringTab } from '../../lib/components/tools/ScoringTab';
import { TimerTab } from '../../lib/components/tools/TimerTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = (SCREEN_WIDTH - spacing.md * 2) / 3;

const tabs = ['manual', 'scoring', 'timer'] as const;
type ToolTab = (typeof tabs)[number];

const tabMeta: { key: ToolTab; label: string; icon: typeof BookOpen }[] = [
	{ key: 'manual', label: 'Game Manual', icon: BookOpen },
	{ key: 'scoring', label: 'Scoring', icon: Calculator },
	{ key: 'timer', label: 'Timer', icon: Timer }
];

export default function ToolsScreen() {
	const tabScrollRef = useRef<ScrollView>(null);
	const activeIndexRef = useRef(0);
	const scrollX = useRef(new Animated.Value(0)).current;

	const indicatorTranslateX = useRef(
		scrollX.interpolate({
			inputRange: [0, SCREEN_WIDTH * 2],
			outputRange: [0, TAB_WIDTH * 2],
			extrapolate: 'clamp'
		})
	).current;

	const tabOpacities = useRef(
		tabMeta.map((_, i) => ({
			active: scrollX.interpolate({
				inputRange: [(i - 0.5) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 0.5) * SCREEN_WIDTH],
				outputRange: [0, 1, 0],
				extrapolate: 'clamp'
			}),
			inactive: scrollX.interpolate({
				inputRange: [(i - 0.5) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 0.5) * SCREEN_WIDTH],
				outputRange: [1, 0, 1],
				extrapolate: 'clamp'
			})
		}))
	).current;

	const scrollHandler = useRef(
		Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
			useNativeDriver: true
		})
	).current;

	const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
		activeIndexRef.current = index;
	}, []);

	const goToTab = (index: number) => {
		activeIndexRef.current = index;
		(tabScrollRef.current as any)?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
	};

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<View style={styles.header}>
				<Text style={styles.title}>Tools</Text>
			</View>

			<View style={styles.tabBar}>
				<Animated.View
					style={[styles.tabIndicator, { transform: [{ translateX: indicatorTranslateX }] }]}
				/>
				{tabMeta.map((tab, i) => {
					const Icon = tab.icon;
					return (
						<Pressable key={tab.key} style={styles.tabBtn} onPress={() => goToTab(i)}>
							<View style={styles.tabIconContainer}>
								<Animated.View style={[styles.tabIconLayer, { opacity: tabOpacities[i].inactive }]}>
									<Icon size={22} color={colors.mutedForeground} strokeWidth={2.25} />
								</Animated.View>
								<Animated.View style={[styles.tabIconLayer, { opacity: tabOpacities[i].active }]}>
									<Icon size={22} color={colors.primary} strokeWidth={2.25} />
								</Animated.View>
							</View>
						</Pressable>
					);
				})}
			</View>

			<Animated.ScrollView
				ref={tabScrollRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={scrollHandler}
				onMomentumScrollEnd={onScrollEnd}
				style={styles.tabPages}
				decelerationRate="fast"
			>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<GameManualTab />
				</ScrollView>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<ScoringTab />
				</ScrollView>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<TimerTab />
				</ScrollView>
			</Animated.ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	header: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm
	},
	title: {
		fontSize: font['2xl'],
		fontWeight: '700',
		color: colors.foreground
	},
	tabBar: {
		flexDirection: 'row',
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		marginHorizontal: spacing.md,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden'
	},
	tabBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
	tabIconContainer: { width: 22, height: 22 },
	tabIconLayer: { position: 'absolute', top: 0, left: 0 },
	tabIndicator: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		width: TAB_WIDTH,
		backgroundColor: colors.primary + '25',
		borderRadius: radius.xl
	},
	tabPages: { flex: 1, marginTop: 8 },
	tabPage: { width: SCREEN_WIDTH },
	tabContent: {
		paddingHorizontal: spacing.md,
		paddingTop: spacing.md,
		paddingBottom: spacing['3xl']
	}
});
