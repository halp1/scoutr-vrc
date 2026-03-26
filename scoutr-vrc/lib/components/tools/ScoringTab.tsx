import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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

const RedBtn = ({
	onPress,
	disabled,
	label
}: {
	onPress: () => void;
	disabled: boolean;
	label: string;
}) => (
	<TouchableOpacity
		style={[st.btn, st.btnRed, disabled && st.btnGhost]}
		onPress={onPress}
		disabled={disabled}
	>
		<Text style={[st.btnTxt, disabled && st.btnTxtGhost]}>{label}</Text>
	</TouchableOpacity>
);

const BlueBtn = ({
	onPress,
	disabled,
	label
}: {
	onPress: () => void;
	disabled: boolean;
	label: string;
}) => (
	<TouchableOpacity
		style={[st.btn, st.btnBlue, disabled && st.btnGhost]}
		onPress={onPress}
		disabled={disabled}
	>
		<Text style={[st.btnTxt, disabled && st.btnTxtGhost]}>{label}</Text>
	</TouchableOpacity>
);

const RedCounter = ({ v, onInc, onDec }: { v: number; onInc: () => void; onDec: () => void }) => (
	<View style={st.counter}>
		<RedBtn onPress={onInc} disabled={false} label="+" />
		<Text style={st.countTxt}>{v}</Text>
		<RedBtn onPress={onDec} disabled={v === 0} label="−" />
	</View>
);

const BlueCounter = ({ v, onInc, onDec }: { v: number; onInc: () => void; onDec: () => void }) => (
	<View style={st.counter}>
		<BlueBtn onPress={onInc} disabled={false} label="+" />
		<Text style={st.countTxt}>{v}</Text>
		<BlueBtn onPress={onDec} disabled={v === 0} label="−" />
	</View>
);

const LongGoalIcon = () => (
	<View style={st.lgIcon}>
		<View style={st.lgTop} />
		<View
			style={{ flexDirection: 'row', justifyContent: 'space-between', width: 68, marginTop: 2 }}
		>
			<View style={st.lgSupportBlock} />
			<View style={st.lgSupportBlock} />
		</View>
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 68 }}>
			<View style={st.lgLeg} />
			<View style={st.lgLeg} />
		</View>
	</View>
);

const ControlToggle = ({ value, onChange }: { value: Control; onChange: (v: Control) => void }) => (
	<View style={st.toggle}>
		<TouchableOpacity
			style={[st.toggleSeg, st.toggleSegLeft, value === 'red' && st.toggleSegRedActive]}
			onPress={() => onChange(value === 'red' ? 'none' : 'red')}
		>
			<Text style={[st.toggleTxt, value === 'red' && st.toggleTxtOnColor]}>◁</Text>
		</TouchableOpacity>
		<TouchableOpacity
			style={[st.toggleSeg, value === 'none' && st.toggleSegNoneActive]}
			onPress={() => onChange('none')}
		>
			<Text style={[st.toggleTxt, value === 'none' && st.toggleTxtNoneActive]}>×</Text>
		</TouchableOpacity>
		<TouchableOpacity
			style={[st.toggleSeg, st.toggleSegRight, value === 'blue' && st.toggleSegBlueActive]}
			onPress={() => onChange(value === 'blue' ? 'none' : 'blue')}
		>
			<Text style={[st.toggleTxt, value === 'blue' && st.toggleTxtOnColor]}>▷</Text>
		</TouchableOpacity>
	</View>
);

const CenterGoalUnit = ({ flipped = false }: { flipped?: boolean }) => (
	<View style={[st.cgUnit, flipped && { transform: [{ scaleY: -1 }] }]}>
		<View style={st.cgTop} />
	</View>
);

const CenterGoalIcon = () => (
	<View style={st.cgIcon}>
		<CenterGoalUnit flipped />
		<View style={st.cgPost} />
		<CenterGoalUnit />
	</View>
);

