// src/components/ajustes/ImportarDadosCard.tsx

"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Upload,
  FileJson,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

interface ArquivoLido {
  raw:        any;
  filename:   string;
  statistics: Record<string, number>;
}

interface ResultadoImportacao {
  resultados:     { modulo: string; importados: number }[];
  totalImportado: number;
}

/**
 * ✅ REESCRITO DO ZERO.
 *
 * Fluxo simplificado: selecionar arquivo → ler e mostrar contagem de
 * registros → confirmar explicitamente (operação destrutiva) → processar
 * via POST /api/import/processar → exibir resultado.
 *
 * Removido: barra de progresso falsa, sessionId/polling de status (que
 * dependia de um Map em memória não confiável em ambiente serverless),
 * estratégias "substituir"/"mesclar" que nunca foram implementadas, e
 * o preview detalhado por módulo que não cobria a maior parte das
 * tabelas reais.
 */
export default function ImportarDadosCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient  = useQueryClient();

  const [arquivo,      setArquivo]      = useState<ArquivoLido | null>(null);
  const [confirmText,  setConfirmText]  = useState("");
  const [processando,  setProcessando]  = useState(false);
  const [resultado,    setResultado]    = useState<ResultadoImportacao | null>(null);
  const [erro,         setErro]         = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setResultado(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json?.data || json?.metadata?.appName !== "MyExpenses") {
        setErro("Arquivo não reconhecido como um export válido do MyExpenses.");
        return;
      }

      setArquivo({
        raw:        json,
        filename:   file.name,
        statistics: json.statistics || {},
      });
    } catch {
      setErro("Não foi possível ler o arquivo. Verifique se é um JSON válido.");
    }
  }

  async function handleConfirmarImportacao() {
    if (!arquivo) return;
    setProcessando(true);
    setErro(null);

    try {
      const res = await fetch("/api/import/processar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ dados: arquivo.raw, confirmar: true }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao processar importação");

      setResultado(json);
      toast.success("Importação concluída com sucesso!", {
        description: `${json.totalImportado} registros importados.`,
      });

      // Restauração afeta praticamente todas as telas do app
      queryClient.invalidateQueries();
    } catch (error: any) {
      setErro(error.message);
      toast.error("Erro ao importar dados", { description: error.message });
    } finally {
      setProcessando(false);
    }
  }

  function handleReset() {
    setArquivo(null);
    setConfirmText("");
    setResultado(null);
    setErro(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const totalRegistros = arquivo
    ? Object.entries(arquivo.statistics)
        .filter(([k]) => !["tamanhoBytes", "tamanhoFormatado"].includes(k))
        .reduce((acc, [, v]) => acc + (typeof v === "number" ? v : 0), 0)
    : 0;

  // ── RESULTADO ──────────────────────────────────────────────────────────────
  if (resultado) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            <p className="font-medium">Importação concluída com sucesso!</p>
            <p className="text-sm mt-1">{resultado.totalImportado} registros foram importados.</p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes por módulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resultado.resultados.map((r) => (
              <div key={r.modulo} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                <span className="capitalize">{r.modulo.replace(/_/g, " ")}</span>
                <span className="font-medium">{r.importados} registros</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={handleReset} className="w-full" size="lg">
          <Upload className="mr-2 h-4 w-4" />
          Importar outro arquivo
        </Button>
      </div>
    );
  }

  // ── CONFIRMAÇÃO (arquivo já lido) ────────────────────────────────────────────
  if (arquivo) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Esta ação substitui todos os seus dados atuais</p>
            <p className="text-sm mt-1">
              Categorias, contas, cartões, transações e demais informações serão
              completamente substituídos pelo conteúdo deste arquivo. Essa operação
              não pode ser desfeita.
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {arquivo.filename}
            </CardTitle>
            <CardDescription>{totalRegistros} registros encontrados no arquivo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(arquivo.statistics)
                .filter(([k, v]) => !["tamanhoBytes", "tamanhoFormatado"].includes(k) && typeof v === "number")
                .map(([modulo, total]) => (
                  <div key={modulo} className="p-2.5 rounded-lg border">
                    <p className="text-muted-foreground capitalize text-xs">{modulo}</p>
                    <p className="font-semibold">{total as number}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <div>
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1.5">
            Digite <strong>SUBSTITUIR</strong> para confirmar
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="SUBSTITUIR"
          />
        </div>

        {erro && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1" disabled={processando}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmarImportacao}
            disabled={confirmText !== "SUBSTITUIR" || processando}
            className="flex-1"
          >
            {processando ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Confirmar importação</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── UPLOAD (estado inicial) ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
          Use um arquivo gerado pela exportação do MyExpenses (aba Exportar) ou um
          backup baixado em Configurações de backup. A importação substitui
          completamente os dados atuais — considere exportar seus dados antes,
          caso queira manter uma cópia.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Selecionar arquivo
          </CardTitle>
          <CardDescription>Escolha o arquivo JSON exportado do MyExpenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-primary/10">
                <FileJson className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Clique para selecionar o arquivo</p>
                <p className="text-sm text-muted-foreground">Apenas arquivos .json</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {erro && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}