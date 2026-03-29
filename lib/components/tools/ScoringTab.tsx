import { useState, useMemo, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Plus, Minus, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../theme';

type Control = 'red' | 'none' | 'blue';
type NumKey = 'lg1Red' | 'lg1Blue' | 'lg2Red' | 'lg2Blue' | 'cuRed' | 'cuBlue' | 'clRed' | 'clBlue';

interface ScoreState {
	lg1Red: number;
	lg1Blue: number;
	lg1Control: Control;
	lg2Red: number;
	lg2Blue: number;
	lg2Control: Control;
	cuRed: number;
	cuBlue: number;
	clRed: number;
	clBlue: number;
	parkedRed: number;
	parkedBlue: number;
	autoRed: boolean;
	autoBlue: boolean;
}

const INIT: ScoreState = {
	lg1Red: 0,
	lg1Blue: 0,
	lg1Control: 'none',
	lg2Red: 0,
	lg2Blue: 0,
	lg2Control: 'none',
	cuRed: 0,
	cuBlue: 0,
	clRed: 0,
	clBlue: 0,
	parkedRed: 0,
	parkedBlue: 0,
	autoRed: false,
	autoBlue: false
};

const calcScore = (s: ScoreState, side: 'red' | 'blue'): number => {
	const r = side === 'red';
	const blocks = r
		? s.lg1Red + s.lg2Red + s.cuRed + s.clRed
		: s.lg1Blue + s.lg2Blue + s.cuBlue + s.clBlue;
	return (
		blocks * 3 +
		(s.lg1Control === side ? 10 : 0) +
		(s.lg2Control === side ? 10 : 0) +
		(r ? (s.cuRed > s.cuBlue ? 8 : 0) : s.cuBlue > s.cuRed ? 8 : 0) +
		(r ? (s.clRed > s.clBlue ? 6 : 0) : s.clBlue > s.clRed ? 6 : 0) +
		(r
			? s.parkedRed === 2
				? 30
				: s.parkedRed === 1
					? 8
					: 0
			: s.parkedBlue === 2
				? 30
				: s.parkedBlue === 1
					? 8
					: 0) +
		(s.autoRed && s.autoBlue ? 5 : r ? (s.autoRed ? 10 : 0) : s.autoBlue ? 10 : 0)
	);
};

const BASE_W = 390;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ctx = createContext<{ st: any; sz: number }>(null!);
const useSt = () => useContext(Ctx);

const RedBtn = ({
	onPress,
	disabled,
	icon
}: {
	onPress: () => void;
	disabled: boolean;
	icon: 'plus' | 'minus';
}) => {
	const { st, sz } = useSt();
	return (
		<TouchableOpacity
			style={[st.btn, st.btnRed, disabled && st.btnGhost]}
			onPress={onPress}
			disabled={disabled}
			hitSlop={{ top: 4, bottom: 4, left: 32, right: 32 }}
		>
			{icon === 'plus' ? (
				<Plus size={sz} color={colors.background} strokeWidth={3} />
			) : (
				<Minus size={sz} color={colors.background} strokeWidth={3} />
			)}
		</TouchableOpacity>
	);
};

const BlueBtn = ({
	onPress,
	disabled,
	icon
}: {
	onPress: () => void;
	disabled: boolean;
	icon: 'plus' | 'minus';
}) => {
	const { st, sz } = useSt();
	return (
		<TouchableOpacity
			style={[st.btn, st.btnBlue, disabled && st.btnGhost]}
			onPress={onPress}
			disabled={disabled}
			hitSlop={{ top: 4, bottom: 4, left: 32, right: 32 }}
		>
			{icon === 'plus' ? (
				<Plus size={sz} color={colors.background} strokeWidth={3} />
			) : (
				<Minus size={sz} color={colors.background} strokeWidth={3} />
			)}
		</TouchableOpacity>
	);
};

const RedCounter = ({
	v,
	onInc,
	onDec,
	disabledInc = false
}: {
	v: number;
	onInc: () => void;
	onDec: () => void;
	disabledInc?: boolean;
}) => {
	const { st } = useSt();
	return (
		<View style={st.counter}>
			<RedBtn onPress={onInc} disabled={disabledInc} icon="plus" />
			<Text allowFontScaling={false} style={st.countTxt}>
				{v}
			</Text>
			<RedBtn onPress={onDec} disabled={v === 0} icon="minus" />
		</View>
	);
};

const BlueCounter = ({
	v,
	onInc,
	onDec,
	disabledInc = false
}: {
	v: number;
	onInc: () => void;
	onDec: () => void;
	disabledInc?: boolean;
}) => {
	const { st } = useSt();
	return (
		<View style={st.counter}>
			<BlueBtn onPress={onInc} disabled={disabledInc} icon="plus" />
			<Text allowFontScaling={false} style={st.countTxt}>
				{v}
			</Text>
			<BlueBtn onPress={onDec} disabled={v === 0} icon="minus" />
		</View>
	);
};

const LongGoalIcon = () => {
	const { st } = useSt();
	return (
		<View style={st.lgIcon}>
			<View style={st.lgTop} />
			<View style={st.lgSupportRow}>
				<View style={st.lgSupportBlock} />
				<View style={st.lgSupportBlock} />
			</View>
			<View style={st.lgLegRow}>
				<View style={st.lgLeg} />
				<View style={st.lgLeg} />
			</View>
		</View>
	);
};

const ControlToggle = ({ value, onChange }: { value: Control; onChange: (v: Control) => void }) => {
	const { st, sz } = useSt();
	const iconSz = Math.round(sz * 0.88);
	return (
		<View style={st.toggle}>
			<TouchableOpacity
				style={[st.toggleSeg, st.toggleSegLeft, value === 'red' && st.toggleSegRedActive]}
				onPress={() => onChange(value === 'red' ? 'none' : 'red')}
			>
				<ChevronLeft
					size={iconSz}
					strokeWidth={2.5}
					color={value === 'red' ? colors.background : colors.mutedForeground}
				/>
			</TouchableOpacity>
			<TouchableOpacity
				style={[st.toggleSeg, value === 'none' && st.toggleSegNoneActive]}
				onPress={() => onChange('none')}
			>
				<X
					size={iconSz}
					strokeWidth={2.5}
					color={value === 'none' ? colors.foreground : colors.mutedForeground}
				/>
			</TouchableOpacity>
			<TouchableOpacity
				style={[st.toggleSeg, st.toggleSegRight, value === 'blue' && st.toggleSegBlueActive]}
				onPress={() => onChange(value === 'blue' ? 'none' : 'blue')}
			>
				<ChevronRight
					size={iconSz}
					strokeWidth={2.5}
					color={value === 'blue' ? colors.background : colors.mutedForeground}
				/>
			</TouchableOpacity>
		</View>
	);
};

const CenterGoalUnit = ({ flipped = false, color }: { flipped?: boolean; color?: string }) => {
	const { st } = useSt();
	return (
		<View style={[st.cgUnit, flipped && { transform: [{ scaleY: -1 }] }]}>
			<View style={[st.cgTop, color ? { backgroundColor: color } : undefined]} />
		</View>
	);
};

const CenterGoalIcon = ({
	cuRed,
	cuBlue,
	clRed,
	clBlue
}: {
	cuRed: number;
	cuBlue: number;
	clRed: number;
	clBlue: number;
}) => {
	const { st } = useSt();
	const upperColor = cuRed > cuBlue ? colors.red : cuBlue > cuRed ? colors.blue : undefined;
	const lowerColor = clRed > clBlue ? colors.red : clBlue > clRed ? colors.blue : undefined;
	return (
		<View style={st.cgIcon}>
			<CenterGoalUnit flipped color={upperColor} />
			<View style={st.cgPost} />
			<CenterGoalUnit color={lowerColor} />
		</View>
	);
};

const RobotDiamond = ({ color }: { color: string }) => {
	const { st } = useSt();
	return (
		<View style={st.diamondOuter}>
			<View style={[st.diamond, { borderColor: color }]}>
				<View style={{ transform: [{ rotate: '-45deg' }] }}>
					<View style={st.robotBody}>
						<View style={[st.robotWheel, { borderColor: color }]} />
						<View style={st.robotGap} />
						<View style={[st.robotWheel, { borderColor: color }]} />
					</View>
				</View>
			</View>
		</View>
	);
};

export const ScoringTab = () => {
	const [s, setS] = useState<ScoreState>(INIT);
	const { width: w } = useWindowDimensions();
	const sz = Math.max(12, Math.round(18 * (w / BASE_W)));
	const st = useMemo(() => makeStyles(w), [w]);

	const GOAL_CAPS: Record<NumKey, { cap: number; pair: NumKey }> = {
		lg1Red: { cap: 15, pair: 'lg1Blue' },
		lg1Blue: { cap: 15, pair: 'lg1Red' },
		lg2Red: { cap: 15, pair: 'lg2Blue' },
		lg2Blue: { cap: 15, pair: 'lg2Red' },
		cuRed: { cap: 7, pair: 'cuBlue' },
		cuBlue: { cap: 7, pair: 'cuRed' },
		clRed: { cap: 7, pair: 'clBlue' },
		clBlue: { cap: 7, pair: 'clRed' }
	};
	const canInc = (p: ScoreState, k: NumKey) => {
		const { cap, pair } = GOAL_CAPS[k];
		const total = (p[k] as number) + (p[pair] as number);
		return total < cap || (p[pair] as number) > 0;
	};
	const inc = (k: NumKey) =>
		setS((p) => {
			const { cap, pair } = GOAL_CAPS[k];
			const total = (p[k] as number) + (p[pair] as number);
			if (total < cap) return { ...p, [k]: (p[k] as number) + 1 };
			if ((p[pair] as number) > 0)
				return { ...p, [k]: (p[k] as number) + 1, [pair]: (p[pair] as number) - 1 };
			return p;
		});
	const dec = (k: NumKey) => setS((p) => ({ ...p, [k]: Math.max(0, (p[k] as number) - 1) }));
	const setCtrl = (k: 'lg1Control' | 'lg2Control') => (v: Control) =>
		setS((p) => ({ ...p, [k]: v }));
	const incPark = (side: 'red' | 'blue') =>
		setS((p) => {
			const k = side === 'red' ? 'parkedRed' : 'parkedBlue';
			return { ...p, [k]: Math.min(2, p[k] + 1) };
		});
	const decPark = (side: 'red' | 'blue') =>
		setS((p) => {
			const k = side === 'red' ? 'parkedRed' : 'parkedBlue';
			return { ...p, [k]: Math.max(0, p[k] - 1) };
		});
	const toggleAuto = (side: 'red' | 'blue') =>
		setS((p) => (side === 'red' ? { ...p, autoRed: !p.autoRed } : { ...p, autoBlue: !p.autoBlue }));

	const redScore = calcScore(s, 'red');
	const blueScore = calcScore(s, 'blue');

	return (
		<Ctx.Provider value={{ st, sz }}>
			<View style={st.root}>
				{/* ── Score Bar ── */}
				<View style={st.scoreBar}>
					<Text allowFontScaling={false} style={st.scoreNum}>
						{redScore}
					</Text>
					<View style={st.scoreMid}>
						<TouchableOpacity
							style={[st.autoBadge, st.autoBadgeRed, s.autoRed && st.autoBadgeRedActive]}
							onPress={() => toggleAuto('red')}
						>
							<Text
								allowFontScaling={false}
								style={[st.autoBadgeTxt, { color: s.autoRed ? colors.background : colors.red }]}
							>
								A
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[st.autoBadge, st.autoBadgeBlue, s.autoBlue && st.autoBadgeBlueActive]}
							onPress={() => toggleAuto('blue')}
						>
							<Text
								allowFontScaling={false}
								style={[st.autoBadgeTxt, { color: s.autoBlue ? colors.background : colors.blue }]}
							>
								A
							</Text>
						</TouchableOpacity>
					</View>
					<Text allowFontScaling={false} style={st.scoreNum}>
						{blueScore}
					</Text>
				</View>

				{/* ── Long Goal 1 ── */}
				<View style={[st.lgRow, st.rowBgDark]}>
					<RedCounter
						v={s.lg1Red}
						onInc={() => inc('lg1Red')}
						onDec={() => dec('lg1Red')}
						disabledInc={!canInc(s, 'lg1Red')}
					/>
					<View style={st.goalCenter}>
						<LongGoalIcon />
						<ControlToggle value={s.lg1Control} onChange={setCtrl('lg1Control')} />
					</View>
					<BlueCounter
						v={s.lg1Blue}
						onInc={() => inc('lg1Blue')}
						onDec={() => dec('lg1Blue')}
						disabledInc={!canInc(s, 'lg1Blue')}
					/>
				</View>

				{/* ── Long Goal 2 ── */}
				<View style={[st.lgRow, st.rowBgLight]}>
					<RedCounter
						v={s.lg2Red}
						onInc={() => inc('lg2Red')}
						onDec={() => dec('lg2Red')}
						disabledInc={!canInc(s, 'lg2Red')}
					/>
					<View style={st.goalCenter}>
						<LongGoalIcon />
						<ControlToggle value={s.lg2Control} onChange={setCtrl('lg2Control')} />
					</View>
					<BlueCounter
						v={s.lg2Blue}
						onInc={() => inc('lg2Blue')}
						onDec={() => dec('lg2Blue')}
						disabledInc={!canInc(s, 'lg2Blue')}
					/>
				</View>

				{/* ── Center Goals ── */}
				<View style={[st.cgRow, st.rowBgMid]}>
					<View style={st.cgSide}>
						<RedCounter
							v={s.cuRed}
							onInc={() => inc('cuRed')}
							onDec={() => dec('cuRed')}
							disabledInc={!canInc(s, 'cuRed')}
						/>
						<View style={st.cgDivider} />
						<RedCounter
							v={s.clRed}
							onInc={() => inc('clRed')}
							onDec={() => dec('clRed')}
							disabledInc={!canInc(s, 'clRed')}
						/>
					</View>
					<View style={st.cgIconCol}>
						<CenterGoalIcon cuRed={s.cuRed} cuBlue={s.cuBlue} clRed={s.clRed} clBlue={s.clBlue} />
					</View>
					<View style={st.cgSide}>
						<BlueCounter
							v={s.cuBlue}
							onInc={() => inc('cuBlue')}
							onDec={() => dec('cuBlue')}
							disabledInc={!canInc(s, 'cuBlue')}
						/>
						<View style={st.cgDivider} />
						<BlueCounter
							v={s.clBlue}
							onInc={() => inc('clBlue')}
							onDec={() => dec('clBlue')}
							disabledInc={!canInc(s, 'clBlue')}
						/>
					</View>
				</View>

				{/* ── Parking ── */}
				<View style={[st.parkRow, st.rowBgDark]}>
					<View style={st.parkSide}>
						<View style={st.parkBtns}>
							<RedBtn onPress={() => incPark('red')} disabled={s.parkedRed === 2} icon="plus" />
							<Text allowFontScaling={false} style={st.countTxt}>
								{s.parkedRed}
							</Text>
							<RedBtn onPress={() => decPark('red')} disabled={s.parkedRed === 0} icon="minus" />
						</View>
						<RobotDiamond color={colors.red} />
					</View>
					<View style={st.parkSide}>
						<RobotDiamond color={colors.blue} />
						<View style={st.parkBtns}>
							<BlueBtn onPress={() => incPark('blue')} disabled={s.parkedBlue === 2} icon="plus" />
							<Text allowFontScaling={false} style={st.countTxt}>
								{s.parkedBlue}
							</Text>
							<BlueBtn onPress={() => decPark('blue')} disabled={s.parkedBlue === 0} icon="minus" />
						</View>
					</View>
				</View>
			</View>
		</Ctx.Provider>
	);
};

