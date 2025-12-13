import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { iconOptions } from "@/utils/iconOptions";
import { useCategorias } from "@/hooks/useCategorias";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MdMoreVert } from "react-icons/md";
import { FaMoneyBill, FaCreditCard, FaDollarSign, FaSyncAlt, FaDonate, FaSpinner } from "react-icons/fa";
import { empresaOptions } from "@/utils/cartoes/cartaoOptions";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  onEditar: () => void;
  onExcluir: () => void;
}

// Mapeamento ícones forma de pagamento
const formaPagamentoIcons = {
  dinheiro: FaMoneyBill,
  pix: FaDollarSign,
  cartao: FaCreditCard,
};

export default function MovimentacaoLinha({
  mov,
  cartao,
  onEditar,
  onExcluir,
}: Props) {
  const { categorias } = useCategorias();

  const formatarValor = (valor: number) =>
    valor.toFixed(2).replace(".", ",");

  // Tipo de pagamento condicao
  const condicao = (() => {
    if (mov.recorrente) return "Recorrente";
    if (mov.parcelas && mov.parcelas > 1) return "Parcelado";
    return "À Vista";
  })();

  const CondicaoIconComp = (() => {
    if (condicao === "Recorrente") return FaSyncAlt;
    if (condicao === "Parcelado") return FaSpinner;
    return FaDonate; // À Vista
  })();

  // Círculo para tipo entrada/saida
  const corTipo = mov.tipo === "entrada" ? "bg-green-500" : "bg-red-500";

  // Ícone categoria
  const categoriaObj = categorias.find(c => c.nome === mov.categoria);
  const CategoriaIconComp = categoriaObj
    ? iconOptions.find(i => i.name === categoriaObj.icon)?.component
    : null;

  // Ícone forma de pagamento (sempre mostrar o ícone genérico)
  const PagamentoIconComp = formaPagamentoIcons[mov.formaPagamento];

  return (
    <div className="border rounded-xl p-4 flex justify-between items-center shadow-sm bg-white">

      <div className="grid grid-cols-8 gap-3 w-full text-sm text-gray-800 items-center">

        {/* Data */}
        <p>{new Date(mov.data).toLocaleDateString()}</p>

        {/* Descrição */}
        <p>{mov.descricao || "(Sem descrição)"}</p>

        {/* Tipo Entrada/Saída */}
        <p className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-full ${corTipo}`}></span>
          {mov.tipo === "entrada" ? "Entrada" : "Saída"}
        </p>

        {/* Categoria */}
        <p className="flex items-center gap-2">
          {CategoriaIconComp && <CategoriaIconComp size={16} className="text-gray-700" />}
          {mov.categoria}
        </p>

        {/* Valor */}
        <p>R$ {formatarValor(Number(mov.valor))}</p>

        {/* Forma de pagamento */}
        <p className="flex items-center gap-1">
          {PagamentoIconComp && <PagamentoIconComp size={16} className="text-gray-700" />}
          {mov.formaPagamento === "cartao"
            ? "Cartão"
            : mov.formaPagamento === "pix"
              ? "Pix"
              : "Dinheiro"}
        </p>

        {/* Tipo de pagamento com ícone */}
        <p className="flex items-center gap-1">
          {CondicaoIconComp && <CondicaoIconComp size={16} className="text-gray-700" />}
          {condicao}
        </p>


        {/* Cartão (apenas quando selecionado) */}
        <p className="flex items-center gap-2">
          {mov.formaPagamento === "cartao" && cartao ? (
            <>
              {/* Ícone do banco emissor */}
              {empresaOptions.find(e => e.value === cartao.empresa)?.imgSrc && (
                <img
                  src={empresaOptions.find(e => e.value === cartao.empresa)?.imgSrc}
                  alt={cartao.empresa}
                  className="w-6 h-6 object-contain"
                />
              )}
              <span>{cartao.nome}</span>
            </>
          ) : (
            mov.formaPagamento === "cartao" ? (
              <span className="flex items-center gap-1">
                <FaCreditCard size={16} className="text-gray-700" />
                Cartão
              </span>
            ) : (
              "-"
            )
          )}
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
        <DropdownMenuItem onClick={onEditar}>Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onExcluir}>Excluir</DropdownMenuItem>
      </DropdownMenu>
    </div>
  );
}
