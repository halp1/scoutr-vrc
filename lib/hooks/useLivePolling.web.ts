import { useCallback, useEffect, useRef, useState } from "react";
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
  const isVisibleRef = useRef(!document.hidden);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPollTimeRef = useRef<number>(0);

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
    lastPollTimeRef.current = Date.now();
    refreshRef.current();
    setLastRefreshed(new Date());
  }, []);

  const maybeStart = useCallback(() => {
    if (
      !isFocusedRef.current ||
      !isVisibleRef.current ||
      intervalRef.current !== null ||
      timeoutRef.current !== null
    )
      return;
    if (Date.now() - lastPollTimeRef.current >= 30_000) {
      poll();
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!isFocusedRef.current || !isVisibleRef.current) return;
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
    const handler = () => {
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && !wasVisible) {
        maybeStart();
      } else if (!isVisibleRef.current) {
        stop();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [maybeStart, stop]);

  return { lastRefreshed };
};
