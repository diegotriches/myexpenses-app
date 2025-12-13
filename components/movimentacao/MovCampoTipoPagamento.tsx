import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FaMoneyBill, FaSpinner, FaSyncAlt } from "react-icons/fa";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

// Mapeamento de ícones para cada tipo de pagamento
const tipoPagamentoIcons = {
  avista: FaMoneyBill,
  parcelado: FaSpinner,
  recorrente: FaSyncAlt,
};

export default function MovCampoTipoPagamento({ form, update }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Select tipo de pagamento */}
      <div>
        <Label>Tipo de Pagamento</Label>
        <Select
          value={form.tipoPagamento || "avista"}
          onValueChange={(v) => update("tipoPagamento", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>

          <SelectContent>
            {["avista", "parcelado", "recorrente"].map((tipo) => {
              const IconComp = tipoPagamentoIcons[tipo as keyof typeof tipoPagamentoIcons];
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
      </div>

      {/* Campos adicionais para Parcelado */}
      {form.tipoPagamento === "parcelado" && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Parcelas</Label>
            <Input
              type="number"
              min={1}
              value={form.parcelas || 1}
              onChange={(e) => update("parcelas", Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Campos adicionais para Recorrente */}
      {form.tipoPagamento === "recorrente" && (
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Repetições</Label>
            <Input
              type="number"
              min={1}
              value={form.repeticoes || 1}
              onChange={(e) => update("repeticoes", Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
