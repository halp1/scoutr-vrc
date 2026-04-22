import { useEffect, useRef } from "react";

const SoundFiles = {
  start: require("../../../assets/sounds/Start.wav"),
  pause: require("../../../assets/sounds/Pause.wav"),
  stop: require("../../../assets/sounds/Stop.wav"),
  warning: require("../../../assets/sounds/Warning.wav"),
  abort: require("../../../assets/sounds/Abort.wav"),
} as const;

type SoundKey = keyof typeof SoundFiles;

export const useSoundManager = () => {
  const sounds = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});

  useEffect(() => {
    const entries = Object.entries(SoundFiles) as [SoundKey, string][];
    for (const [key, src] of entries) {
      const audio = new Audio(src);
      audio.preload = "auto";
      sounds.current[key] = audio;
    }
    return () => {
      for (const audio of Object.values(sounds.current)) {
        audio?.pause();
      }
      sounds.current = {};
    };
  }, []);

  const play = (key: SoundKey) => {
    const audio = sounds.current[key];
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  };

  return {
    playStart: () => play("start"),
    playPause: () => play("pause"),
    playStop: () => play("stop"),
    playWarning: () => play("warning"),
    playAbort: () => play("abort"),
  };
};
