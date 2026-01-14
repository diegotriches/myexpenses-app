// src/components/ajustes/PreferenciasCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Save, 
  X, 
  Loader2, 
  CheckCircle, 
  Sun,
  Moon,
  Monitor,
  Globe,
  DollarSign,
  Bell,
  BellOff,
  Info
} from "lucide-react";
import { useAtualizarPreferences } from "@/hooks/usePreferences";
import type { Preferencias } from "@/types/preferences";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

interface Props {
  preferencias: Preferencias;
}

export default function PreferenciasCard({ preferencias }: Props) {
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<Preferencias>(preferencias);
  const [preferenciasOriginais, setPreferenciasOriginais] = useState<Preferencias>(preferencias);
  const [sucesso, setSucesso] = useState(false);
  const { toast } = useToast();

  // React Query Mutation
  const atualizarPreferencias = useAtualizarPreferences();

  useEffect(() => {
    setForm(preferencias);
    setPreferenciasOriginais(preferencias);
  }, [preferencias]);

  // Verifica se houve alterações
  const temAlteracoes = () => {
    return JSON.stringify(form) !== JSON.stringify(preferenciasOriginais);
  };

  const handleChange = <K extends keyof Preferencias>(
    campo: K,
    valor: Preferencias[K]
  ) => {
    setForm({ ...form, [campo]: valor });
    
    if (sucesso) {
      setSucesso(false);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
    
    const labels = {
      light: "Claro",
      dark: "Escuro",
      system: "Sistema"
    };

    toast({
      title: "Tema alterado",
      description: `Tema ${labels[value as keyof typeof labels]} aplicado com sucesso.`,
    });
  };

  const salvarPreferencias = async () => {
    try {
      await atualizarPreferencias.mutateAsync(form);
      
      setPreferenciasOriginais(form);
      setSucesso(true);

      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      // Toast de erro já é exibido pelo hook
      console.error("Erro ao salvar preferências:", error);
    }
  };

  const cancelar = () => {
    setForm(preferenciasOriginais);
    setSucesso(false);
  };

  const idiomas = [
    { value: "pt-BR", label: "Português (Brasil)" },
    { value: "en-US", label: "English (US)" },
    { value: "es-ES", label: "Español" },
  ];

  const moedas = [
    { value: "BRL", label: "Real (R$)", simbolo: "R$" },
    { value: "USD", label: "Dólar ($)", simbolo: "$" },
    { value: "EUR", label: "Euro (€)", simbolo: "€" },
  ];

  const formatosData = [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
  ];

  return (
    <div className="space-y-6">
      {/* Mensagem de Sucesso */}
      {sucesso && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Suas preferências foram atualizadas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Seção: Aparência */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Sun size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Aparência</h3>
        </div>

        {/* Tema - Cards Radio */}
        <div className="space-y-3">
          <Label>Tema da Interface</Label>
          <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid gap-3">
            {/* Light Mode */}
            <div
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                theme === "light"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => handleThemeChange("light")}
            >
              <RadioGroupItem value="light" id="light" />
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  theme === "light" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                }`}>
                  <Sun className={`h-5 w-5 ${
                    theme === "light" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="light" className="cursor-pointer font-medium text-gray-900 dark:text-white">
                    Claro
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tema claro sempre ativo
                  </p>
                </div>
              </div>
            </div>

            {/* Dark Mode */}
            <div
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                theme === "dark"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => handleThemeChange("dark")}
            >
              <RadioGroupItem value="dark" id="dark" />
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                }`}>
                  <Moon className={`h-5 w-5 ${
                    theme === "dark" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="dark" className="cursor-pointer font-medium text-gray-900 dark:text-white">
                    Escuro
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tema escuro sempre ativo
                  </p>
                </div>
              </div>
            </div>

            {/* System Mode */}
            <div
              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                theme === "system"
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
              onClick={() => handleThemeChange("system")}
            >
              <RadioGroupItem value="system" id="system" />
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${
                  theme === "system" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                }`}>
                  <Monitor className={`h-5 w-5 ${
                    theme === "system" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="system" className="cursor-pointer font-medium text-gray-900 dark:text-white">
                    Sistema
                  </Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Segue a preferência do sistema operacional
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              💡 Você também pode alternar rapidamente entre claro e escuro usando o botão no menu superior.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Seção: Regionalização */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Globe size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Região e Idioma</h3>
        </div>

        {/* Idioma */}
        <div className="space-y-2">
          <Label htmlFor="idioma">Idioma</Label>
          <Select
            value={form.idioma || "pt-BR"}
            onValueChange={(v) => handleChange("idioma", v)}
            disabled={atualizarPreferencias.isPending}
          >
            <SelectTrigger id="idioma">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {idiomas.map((idioma) => (
                <SelectItem key={idioma.value} value={idioma.value}>
                  {idioma.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Idioma da interface e notificações
          </p>
        </div>

        {/* Moeda */}
        <div className="space-y-2">
          <Label htmlFor="moeda">Moeda Padrão</Label>
          <Select
            value={form.moeda || "BRL"}
            onValueChange={(v) => handleChange("moeda", v)}
            disabled={atualizarPreferencias.isPending}
          >
            <SelectTrigger id="moeda">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {moedas.map((moeda) => (
                <SelectItem key={moeda.value} value={moeda.value}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} />
                    {moeda.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Moeda utilizada para exibir valores
          </p>
        </div>

        {/* Formato de Data */}
        <div className="space-y-2">
          <Label htmlFor="formatoData">Formato de Data</Label>
          <Select
            value={form.formatoData || "DD/MM/YYYY"}
            onValueChange={(v) => handleChange("formatoData", v as any)}
            disabled={atualizarPreferencias.isPending}
          >
            <SelectTrigger id="formatoData">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatosData.map((formato) => (
                <SelectItem key={formato.value} value={formato.value}>
                  {formato.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Início da Semana */}
        <div className="space-y-2">
          <Label htmlFor="inicioSemana">Início da Semana</Label>
          <Select
            value={form.inicioSemana || "domingo"}
            onValueChange={(v) => handleChange("inicioSemana", v as "domingo" | "segunda")}
            disabled={atualizarPreferencias.isPending}
          >
            <SelectTrigger id="inicioSemana">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="domingo">Domingo</SelectItem>
              <SelectItem value="segunda">Segunda-feira</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Primeiro dia da semana em calendários
          </p>
        </div>
      </div>

      {/* Seção: Notificações */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Bell size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
        </div>

        {/* Notificações no App */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 flex-1">
            {form.notificacoes ? (
              <Bell size={20} className="text-blue-600 mt-0.5" />
            ) : (
              <BellOff size={20} className="text-gray-400 mt-0.5" />
            )}
            <div>
              <Label htmlFor="notificacoes" className="cursor-pointer">
                Notificações no Aplicativo
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Receba alertas sobre transações e lembretes
              </p>
            </div>
          </div>
          <Switch
            id="notificacoes"
            checked={form.notificacoes ?? true}
            onCheckedChange={(v) => handleChange("notificacoes", v)}
            disabled={atualizarPreferencias.isPending}
          />
        </div>

        {/* Notificações por Email */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <Label htmlFor="notificacoesEmail" className="cursor-pointer">
              Notificações por E-mail
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Receba resumos e relatórios por e-mail
            </p>
          </div>
          <Switch
            id="notificacoesEmail"
            checked={form.notificacoesEmail ?? false}
            onCheckedChange={(v) => handleChange("notificacoesEmail", v)}
            disabled={atualizarPreferencias.isPending}
          />
        </div>
      </div>

      {/* Ações */}
      {temAlteracoes() && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={cancelar}
            disabled={atualizarPreferencias.isPending}
            className="flex-1 sm:flex-initial"
          >
            <X size={16} className="mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={salvarPreferencias}
            disabled={atualizarPreferencias.isPending}
            className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700"
          >
            {atualizarPreferencias.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Salvar Preferências
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}