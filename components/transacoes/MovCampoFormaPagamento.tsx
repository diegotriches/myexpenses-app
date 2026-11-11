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
import type { IconType } from "react-icons";

type FormaPagamento = "dinheiro" | "pix" | "cartao";

interface Props {
  form: {
    tipo: "entrada" | "saida";
    formaPagamento: string;
  };
  update: (k: "formaPagamento", v: FormaPagamento) => void;
  opcoesDisponiveis?: readonly FormaPagamento[];
}

const formaPagamentoOptions: { value: FormaPagamento; label: string; icon: IconType; color: string }[] = [
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
    opcoesDisponiveis.includes(opt.value)
  );

  const labelTexto = form.tipo === "entrada" 
    ? "Forma de Recebimento" 
    : "Forma de Pagamento";

  const opcaoSelecionada = opcoesVisiveis.find(
    (opt) => opt.value === form.formaPagamento
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {labelTexto}
      </Label>

      <Select
        value={form.formaPagamento}
        onValueChange={(v) => {
          const opcao = opcoesVisiveis.find((opt) => opt.value === v);
          if (opcao) update("formaPagamento", opcao.value);
        }}
      >
        <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 h-12">
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
                className="dark:hover:bg-gray-700 h-10"
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