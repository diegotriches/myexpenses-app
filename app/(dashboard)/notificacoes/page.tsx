// src/app/(dashboard)/ajustes/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PreferenciasCard from "@/components/ajustes/PreferenciasCard";
import ExportarDadosCard from "@/components/ajustes/ExportarDadosCard";
import ImportarDadosCard from "@/components/ajustes/ImportarDadosCard";
import BackupsCard from "@/components/ajustes/BackupsCard";
import { usePreferences } from "@/hooks/usePreferences";
import {
  Settings,
  AlertCircle,
  Download,
  Upload,
  Sliders,
} from "lucide-react";
import { BsFillGearFill } from "react-icons/bs";

const TABS_VALIDAS = ["preferencias", "exportar", "importar"] as const;
type TabValida = typeof TABS_VALIDAS[number];

export default function AjustesPage() {
  const { data: preferencias, isLoading: loading, error: queryError } = usePreferences();
  const searchParams = useSearchParams();

  // ✅ NOVO: lê ?tab= da URL para abrir direto na aba correta
  // (usado pelos links de notificação, ex: /ajustes?tab=exportar)
  const tabParam = searchParams.get("tab");
  const tabInicial: TabValida =
    tabParam && TABS_VALIDAS.includes(tabParam as TabValida)
      ? (tabParam as TabValida)
      : "preferencias";

  const [activeTab, setActiveTab] = useState<TabValida>(tabInicial);

  // Atualiza a aba ativa se o usuário navegar para a página já aberta
  // com um ?tab= diferente (ex: clicar em outra notificação)
  useEffect(() => {
    if (tabParam && TABS_VALIDAS.includes(tabParam as TabValida)) {
      setActiveTab(tabParam as TabValida);
    }
  }, [tabParam]);

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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValida)} className="space-y-6">
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

          {/* ✅ NOVO: Backups automáticos (substitui o card do Google Drive) */}
          <BackupsCard />
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