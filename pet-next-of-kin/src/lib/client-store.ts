"use client";

import { useCallback, useSyncExternalStore } from "react";

const ONBOARDING_KEY = "pnk-onboarding-v1";
const CHECKIN_KEY = "pnk-checkin-v1";
const ALERTS_KEY = "pnk-alerts-v1";

export type OnboardingState = {
  completed: boolean;
  ownerName: string;
  petName: string;
  petSpecies: string;
  acknowledgedAt?: string;
};

export type CheckInState = {
  lastCheckInIso: string;
  intervalHours: number;
};

export type AlertEntry = {
  id: string;
  atIso: string;
  channel: "in_app" | "contact" | "system";
  title: string;
  body: string;
};

const defaultOnboarding = (): OnboardingState => ({
  completed: false,
  ownerName: "",
  petName: "",
  petSpecies: "Cat",
});

const DEFAULT_CHECKIN_ISO = "2024-05-10T09:00:00.000Z";

const defaultCheckIn = (): CheckInState => ({
  lastCheckInIso: DEFAULT_CHECKIN_ISO,
  intervalHours: 36,
});

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const onboardingListeners = new Set<() => void>();
let onboardingEpoch = 0;
function emitOnboarding() {
  onboardingEpoch += 1;
  onboardingListeners.forEach((l) => l());
}

const checkInListeners = new Set<() => void>();
let checkInEpoch = 0;
function emitCheckIn() {
  checkInEpoch += 1;
  checkInListeners.forEach((l) => l());
}

const alertsListeners = new Set<() => void>();
let alertsEpoch = 0;
function emitAlerts() {
  alertsEpoch += 1;
  alertsListeners.forEach((l) => l());
}

const STATIC_ALERT_SEED: AlertEntry[] = [
  {
    id: "seed-1",
    atIso: "2024-05-09T08:00:00.000Z",
    channel: "in_app",
    title: "Check-in reminder sent",
    body: "Soft nudge: tap “I’m okay” when you have a quiet moment.",
  },
  {
    id: "seed-2",
    atIso: "2024-05-08T06:00:00.000Z",
    channel: "system",
    title: "Care plan updated",
    body: "You edited feeding notes for Milo.",
  },
];

export function useOnboardingState() {
  const state = useSyncExternalStore(
    (onStoreChange) => {
      onboardingListeners.add(onStoreChange);
      return () => onboardingListeners.delete(onStoreChange);
    },
    () => {
      void onboardingEpoch;
      return readJson(ONBOARDING_KEY, defaultOnboarding());
    },
    () => defaultOnboarding(),
  );

  const update = useCallback((patch: Partial<OnboardingState>) => {
    const prev = readJson(ONBOARDING_KEY, defaultOnboarding());
    const next = { ...prev, ...patch };
    writeJson(ONBOARDING_KEY, next);
    emitOnboarding();
  }, []);

  const reset = useCallback(() => {
    writeJson(ONBOARDING_KEY, defaultOnboarding());
    emitOnboarding();
  }, []);

  return { state, update, reset };
}

export function useCheckInState() {
  const state = useSyncExternalStore(
    (onStoreChange) => {
      checkInListeners.add(onStoreChange);
      return () => checkInListeners.delete(onStoreChange);
    },
    () => {
      void checkInEpoch;
      return readJson(CHECKIN_KEY, defaultCheckIn());
    },
    () => defaultCheckIn(),
  );

  const update = useCallback((patch: Partial<CheckInState>) => {
    const prev = readJson(CHECKIN_KEY, defaultCheckIn());
    const next = { ...prev, ...patch };
    writeJson(CHECKIN_KEY, next);
    emitCheckIn();
  }, []);

  return { state, update };
}

export function useAlertLog() {
  const entries = useSyncExternalStore(
    (onStoreChange) => {
      alertsListeners.add(onStoreChange);
      return () => alertsListeners.delete(onStoreChange);
    },
    () => {
      void alertsEpoch;
      return readJson(ALERTS_KEY, STATIC_ALERT_SEED);
    },
    () => STATIC_ALERT_SEED,
  );

  const push = useCallback((entry: Omit<AlertEntry, "id" | "atIso">) => {
    const prev = readJson(ALERTS_KEY, STATIC_ALERT_SEED);
    const next: AlertEntry[] = [
      {
        id: `a-${Date.now()}`,
        atIso: new Date().toISOString(),
        ...entry,
      },
      ...prev,
    ];
    writeJson(ALERTS_KEY, next);
    emitAlerts();
  }, []);

  return { entries, push };
}
