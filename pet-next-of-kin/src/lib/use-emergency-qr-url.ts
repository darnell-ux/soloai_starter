"use client";

import { useSyncExternalStore } from "react";
import { EMERGENCY_PUBLIC_SLUG } from "@/lib/mock-data";
import { getEmergencyPageUrl } from "@/lib/emergency-url";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return "";
}

function getClientSnapshot() {
  return getEmergencyPageUrl(EMERGENCY_PUBLIC_SLUG);
}

export function useEmergencyQrUrl() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
