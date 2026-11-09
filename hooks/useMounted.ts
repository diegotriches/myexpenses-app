"use client";

import { useSyncExternalStore } from "react";

const assinarNada = () => () => {};

/** false no SSR e durante a hidratação; true depois disso no cliente. */
export function useMounted(): boolean {
  return useSyncExternalStore(assinarNada, () => true, () => false);
}
