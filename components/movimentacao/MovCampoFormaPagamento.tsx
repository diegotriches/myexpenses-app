import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FaMoneyBill, FaCreditCard, FaDollarSign } from "react-icons/fa";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
  opcoesDisponiveis?: readonly ("dinheiro" | "pix" | "cartao")[];
}

// Definindo opções de forma de pagamento com ícones
const formaPagamentoOptions = [
  { value: "dinheiro", label: "Dinheiro", icon: FaMoneyBill },
  { value: "pix", label: "Pix", icon: FaDollarSign },
  { value: "cartao", label: "Cartão", icon: FaCreditCard },
];

export default function MovCampoFormaPagamento({ 
  form, 
  update,
  opcoesDisponiveis = ["dinheiro", "pix", "cartao"]
}: Props) {
  // Filtra as opções baseado no que está disponível
  const opcoesVisiveis = formaPagamentoOptions.filter((opt) =>
    opcoesDisponiveis.includes(opt.value as any)
  );

  return (
    <div>
      <Label>Forma de Pagamento</Label>
      <Select
        value={form.formaPagamento}
        onValueChange={(v) => update("formaPagamento", v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>

        <SelectContent>
          {opcoesVisiveis.map((opt) => {
            const IconComp = opt.icon;
            return (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="flex items-center gap-2"
              >
                <IconComp size={16} />
                {opt.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}