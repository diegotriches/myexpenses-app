"use client";

import { useCallback } from "react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

/** Formata em reais respeitando "ocultar valores". Para valor digitado pelo usuário, use `formatarMoeda` direto. */
export function useMoeda() {
  const { mask } = useHideValues();
  return useCallback((valor: number | string | null | undefined) => mask(formatarMoeda(valor)), [mask]);
}