const SUPPORT_COLOR = '#c27300';

const makeStyles = (w: number) => {
	const s = w / BASE_W;
	const sc = (v: number) => Math.round(v * s);
	return StyleSheet.create({
		root: { flex: 1, backgroundColor: colors.background },
		content: { flexGrow: 1 },

		// Score bar
		scoreBar: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingHorizontal: spacing['2xl'],
			paddingVertical: spacing.md,
			backgroundColor: colors.muted
		},
		scoreNum: {
			fontSize: sc(font['3xl']),
			fontWeight: '700',
			color: colors.foreground,
			minWidth: sc(48),
			textAlign: 'center'
		},
		scoreMid: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.sm
		},
		autoBadge: {
			width: sc(40),
			height: sc(40),
			borderWidth: 2,
			alignItems: 'center',
			justifyContent: 'center'
		},
		autoBadgeRed: {
			borderColor: colors.red,
			borderRadius: radius.full
		},
		autoBadgeBlue: {
			borderColor: colors.blue,
			borderRadius: radius.sm
		},
		autoBadgeRedActive: { backgroundColor: colors.red },
		autoBadgeBlueActive: { backgroundColor: colors.blue },
		autoBadgeTxt: {
			fontSize: sc(font.lg),
			fontWeight: '700'
		},

		// Row backgrounds
		rowBgDark: { backgroundColor: colors.card },
		rowBgLight: { backgroundColor: '#222225' },
		rowBgMid: { backgroundColor: '#1c1c1f' },

		// Counter column
		counter: {
			flex: 1,
			flexDirection: 'column',
			alignItems: 'stretch',
			justifyContent: 'center',
			paddingVertical: spacing.xs
		},
		countTxt: {
			fontSize: sc(font.lg),
			fontWeight: '600',
			color: colors.foreground,
			minWidth: sc(26),
			textAlign: 'center'
		},

		// Buttons
		btn: {
			alignSelf: 'stretch',
			minHeight: sc(36),
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: spacing.xs,
			paddingHorizontal: spacing.sm
		},
		btnRed: {
			backgroundColor: colors.red,
			borderRadius: radius.full
		},
		btnBlue: {
			backgroundColor: colors.blue,
			borderRadius: radius.sm
		},
		btnGhost: { opacity: 0.25 },
		btnTxt: {
			fontSize: sc(font.xl),
			fontWeight: '700',
			color: colors.background
		},
		btnTxtGhost: {},

		// Long goal row
		lgRow: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: spacing.md
		},
		goalCenter: {
			flex: 1,
			alignItems: 'center',
			gap: spacing.xs
		},

		// Long goal icon
		lgIcon: { alignItems: 'center' },
		lgTop: {
			width: sc(72),
			height: sc(8),
			backgroundColor: colors.mutedForeground,
			borderRadius: 2
		},
		lgSupportRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			width: sc(68),
			marginTop: 2
		},
		lgLegRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			width: sc(68)
		},
		lgSupportBlock: {
			width: sc(14),
			height: sc(7),
			backgroundColor: SUPPORT_COLOR,
			borderRadius: 1
		},
		lgLeg: {
			width: sc(5),
			height: sc(10),
			backgroundColor: SUPPORT_COLOR,
			borderRadius: 1
		},

		// Control zone toggle
		toggle: {
			flexDirection: 'row',
			borderRadius: radius.sm,
			borderWidth: 1,
			borderColor: colors.border,
			overflow: 'hidden'
		},
		toggleSeg: {
			paddingHorizontal: spacing.md,
			paddingVertical: spacing.xs + 2,
			backgroundColor: colors.muted
		},
		toggleSegLeft: {
			borderRightWidth: 1,
			borderRightColor: colors.border
		},
		toggleSegRight: {
			borderLeftWidth: 1,
			borderLeftColor: colors.border
		},
		toggleSegRedActive: { backgroundColor: colors.red },
		toggleSegBlueActive: { backgroundColor: colors.blue },
		toggleSegNoneActive: { backgroundColor: colors.secondary },
		toggleTxt: {
			fontSize: sc(font.base),
			fontWeight: '600',
			color: colors.mutedForeground
		},
		toggleTxtOnColor: { color: colors.background },
		toggleTxtNoneActive: { color: colors.foreground },

		// Center goals section
		cgRow: {
			flex: 2,
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: spacing.md,
			paddingVertical: spacing.sm
		},
		cgSide: {
			flex: 1,
			alignItems: 'stretch',
			justifyContent: 'center',
			paddingHorizontal: spacing.sm
		},
		cgDivider: {
			width: '75%',
			height: 1,
			backgroundColor: colors.border,
			marginVertical: spacing.md
		},
		cgIconCol: {
			width: sc(96),
			alignItems: 'center',
			justifyContent: 'center'
		},
		cgIcon: { alignItems: 'center', gap: 0 },
		cgUnit: { alignItems: 'center' },
		cgTop: {
			width: sc(52),
			height: sc(8),
			backgroundColor: colors.mutedForeground,
			borderRadius: 2
		},
		cgSupportBlock: {
			width: sc(12),
			height: sc(7),
			backgroundColor: SUPPORT_COLOR,
			borderRadius: 1
		},
		cgPost: {
			width: sc(8),
			height: sc(14),
			backgroundColor: SUPPORT_COLOR,
			borderRadius: 2
		},

		// Parking row
		parkRow: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: spacing.md
		},
		parkSide: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: spacing.sm
		},
		parkBtns: {
			flexDirection: 'column',
			alignItems: 'stretch',
			gap: spacing.xs,
			minWidth: sc(80)
		},
		diamondOuter: {
			width: sc(44),
			height: sc(44),
			alignItems: 'center',
			justifyContent: 'center'
		},
		diamond: {
			width: sc(34),
			height: sc(34),
			borderWidth: 2.5,
			transform: [{ rotate: '45deg' }],
			alignItems: 'center',
			justifyContent: 'center'
		},
		robotBody: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		robotGap: { width: sc(10) },
		robotWheel: {
			width: sc(8),
			height: sc(8),
			borderRadius: sc(4),
			borderWidth: 2
		}
	});
};
