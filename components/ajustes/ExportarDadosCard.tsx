// src/components/ajustes/ExportarDadosCard.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExport } from "@/hooks/useExport";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ModuloExport } from "@/types/export";
import {
  Download,
  Loader2,
  CheckCircle2,
  Info,
  Shield,
  AlertCircle,
  Trash2,
  Calendar as CalendarIcon,
  FileJson,
  Package,
  Clock,
} from "lucide-react";

const MODULOS_DISPONIVEIS: { value: ModuloExport; label: string; description: string }[] = [
  { value: "categorias", label: "Categorias", description: "Suas categorias personalizadas" },
  { value: "contas", label: "Contas", description: "Contas bancárias e carteiras" },
  { value: "cartoes", label: "Cartões", description: "Cartões de crédito" },
  { value: "transacoes", label: "Transações", description: "Histórico completo de transações" },
  { value: "faturas", label: "Faturas", description: "Faturas dos cartões" },
  { value: "extrato", label: "Extrato", description: "Extrato detalhado das contas" },
  { value: "notificacoes", label: "Notificações", description: "Histórico de notificações" },
  { value: "preferencias", label: "Preferências", description: "Suas configurações" },
];

export default function ExportarDadosCard() {
  const exportHook = useExport();

  // Export Seletivo
  const [modulosSelecionados, setModulosSelecionados] = useState<ModuloExport[]>([]);

  // Export por Período
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();

  // Handlers
  const handleToggleModulo = (modulo: ModuloExport) => {
    setModulosSelecionados((prev) =>
      prev.includes(modulo) ? prev.filter((m) => m !== modulo) : [...prev, modulo]
    );
  };

  const handleSelecionarTodos = () => {
    if (modulosSelecionados.length === MODULOS_DISPONIVEIS.length) {
      setModulosSelecionados([]);
    } else {
      setModulosSelecionados(MODULOS_DISPONIVEIS.map((m) => m.value));
    }
  };

  const handleExportCompleto = () => {
    exportHook.completo.mutate({ formato: "json" });
  };

  const handleExportSeletivo = () => {
    if (modulosSelecionados.length === 0) {
      return;
    }

    exportHook.seletivo.mutate({
      modulos: modulosSelecionados,
      formato: "json",
    });
  };

  const handleExportPeriodo = () => {
    if (!dataInicio || !dataFim) {
      return;
    }

    exportHook.periodo.mutate({
      inicio: format(dataInicio, "yyyy-MM-dd"),
      fim: format(dataFim, "yyyy-MM-dd"),
      formato: "json",
    });
  };

  const handleLimparHistorico = () => {
    if (confirm("Tem certeza que deseja limpar todo o histórico de exportações?")) {
      exportHook.limparHistorico.mutate();
    }
  };

  const handleRemoverItem = (id: string) => {
    exportHook.removerDoHistorico.mutate(id);
  };

  const historico = exportHook.historico.data || [];

  return (
    <div className="space-y-6">
      {/* Info sobre o backup */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-2">Exporte seus dados de forma segura:</p>
          <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-400">
            <li>• <strong>Completo:</strong> Todos os seus dados</li>
            <li>• <strong>Seletivo:</strong> Apenas os módulos escolhidos</li>
            <li>• <strong>Por Período:</strong> Transações de uma data específica</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Accordion com 3 seções */}
      <Accordion type="single" collapsible defaultValue="completo" className="space-y-4">
        
        {/* SEÇÃO 1: EXPORT COMPLETO */}
        <AccordionItem value="completo" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Export Completo</p>
                <p className="text-sm text-muted-foreground">Baixe todos os seus dados</p>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4 space-y-4">
            <Separator />
            
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 dark:bg-muted/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Exportar Todos os Dados</p>
                  <Badge variant="secondary" className="text-xs">JSON</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Backup completo: categorias, contas, transações, faturas, etc.
                </p>
              </div>

              <Button
                onClick={handleExportCompleto}
                disabled={exportHook.completo.isPending}
                size="lg"
              >
                {exportHook.completo.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </>
                )}
              </Button>
            </div>

            {/* Informações */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  O arquivo contém <strong>todos os seus dados</strong> e será baixado automaticamente
                  em formato JSON. Não inclui informações sensíveis como senhas.
                </p>
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* SEÇÃO 2: EXPORT SELETIVO */}
        <AccordionItem value="seletivo" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Export Seletivo</p>
                <p className="text-sm text-muted-foreground">Escolha os módulos a exportar</p>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4 space-y-4">
            <Separator />

            {/* Selecionar todos */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Selecionar Módulos</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelecionarTodos}
              >
                {modulosSelecionados.length === MODULOS_DISPONIVEIS.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
            </div>

            {/* Grid de módulos */}
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULOS_DISPONIVEIS.map((modulo) => (
                <div
                  key={modulo.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    modulosSelecionados.includes(modulo.value)
                      ? "bg-primary/5 border-primary"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleToggleModulo(modulo.value)}
                >
                  <Checkbox
                    id={modulo.value}
                    checked={modulosSelecionados.includes(modulo.value)}
                    onCheckedChange={() => handleToggleModulo(modulo.value)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={modulo.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {modulo.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{modulo.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Botão exportar */}
            <Button
              onClick={handleExportSeletivo}
              disabled={modulosSelecionados.length === 0 || exportHook.seletivo.isPending}
              className="w-full"
              size="lg"
            >
              {exportHook.seletivo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando {modulosSelecionados.length} módulo(s)...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar {modulosSelecionados.length} Módulo(s)
                </>
              )}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* SEÇÃO 3: EXPORT POR PERÍODO */}
        <AccordionItem value="periodo" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Export por Período</p>
                <p className="text-sm text-muted-foreground">Transações de uma data específica</p>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4 space-y-4">
            <Separator />

            {/* Seleção de datas */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      disabled={(date) => dataInicio ? date < dataInicio : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Info sobre período */}
            {dataInicio && dataFim && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    Serão exportadas as transações entre{" "}
                    <strong>{format(dataInicio, "dd/MM/yyyy")}</strong> e{" "}
                    <strong>{format(dataFim, "dd/MM/yyyy")}</strong>.
                    Categorias, contas e cartões serão incluídos automaticamente.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Botão exportar */}
            <Button
              onClick={handleExportPeriodo}
              disabled={!dataInicio || !dataFim || exportHook.periodo.isPending}
              className="w-full"
              size="lg"
            >
              {exportHook.periodo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando Período...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Período
                </>
              )}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* SEÇÃO 4: HISTÓRICO */}
        <AccordionItem value="historico" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Histórico de Exportações</p>
                <p className="text-sm text-muted-foreground">Últimas {historico.length} exportações</p>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="px-4 pb-4 space-y-4">
            <Separator />

            {historico.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma exportação realizada ainda. Faça seu primeiro backup!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {historico.length} exportaç{historico.length === 1 ? "ão" : "ões"} realizad{historico.length === 1 ? "a" : "as"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLimparHistorico}
                    disabled={exportHook.limparHistorico.isPending}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Limpar Histórico
                  </Button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {historico.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileJson className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.filename}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                            {item.tamanho && (
                              <>
                                <span>•</span>
                                <span>{(item.tamanho / 1024 / 1024).toFixed(2)} MB</span>
                              </>
                            )}
                            {item.status && (
                              <>
                                <span>•</span>
                                <Badge
                                  variant={item.status === "concluido" ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {item.status}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Informações de Segurança */}
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
              <strong>Privacidade:</strong> O arquivo contém apenas os seus dados e não inclui
              informações sensíveis como senhas.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p>
              <strong>Armazenamento:</strong> O arquivo é baixado diretamente para o seu dispositivo.
              Nenhuma cópia fica em nossos servidores.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p>
              <strong>Backup:</strong> Recomendamos fazer backups regulares e armazená-los em local
              seguro (nuvem criptografada, HD externo, etc).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}