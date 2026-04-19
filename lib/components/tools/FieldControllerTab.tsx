import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Wifi,
  WifiOff,
  Play,
  Pause,
  SkipForward,
  StopCircle,
  Zap,
  LogOut,
  Cpu,
  Video,
  X,
  Circle,
} from "lucide-react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import * as ScreenOrientation from "expo-screen-orientation";
import { colors, font, spacing, radius } from "../../theme";
import { CountdownTimer, TimerStatus } from "../../data/countdownTimer";
import {
  defaultMatchProfiles,
  MatchMode,
  MatchPhase,
  MatchProfile,
} from "../../data/matchProfile";
import { useSoundManager } from "./useSoundManager";
import { useVexSerial } from "./useVexSerial";

type RecordingPhase = "idle" | "countdown" | "active" | "post-match" | "saving";

const formatVexTime = (ms: number) => {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const isValidProfile = (profile: MatchProfile) => {
  let shouldBeDisabled = true;
  let hasNonZeroPhase = false;
  for (const phase of profile.phases) {
    if (phase.mode === "disabled") {
      if (!shouldBeDisabled) return false;
      shouldBeDisabled = false;
    } else {
      if (shouldBeDisabled) return false;
      if (phase.duration >= 1) hasNonZeroPhase = true;
      shouldBeDisabled = true;
    }
  }
  if (shouldBeDisabled) return false;
  return hasNonZeroPhase;
};

const isLastNonDisabledPhase = (profile: MatchProfile, phaseIndex: number) => {
  for (let i = phaseIndex + 1; i < profile.phases.length; i++) {
    if (profile.phases[i].mode !== "disabled" && profile.phases[i].duration >= 1)
      return false;
  }
  return true;
};

export const FieldControllerTab = () => {
  const fixedProfiles = useRef(defaultMatchProfiles()).current;
  const [selectedProfile, setSelectedProfile] = useState(0);
  const [customAuto, setCustomAuto] = useState("15");
  const [customDriver, setCustomDriver] = useState("105");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const timer = useRef(new CountdownTimer()).current;
  const [tick, setTick] = useState(0);
  const [usingMatchMode, setUsingMatchMode] = useState<MatchMode>("disabled");
  const [pinInput, setPinInput] = useState("");
  const warnedRef = useRef(false);
  const sounds = useSoundManager();
  const {
    connectedDevices,
    connecting,
    connectController,
    disconnectAll,
    sendMatchMode,
  } = useVexSerial();

  // Recording state
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>("idle");
  const [countdownValue, setCountdownValue] = useState(0);
  const [abortSheetVisible, setAbortSheetVisible] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const shouldDiscard = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const getActiveProfile = useCallback((): MatchProfile => {
    if (selectedProfile !== 4) return fixedProfiles[selectedProfile];
    const autoSec = parseInt(customAuto) || 0;
    const driverSec = parseInt(customDriver) || 0;
    const phases: MatchPhase[] = [new MatchPhase("disabled", 0)];
    if (autoSec > 0) {
      phases.push(new MatchPhase("autonomous", autoSec));
      phases.push(new MatchPhase("disabled", 0));
    }
    if (driverSec > 0) {
      phases.push(new MatchPhase("driver", driverSec));
      phases.push(new MatchPhase("disabled", 0));
    }
    return new MatchProfile("Custom", phases);
  }, [selectedProfile, fixedProfiles, customAuto, customDriver]);

  const setMode = useCallback(
    (mode: MatchMode) => {
      setUsingMatchMode(mode);
      sendMatchMode(mode);
    },
    [sendMatchMode],
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const burnAndSave = useCallback(async (rawPath: string) => {
    setRecordingPhase("saving");
    try {
      const uri = rawPath.startsWith("file://") ? rawPath : `file://${rawPath}`;
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch {
      // ignore save errors silently
    }
    setRecordingPhase("idle");
  }, []);

  const stopAndSave = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const startActualRecording = useCallback(async () => {
    shouldDiscard.current = false;
    try {
      const video = await cameraRef.current?.recordAsync();
      if (!video) {
        setRecordingPhase("idle");
        return;
      }
      if (shouldDiscard.current) {
        shouldDiscard.current = false;
        setRecordingPhase("idle");
        return;
      }
      burnAndSave(video.uri);
    } catch {
      setRecordingPhase("idle");
    }
  }, [burnAndSave]);

  const startCountdown = useCallback((onDone: () => void) => {
    setRecordingPhase("countdown");
    setCountdownValue(3);
    const t1 = setTimeout(() => setCountdownValue(2), 1000);
    const t2 = setTimeout(() => setCountdownValue(1), 2000);
    const t3 = setTimeout(() => {
      setCountdownValue(0);
      onDone();
    }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const openRecordingMode = useCallback(async () => {
    let camOk = cameraPermission?.granted ?? false;
    let micOk = micPermission?.granted ?? false;
    let mediaOk = mediaPermission?.granted ?? false;
    if (!camOk) {
      const r = await requestCameraPermission();
      camOk = r.granted;
    }
    if (!micOk) {
      const r = await requestMicPermission();
      micOk = r.granted;
    }
    if (!mediaOk) {
      const r = await requestMediaPermission();
      mediaOk = r.granted;
    }
    if (camOk && micOk && mediaOk) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsRecordingMode(true);
    }
  }, [
    cameraPermission,
    micPermission,
    mediaPermission,
    requestCameraPermission,
    requestMicPermission,
    requestMediaPermission,
  ]);

  const closeRecordingMode = useCallback(async () => {
    await ScreenOrientation.unlockAsync();
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    setIsRecordingMode(false);
  }, []);

  useEffect(() => {
    const profile = getActiveProfile();
    const phase = profile?.phases[phaseIndex];
    if (!phase) return;
    if (phase.mode === "disabled") return;

    if (timer.status === TimerStatus.TIMESUP) {
      const nextIndex = phaseIndex + 1;
      setPhaseIndex(nextIndex);
      const isLast = isLastNonDisabledPhase(profile, phaseIndex);
      if (isLast) {
        sounds.playStop();
        if (isRecordingMode && recordingPhase === "active") {
          setRecordingPhase("post-match");
        }
      } else {
        sounds.playPause();
      }
      timer.reset();
      setMode("disabled");
    } else if (timer.isRunning) {
      const remaining = timer.displayTicks;
      if (remaining <= 30000 && remaining > 29800 && !warnedRef.current) {
        warnedRef.current = true;
        sounds.playWarning();
      }
    }
  }, [tick]);

  useEffect(() => {
    if (recordingPhase !== "post-match") return;
    setCountdownValue(5);
    const t1 = setTimeout(() => setCountdownValue(4), 1000);
    const t2 = setTimeout(() => setCountdownValue(3), 2000);
    const t3 = setTimeout(() => setCountdownValue(2), 3000);
    const t4 = setTimeout(() => setCountdownValue(1), 4000);
    const t5 = setTimeout(() => stopAndSave(), 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [recordingPhase, stopAndSave]);

  const resetToInit = useCallback(() => {
    timer.reset();
    setPhaseIndex(0);
    setMode("disabled");
    warnedRef.current = false;
  }, [setMode, timer]);

  useEffect(() => {
    if (selectedProfile === 4) resetToInit();
  }, [customAuto, customDriver]);

  const advanceToPhase = useCallback(
    (nextIndex: number, prof: MatchProfile) => {
      const phase = prof.phases[nextIndex];
      if (!phase) return;
      timer.set(phase.duration * 1000);
      timer.start();
      setPhaseIndex(nextIndex);
      setMode(phase.mode);
      warnedRef.current = false;
      sounds.playStart();
      if (isRecordingMode) {
        setRecordingPhase("active");
      }
    },
    [setMode, sounds, timer, isRecordingMode],
  );

  const btn1Press = () => {
    const profile = getActiveProfile();
    if (!isValidProfile(profile)) return;

    if (timer.status === TimerStatus.INIT) {
      const nextIndex = phaseIndex + 1;
      if (isRecordingMode) {
        if (recordingPhase === "idle") {
          startActualRecording();
        }
        startCountdown(() => advanceToPhase(nextIndex, profile));
      } else {
        advanceToPhase(nextIndex, profile);
      }
    } else if (timer.status === TimerStatus.RUNNING) {
      timer.stop();
      setMode("disabled");
    } else if (timer.status === TimerStatus.PAUSE) {
      timer.start();
      const phase = profile.phases[phaseIndex];
      if (phase) setMode(phase.mode);
    } else if (timer.status === TimerStatus.TIMESUP) {
      const nextIndex = phaseIndex + 1;
      if (nextIndex >= profile.phases.length) {
        resetToInit();
      } else {
        if (isRecordingMode) {
          setRecordingPhase("countdown");
          startCountdown(() => advanceToPhase(nextIndex, profile));
        } else {
          advanceToPhase(nextIndex, profile);
        }
      }
    }
    setTick((t) => t + 1);
  };

  const btn2Press = () => {
    const profile = getActiveProfile();
    if (!isValidProfile(profile)) return;

    if (timer.status === TimerStatus.INIT || timer.status === TimerStatus.TIMESUP) {
      resetToInit();
    } else {
      if (
        isRecordingMode &&
        (recordingPhase === "active" || recordingPhase === "countdown")
      ) {
        setAbortSheetVisible(true);
        return;
      }
      timer.set(0);
      timer.start();
      setMode("disabled");
      sounds.playAbort();
    }
    setTick((t) => t + 1);
  };

  const handleAbortDiscard = useCallback(() => {
    setAbortSheetVisible(false);
    shouldDiscard.current = true;
    cameraRef.current?.stopRecording();
    setRecordingPhase("idle");
    timer.set(0);
    timer.start();
    setMode("disabled");
    sounds.playAbort();
    setTick((t) => t + 1);
  }, [setMode, sounds, timer]);

  const handleAbortSave = useCallback(() => {
    setAbortSheetVisible(false);
    stopAndSave();
    timer.set(0);
    timer.start();
    setMode("disabled");
    sounds.playAbort();
    setTick((t) => t + 1);
  }, [setMode, sounds, timer, stopAndSave]);

  const selectProfile = (i: number) => {
    resetToInit();
    setSelectedProfile(i);
    setTick((t) => t + 1);
  };

  const profile = getActiveProfile();
  const profileValid = profile ? isValidProfile(profile) : false;

  const getBtn1Label = () => {
    if (!profile) return "Start";
    if (timer.status === TimerStatus.INIT) return "Start";
    if (timer.status === TimerStatus.RUNNING) return "Pause";
    if (timer.status === TimerStatus.PAUSE) return "Resume";
    if (timer.status === TimerStatus.TIMESUP) {
      const nextIndex = phaseIndex + 1;
      if (nextIndex >= profile.phases.length) return "Restart";
      return "Next";
    }
    return "Start";
  };

  const getBtn2Label = () => {
    if (timer.status === TimerStatus.INIT || timer.status === TimerStatus.TIMESUP)
      return "Reset";
    return "Abort";
  };

  const getStatusLabel = () => {
    if (!profile || !profileValid) return "Select a profile";
    const phase = profile.phases[phaseIndex];
    if (!phase) return "Finished";
    if (phase.mode !== "disabled") {
      if (usingMatchMode === "disabled") return "Paused";
      return usingMatchMode === "autonomous" ? "Autonomous" : "Driver Control";
    }
    const nextPhase = profile.phases[phaseIndex + 1];
    if (timer.status === TimerStatus.INIT && phaseIndex === 0) return "Ready";
    if (nextPhase) return `Waiting → ${nextPhase.mode}`;
    return "Match Ended";
  };

  const getModeColor = () => {
    if (usingMatchMode === "autonomous") return colors.blue;
    if (usingMatchMode === "driver") return colors.green;
    return colors.mutedForeground;
  };

  const displayTime = (() => {
    const currentPhase = profile?.phases[phaseIndex];
    if (timer.status === TimerStatus.INIT && currentPhase?.mode === "disabled") {
      const nextPhase = profile?.phases[phaseIndex + 1];
      if (nextPhase && nextPhase.duration > 0) {
        const m = Math.floor(nextPhase.duration / 60);
        const s = nextPhase.duration % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
      }
      return "--:--";
    }
    return formatVexTime(timer.displayTicks);
  })();

  const profileNames = [...fixedProfiles.map((p) => p.name), "Custom"];

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.profileBar}>
          {profileNames.map((name, i) => (
            <Pressable
              key={name}
              style={[
                styles.profilePill,
                selectedProfile === i && styles.profilePillActive,
              ]}
              onPress={() => selectProfile(i)}
            >
              <Text
                style={[
                  styles.profilePillLabel,
                  selectedProfile === i && styles.profilePillLabelActive,
                ]}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </View>

        {selectedProfile === 4 && (
          <View style={styles.customCard}>
            <View style={styles.customRow}>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>AUTO (seconds)</Text>
                <TextInput
                  style={styles.customInput}
                  value={customAuto}
                  onChangeText={(v) => setCustomAuto(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  placeholder="0 = skip"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={styles.customField}>
                <Text style={styles.customLabel}>DRIVER (seconds)</Text>
                <TextInput
                  style={styles.customInput}
                  value={customDriver}
                  onChangeText={(v) => setCustomDriver(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  placeholder="0 = skip"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.timerCard}>
          <View style={styles.timerCardHeader}>
            <Text style={[styles.statusLabel, { color: getModeColor() }]}>
              {getStatusLabel()}
            </Text>
            <Pressable style={styles.recordToggleBtn} onPress={openRecordingMode}>
              <Video size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Text style={styles.timerDisplay}>{displayTime}</Text>
          {profileValid && (
            <View style={styles.phaseRow}>
              {profile.phases
                .filter((ph) => ph.mode !== "disabled")
                .map((ph, i) => (
                  <View
                    key={i}
                    style={[
                      styles.phaseDot,
                      ph.mode === "autonomous"
                        ? styles.phaseDotAuto
                        : styles.phaseDotDriver,
                    ]}
                  />
                ))}
            </View>
          )}
        </View>

        {profileValid && (
          <View style={styles.buttonsRow}>
            <Pressable style={styles.btn1} onPress={btn1Press}>
              {timer.status === TimerStatus.RUNNING ? (
                <Pause
                  size={22}
                  color={colors.primaryForeground}
                  fill={colors.primaryForeground}
                />
              ) : timer.status === TimerStatus.PAUSE ? (
                <Play
                  size={22}
                  color={colors.primaryForeground}
                  fill={colors.primaryForeground}
                />
              ) : (
                <SkipForward
                  size={22}
                  color={colors.primaryForeground}
                  fill={colors.primaryForeground}
                />
              )}
              <Text style={styles.btnLabel}>{getBtn1Label()}</Text>
            </Pressable>
            <Pressable style={styles.btn2} onPress={btn2Press}>
              <StopCircle size={22} color={colors.foreground} />
              <Text style={[styles.btnLabel, { color: colors.foreground }]}>
                {getBtn2Label()}
              </Text>
            </Pressable>
          </View>
        )}

        {Platform.OS !== "android" && Platform.OS !== "ios" ? (
          <View style={styles.androidOnlyBanner}>
            <Cpu size={16} color={colors.mutedForeground} />
            <Text style={styles.androidOnlyText}>
              Field controller requires Android (USB OTG) or iOS (Bluetooth).
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.manualModeRow}>
              <Text style={styles.sectionLabel}>MANUAL OVERRIDE</Text>
              <View style={styles.modeButtonsRow}>
                {(["disabled", "autonomous", "driver"] as MatchMode[]).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.modeBtn, usingMatchMode === m && styles.modeBtnActive]}
                    onPress={() => {
                      resetToInit();
                      setMode(m);
                    }}
                  >
                    <Text
                      style={[
                        styles.modeBtnLabel,
                        usingMatchMode === m && styles.modeBtnLabelActive,
                      ]}
                    >
                      {m === "autonomous"
                        ? "Auto"
                        : m === "driver"
                          ? "Driver"
                          : "Disabled"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.controllerSection}>
              <Text style={styles.sectionLabel}>CONTROLLERS</Text>
              {connectedDevices.length === 0 ? (
                <View style={styles.noDevices}>
                  <WifiOff size={20} color={colors.mutedForeground} />
                  <Text style={styles.noDevicesText}>No controllers connected</Text>
                </View>
              ) : (
                connectedDevices.map((d) => (
                  <View key={d.deviceId} style={styles.deviceRow}>
                    <Wifi size={16} color={colors.green} />
                    <Text style={styles.deviceName}>{d.deviceName}</Text>
                  </View>
                ))
              )}
              <View style={styles.controllerActions}>
                <Pressable
                  style={styles.connectBtn}
                  onPress={connectController}
                  disabled={connecting}
                >
                  {connecting ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Zap size={18} color={colors.primaryForeground} />
                  )}
                  <Text style={styles.connectBtnLabel}>
                    {connecting ? "Scanning..." : "Connect"}
                  </Text>
                </Pressable>
                {connectedDevices.length > 0 && (
                  <Pressable style={styles.disconnectBtn} onPress={disconnectAll}>
                    <LogOut size={18} color={colors.foreground} />
                    <Text style={[styles.connectBtnLabel, { color: colors.foreground }]}>
                      Disconnect
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isRecordingMode}
        animationType="slide"
        onRequestClose={() => {
          if (recordingPhase === "idle") closeRecordingMode();
        }}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            facing="back"
            mode="video"
            zoom={0}
          />

          <SafeAreaView edges={["top", "left", "right"]} style={styles.camTopBar}>
            <Pressable
              style={[
                styles.camCloseBtn,
                recordingPhase !== "idle" && styles.camCloseBtnDisabled,
              ]}
              onPress={() => {
                if (recordingPhase === "idle") closeRecordingMode();
              }}
              disabled={recordingPhase !== "idle"}
            >
              <X size={22} color={colors.foreground} />
            </Pressable>
            {(recordingPhase === "active" || recordingPhase === "countdown") && (
              <View style={styles.recIndicator}>
                <Circle size={10} color={colors.primary} fill={colors.primary} />
                <Text style={styles.recText}>REC</Text>
              </View>
            )}
          </SafeAreaView>

          <View style={styles.camCenter} pointerEvents="none">
            {recordingPhase === "countdown" && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownNumber}>{countdownValue}</Text>
                <Text style={styles.countdownLabel}>Get ready</Text>
              </View>
            )}
            {recordingPhase === "active" && (
              <View style={styles.activeTimerOverlay}>
                <Text style={[styles.camStatusLabel, { color: getModeColor() }]}>
                  {getStatusLabel()}
                </Text>
                <Text style={styles.camTimerDisplay}>{displayTime}</Text>
              </View>
            )}
            {recordingPhase === "post-match" && (
              <View style={styles.postMatchOverlay}>
                <Text style={styles.postMatchTitle}>Match Ended</Text>
                <Text style={styles.postMatchSub}>Saving in {countdownValue}s…</Text>
              </View>
            )}
            {recordingPhase === "saving" && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>Saving to gallery…</Text>
              </View>
            )}
          </View>

          {(recordingPhase === "idle" ||
            recordingPhase === "active" ||
            recordingPhase === "countdown") &&
            profileValid && (
              <SafeAreaView edges={["right", "bottom"]} style={styles.camSideBar}>
                {recordingPhase === "idle" && (
                  <View style={styles.camStatusCol}>
                    <Text style={[styles.camBottomStatus, { color: getModeColor() }]}>
                      {getStatusLabel()}
                    </Text>
                    <Text style={styles.camBottomTime}>{displayTime}</Text>
                  </View>
                )}
                <Pressable style={styles.camBtn1} onPress={btn1Press}>
                  {timer.status === TimerStatus.RUNNING ? (
                    <Pause
                      size={22}
                      color={colors.primaryForeground}
                      fill={colors.primaryForeground}
                    />
                  ) : timer.status === TimerStatus.PAUSE ? (
                    <Play
                      size={22}
                      color={colors.primaryForeground}
                      fill={colors.primaryForeground}
                    />
                  ) : (
                    <SkipForward
                      size={22}
                      color={colors.primaryForeground}
                      fill={colors.primaryForeground}
                    />
                  )}
                  <Text style={styles.btnLabel}>{getBtn1Label()}</Text>
                </Pressable>
                <Pressable style={styles.camBtn2} onPress={btn2Press}>
                  <StopCircle size={22} color={colors.foreground} />
                  <Text style={[styles.btnLabel, { color: colors.foreground }]}>
                    {getBtn2Label()}
                  </Text>
                </Pressable>
              </SafeAreaView>
            )}
        </View>
      </Modal>

      {abortSheetVisible && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setAbortSheetVisible(false)}
        >
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => setAbortSheetVisible(false)}
          >
            <Pressable style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Save recording?</Text>
              <Text style={styles.sheetBody}>
                The match was aborted early. Do you want to save the recording so far?
              </Text>
              <View style={styles.sheetActions}>
                <Pressable style={styles.sheetDiscard} onPress={handleAbortDiscard}>
                  <Text style={styles.sheetDiscardText}>Discard</Text>
                </Pressable>
                <Pressable style={styles.sheetSave} onPress={handleAbortSave}>
                  <Text style={styles.sheetSaveText}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: spacing["2xl"],
    gap: spacing["2xl"],
    paddingBottom: spacing["3xl"],
  },
  androidOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  androidOnlyText: {
    flex: 1,
    fontSize: font.sm,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  profileBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  profilePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
  },
  profilePillActive: {
    backgroundColor: colors.primary,
  },
  profilePillLabel: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  profilePillLabelActive: {
    color: colors.primaryForeground,
  },
  timerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  statusLabel: {
    fontSize: font.sm,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  timerDisplay: {
    fontSize: font["5xl"],
    fontWeight: "200",
    color: colors.foreground,
    letterSpacing: 4,
  },
  phaseRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseDotAuto: {
    backgroundColor: colors.blue,
  },
  phaseDotDriver: {
    backgroundColor: colors.green,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  btn1: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  btn2: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.muted,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
  camBtn1: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  camBtn2: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.muted,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  btnLabel: {
    fontSize: font.md,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  sectionLabel: {
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  manualModeRow: {
    gap: spacing.xs,
  },
  modeButtonsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtnLabel: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  modeBtnLabelActive: {
    color: colors.foreground,
  },
  controllerSection: {
    gap: spacing.xs,
  },
  noDevices: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  noDevicesText: {
    fontSize: font.base,
    color: colors.mutedForeground,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceName: {
    fontSize: font.base,
    color: colors.foreground,
  },
  controllerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  connectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  disconnectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.muted,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  connectBtnLabel: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["2xl"],
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalSubtitle: {
    fontSize: font.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  pinInput: {
    width: "100%",
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: font["3xl"],
    fontWeight: "300",
    letterSpacing: 12,
    color: colors.foreground,
  },
  pinConfirmDisabled: {
    opacity: 0.4,
  },
  modalCancel: {
    fontSize: font.sm,
    color: colors.mutedForeground,
    paddingVertical: spacing.sm,
  },
  // Camera modal
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
  },
  cameraView: {
    height: "100%" as unknown as number,
    aspectRatio: 16 / 9,
  },
  camTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  camCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  camCloseBtnDisabled: {
    opacity: 0.3,
  },
  recIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  recText: {
    fontSize: font.sm,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1.5,
  },
  camCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownOverlay: {
    alignItems: "center",
    gap: spacing.sm,
  },
  countdownNumber: {
    fontSize: 160,
    fontWeight: "200",
    color: "#fff",
    lineHeight: 180,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    fontSize: font.lg,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  activeTimerOverlay: {
    position: "absolute",
    top: 80,
    alignItems: "center",
    gap: spacing.xs,
  },
  camStatusLabel: {
    fontSize: font.sm,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  camTimerDisplay: {
    fontSize: font["5xl"],
    fontWeight: "200",
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  postMatchOverlay: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
  },
  postMatchTitle: {
    fontSize: font["2xl"],
    fontWeight: "700",
    color: "#fff",
  },
  postMatchSub: {
    fontSize: font.lg,
    color: "rgba(255,255,255,0.7)",
  },
  processingOverlay: {
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["2xl"],
    borderRadius: radius.lg,
  },
  processingText: {
    fontSize: font.md,
    fontWeight: "600",
    color: "#fff",
  },
  camSideBar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    paddingRight: spacing["2xl"],
    paddingVertical: spacing["2xl"],
    gap: spacing.md,
    justifyContent: "center",
    alignItems: "stretch",
    width: 140,
  },
  camStatusCol: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  camBottomStatus: {
    fontSize: font.sm,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  camBottomTime: {
    fontSize: font["3xl"],
    fontWeight: "200",
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  // Custom profile card
  customCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  customRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  customField: {
    flex: 1,
    gap: spacing.xs,
  },
  customLabel: {
    fontSize: font.xs,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.mutedForeground,
  },
  customInput: {
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: font.lg,
    fontWeight: "300",
    color: colors.foreground,
  },
  // Timer card header
  timerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  recordToggleBtn: {
    position: "absolute",
    right: 0,
    padding: spacing.xs,
  },
  // Abort sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.foreground,
  },
  sheetBody: {
    fontSize: font.base,
    color: colors.mutedForeground,
    lineHeight: 22,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sheetDiscard: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
    alignItems: "center",
  },
  sheetDiscardText: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  sheetSave: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
  },
  sheetSaveText: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
});
