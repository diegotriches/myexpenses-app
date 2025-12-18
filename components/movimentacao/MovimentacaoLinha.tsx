import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { iconOptions } from "@/utils/iconOptions";
import { empresaOptions } from "@/utils/cartoes/cartaoOptions";

import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";

import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

import { MdMoreVert } from "react-icons/md";
import {
  FaMoneyBill,
  FaCreditCard,
  FaDollarSign,
  FaSyncAlt,
  FaDonate,
  FaSpinner,
  FaExchangeAlt,
} from "react-icons/fa";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  onEditar: () => void;
  onExcluir: () => void;
}

const formaPagamentoIcons: Record<
  "dinheiro" | "pix" | "cartao" | "transferencia",
  React.ComponentType<{ size?: number; className?: string }>
> = {
  dinheiro: FaMoneyBill,
  pix: FaDollarSign,
  cartao: FaCreditCard,
  transferencia: FaExchangeAlt
};

export default function MovimentacaoLinha({
  mov,
  cartao,
  onEditar,
  onExcluir,
}: Props) {
  const { categorias } = useCategorias();
  const { contas } = useContas();

  const isTransferencia = !!mov.transferenciaId;

  const contaAtual = contas.find((c) => c.id === mov.contaId);

  const descricaoTransferencia =
    mov.tipo === "saida"
      ? `Transferência enviada${contaAtual ? ` (${contaAtual.nome})` : ""}`
      : `Transferência recebida${contaAtual ? ` (${contaAtual.nome})` : ""}`;

  const formatarValor = (valor: number) =>
    valor.toFixed(2).replace(".", ",");

  const condicao = (() => {
    if (mov.recorrente) return "Recorrente";
    if (mov.parcelas && mov.parcelas > 1) return "Parcelado";
    return "À Vista";
  })();

  const CondicaoIconComp = (() => {
    if (condicao === "Recorrente") return FaSyncAlt;
    if (condicao === "Parcelado") return FaSpinner;
    return FaDonate;
  })();

  const corTipo = mov.tipo === "entrada" ? "bg-green-500" : "bg-red-500";

  const categoriaObj = categorias.find((c) => c.nome === mov.categoria);
  const CategoriaIconComp = categoriaObj
    ? iconOptions.find((i) => i.name === categoriaObj.icon)?.component
    : null;

  const PagamentoIconComp =
    !isTransferencia && mov.formaPagamento
      ? formaPagamentoIcons[mov.formaPagamento]
      : null;

  return (
    <div className="border rounded-xl p-4 flex justify-between items-center shadow-sm bg-white">
      <div className="grid grid-cols-8 gap-3 w-full text-sm text-gray-800 items-center">
        {/* Data */}
        <p>{new Date(mov.data).toLocaleDateString()}</p>

        {/* Descrição */}
        <p>
          {isTransferencia
            ? descricaoTransferencia
            : mov.descricao || "(Sem descrição)"}
        </p>

        {/* Tipo */}
        <p className="flex items-center gap-1">
          {isTransferencia ? (
            <>
              <FaExchangeAlt className="text-blue-600" />
              Transferência
            </>
          ) : (
            <>
              <span className={`w-3 h-3 rounded-full ${corTipo}`}></span>
              {mov.tipo === "entrada" ? "Entrada" : "Saída"}
            </>
          )}
        </p>

        {/* Categoria */}
        <p className="flex items-center gap-2">
          {isTransferencia ? (
            "—"
          ) : (
            <>
              {CategoriaIconComp && (
                <CategoriaIconComp size={16} className="text-gray-700" />
              )}
              {mov.categoria}
            </>
          )}
        </p>

        {/* Valor */}
        <p>R$ {formatarValor(Number(mov.valor))}</p>

        {/* Forma de pagamento */}
        <p className="flex items-center gap-1">
          {isTransferencia ? (
            "Conta bancária"
          ) : (
            <>
              {PagamentoIconComp && (
                <PagamentoIconComp size={16} className="text-gray-700" />
              )}
              {mov.formaPagamento === "cartao"
                ? "Cartão"
                : mov.formaPagamento === "pix"
                  ? "Pix"
                  : "Dinheiro"}
            </>
          )}
        </p>

        {/* Condição */}
        <p className="flex items-center gap-1">
          {isTransferencia ? (
            "—"
          ) : (
            <>
              {CondicaoIconComp && (
                <CondicaoIconComp size={16} className="text-gray-700" />
              )}
              {condicao}
            </>
          )}
        </p>

        {/* Cartão */}
        <p className="flex items-center gap-2">
          {isTransferencia ? (
            "—"
          ) : mov.formaPagamento === "cartao" && cartao ? (
            <>
              {empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc && (
                <img
                  src={
                    empresaOptions.find((e) => e.value === cartao.empresa)
                      ?.imgSrc
                  }
                  alt={cartao.empresa}
                  className="w-6 h-6 object-contain"
                />
              )}
              <span>{cartao.nome}</span>
            </>
          ) : mov.formaPagamento === "cartao" ? (
            <span className="flex items-center gap-1">
              <FaCreditCard size={16} className="text-gray-700" />
              Cartão
            </span>
          ) : (
            "-"
          )}
        </p>
      </div>

      <DropdownMenu
        trigger={
          <button className="p-2 rounded-full hover:bg-gray-100">
            <MdMoreVert size={22} />
          </button>
        }>
        {!isTransferencia && (
          <DropdownMenuItem onClick={onEditar}>
            Editar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onExcluir}>
          {isTransferencia ? "Excluir transferência" : "Excluir"}
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}