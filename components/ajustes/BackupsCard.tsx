"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DatabaseBackup,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  HardDrive,
  Settings2,
} from "lucide-react";
import {
  useBackups,
  useDownloadBackup,
  useRestaurarBackup,
  useExcluirBackup,
} from "@/hooks/useBackups";
import {
  usePreferences,
  useAtualizarPreferences,
} from "@/hooks/usePreferences";
import type { BackupListItem } from "@/types/backup";
import type { BackupFrequencia } from "@/types/preferences";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const DIAS_SEMANA = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda" },
  { value: "2", label: "Terça" },
  { value: "3", label: "Quarta" },
  { value: "4", label: "Quinta" },
  { value: "5", label: "Sexta" },
  { value: "6", label: "Sábado" },
];

const FREQUENCIA_LABEL: Record<BackupFrequencia, string> = {
  diario: "Diário (ao fazer alterações)",
  semanal: "Semanal",
  mensal: "Mensal",
  desativado: "Desativado",
};

export default function BackupsCard() {
  const { data: backups = [], isLoading } = useBackups();
  const downloadBackup = useDownloadBackup();
  const restaurarBackup = useRestaurarBackup();
  const excluirBackup = useExcluirBackup();

  const { data: prefs } = usePreferences();
  const updatePrefs = useAtualizarPreferences();

  const backupAtivo = prefs?.backupAutomatico ?? true;
  const frequencia = (prefs?.backupFrequencia ?? "semanal") as BackupFrequencia;
  const diaSemana = prefs?.backupDiaSemana ?? 0;
  const diaMes = prefs?.backupDiaMes ?? 1;
  const quantidadeMaxima = prefs?.backupQuantidadeMaxima ?? 8;

  const [backupRestaurar, setBackupRestaurar] = useState<BackupListItem | null>(
    null,
  );
  const [backupExcluir, setBackupExcluir] = useState<BackupListItem | null>(
    null,
  );
  const [confirmText, setConfirmText] = useState("");

  async function handleConfirmarRestauracao() {
    if (!backupRestaurar) return;
    await restaurarBackup.mutateAsync(backupRestaurar.id);
    setBackupRestaurar(null);
    setConfirmText("");
  }

  async function handleConfirmarExclusao() {
    if (!backupExcluir) return;
    await excluirBackup.mutateAsync(backupExcluir.id);
    setBackupExcluir(null);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* ── Status e toggle ─────────────────────────────────────────── */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <DatabaseBackup className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Backup automático
                  </p>
                  {backupAtivo && frequencia !== "desativado" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <span className="text-xs text-gray-400">(desativado)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="backup-toggle"
                    className="text-xs text-gray-500 cursor-pointer"
                  >
                    {backupAtivo ? "Ativado" : "Desativado"}
                  </Label>
                  <Switch
                    id="backup-toggle"
                    checked={backupAtivo}
                    disabled={updatePrefs.isPending}
                    onCheckedChange={(checked) =>
                      updatePrefs.mutate({ backupAutomatico: checked })
                    }
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {backupAtivo && frequencia !== "desativado"
                  ? `Backup ${FREQUENCIA_LABEL[frequencia].toLowerCase()} ativo. As últimas ${quantidadeMaxima} versões ficam disponíveis abaixo.`
                  : "O backup automático está desativado. Exporte seus dados manualmente quando quiser."}
              </p>
            </div>
          </div>

          {/* ── Configuração de frequência ───────────────────────────────── */}
          {backupAtivo && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Frequência do backup
                </span>
              </div>

              {/* Seletor de frequência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                    Frequência
                  </label>
                  <Select
                    value={frequencia}
                    onValueChange={(v) =>
                      updatePrefs.mutate({
                        backupFrequencia: v as BackupFrequencia,
                      })
                    }
                    disabled={updatePrefs.isPending}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">
                        Diário (ao fazer alterações)
                      </SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dia da semana — visível apenas para semanal */}
                {frequencia === "semanal" && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      Dia da semana
                    </label>
                    <Select
                      value={String(diaSemana)}
                      onValueChange={(v) =>
                        updatePrefs.mutate({ backupDiaSemana: Number(v) })
                      }
                      disabled={updatePrefs.isPending}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIAS_SEMANA.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dia do mês — visível apenas para mensal */}
                {frequencia === "mensal" && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      Dia do mês
                    </label>
                    <Select
                      value={String(diaMes)}
                      onValueChange={(v) =>
                        updatePrefs.mutate({ backupDiaMes: Number(v) })
                      }
                      disabled={updatePrefs.isPending}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (d) => (
                            <SelectItem key={d} value={String(d)}>
                              Dia {d}
                              {d === 1 ? " (padrão)" : ""}
                            </SelectItem>
                          ),
                        )}
                        <SelectItem value="29">Dia 29</SelectItem>
                        <SelectItem value="30">Dia 30</SelectItem>
                        <SelectItem value="31">
                          Dia 31 (último dia do mês)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {diaMes > 28 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Meses com menos dias usarão o último dia disponível.
                      </p>
                    )}
                  </div>
                )}

                {/* Info — diário */}
                {frequencia === "diario" && (
                  <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 col-span-full">
                    <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
                      O backup diário é gerado automaticamente uma vez por dia
                      quando você fizer alguma alteração no app.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* ✅ NOVO: bloco separado, irmão do bloco de frequência acima — mesma
    condição {backupAtivo}, mas independente dela (não depende de qual
    frequência está selecionada) */}
          {backupAtivo && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <DatabaseBackup className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade de backups mantidos
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                  Versões mais antigas são removidas automaticamente
                </label>
                <Select
                  value={String(quantidadeMaxima)}
                  onValueChange={(v) =>
                    updatePrefs.mutate({ backupQuantidadeMaxima: Number(v) })
                  }
                  disabled={updatePrefs.isPending}
                >
                  <SelectTrigger className="text-sm max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} backup{n !== 1 ? "s" : ""}
                        {n === 8 ? " (padrão)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* ── Histórico de backups ─────────────────────────────────────── */}
          {backups.length === 0 ? (
            <div className="text-center py-6">
              <DatabaseBackup
                className="mx-auto mb-3 text-gray-300 dark:text-gray-700"
                size={36}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum backup gerado ainda
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                O primeiro backup será criado automaticamente conforme a
                frequência configurada
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup, index) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      <Calendar
                        size={15}
                        className="text-gray-500 dark:text-gray-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(
                            new Date(backup.createdAt),
                            "dd 'de' MMMM 'de' yyyy",
                            { locale: ptBR },
                          )}
                        </p>
                        {index === 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                            Mais recente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {format(new Date(backup.createdAt), "HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={11} />
                          {formatBytes(backup.tamanhoBytes)}
                        </span>
                        {backup.estatisticas?.transacoes !== undefined && (
                          <span>
                            {backup.estatisticas.transacoes} transações
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={() => downloadBackup.mutate(backup.id)}
                      disabled={downloadBackup.isPending}
                      title="Baixar backup"
                    >
                      {downloadBackup.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Download size={15} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400"
                      onClick={() => setBackupRestaurar(backup)}
                      title="Restaurar este backup"
                    >
                      <RotateCcw size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => setBackupExcluir(backup)}
                      title="Excluir backup"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal restaurar */}
      <Dialog
        open={!!backupRestaurar}
        onOpenChange={(v) => {
          if (!v) {
            setBackupRestaurar(null);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={18} />
              Restaurar backup
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados
              atuais serão substituídos pelos dados do backup selecionado.
            </DialogDescription>
          </DialogHeader>
          {backupRestaurar && (
            <div className="py-2 space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Backup de:</span>
                  <span className="font-medium">
                    {format(
                      new Date(backupRestaurar.createdAt),
                      "dd/MM/yyyy 'às' HH:mm",
                      { locale: ptBR },
                    )}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Tamanho:</span>
                  <span>{formatBytes(backupRestaurar.tamanhoBytes)}</span>
                </div>
              </div>
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Todos os dados criados após esta data serão perdidos
                  permanentemente.
                </AlertDescription>
              </Alert>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
                  Digite <strong>RESTAURAR</strong> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="RESTAURAR"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBackupRestaurar(null);
                setConfirmText("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarRestauracao}
              disabled={
                confirmText !== "RESTAURAR" || restaurarBackup.isPending
              }
            >
              {restaurarBackup.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw size={14} className="mr-2" />
                  Restaurar backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal excluir */}
      <Dialog
        open={!!backupExcluir}
        onOpenChange={(v) => {
          if (!v) setBackupExcluir(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 size={18} />
              Excluir backup
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O backup será removido
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBackupExcluir(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarExclusao}
              disabled={excluirBackup.isPending}
            >
              {excluirBackup.isPending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 size={14} className="mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
