import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Timer, Volume2, VolumeX, Play, Pause, X, SkipForward } from 'lucide-react-native';
import { colors, font, spacing } from '../../theme';
import { useSoundManager } from './useSoundManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Mode = 'skills' | 'vexu' | 'regular';

type Phase = { label: string; duration: number };

const MODE_PHASES: Record<Mode, Phase[]> = {
	skills: [{ label: 'Skills', duration: 60 }],
	vexu: [
		{ label: 'Auto', duration: 30 },
		{ label: 'Driver', duration: 90 }
	],
	regular: [
		{ label: 'Auto', duration: 15 },
		{ label: 'Driver', duration: 105 }
	]
};

const MODE_META: { key: Mode; label: string }[] = [
	{ key: 'skills', label: 'Skills' },
	{ key: 'vexu', label: 'VEX U' },
	{ key: 'regular', label: 'Regular' }
];

const RING_SIZE = SCREEN_WIDTH * 0.78;
const STROKE_WIDTH = 20;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const formatTime = (seconds: number) => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
};

export const TimerTab = () => {
	const [mode, setMode] = useState<Mode>('skills');
	const [phaseIndex, setPhaseIndex] = useState(0);
	const [timeLeft, setTimeLeft] = useState(60);
	const [running, setRunning] = useState(false);
	const [started, setStarted] = useState(false);
	const [awaitingNext, setAwaitingNext] = useState(false);
	const [soundEnabled, setSoundEnabled] = useState(true);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const warnedRef = useRef(false);
	const sounds = useSoundManager();

	const phases = MODE_PHASES[mode];
	const currentPhase = phases[phaseIndex];
	const progress = timeLeft / currentPhase.duration;
	const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
	const isMultiPhase = phases.length > 1;
	const isLastPhase = phaseIndex === phases.length - 1;

	const clearTick = () => {
		if (intervalRef.current) clearInterval(intervalRef.current);
	};

	const resetTimer = useCallback(
		(m?: Mode) => {
			clearTick();
			const targetMode = m ?? mode;
			setMode(targetMode);
			setPhaseIndex(0);
			setTimeLeft(MODE_PHASES[targetMode][0].duration);
			setRunning(false);
			setStarted(false);
			setAwaitingNext(false);
			warnedRef.current = false;
		},
		[mode]
	);

	const selectMode = useCallback(
		(m: Mode) => {
			resetTimer(m);
		},
		[resetTimer]
	);

	useEffect(() => {
		if (running) {
			intervalRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTick();
						setRunning(false);
						if (isMultiPhase && !isLastPhase) {
							setAwaitingNext(true);
							if (soundEnabled) sounds.playPause();
						} else {
							if (soundEnabled) sounds.playStop();
						}
						return 0;
					}
					if (prev === 31 && !warnedRef.current) {
						warnedRef.current = true;
						if (soundEnabled) sounds.playWarning();
					}
					return prev - 1;
				});
			}, 1000);
		} else {
			clearTick();
		}
		return clearTick;
	}, [running, isMultiPhase, isLastPhase, soundEnabled, sounds]);

	const togglePlay = useCallback(() => {
		if (awaitingNext) return;
		if (!started) {
			setStarted(true);
			setRunning(true);
			warnedRef.current = false;
			if (soundEnabled) sounds.playStart();
		} else {
			setRunning((prev) => !prev);
		}
	}, [awaitingNext, started, soundEnabled, sounds]);

	const advancePhase = useCallback(() => {
		const nextIndex = phaseIndex + 1;
		setPhaseIndex(nextIndex);
		setTimeLeft(phases[nextIndex].duration);
		setAwaitingNext(false);
		setRunning(true);
		warnedRef.current = false;
		if (soundEnabled) sounds.playStart();
	}, [phaseIndex, phases, soundEnabled, sounds]);

	return (
		<View style={styles.container}>
			<View style={styles.modesRow}>
				{MODE_META.map((m) => {
					const active = mode === m.key;
					return (
						<Pressable
							key={m.key}
							style={[styles.modeButton, active && styles.modeButtonActive]}
							onPress={() => selectMode(m.key)}
						>
							<Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{m.label}</Text>
							<Timer
								size={22}
								color={active ? colors.primaryForeground : colors.mutedForeground}
								strokeWidth={2}
							/>
						</Pressable>
					);
				})}
			</View>

			<View style={styles.ringWrapper}>
				<Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RING_RADIUS}
						stroke={colors.muted}
						strokeWidth={STROKE_WIDTH}
						fill="none"
					/>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RING_RADIUS}
						stroke={colors.primary}
						strokeWidth={STROKE_WIDTH}
						fill="none"
						strokeDasharray={`${CIRCUMFERENCE}`}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						rotation="-90"
						origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
					/>
				</Svg>
				<View style={styles.ringCenter}>
					{isMultiPhase && <Text style={styles.phaseLabel}>{currentPhase.label}</Text>}
					<Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
					<Pressable onPress={() => setSoundEnabled((prev) => !prev)} hitSlop={12}>
						{soundEnabled ? (
							<Volume2 size={24} color={colors.mutedForeground} />
						) : (
							<VolumeX size={24} color={colors.mutedForeground} />
						)}
					</Pressable>
				</View>
			</View>

			<View style={styles.buttonsRow}>
				{awaitingNext ? (
					<Pressable style={styles.playButton} onPress={advancePhase}>
						<SkipForward
							size={30}
							color={colors.primaryForeground}
							fill={colors.primaryForeground}
						/>
					</Pressable>
				) : (
					<Pressable style={styles.playButton} onPress={togglePlay}>
						{running ? (
							<Pause size={30} color={colors.primaryForeground} fill={colors.primaryForeground} />
						) : (
							<Play size={30} color={colors.primaryForeground} fill={colors.primaryForeground} />
						)}
					</Pressable>
				)}
				{started && (
					<Pressable style={styles.playButton} onPress={() => resetTimer()}>
						<X size={30} color={colors.primaryForeground} strokeWidth={2.5} />
					</Pressable>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		paddingTop: spacing['3xl'],
		paddingBottom: spacing['2xl'],
		gap: spacing['3xl']
	},
	modesRow: {
		flexDirection: 'row',
		gap: spacing.xl
	},
	modeButton: {
		width: 82,
		height: 82,
		borderRadius: 41,
		backgroundColor: colors.muted,
		alignItems: 'center',
		justifyContent: 'center',
		gap: spacing.xs
	},
	modeButtonActive: {
		backgroundColor: colors.primary
	},
	modeLabel: {
		fontSize: font.sm,
		fontWeight: '600',
		color: colors.mutedForeground
	},
	modeLabelActive: {
		color: colors.primaryForeground
	},
	ringWrapper: {
		width: RING_SIZE,
		height: RING_SIZE,
		alignItems: 'center',
		justifyContent: 'center'
	},
	svg: {
		position: 'absolute'
	},
	ringCenter: {
		alignItems: 'center',
		gap: spacing.md
	},
	phaseLabel: {
		fontSize: font.lg,
		fontWeight: '600',
		color: colors.mutedForeground,
		letterSpacing: 1
	},
	timeText: {
		fontSize: font['5xl'],
		fontWeight: '300',
		color: colors.foreground,
		letterSpacing: 2
	},
	buttonsRow: {
		flexDirection: 'row',
		gap: spacing.xl
	},
	playButton: {
		width: 68,
		height: 68,
		borderRadius: 34,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center'
	}
});
