// src/components/ajustes/ImportarDadosCard.tsx

"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useImport, STATUS_COLORS, STATUS_ICONS } from "@/hooks/useImport";
import type { ExportFile } from "@/types/export";
import type { ImportValidationResult, EstrategiaConflito } from "@/types/import";
import { cn } from "@/lib/utils";
import {
  Upload,
  FileJson,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Play,
  RotateCcw,
  Shield,
  Info,
  AlertTriangle,
} from "lucide-react";

export default function ImportarDadosCard() {
  const importHook = useImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do fluxo
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<ExportFile | null>(null);
  const [validacao, setValidacao] = useState<ImportValidationResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [estrategia, setEstrategia] = useState<EstrategiaConflito>("skip");
  const [importado, setImportado] = useState(false);

  // Passo 1: Upload do arquivo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setDados(null);
    setValidacao(null);
    setImportado(false);

    // Upload automático
    importHook.upload.mutate(
      { file },
      {
        onSuccess: (response) => {
          setDados(response.dados);
          
          // Validar automaticamente
          importHook.validar.mutate(
            {
              dados: response.dados,
              estrategiaPadrao: estrategia,
            },
            {
              onSuccess: (validacaoResponse) => {
                setValidacao(validacaoResponse.validacao);
                setSessionId(validacaoResponse.sessionId);
              },
            }
          );
        },
        onError: () => {
          setArquivo(null);
        },
      }
    );
  };

  // Passo 2: Processar importação
  const handleProcessar = () => {
    if (!dados) return;

    importHook.processar.mutate(
      {
        dados,
        estrategiaConflito: estrategia,
        criarBackup: true,
      },
      {
        onSuccess: () => {
          setImportado(true);
        },
      }
    );
  };

  // Resetar fluxo
  const handleReset = () => {
    setArquivo(null);
    setDados(null);
    setValidacao(null);
    setSessionId(null);
    setImportado(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Determinar passo atual
  const isUploading = importHook.upload.isPending;
  const isValidating = importHook.validar.isPending;
  const isProcessing = importHook.processar.isPending;

  // PASSO 1: UPLOAD
  if (!arquivo) {
    return (
      <div className="space-y-6">
        {/* Alert informativo */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-2">Como funciona a importação:</p>
            <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-400">
              <li>1. Faça upload do arquivo JSON exportado anteriormente</li>
              <li>2. Visualize o preview dos dados a serem importados</li>
              <li>3. Escolha a estratégia para lidar com duplicatas</li>
              <li>4. Confirme e aguarde a importação</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Upload área */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Selecionar Arquivo
            </CardTitle>
            <CardDescription>
              Escolha o arquivo JSON exportado do MyExpenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-muted/50"
              )}
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
                  <p className="text-sm text-muted-foreground">
                    Apenas arquivos .json (máximo 50MB)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avisos de segurança */}
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p>
                <strong>Importante:</strong> Certifique-se de que o arquivo foi exportado do MyExpenses.
                Arquivos de outras fontes podem causar erros.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p>
                <strong>Backup Automático:</strong> Seus dados atuais serão salvos automaticamente antes
                da importação para garantir segurança.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PASSO 2: VALIDANDO
  if (isValidating || (dados && !validacao)) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div>
              <p className="font-medium text-lg">Validando arquivo...</p>
              <p className="text-sm text-muted-foreground">
                Analisando estrutura e detectando conflitos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PASSO 3: PREVIEW + ESCOLHA DE ESTRATÉGIA
  if (validacao && !importado && !isProcessing) {
    const { preview, podeProsseguir, errosCriticos, avisos } = validacao;

    return (
      <div className="space-y-6">
        {/* Resultado da validação */}
        {!podeProsseguir ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Arquivo inválido</p>
              <p className="text-sm mt-1">
                {errosCriticos.length} erro(s) crítico(s) encontrado(s). Corrija o arquivo e tente novamente.
              </p>
            </AlertDescription>
          </Alert>
        ) : avisos.length > 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Arquivo válido com avisos</p>
              <p className="text-sm mt-1">
                {avisos.length} aviso(s) encontrado(s), mas a importação pode prosseguir.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              <p className="font-medium">Arquivo válido!</p>
              <p className="text-sm mt-1">
                Pronto para importar. Revise o preview abaixo antes de continuar.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview dos dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview da Importação
            </CardTitle>
            <CardDescription>
              Resumo dos dados que serão importados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo geral */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {preview.resumo.novos}
                </p>
                <p className="text-sm text-muted-foreground">Novos Registros</p>
              </div>
              <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {preview.resumo.duplicados}
                </p>
                <p className="text-sm text-muted-foreground">Duplicados</p>
              </div>
              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {preview.resumo.invalidos}
                </p>
                <p className="text-sm text-muted-foreground">Inválidos</p>
              </div>
            </div>

            <Separator />

            {/* Detalhes por módulo */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Detalhes por Módulo:</p>
              {preview.modulos.map((modulo) => {
                const detalhe = preview.detalhes[modulo];
                return (
                  <div key={modulo} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium capitalize">{modulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {detalhe.novos} novos • {detalhe.duplicados} duplicados
                      </p>
                    </div>
                    <Badge variant="outline">{detalhe.total} total</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Escolha de estratégia */}
        {podeProsseguir && preview.resumo.duplicados > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Estratégia para Duplicados
              </CardTitle>
              <CardDescription>
                Como deseja lidar com os {preview.resumo.duplicados} registros duplicados?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={estrategia} onValueChange={(v) => setEstrategia(v as EstrategiaConflito)}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="skip" id="skip" />
                    <div className="flex-1">
                      <Label htmlFor="skip" className="font-medium cursor-pointer">
                        Pular Duplicados (Recomendado)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Mantém os dados existentes e adiciona apenas os novos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 opacity-50">
                    <RadioGroupItem value="substituir" id="substituir" disabled />
                    <div className="flex-1">
                      <Label htmlFor="substituir" className="font-medium cursor-pointer">
                        Substituir Existentes <Badge variant="outline" className="ml-2">Em breve</Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sobrescreve os dados existentes com os importados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 opacity-50">
                    <RadioGroupItem value="mesclar" id="mesclar" disabled />
                    <div className="flex-1">
                      <Label htmlFor="mesclar" className="font-medium cursor-pointer">
                        Mesclar Dados <Badge variant="outline" className="ml-2">Em breve</Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adiciona novos e atualiza campos dos existentes
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleProcessar}
            disabled={!podeProsseguir}
            className="flex-1"
            size="lg"
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar Importação
          </Button>
        </div>
      </div>
    );
  }

  // PASSO 4: PROCESSANDO
  if (isProcessing) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div>
              <p className="font-medium text-lg">Importando dados...</p>
              <p className="text-sm text-muted-foreground">
                Isso pode levar alguns instantes
              </p>
            </div>
            <Progress value={45} className="w-full max-w-xs mt-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // PASSO 5: RESULTADO
  if (importado) {
    const resultado = importHook.processar.data?.resultado;

    return (
      <div className="space-y-6">
        {/* Status */}
        {resultado?.sucesso ? (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              <p className="font-medium">Importação concluída com sucesso!</p>
              <p className="text-sm mt-1">
                {resultado.resumo.importados} registros foram importados.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Importação concluída com erros</p>
              <p className="text-sm mt-1">
                {resultado?.resumo.erros || 0} erro(s) encontrado(s).
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Resumo */}
        {resultado && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Importação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {resultado.resumo.importados}
                  </p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {resultado.resumo.pulados}
                  </p>
                  <p className="text-sm text-muted-foreground">Pulados</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {resultado.resumo.erros}
                  </p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              </div>

              <Separator />

              {/* Detalhes por módulo */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Detalhes por Módulo:</p>
                {resultado.modulos.map((modulo) => {
                  const detalhe = resultado.detalhes[modulo];
                  return (
                    <div key={modulo} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium capitalize">{modulo}</p>
                        <p className="text-xs text-muted-foreground">
                          {detalhe.importados} importados • {detalhe.pulados} pulados • {detalhe.erros} erros
                        </p>
                      </div>
                      {detalhe.sucesso ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nova importação */}
        <Button onClick={handleReset} className="w-full" size="lg">
          <Upload className="mr-2 h-4 w-4" />
          Importar Outro Arquivo
        </Button>
      </div>
    );
  }

  return null;
}