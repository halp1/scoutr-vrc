import { useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const SoundFiles = {
	start: require('../../../assets/sounds/Start.wav'),
	pause: require('../../../assets/sounds/Pause.wav'),
	stop: require('../../../assets/sounds/Stop.wav'),
	warning: require('../../../assets/sounds/Warning.wav'),
	abort: require('../../../assets/sounds/Abort.wav')
} as const;

type SoundKey = keyof typeof SoundFiles;

export const useSoundManager = () => {
	const sounds = useRef<Partial<Record<SoundKey, AudioPlayer>>>({});

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
			const entries = Object.entries(SoundFiles) as [SoundKey, number][];
			for (const [key, file] of entries) {
				const player = createAudioPlayer(file);
				if (!cancelled) sounds.current[key] = player;
				else player.remove();
			}
		};

		load();

		return () => {
			cancelled = true;
			for (const player of Object.values(sounds.current)) {
				player?.remove();
			}
			sounds.current = {};
		};
	}, []);

	const play = async (key: SoundKey) => {
		const player = sounds.current[key];
		if (!player) return;
		try {
			player.seekTo(0);
			player.play();
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
