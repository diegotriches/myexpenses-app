import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCartoes } from "@/hooks/useCartoes";
import { CartaoSelectItem } from "@/components/CartaoSelectItem";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

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
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">Pix</SelectItem>
            <SelectItem value="cartao">Cartão</SelectItem>
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
              <SelectTrigger>
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
