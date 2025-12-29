"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PreferenciasCard from "@/components/ajustes/PreferenciasCard";
import { Settings, AlertCircle } from "lucide-react";
import { BsFillGearFill } from "react-icons/bs";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  useEffect(() => {
    carregarPreferencias();
  }, []);

  const carregarPreferencias = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carrega preferências (se houver endpoint)
      try {
        const resPreferencias = await api.get("/users/preferencias");
        if (resPreferencias.data) {
          setPreferencias(resPreferencias.data);
        }
      } catch (err) {
        // Preferências podem não existir ainda, usa padrão
        console.log("Usando preferências padrão");
      }
    } catch (err: any) {
      console.error("Erro ao carregar preferências:", err);
      setError(err.response?.data?.message || "Erro ao carregar preferências.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarPreferencias = (dados: Partial<Preferencias>) => {
    setPreferencias((prev) => ({ ...prev, ...dados }));
  };

  // Skeleton Loading
  const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
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
          <BsFillGearFill className="text-2xl md:text-3xl text-blue-700" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Ajustes
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Personalize suas preferências e configurações do sistema
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Card de Preferências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={20} className="text-blue-600" />
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

      {/* Card informativo sobre outras configurações */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Procurando por outras configurações?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Suas informações pessoais, foto de perfil e configurações de segurança foram movidas para a página{" "}
                <a href="/perfil" className="text-blue-600 hover:text-blue-700 font-medium underline">
                  Meu Perfil
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}