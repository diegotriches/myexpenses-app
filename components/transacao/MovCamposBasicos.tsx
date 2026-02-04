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
  // ✅ Formatação monetária (input como calculadora)
  const formatarValorMonetario = (valorCentavos: number): string => {
    const reais = (valorCentavos / 100).toFixed(2);
    return reais.replace('.', ',');
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é dígito
    const apenasNumeros = e.target.value.replace(/\D/g, '');
    
    if (apenasNumeros === '') {
      update('valor', '');
      return;
    }

    // Converte para número (em centavos)
    const valorEmCentavos = parseInt(apenasNumeros, 10);
    
    // Converte para formato decimal (ex: 150 centavos = 1.50 reais)
    const valorDecimal = (valorEmCentavos / 100).toFixed(2);
    
    // Atualiza com valor decimal (ponto como separador)
    update('valor', valorDecimal);
  };

  const getValorFormatadoParaInput = (): string => {
    if (!form.valor || form.valor === '0' || form.valor === '0.00') {
      return '0,00';
    }
    
    // Formata o valor com vírgula para exibição
    const valorNum = parseFloat(form.valor);
    if (isNaN(valorNum)) return '0,00';
    
    return valorNum.toFixed(2).replace('.', ',');
  };

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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-medium pointer-events-none">
              R$
            </span>
            <Input
              type="text"
              inputMode="numeric"
              value={getValorFormatadoParaInput()}
              onChange={handleValorChange}
              className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-medium text-lg"
              placeholder="0,00"
            />
          </div>
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
        </div>
      );

    default:
      return null;
  }
}