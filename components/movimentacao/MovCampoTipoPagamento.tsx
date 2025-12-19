import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";
import { TipoPagamento } from "@/types/transacao";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

// Ícones por tipo de pagamento
const tipoPagamentoIcons: Record<TipoPagamento, any> = {
  avista: FaMoneyBill,
  parcelado: FaSpinner,
  recorrente: FaSyncAlt,
};

export default function MovCampoTipoPagamento({ form, update }: Props) {
  // Determina tipo de pagamento para select baseado nos booleanos
  const tipoPagamentoAtual: TipoPagamento = form.parcelado
    ? "parcelado"
    : form.recorrente
    ? "recorrente"
    : "avista";

  return (
    <div className="flex flex-col gap-4">
      <Label>Tipo de Pagamento</Label>
      <Select
        value={tipoPagamentoAtual}
        onValueChange={(v: TipoPagamento) => {
          // Atualiza os booleanos
          update("parcelado", v === "parcelado");
          update("recorrente", v === "recorrente");
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>

        <SelectContent>
          {(["avista", "parcelado", "recorrente"] as TipoPagamento[]).map((tipo) => {
            const IconComp = tipoPagamentoIcons[tipo];
            const label = tipo === "avista" ? "À vista" : tipo === "parcelado" ? "Parcelado" : "Recorrente";
            return (
              <SelectItem key={tipo} value={tipo} className="flex items-center gap-2">
                <IconComp size={16} />
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Campos adicionais para Parcelado */}
      {form.parcelado && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Parcelas</Label>
            <Input
              type="number"
              min={1}
              value={form.parcelas || 1}
              onChange={(e) => update("parcelas", Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Campos adicionais para Recorrente */}
      {form.recorrente && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Repetições</Label>
            <Input
              type="number"
              min={1}
              value={form.repeticoes || 1}
              onChange={(e) => update("repeticoes", Number(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}