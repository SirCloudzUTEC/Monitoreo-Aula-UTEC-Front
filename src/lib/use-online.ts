"use client";
import { useSyncExternalStore } from "react";
import { useApp } from "@/lib/store";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}
const online = () => navigator.onLine;
const server = () => true;
export function useOnline() {
  const reachable = useApp((state) => state.connected);
  const browserOnline = useSyncExternalStore(subscribe, online, server);
  return reachable && browserOnline;
}
