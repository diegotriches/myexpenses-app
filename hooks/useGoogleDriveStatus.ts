// src/hooks/useGoogleDriveStatus.ts

import { useQuery } from "@tanstack/react-query";

interface GoogleDriveStatus {
  temContaGoogle: boolean;
  temDriveAutorizado: boolean;
  precisaReautorizar: boolean;
}

async function fetchGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  const res = await fetch("/api/auth/google-drive-status");
  if (!res.ok) throw new Error("Erro ao verificar status do Drive");
  return res.json();
}

export function useGoogleDriveStatus() {
  return useQuery({
    queryKey: ["google-drive-status"],
    queryFn: fetchGoogleDriveStatus,
    staleTime: 5 * 60 * 1000, // 5 minutos — não muda com frequência
  });
}