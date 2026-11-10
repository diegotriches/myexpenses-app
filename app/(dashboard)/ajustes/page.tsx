"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import PreferenciasCard from "@/components/ajustes/PreferenciasCard";
import ExportarDadosCard from "@/components/ajustes/ExportarDadosCard";
import ImportarDadosCard from "@/components/ajustes/ImportarDadosCard";
import BackupsCard from "@/components/ajustes/BackupsCard";
import {
  Settings,
  AlertCircle,
  Download,
  Upload,
  Sliders,
  Database,
} from "lucide-react";
import { BsFillGearFill } from "react-icons/bs";

type Aba = "preferencias" | "dados";

// ?tab= aceita também os nomes antigos das abas (links das notificações de backup)
const ABA_DO_PARAMETRO: Record<string, Aba> = {
  preferencias: "preferencias",
  dados: "dados",
  exportar: "dados",
  importar: "dados",
};

/**
 * useSearchParams() fica neste componente interno, envolvido por <Suspense>
 * no componente exportado (abaixo); sem isso o build falha ao pré-renderizar /ajustes.
 */
function AjustesContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Aba>((tabParam && ABA_DO_PARAMETRO[tabParam]) || "preferencias");

  // Atualiza a aba se a página já aberta receber outro ?tab= (ex.: clicar em outra notificação).
  // Ajusta o estado durante o render quando o parâmetro muda (inclusive na montagem)
  const [tabAnterior, setTabAnterior] = useState<string | null>(tabParam);
  if (tabParam !== tabAnterior) {
    setTabAnterior(tabParam);
    const aba = tabParam ? ABA_DO_PARAMETRO[tabParam] : undefined;
    if (aba) setActiveTab(aba);
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
          Aparência, notificações, backup e importação de dados
        </p>
      </div>

      <Separator />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Aba)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="preferencias" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dados
          </TabsTrigger>
        </TabsList>

        {/* PREFERÊNCIAS */}
        <TabsContent value="preferencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} className="text-blue-600 dark:text-blue-400" />
                Preferências
              </CardTitle>
              <CardDescription>
                Aparência do aplicativo e avisos automáticos. As mudanças valem na hora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreferenciasCard />
            </CardContent>
          </Card>

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
                    <Link href="/perfil" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline">
                      Meu Perfil
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DADOS: exportar, backups automáticos e importar/restaurar */}
        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>Exportar dados</CardTitle>
              </div>
              <CardDescription>
                Baixe uma cópia completa dos seus dados financeiros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportarDadosCard />
            </CardContent>
          </Card>

          <BackupsCard />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle>Importar dados</CardTitle>
              </div>
              <CardDescription>
                Restaure seus dados a partir de um arquivo exportado
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

export default function AjustesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse" />
          </div>
        </div>
      }
    >
      <AjustesContent />
    </Suspense>
  );
}
