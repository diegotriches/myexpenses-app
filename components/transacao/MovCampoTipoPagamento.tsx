"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DollarSign, Calendar, Repeat, CreditCard } from "lucide-react";

// ✅ Tipo local (sem importar de transacao.ts se não existir)
type TipoPagamento = "avista" | "parcelado" | "recorrente";

interface Props {
  form: {
    parcelado: boolean;
    recorrente: boolean;
    parcelas?: number;
    repeticoes?: number;
  };
  update: (k: string, v: any) => void;
}

// Configuração dos tipos de pagamento
const tipoPagamentoConfig = {
  avista: { 
    icon: DollarSign, 
    label: "À Vista",
    color: "text-green-600 dark:text-green-400",
    description: "Pagamento único"
  },
  parcelado: { 
    icon: CreditCard, 
    label: "Parcelado",
    color: "text-orange-600 dark:text-orange-400",
    description: "Dividido em várias parcelas"
  },
  recorrente: { 
    icon: Repeat, 
    label: "Recorrente",
    color: "text-purple-600 dark:text-purple-400",
    description: "Repete mensalmente"
  },
};

export default function MovCampoTipoPagamento({ form, update }: Props) {
  // Determina tipo de pagamento para select baseado nos booleanos
  const tipoPagamentoAtual: TipoPagamento = form.parcelado
    ? "parcelado"
    : form.recorrente
    ? "recorrente"
    : "avista";

  const configAtual = tipoPagamentoConfig[tipoPagamentoAtual];
  const IconAtual = configAtual.icon;

  const handleTipoChange = (v: TipoPagamento) => {
    // Atualiza os booleanos
    update("parcelado", v === "parcelado");
    update("recorrente", v === "recorrente");

    // Limpa campos relacionados ao mudar de tipo
    if (v !== "parcelado") {
      update("parcelas", null);
    }
    if (v !== "recorrente") {
      update("repeticoes", null);
    }

    // Define valores padrão
    if (v === "parcelado" && !form.parcelas) {
      update("parcelas", 2);
    }
    if (v === "recorrente" && !form.repeticoes) {
      update("repeticoes", 2);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">
          Tipo de Pagamento
        </Label>
        
        <Select
          value={tipoPagamentoAtual}
          onValueChange={handleTipoChange}
        >
          <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
            <SelectValue>
              <div className="flex items-center gap-2">
                <IconAtual className={`w-4 h-4 ${configAtual.color}`} />
                <span className="text-gray-900 dark:text-white">
                  {configAtual.label}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            {(Object.entries(tipoPagamentoConfig) as [TipoPagamento, typeof tipoPagamentoConfig[TipoPagamento]][]).map(([tipo, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem 
                  key={tipo} 
                  value={tipo}
                  className="dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2 py-1">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {config.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Info contextual */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {configAtual.description}
        </div>
      </div>

      {/* Campos adicionais para Parcelado */}
      {form.parcelado && (
        <div className="space-y-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <Label className="text-gray-900 dark:text-white">
              Número de Parcelas
            </Label>
          </div>
          
          <Input
            type="number"
            min={2}
            max={60}
            value={form.parcelas || 2}
            onChange={(e) => {
              const valor = parseInt(e.target.value);
              if (valor >= 2 && valor <= 60) {
                update("parcelas", valor);
              }
            }}
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Mínimo: 2 parcelas | Máximo: 60 parcelas
          </div>

          {/* Preview do parcelamento */}
          {form.parcelas && form.parcelas > 1 && (
            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-orange-200 dark:border-orange-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{form.parcelas}x</strong> parcelas mensais
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campos adicionais para Recorrente */}
      {form.recorrente && (
        <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <Label className="text-gray-900 dark:text-white">
              Número de Repetições
            </Label>
          </div>
          
          <Input
            type="number"
            min={2}
            max={120}
            value={form.repeticoes || 2}
            onChange={(e) => {
              const valor = parseInt(e.target.value);
              if (valor >= 2 && valor <= 120) {
                update("repeticoes", valor);
              }
            }}
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Mínimo: 2 meses | Máximo: 120 meses (10 anos)
          </div>

          {/* Preview da recorrência */}
          {form.repeticoes && form.repeticoes > 1 && (
            <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Repetirá por <strong>{form.repeticoes} meses</strong> consecutivos
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}