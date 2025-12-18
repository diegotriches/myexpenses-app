import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCartoes } from "@/hooks/useCartoes";
import { CartaoSelectItem } from "@/components/cartoes/CartaoSelectItem";
import { FaMoneyBill, FaCreditCard, FaDollarSign } from "react-icons/fa";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

// Definindo opções de forma de pagamento com ícones
const formaPagamentoOptions = [
  { value: "dinheiro", label: "Dinheiro", icon: FaMoneyBill },
  { value: "pix", label: "Pix", icon: FaDollarSign },
  { value: "cartao", label: "Cartão", icon: FaCreditCard },
];

export default function MovCampoFormaPagamento({ form, update }: Props) {
  const { cartoes, loading } = useCartoes();

  return (
    <>
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
            {formaPagamentoOptions.map((opt) => {
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

      {form.formaPagamento === "cartao" && (
        <div>
          <Label>Cartão</Label>

          {loading ? (
            <p>Carregando cartões...</p>
          ) : cartoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
          ) : (
            <Select
              value={form.cartaoId}
              onValueChange={(v) => update("cartaoId", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((c) => (
                  <CartaoSelectItem key={c.id} cartao={c} />
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </>
  );
}
