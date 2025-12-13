import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";

import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { MdMoreVert } from "react-icons/md";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  onEditar: () => void;
  onExcluir: () => void;
}

export default function MovimentacaoLinha({
  mov,
  cartao,
  onEditar,
  onExcluir,
}: Props) {

  const formatarValor = (valor: number) => {
    return valor.toFixed(2).replace(".", ",");
  };

  const condicao = (() => {
    if (mov.recorrente) return "Recorrente";
    if (mov.parcelas && mov.parcelas > 1) return "Parcelado";
    return "À Vista";
  })();

  return (
    <div className="border rounded-xl p-4 flex justify-between items-center shadow-sm bg-white">

      {/* Colunas */}
      <div className="grid grid-cols-8 gap-3 w-full text-sm text-gray-800">
        <p>{new Date(mov.data).toLocaleDateString()}</p>
        <p>{mov.descricao || "(Sem descrição)"}</p>
        <p>{mov.tipo === "entrada" ? "Entrada" : "Saída"}</p>
        <p>{mov.categoria}</p>
        <p>R$ {formatarValor(Number(mov.valor))}</p>
        <p>
          {mov.formaPagamento === "cartao"
            ? "Cartão"
            : mov.formaPagamento === "pix"
              ? "Pix"
              : "Dinheiro"}
        </p>
        <p>{condicao}</p>
        <p>
          {mov.formaPagamento === "cartao" && cartao
            ? `${cartao.nome} (**** ${cartao.ultimosDigitos})`
            : "-"}
        </p>
      </div>

      {/* Menu suspenso */}
        <DropdownMenu
          trigger={
            <button className="p-2 rounded-full hover:bg-gray-100">
              <MdMoreVert size={22} />
            </button>
          }
        >
          <DropdownMenuItem onClick={onEditar}>
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onExcluir}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenu>
      </div>

      );
}
