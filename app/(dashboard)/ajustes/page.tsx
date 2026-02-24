// src/app/(dashboard)/ajustes/page.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PreferenciasCard from "@/components/ajustes/PreferenciasCard";
import ExportarDadosCard from "@/components/ajustes/ExportarDadosCard";
import ImportarDadosCard from "@/components/ajustes/ImportarDadosCard";
import { usePreferences } from "@/hooks/usePreferences";
import { useGoogleDriveStatus } from "@/hooks/useGoogleDriveStatus";
import {
  Settings,
  AlertCircle,
  Download,
  Upload,
  Sliders,
  CloudUpload,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";
import { BsFillGearFill } from "react-icons/bs";
import { FaGoogleDrive } from "react-icons/fa";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AjustesPage() {
  const { data: preferencias, isLoading: loading, error: queryError } = usePreferences();
  const { data: driveStatus, isLoading: loadingDrive } = useGoogleDriveStatus();
  const [activeTab, setActiveTab] = useState("preferencias");

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

  // ── Card de backup automático com 3 estados reais ─────────────────────────

  const renderBackupCard = () => {
    // Enquanto carrega, mostra skeleton sutil
    if (loadingDrive) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // ✅ Estado 1: Drive autorizado corretamente
    if (driveStatus?.temDriveAutorizado) {
      return (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                <FaGoogleDrive className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Backup automático no Google Drive ativado
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Seus dados são salvos automaticamente toda semana na pasta{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    "MyExpenses Backups"
                  </span>{" "}
                  do seu Google Drive. Os últimos 4 backups são mantidos automaticamente.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Você também receberá uma notificação no app após cada backup.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // ⚠️ Estado 2: Tem conta Google mas precisa reautorizar (fez login antes do scope Drive)
    if (driveStatus?.temContaGoogle && driveStatus?.precisaReautorizar) {
      return (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Permissão do Google Drive necessária
                    </p>
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Você usa o login com Google, mas ainda não autorizou o acesso ao Drive.
                    Faça login novamente para ativar o backup automático semanal.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30"
                  onClick={() => signIn("google", { callbackUrl: "/ajustes" })}
                >
                  <FaGoogleDrive className="h-4 w-4 mr-2" />
                  Autorizar Google Drive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // ℹ️ Estado 3: Sem conta Google — backup indisponível
    return (
      <Card className="border-gray-200 bg-gray-50/50 dark:bg-gray-900/50 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              <CloudUpload className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Backup automático no Google Drive
                </p>
                <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Disponível para usuários que fazem login com Google. Seus dados seriam
                salvos automaticamente toda semana na pasta{" "}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  "MyExpenses Backups"
                </span>{" "}
                do seu Drive, sem nenhuma ação necessária da sua parte.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Enquanto isso, você pode exportar seus dados manualmente usando as opções acima.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
          Gerencie suas preferências, backup e importação de dados
        </p>
      </div>

      <Separator />

      {/* Error Alert */}
      {queryError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {queryError instanceof Error ? queryError.message : "Erro ao carregar preferências"}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="preferencias" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Preferências</span>
          </TabsTrigger>
          <TabsTrigger value="exportar" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </TabsTrigger>
          <TabsTrigger value="importar" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar</span>
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
              {preferencias && (
                <PreferenciasCard preferencias={preferencias} />
              )}
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

        {/* TAB 2: EXPORTAR DADOS */}
        <TabsContent value="exportar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Exportar Dados</CardTitle>
              </div>
              <CardDescription>
                Faça backup dos seus dados financeiros de forma segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportarDadosCard />
            </CardContent>
          </Card>

          {/* Card: Backup Automático Google Drive */}
          {renderBackupCard()}
        </TabsContent>

        {/* TAB 3: IMPORTAR DADOS */}
        <TabsContent value="importar" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle>Importar Dados</CardTitle>
              </div>
              <CardDescription>
                Restaure seus dados a partir de um backup anterior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportarDadosCard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}