import { SelectItem } from "@/components/ui/select";
import { Cartao } from "@/types/cartao";
import { empresaOptions } from "@/utils/cartoes/cartaoOptions";

interface Props {
  cartao: Cartao;
}

export function CartaoSelectItem({ cartao }: Props) {
  const empresaImg = empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc;

  return (
    <SelectItem
      value={String(cartao.id)}
      className="flex items-center gap-3 py-2"
    >
      <div className="w-10 h-6 flex items-center justify-center text-xs">
        {empresaImg ? (
          <img src={empresaImg} alt={cartao.empresa || "Empresa"} className="h-7 w-7 object-contain" />
        ) : (
          <span className="w-7 h-7 block" />
        )}
      </div>

      <div className="flex flex-col">
        <span className="font-semibold">{cartao.nome}</span>
        <span className="text-xs text-muted-foreground">
          {cartao.bandeira.toUpperCase()} - {cartao.tipo}
        </span>
      </div>
    </SelectItem>
  );
}
