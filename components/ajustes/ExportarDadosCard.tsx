// src/components/ajustes/ExportarDadosCard.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Loader2,
  CheckCircle2,
  Info,
  Shield,
  Package,
} from "lucide-react";
import { toast } from "sonner";

/**
 * ✅ REESCRITO: simplificado para uma única ação de exportação completa.
 * As seções de "seletivo" e "por período" foram removidas porque
 * dependiam de rotas de API (/api/export/seletivo, /api/export/periodo)
 * que nunca existiram — os botões correspondentes resultavam em erro
 * 404 em produção. O histórico de exportações (armazenado em
 * localStorage) também foi removido, já que não tinha relação com os
 * dados reais no servidor e não acrescentava valor.
 *
 * Para histórico real de backups, veja o BackupsCard (backup automático
 * semanal, com histórico persistido no Postgres).
 */
export default function ExportarDadosCard() {
  const [exportando, setExportando] = useState(false);

  async function handleExportar() {
    setExportando(true);
    try {
      const res = await fetch("/api/export/meus-dados");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao exportar dados" }));
        throw new Error(err.error || "Erro ao exportar dados");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] || `myexpenses-export-${Date.now()}.json`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!", {
        description: `Arquivo: ${filename}`,
      });
    } catch (error: any) {
      toast.error("Erro ao exportar dados", { description: error.message });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
          O arquivo gerado contém todos os seus dados (categorias, contas, cartões,
          transações, faturas, notas e demais informações) e pode ser usado para
          restaurar ou migrar seus dados posteriormente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Exportar Todos os Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground max-w-md">
              Gera um arquivo JSON com o backup completo dos seus dados, baixado
              diretamente para o seu dispositivo.
            </p>
            <Button onClick={handleExportar} disabled={exportando} size="lg">
              {exportando ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exportando...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" />Exportar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-base">Informações de Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p>
              <strong>Privacidade:</strong> o arquivo contém apenas os seus dados e
              não inclui senhas ou tokens de autenticação.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p>
              <strong>Armazenamento:</strong> o arquivo é baixado diretamente para o
              seu dispositivo — nenhuma cópia adicional fica em nossos servidores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}