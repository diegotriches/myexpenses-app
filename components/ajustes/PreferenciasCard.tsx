"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Bell,
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

  const atualizarPreferencias = useAtualizarPreferences();

  // Novas preferências vindas do servidor substituem o formulário (durante o render, sem efeito)
  const [preferenciasRecebidas, setPreferenciasRecebidas] = useState(preferencias);
  if (preferencias !== preferenciasRecebidas) {
    setPreferenciasRecebidas(preferencias);
    setForm(preferencias);
    setPreferenciasOriginais(preferencias);
  }

  const temAlteracoes = () =>
    JSON.stringify(form) !== JSON.stringify(preferenciasOriginais);

  const handleChange = <K extends keyof Preferencias>(campo: K, valor: Preferencias[K]) => {
    setForm({ ...form, [campo]: valor });
    if (sucesso) setSucesso(false);
  };

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
    const labels = { light: "Claro", dark: "Escuro", system: "Sistema" };
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
      console.error("Erro ao salvar preferências:", error);
    }
  };

  const cancelar = () => {
    setForm(preferenciasOriginais);
    setSucesso(false);
  };

  // TODO: idiomas, moedas e formatosData mantidos para implementação futura
  // const idiomas = [
  //   { value: "pt-BR", label: "Português (Brasil)" },
  //   { value: "en-US", label: "English (US)" },
  //   { value: "es-ES", label: "Español" },
  // ];

  // const moedas = [
  //   { value: "BRL", label: "Real (R$)",  simbolo: "R$" },
  //   { value: "USD", label: "Dólar ($)",  simbolo: "$"  },
  //   { value: "EUR", label: "Euro (€)",   simbolo: "€"  },
  // ];

  // const formatosData = [
  //   { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
  //   { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
  //   { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
  // ];

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

        <div className="space-y-3">
          <Label>Tema da Interface</Label>
          <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid gap-3">
            {/* Light */}
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
                <div className={`p-2 rounded-lg ${theme === "light" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Sun className={`h-5 w-5 ${theme === "light" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="light" className="cursor-pointer font-medium text-gray-900 dark:text-white">Claro</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tema claro sempre ativo</p>
                </div>
              </div>
            </div>

            {/* Dark */}
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
                <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Moon className={`h-5 w-5 ${theme === "dark" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="dark" className="cursor-pointer font-medium text-gray-900 dark:text-white">Escuro</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tema escuro sempre ativo</p>
                </div>
              </div>
            </div>

            {/* System */}
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
                <div className={`p-2 rounded-lg ${theme === "system" ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"}`}>
                  <Monitor className={`h-5 w-5 ${theme === "system" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="system" className="cursor-pointer font-medium text-gray-900 dark:text-white">Sistema</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Segue a preferência do sistema operacional</p>
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

      {/* Seção: Região e Idioma */}
      {/* TODO: idioma, moeda e formato de data desativados — não implementados ainda.
               Descomentar os blocos abaixo quando a funcionalidade for implementada. */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Globe size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Região e Idioma</h3>
        </div>

        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
            As opções de idioma, moeda e formato de data estão em desenvolvimento e serão disponibilizadas em breve.
          </AlertDescription>
        </Alert>

        {/* Idioma — desativado até implementação
        <div className="space-y-2">
          <Label htmlFor="idioma">Idioma</Label>
          <Select value={form.idioma || "pt-BR"} onValueChange={(v) => handleChange("idioma", v)} disabled={atualizarPreferencias.isPending}>
            <SelectTrigger id="idioma"><SelectValue /></SelectTrigger>
            <SelectContent>
              {idiomas.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">Idioma da interface e notificações</p>
        </div>
        */}

        {/* Moeda Padrão — desativado até implementação
        <div className="space-y-2">
          <Label htmlFor="moeda">Moeda Padrão</Label>
          <Select value={form.moeda || "BRL"} onValueChange={(v) => handleChange("moeda", v)} disabled={atualizarPreferencias.isPending}>
            <SelectTrigger id="moeda"><SelectValue /></SelectTrigger>
            <SelectContent>
              {moedas.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  <div className="flex items-center gap-2"><DollarSign size={16} />{m.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">Moeda utilizada para exibir valores</p>
        </div>
        */}

        {/* Formato de Data — desativado até implementação
        <div className="space-y-2">
          <Label htmlFor="formatoData">Formato de Data</Label>
          <Select value={form.formatoData || "DD/MM/YYYY"} onValueChange={(v) => handleChange("formatoData", v as any)} disabled={atualizarPreferencias.isPending}>
            <SelectTrigger id="formatoData"><SelectValue /></SelectTrigger>
            <SelectContent>
              {formatosData.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        */}

        {/* Início da Semana — removido (não implementado e sem previsão)
        <div className="space-y-2">
          <Label htmlFor="inicioSemana">Início da Semana</Label>
          <Select value={form.inicioSemana || "domingo"} onValueChange={(v) => handleChange("inicioSemana", v as "domingo" | "segunda")} disabled={atualizarPreferencias.isPending}>
            <SelectTrigger id="inicioSemana"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="domingo">Domingo</SelectItem>
              <SelectItem value="segunda">Segunda-feira</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">Primeiro dia da semana em calendários</p>
        </div>
        */}
      </div>

      {/* Seção: Notificações */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Bell size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 flex-1">
            <Bell size={20} className={form.notificacoes ? "text-blue-600 mt-0.5" : "text-gray-400 mt-0.5"} />
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
      </div>

      {/* Ações */}
      {temAlteracoes() && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={cancelar} disabled={atualizarPreferencias.isPending} className="flex-1 sm:flex-initial">
            <X size={16} className="mr-2" />
            Cancelar
          </Button>
          <Button onClick={salvarPreferencias} disabled={atualizarPreferencias.isPending} className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700">
            {atualizarPreferencias.isPending ? (
              <><Loader2 size={16} className="mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save size={16} className="mr-2" />Salvar Preferências</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}