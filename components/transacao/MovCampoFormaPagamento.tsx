"use client";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FaMoneyBill, FaCreditCard, FaDollarSign } from "react-icons/fa";

interface Props {
  form: {
    tipo: "entrada" | "saida";
    formaPagamento: string;
  };
  update: (k: string, v: any) => void;
  opcoesDisponiveis?: readonly ("dinheiro" | "pix" | "cartao")[];
}

const formaPagamentoOptions = [
  { 
    value: "dinheiro", 
    label: "Dinheiro", 
    icon: FaMoneyBill,
    color: "text-green-600 dark:text-green-400" 
  },
  { 
    value: "pix", 
    label: "Pix", 
    icon: FaDollarSign,
    color: "text-blue-600 dark:text-blue-400" 
  },
  { 
    value: "cartao", 
    label: "Cartão", 
    icon: FaCreditCard,
    color: "text-purple-600 dark:text-purple-400" 
  },
];

export default function MovCampoFormaPagamento({ 
  form, 
  update,
  opcoesDisponiveis = ["dinheiro", "pix", "cartao"]
}: Props) {
  const opcoesVisiveis = formaPagamentoOptions.filter((opt) =>
    opcoesDisponiveis.includes(opt.value as any)
  );

  const labelTexto = form.tipo === "entrada" 
    ? "Forma de Recebimento" 
    : "Forma de Pagamento";

  const opcaoSelecionada = opcoesVisiveis.find(
    (opt) => opt.value === form.formaPagamento
  );

  return (
    <div className="space-y-2">
      <Label className="text-gray-900 dark:text-white">
        {labelTexto}
      </Label>

      <Select
        value={form.formaPagamento}
        onValueChange={(v) => update("formaPagamento", v)}
      >
        <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
          <SelectValue placeholder="Selecione">
            {opcaoSelecionada && (
              <div className="flex items-center gap-2">
                <opcaoSelecionada.icon 
                  className={opcaoSelecionada.color}
                  size={16}
                />
                <span className="text-gray-900 dark:text-white">
                  {opcaoSelecionada.label}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
          {opcoesVisiveis.map((opt) => {
            const IconComp = opt.icon;
            return (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <IconComp className={opt.color} size={16} />
                  <span className="text-gray-900 dark:text-white">
                    {opt.label}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}