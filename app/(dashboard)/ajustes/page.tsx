// src/app/(protected)/ajustes/page.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PreferenciasCard from "@/components/ajustes/PreferenciasCard";
import {
  Settings,
  AlertCircle,
  Download,
  Database,
  Shield,
  Info,
  CheckCircle2,
  Loader2,
  Sliders,
} from "lucide-react";
import { BsFillGearFill } from "react-icons/bs";
import { useToast } from "@/hooks/use-toast";

interface Preferencias {
  tema?: "light" | "dark" | "system";
  idioma?: string;
  moeda?: string;
  notificacoes?: boolean;
}

export default function AjustesPage() {
  const [preferencias, setPreferencias] = useState<Preferencias>({
    tema: "system",
    idioma: "pt-BR",
    moeda: "BRL",
    notificacoes: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("preferencias");
  const { toast } = useToast();

  useEffect(() => {
    carregarPreferencias();
    carregarUltimoExport();
  }, []);

  const carregarPreferencias = async () => {
    try {
      setLoading(true);
      setError(null);

      try {
        const resPreferencias = await api.get("/users/preferencias");
        if (resPreferencias.data) {
          setPreferencias(resPreferencias.data);
        }
      } catch (err) {
        console.log("Usando preferências padrão");
      }
    } catch (err: any) {
      console.error("Erro ao carregar preferências:", err);
      setError(err.response?.data?.message || "Erro ao carregar preferências.");
    } finally {
      setLoading(false);
    }
  };

  const carregarUltimoExport = () => {
    const lastExportDate = localStorage.getItem("lastExportDate");
    if (lastExportDate) {
      setLastExport(lastExportDate);
    }
  };

  const atualizarPreferencias = (dados: Partial<Preferencias>) => {
    setPreferencias((prev) => ({ ...prev, ...dados }));
  };

  const handleExportarDados = async () => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/export/meus-dados");

      if (!response.ok) {
        throw new Error("Erro ao exportar dados");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `myexpenses-backup-${Date.now()}.json`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      setLastExport(now);
      localStorage.setItem("lastExportDate", now);

      toast({
        title: "Dados exportados com sucesso!",
        description: `Arquivo salvo: ${filename}`,
      });
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro ao exportar dados",
        description: "Não foi possível realizar o export. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <BsFillGearFill className="text-2xl md:text-3xl text-blue-700 dark:text-blue-400" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Ajustes
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie suas preferências, backup de dados e configurações do sistema
        </p>
      </div>

      <Separator />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="preferencias" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup de Dados
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PREFERÊNCIAS */}
        <TabsContent value="preferencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} className="text-blue-600 dark:text-blue-400" />
                Preferências do Sistema
              </CardTitle>
              <CardDescription>
                Configure a aparência e o comportamento do aplicativo de acordo com suas preferências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferenciasCard
                preferencias={preferencias}
                atualizarPreferencias={atualizarPreferencias}
              />
            </CardContent>
          </Card>

          {/* Card informativo */}
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Procurando por outras configurações?
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Suas informações pessoais, foto de perfil e configurações de segurança estão na página{" "}
                    <a href="/perfil" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline">
                      Meu Perfil
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: BACKUP DE DADOS */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Backup de Dados</CardTitle>
              </div>
              <CardDescription>
                Exporte todos os seus dados financeiros em formato JSON
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Info sobre o backup */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-2">O que será exportado:</p>
                  <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-400">
                    <li>• Todas as suas contas e cartões</li>
                    <li>• Histórico completo de transações</li>
                    <li>• Categorias personalizadas</li>
                    <li>• Faturas e transferências</li>
                    <li>• Extrato detalhado</li>
                    <li>• Notificações e preferências</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Botão de exportar */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 dark:bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Exportar Meus Dados</p>
                    <Badge variant="secondary" className="text-xs">
                      JSON
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Baixe uma cópia completa de todos os seus dados
                  </p>
                  {lastExport && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      Último export: {new Date(lastExport).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleExportarDados}
                  disabled={isExporting}
                  size="lg"
                  className="min-w-[140px]"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Dados
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Informações de segurança */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>Informações de Segurança</span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <p>
                      <strong>Privacidade:</strong> O arquivo contém apenas os seus dados e não
                      inclui informações sensíveis como senhas.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <p>
                      <strong>Armazenamento:</strong> O arquivo é baixado diretamente para o seu
                      dispositivo. Nenhuma cópia fica armazenada em nossos servidores.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <p>
                      <strong>Backup:</strong> Recomendamos fazer backups regulares e armazenar o
                      arquivo em local seguro (nuvem criptografada, HD externo, etc).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p>
                      <strong>Atenção:</strong> Este arquivo pode ser usado para restaurar seus dados
                      em caso de perda, mas não há uma função automática de restauração implementada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Formato do arquivo */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Formato do Arquivo</p>
                  <p className="text-sm text-muted-foreground">
                    O arquivo é exportado em formato JSON (JavaScript Object Notation), um padrão
                    universal para troca de dados. Você pode visualizá-lo em qualquer editor de texto
                    ou importá-lo em outras aplicações.
                  </p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}