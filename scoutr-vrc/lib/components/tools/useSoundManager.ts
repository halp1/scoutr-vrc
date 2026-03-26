import { useEffect, useRef } from 'react';

let Audio: typeof import('expo-av').Audio | null = null;
try {
	Audio = require('expo-av').Audio;
} catch {}

const SoundFiles = {
	start: require('../../../assets/sounds/Start.wav'),
	pause: require('../../../assets/sounds/Pause.wav'),
	stop: require('../../../assets/sounds/Stop.wav'),
	warning: require('../../../assets/sounds/Warning.wav'),
	abort: require('../../../assets/sounds/Abort.wav')
} as const;

type SoundKey = keyof typeof SoundFiles;
type AVSound = InstanceType<typeof import('expo-av').Audio.Sound>;

export const useSoundManager = () => {
	const sounds = useRef<Partial<Record<SoundKey, AVSound>>>({});
	const loaded = useRef(false);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			if (!Audio) return;
			await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
			const entries = Object.entries(SoundFiles) as [SoundKey, number][];
			for (const [key, file] of entries) {
				const { sound } = await Audio.Sound.createAsync(file);
				if (!cancelled) sounds.current[key] = sound;
			}
			if (!cancelled) loaded.current = true;
		};

		load();

		return () => {
			cancelled = true;
			for (const sound of Object.values(sounds.current)) {
				sound?.unloadAsync();
			}
			sounds.current = {};
			loaded.current = false;
		};
	}, []);

	const play = async (key: SoundKey) => {
		const sound = sounds.current[key];
		if (!sound) return;
		try {
			await sound.stopAsync();
			await sound.setPositionAsync(0);
			await sound.playAsync();
		} catch {}
	};

	return {
		playStart: () => play('start'),
		playPause: () => play('pause'),
		playStop: () => play('stop'),
		playWarning: () => play('warning'),
		playAbort: () => play('abort')
	};
};
