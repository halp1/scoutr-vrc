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
  KeyboardAvoidingView,
} from "react-native";
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
} from "lucide-react-native";
import { colors, font, spacing, radius } from "../../theme";
import { CountdownTimer, TimerStatus } from "../../data/countdownTimer";
import { defaultMatchProfiles, MatchMode, MatchProfile } from "../../data/matchProfile";
import { useSoundManager } from "./useSoundManager";
import { useVexSerial } from "./useVexSerial";

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
  const profiles = useRef(defaultMatchProfiles()).current;
  const [selectedProfile, setSelectedProfile] = useState(0);
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
    pairingDevice,
    submitPin,
  } = useVexSerial();

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

  useEffect(() => {
    const profile = profiles[selectedProfile];
    const phase = profile?.phases[phaseIndex];
    if (!phase) return;

    if (phase.mode === "disabled") return;

    if (timer.status === TimerStatus.TIMESUP) {
      const nextIndex = phaseIndex + 1;
      setPhaseIndex(nextIndex);
      if (isLastNonDisabledPhase(profile, phaseIndex)) {
        sounds.playStop();
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

  const resetToInit = useCallback(() => {
    timer.reset();
    setPhaseIndex(0);
    setMode("disabled");
    warnedRef.current = false;
  }, [setMode, timer]);

  const btn1Press = () => {
    const profile = profiles[selectedProfile];
    if (!isValidProfile(profile)) return;

    if (timer.status === TimerStatus.INIT) {
      const nextIndex = phaseIndex + 1;
      const phase = profile.phases[nextIndex];
      if (!phase) return;
      timer.set(phase.duration * 1000);
      timer.start();
      setPhaseIndex(nextIndex);
      setMode(phase.mode);
      warnedRef.current = false;
      sounds.playStart();
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
        const phase = profile.phases[nextIndex];
        if (!phase) return;
        timer.set(phase.duration * 1000);
        timer.start();
        setPhaseIndex(nextIndex);
        setMode(phase.mode);
        warnedRef.current = false;
        sounds.playStart();
      }
    }
    setTick((t) => t + 1);
  };

  const btn2Press = () => {
    const profile = profiles[selectedProfile];
    if (!isValidProfile(profile)) return;

    if (timer.status === TimerStatus.INIT || timer.status === TimerStatus.TIMESUP) {
      resetToInit();
    } else {
      timer.set(0);
      timer.start();
      setMode("disabled");
      sounds.playAbort();
    }
    setTick((t) => t + 1);
  };

  const selectProfile = (i: number) => {
    resetToInit();
    setSelectedProfile(i);
    setTick((t) => t + 1);
  };

  const profile = profiles[selectedProfile];
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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.profileBar}>
        {profiles.map((p, i) => (
          <Pressable
            key={p.name}
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
              {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.timerCard}>
        <Text style={[styles.statusLabel, { color: getModeColor() }]}>
          {getStatusLabel()}
        </Text>
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

      {pairingDevice && (
        <Modal transparent animationType="fade" onRequestClose={() => {}}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
            <View style={styles.modalCard}>
              <Cpu size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Pair VEX Brain</Text>
              <Text style={styles.modalSubtitle}>
                {`Enter the 4-digit PIN shown on ${pairingDevice.deviceName}`}
              </Text>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={(t) => setPinInput(t.replace(/[^0-9]/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor={colors.mutedForeground}
                textAlign="center"
                autoFocus
              />
              <Pressable
                style={[
                  styles.connectBtn,
                  pinInput.length !== 4 && styles.pinConfirmDisabled,
                ]}
                disabled={pinInput.length !== 4}
                onPress={() => {
                  submitPin(pinInput);
                  setPinInput("");
                }}
              >
                <Text style={styles.connectBtnLabel}>Confirm</Text>
              </Pressable>
              <Pressable onPress={disconnectAll}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
                    {m === "autonomous" ? "Auto" : m === "driver" ? "Driver" : "Disabled"}
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
});
