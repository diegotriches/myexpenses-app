import { SelectItem } from "@/components/ui/select";
import { Cartao } from "@/types/cartao";

interface Props {
  cartao: Cartao;
}

export function CartaoSelectItem({ cartao }: Props) {
  return (
    <SelectItem
      value={String(cartao.id)}
      className="flex items-center gap-3 py-2"
    >
      <div
        className="w-10 h-6 rounded-md border flex items-center justify-center text-xs"
        style={{ backgroundColor: cartao.cor }}
      >
        {cartao.icone}
      </div>

      <div className="flex flex-col">
        <span className="font-semibold">{cartao.nome}</span>
        <span className="text-xs text-muted-foreground">
          {cartao.bandeira.toUpperCase()} – {cartao.tipo}
        </span>
      </div>
    </SelectItem>
  );
}
