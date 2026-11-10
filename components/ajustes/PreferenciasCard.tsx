"use client";

import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sun, Moon, Monitor, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/useMounted";
import NotificacoesPreferencias from "@/components/ajustes/NotificacoesPreferencias";

// Aparência (tema, guardado em cada aparelho) e avisos automáticos (salvos na conta).
// Tudo é aplicado na hora, sem botão de salvar.
export default function PreferenciasCard() {
  const { theme: temaSalvo, resolvedTheme, setTheme } = useTheme();
  // O tema só é conhecido no navegador: antes de montar, nenhuma opção aparece marcada errada
  const mounted = useMounted();
  const theme = mounted ? temaSalvo : undefined;
  const temaAtivo = resolvedTheme === "dark" ? "escuro" : "claro";
  const { toast } = useToast();

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
    const labels = { light: "Claro", dark: "Escuro", system: "Sistema" };
    toast({
      title: "Tema alterado",
      description: `Tema ${labels[value as keyof typeof labels]} aplicado com sucesso.`,
    });
  };

  return (
    <div className="space-y-6">
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Acompanha o claro e o escuro do sistema operacional
                    {theme === "system" && mounted ? ` (agora: ${temaAtivo})` : ""}
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              O botão de tema do menu superior alterna entre claro e escuro; clicando de novo, o app volta a seguir o sistema.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <NotificacoesPreferencias />
    </div>
  );
}