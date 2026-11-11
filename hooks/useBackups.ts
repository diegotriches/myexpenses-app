"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { BackupListItem, RestaurarBackupResponse } from "@/types/backup";

const QUERY_KEY = ["backups"] as const;

// ── Listar ────────────────────────────────────────────────────────────────────
export function useBackups() {
  return useQuery<BackupListItem[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/backups");
      if (!res.ok) throw new Error("Erro ao buscar backups");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

// ── Download ──────────────────────────────────────────────────────────────────
export function useDownloadBackup() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (backupId: string) => {
      const res = await fetch(`/api/backups/${backupId}/download`);
      if (!res.ok) throw new Error("Erro ao baixar backup");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `myexpenses-backup-${backupId}.json`;

      // Dispara download no navegador
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao baixar backup", description: error.message, variant: "destructive" });
    },
  });
}

// ── Restaurar ─────────────────────────────────────────────────────────────────
export function useRestaurarBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (backupId: string): Promise<RestaurarBackupResponse> => {
      const res = await fetch(`/api/backups/${backupId}/restaurar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ confirmar: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao restaurar backup" }));
        throw new Error(err.error || "Erro ao restaurar backup");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Backup restaurado com sucesso!", description: "Todos os seus dados foram restaurados." });
      // Invalida TUDO — restauração afeta praticamente todas as queries do app
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao restaurar backup", description: error.message, variant: "destructive" });
    },
  });
}

// ── Excluir ───────────────────────────────────────────────────────────────────
export function useExcluirBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (backupId: string) => {
      const res = await fetch(`/api/backups/${backupId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao excluir backup" }));
        throw new Error(err.error || "Erro ao excluir backup");
      }
    },
    onSuccess: (_, backupId) => {
      queryClient.setQueryData<BackupListItem[]>(QUERY_KEY, (prev = []) =>
        prev.filter((b) => b.id !== backupId)
      );
      toast({ title: "Backup removido com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir backup", description: error.message, variant: "destructive" });
    },
  });
}