const RobotDiamond = ({ color }: { color: string }) => (
	<View style={st.diamondOuter}>
		<View style={[st.diamond, { borderColor: color }]}>
			<View style={{ transform: [{ rotate: '-45deg' }] }}>
				<View style={st.robotBody}>
					<View style={[st.robotWheel, { borderColor: color }]} />
					<View style={{ width: 10 }} />
					<View style={[st.robotWheel, { borderColor: color }]} />
				</View>
			</View>
		</View>
	</View>
);

export const ScoringTab = () => {
	const [s, setS] = useState<ScoreState>(INIT);

	const inc = (k: NumKey) => setS((p) => ({ ...p, [k]: (p[k] as number) + 1 }));
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
		<ScrollView style={st.root} contentContainerStyle={st.content} bounces={false}>
			{/* ── Score Bar ── */}
			<View style={st.scoreBar}>
				<Text style={st.scoreNum}>{redScore}</Text>
				<View style={st.scoreMid}>
					<TouchableOpacity
						style={[st.autoBadge, st.autoBadgeRed, s.autoRed && st.autoBadgeRedActive]}
						onPress={() => toggleAuto('red')}
					>
						<Text style={[st.autoBadgeTxt, { color: s.autoRed ? colors.background : colors.red }]}>
							A
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[st.autoBadge, st.autoBadgeBlue, s.autoBlue && st.autoBadgeBlueActive]}
						onPress={() => toggleAuto('blue')}
					>
						<Text
							style={[st.autoBadgeTxt, { color: s.autoBlue ? colors.background : colors.blue }]}
						>
							A
						</Text>
					</TouchableOpacity>
				</View>
				<Text style={st.scoreNum}>{blueScore}</Text>
			</View>

			{/* ── Long Goal 1 ── */}
			<View style={[st.lgRow, st.rowBgDark]}>
				<RedCounter v={s.lg1Red} onInc={() => inc('lg1Red')} onDec={() => dec('lg1Red')} />
				<View style={st.goalCenter}>
					<LongGoalIcon />
					<ControlToggle value={s.lg1Control} onChange={setCtrl('lg1Control')} />
				</View>
				<BlueCounter v={s.lg1Blue} onInc={() => inc('lg1Blue')} onDec={() => dec('lg1Blue')} />
			</View>

			{/* ── Long Goal 2 ── */}
			<View style={[st.lgRow, st.rowBgLight]}>
				<RedCounter v={s.lg2Red} onInc={() => inc('lg2Red')} onDec={() => dec('lg2Red')} />
				<View style={st.goalCenter}>
					<LongGoalIcon />
					<ControlToggle value={s.lg2Control} onChange={setCtrl('lg2Control')} />
				</View>
				<BlueCounter v={s.lg2Blue} onInc={() => inc('lg2Blue')} onDec={() => dec('lg2Blue')} />
			</View>

			{/* ── Center Goals ── */}
			<View style={[st.cgRow, st.rowBgMid]}>
				<View style={st.cgSide}>
					<RedCounter v={s.cuRed} onInc={() => inc('cuRed')} onDec={() => dec('cuRed')} />
					<View style={st.cgDivider} />
					<RedCounter v={s.clRed} onInc={() => inc('clRed')} onDec={() => dec('clRed')} />
				</View>
				<View style={st.cgIconCol}>
					<CenterGoalIcon />
				</View>
				<View style={st.cgSide}>
					<BlueCounter v={s.cuBlue} onInc={() => inc('cuBlue')} onDec={() => dec('cuBlue')} />
					<View style={st.cgDivider} />
					<BlueCounter v={s.clBlue} onInc={() => inc('clBlue')} onDec={() => dec('clBlue')} />
				</View>
			</View>

			{/* ── Parking ── */}
			<View style={[st.parkRow, st.rowBgDark]}>
				<View style={st.parkSide}>
					<RobotDiamond color={colors.red} />
					<View style={st.parkBtns}>
						<RedBtn onPress={() => decPark('red')} disabled={s.parkedRed === 0} label="−" />
						<Text style={st.countTxt}>{s.parkedRed}</Text>
						<RedBtn onPress={() => incPark('red')} disabled={s.parkedRed === 2} label="+" />
					</View>
				</View>
				<View style={st.parkSide}>
					<RobotDiamond color={colors.blue} />
					<View style={st.parkBtns}>
						<BlueBtn onPress={() => decPark('blue')} disabled={s.parkedBlue === 0} label="−" />
						<Text style={st.countTxt}>{s.parkedBlue}</Text>
						<BlueBtn onPress={() => incPark('blue')} disabled={s.parkedBlue === 2} label="+" />
					</View>
				</View>
			</View>
		</ScrollView>
	);
};

