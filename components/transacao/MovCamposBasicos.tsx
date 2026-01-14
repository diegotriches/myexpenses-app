"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calendar, DollarSign, FileText } from "lucide-react";

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
}

export default function MovCamposBasicos({ form, update, campo, disabled }: Props) {
  switch (campo) {
    case "tipo":
      return (
        <div className="space-y-2">
          <Label className="text-gray-900 dark:text-white">Tipo</Label>
          <Select 
            value={form.tipo} 
            onValueChange={(v) => update("tipo", v)} 
            disabled={disabled}
          >
            <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
              <SelectValue placeholder="Selecione o tipo">
                {form.tipo && (
                  <div className="flex items-center gap-2">
                    {form.tipo === "entrada" ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-gray-900 dark:text-white">Entrada</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-gray-900 dark:text-white">Saída</span>
                      </>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="entrada" className="dark:hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-gray-900 dark:text-white">Entrada</span>
                </div>
              </SelectItem>
              <SelectItem value="saida" className="dark:hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-gray-900 dark:text-white">Saída</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Info contextual */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {form.tipo === "entrada" ? (
              <span>📈 Receitas aumentam o saldo da conta</span>
            ) : (
              <span>📉 Despesas diminuem o saldo da conta</span>
            )}
          </div>
        </div>
      );

    case "data":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="h-4 w-4" />
            Data
          </Label>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => update("data", e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            disabled={disabled}
          />
          
          {/* Info contextual */}
          {form.data && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {new Date(form.data + "T00:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      );

    case "valor":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-gray-900 dark:text-white">
            <DollarSign className="h-4 w-4" />
            Valor
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium">
              R$
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor}
              onChange={(e) => update("valor", e.target.value)}
              className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="0,00"
            />
          </div>
          
          {/* Info contextual */}
          {form.valor && parseFloat(form.valor) > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(parseFloat(form.valor))}
            </div>
          )}
        </div>
      );

    case "descricao":
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-gray-900 dark:text-white">
            <FileText className="h-4 w-4" />
            Descrição
          </Label>
          <Input
            type="text"
            value={form.descricao}
            onChange={(e) => update("descricao", e.target.value)}
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            placeholder="Descrição da movimentação"
            maxLength={100}
          />
          
          {/* Contador de caracteres */}
          {form.descricao && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {form.descricao.length}/100 caracteres
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}