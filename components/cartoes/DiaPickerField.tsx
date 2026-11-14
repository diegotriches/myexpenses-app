"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  erro?: string;
  tocado?: boolean;
  obrigatorio?: boolean;
}

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

export function DiaPickerField({
  label,
  value,
  onChange,
  onBlur,
  erro,
  tocado,
  obrigatorio = false,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const isMobile = useMediaQuery("(max-width: 639px)");

  const temErro = tocado && !!erro;
  const valorFormatado = value ? `Dia ${value}` : "Selecionar dia";

  // ── Mobile: Select nativo ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div>
        <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
          {label} {obrigatorio && <span className="text-red-500">*</span>}
        </label>
        <Select
          value={value}
          onValueChange={(v) => {
            onChange(v);
            onBlur?.();
          }}
        >
          <SelectTrigger
            className={`w-full ${temErro ? "border-red-500 dark:border-red-500" : ""}`}
          >
            <SelectValue placeholder="Selecionar dia" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {DIAS.map((dia) => (
              <SelectItem key={dia} value={String(dia)}>
                Dia {dia}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {temErro && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {erro}
          </p>
        )}
      </div>
    );
  }

  // ── Desktop: Grid num popover ────────────────────────────────────────────
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block text-gray-700 dark:text-gray-300">
        {label} {obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <Popover open={aberto} onOpenChange={(v) => { setAberto(v); if (!v) onBlur?.(); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start font-normal ${
              temErro
                ? "border-red-500 dark:border-red-500"
                : "dark:border-gray-700 dark:bg-gray-800"
            } ${!value ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"}`}
          >
            {valorFormatado}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3 dark:bg-gray-800 dark:border-gray-700"
          align="start"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Selecione o dia
          </p>
          <div className="grid grid-cols-7 gap-1">
            {DIAS.map((dia) => {
              const selecionado = String(dia) === value;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => {
                    onChange(String(dia));
                    setAberto(false);
                    onBlur?.();
                  }}
                  className={`
                    h-8 w-8 rounded-md text-sm font-medium transition-colors
                    flex items-center justify-center
                    ${
                      selecionado
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }
                  `}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {temErro && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {erro}
        </p>
      )}
    </div>
  );
}