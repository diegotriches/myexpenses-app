"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, DollarSign, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  form: {
    tipo: "entrada" | "saida";
    data: string;
    valor: string;
    descricao: string;
  };
  update: (k: string, v: any) => void;
  campo: "tipo" | "data" | "valor" | "descricao";
  disabled?: boolean;
  error?: string;
}

// ✅ NOVO: formatador pt-BR — vírgula nos centavos e ponto nos milhares
// (ex: 1.234.567,89). Declarado fora do componente pra não recriar a
// cada render.
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function MovCamposBasicos({ form, update, campo, disabled, error }: Props) {
  const [valorDigitos, setValorDigitos] = useState("");

  useEffect(() => {
    if (campo === "valor" && form.valor) {
      const valorEmCentavos = Math.round(parseFloat(form.valor) * 100);
      setValorDigitos(valorEmCentavos.toString());
    }
  }, []);

  const formatarValorCalculadora = (digitos: string): string => {
    if (!digitos) return "0,00";
    const valorEmCentavos = parseInt(digitos, 10);
    const valorEmReais = valorEmCentavos / 100;
    return formatadorMoeda.format(valorEmReais);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasNumeros = e.target.value.replace(/\D/g, "");
    const limitado = apenasNumeros.slice(0, 10);
    setValorDigitos(limitado);
    const valorEmReais = limitado ? (parseInt(limitado, 10) / 100).toFixed(2) : "";
    update("valor", valorEmReais);
  };

  const errorClass = error ? "border-red-500 dark:border-red-500 focus-visible:ring-red-500" : "";

  switch (campo) {
    case "tipo":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Transação <span className="text-red-500">*</span>
          </Label>
          <div className={`grid grid-cols-2 gap-3 ${error ? "ring-2 ring-red-500 ring-offset-2 rounded-lg" : ""}`}>
            <button
              type="button"
              onClick={() => !disabled && update("tipo", "entrada")}
              disabled={disabled}
              className={`
                h-20 border-2 rounded-lg transition-all duration-200
                flex flex-col items-center justify-center gap-2
                ${form.tipo === "entrada"
                  ? "border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <TrendingUp className={`h-7 w-7 ${form.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`} />
              <span className={`text-sm font-medium ${form.tipo === "entrada" ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400"}`}>
                Receita
              </span>
            </button>
            <button
              type="button"
              onClick={() => !disabled && update("tipo", "saida")}
              disabled={disabled}
              className={`
                h-20 border-2 rounded-lg transition-all duration-200
                flex flex-col items-center justify-center gap-2
                ${form.tipo === "saida"
                  ? "border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400"
                  : "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <TrendingDown className={`h-7 w-7 ${form.tipo === "saida" ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`} />
              <span className={`text-sm font-medium ${form.tipo === "saida" ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-400"}`}>
                Despesa
              </span>
            </button>
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1 mt-1">⚠ {error}</p>}
        </div>
      );

    case "data":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            Data
          </Label>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => update("data", e.target.value)}
            className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white h-12 ${errorClass}`}
            disabled={disabled}
          />
          {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
        </div>
      );

    case "valor":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <DollarSign className="h-4 w-4" />
            Valor <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-base font-semibold pointer-events-none">
              R$
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={formatarValorCalculadora(valorDigitos)}
              onChange={handleValorChange}
              className={`pl-12 pr-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-semibold text-lg h-12 ${errorClass}`}
              placeholder="0,00"
            />
          </div>
          {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
        </div>
      );

    case "descricao":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <FileText className="h-4 w-4" />
            Descrição
          </Label>
          <Input
            type="text"
            value={form.descricao}
            onChange={(e) => update("descricao", e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white h-12"
            placeholder="Descrição da movimentação (opcional)"
            maxLength={100}
          />
        </div>
      );

    default:
      return null;
  }
}