const SUPPORT_COLOR = '#c27300';

const st = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.background },
	content: { flexGrow: 1 },

	// Score bar
	scoreBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing['2xl'],
		paddingVertical: spacing.lg,
		backgroundColor: colors.muted
	},
	scoreNum: {
		fontSize: font['4xl'],
		fontWeight: '700',
		color: colors.foreground,
		minWidth: 56,
		textAlign: 'center'
	},
	scoreMid: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md
	},
	autoBadge: {
		width: 46,
		height: 46,
		borderWidth: 2.5,
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
		fontSize: font.lg,
		fontWeight: '700'
	},

	// Row backgrounds
	rowBgDark: { backgroundColor: colors.card },
	rowBgLight: { backgroundColor: '#222225' },
	rowBgMid: { backgroundColor: '#1c1c1f' },

	// Counter column
	counter: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.xs,
		paddingVertical: spacing.md
	},
	countTxt: {
		fontSize: font['2xl'],
		fontWeight: '600',
		color: colors.foreground,
		minWidth: 32,
		textAlign: 'center'
	},

	// Buttons
	btn: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center'
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
		fontSize: font.xl,
		fontWeight: '700',
		color: colors.background
	},
	btnTxtGhost: {},

	// Long goal row
	lgRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.lg
	},
	goalCenter: {
		flex: 1,
		alignItems: 'center',
		gap: spacing.sm
	},

	// Long goal icon
	lgIcon: { alignItems: 'center' },
	lgTop: {
		width: 72,
		height: 8,
		backgroundColor: colors.mutedForeground,
		borderRadius: 2
	},
	lgSupportBlock: {
		width: 14,
		height: 7,
		backgroundColor: SUPPORT_COLOR,
		borderRadius: 1
	},
	lgLeg: {
		width: 6,
		height: 16,
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
		fontSize: font.base,
		fontWeight: '600',
		color: colors.mutedForeground
	},
	toggleTxtOnColor: { color: colors.background },
	toggleTxtNoneActive: { color: colors.foreground },

	// Center goals section
	cgRow: {
		flexDirection: 'row',
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.lg
	},
	cgSide: {
		flex: 1,
		alignItems: 'center'
	},
	cgDivider: {
		width: '75%',
		height: 1,
		backgroundColor: colors.border,
		marginVertical: spacing.xs
	},
	cgIconCol: {
		width: 96,
		alignItems: 'center',
		justifyContent: 'center'
	},
	cgIcon: { alignItems: 'center', gap: 0 },
	cgUnit: { alignItems: 'center' },
	cgTop: {
		width: 52,
		height: 8,
		backgroundColor: colors.mutedForeground,
		borderRadius: 2
	},
	cgSupportBlock: {
		width: 12,
		height: 7,
		backgroundColor: SUPPORT_COLOR,
		borderRadius: 1
	},
	cgPost: {
		width: 8,
		height: 14,
		backgroundColor: SUPPORT_COLOR,
		borderRadius: 2
	},

	// Parking row
	parkRow: {
		flexDirection: 'row',
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.lg
	},
	parkSide: {
		flex: 1,
		alignItems: 'center',
		gap: spacing.sm
	},
	parkBtns: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm
	},
	diamondOuter: {
		width: 72,
		height: 72,
		alignItems: 'center',
		justifyContent: 'center'
	},
	diamond: {
		width: 50,
		height: 50,
		borderWidth: 3,
		transform: [{ rotate: '45deg' }],
		alignItems: 'center',
		justifyContent: 'center'
	},
	robotBody: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	robotWheel: {
		width: 8,
		height: 8,
		borderRadius: 4,
		borderWidth: 2
	}
});
