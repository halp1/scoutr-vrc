import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

const msUntilNextBoundary = () => {
  const now = new Date();
  const s = now.getSeconds() * 1000 + now.getMilliseconds();
  const next = s < 30_000 ? 30_000 - s : 60_000 - s;
  return next;
};

export const useLivePolling = (refresh: () => void) => {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const isFocusedRef = useRef(false);
  const isActiveRef = useRef(AppState.currentState === "active");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const poll = useCallback(() => {
    refreshRef.current();
    setLastRefreshed(new Date());
  }, []);

  const maybeStart = useCallback(() => {
    if (
      !isFocusedRef.current ||
      !isActiveRef.current ||
      intervalRef.current !== null ||
      timeoutRef.current !== null
    )
      return;
    poll();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isFocusedRef.current || !isActiveRef.current) return;
      poll();
      intervalRef.current = setInterval(poll, 30_000);
    }, msUntilNextBoundary());
  }, [poll]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      maybeStart();
      return () => {
        isFocusedRef.current = false;
        stop();
      };
    }, [maybeStart, stop]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasActive = isActiveRef.current;
      isActiveRef.current = nextState === "active";
      if (isActiveRef.current && !wasActive) {
        maybeStart();
      } else if (!isActiveRef.current) {
        stop();
      }
    });
    return () => subscription.remove();
  }, [maybeStart, stop]);

  return { lastRefreshed };
};
