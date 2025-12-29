import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { iconOptions } from "@/utils/iconOptions";
import { empresaOptions } from "@/utils/cartaoOptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";

import { 
  MoreVertical, 
  Edit, 
  Trash2,
  ArrowUpCircle, 
  ArrowDownCircle,
  Repeat,
  Calendar,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
} from "lucide-react";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  onEditar: () => void;
  onExcluir: () => void;
}

const formaPagamentoConfig = {
  dinheiro: { icon: Banknote, label: "Dinheiro" },
  pix: { icon: Smartphone, label: "PIX" },
  cartao: { icon: CreditCard, label: "Cartão" },
  transferencia: { icon: ArrowLeftRight, label: "Transferência" },
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

  const condicao = (() => {
    if (mov.recorrente) return { label: "Recorrente", icon: Repeat };
    if (mov.parcelas && mov.parcelas > 1) 
      return { 
        label: `${mov.parcelaAtual}/${mov.parcelas}`, 
        icon: Calendar 
      };
    return { label: "À Vista", icon: DollarSign };
  })();

  const categoriaObj = categorias.find((c) => c.nome === mov.categoria);
  const CategoriaIconComp = categoriaObj
    ? iconOptions.find((i) => i.name === categoriaObj.icon)?.component
    : null;

  const formaPagamento = formaPagamentoConfig[mov.formaPagamento as keyof typeof formaPagamentoConfig];
  const FormaPagamentoIcon = formaPagamento?.icon;
  const CondicaoIcon = condicao.icon;

  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
      mov.tipo === "entrada" 
        ? "bg-green-50/30 dark:bg-green-950/10" 
        : "bg-red-50/30 dark:bg-red-950/10"
    }`}>
      {/* Data */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {new Date(mov.data).toLocaleDateString("pt-BR")}
      </td>

      {/* Descrição */}
      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
        <div className="max-w-xs truncate">
          {isTransferencia
            ? descricaoTransferencia
            : mov.descricao || "(Sem descrição)"}
        </div>
      </td>

      {/* Tipo */}
      <td className="px-4 py-3 text-center">
        {mov.tipo === "entrada" ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
            <ArrowUpCircle className="w-3 h-3 mr-1" />
            Receita
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
            <ArrowDownCircle className="w-3 h-3 mr-1" />
            Despesa
          </Badge>
        )}
      </td>

      {/* Categoria */}
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-2">
            {CategoriaIconComp && (
              <CategoriaIconComp size={16} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
            )}
            <span className="truncate max-w-[150px]">{mov.categoria}</span>
          </div>
        )}
      </td>

      {/* Valor */}
      <td className="px-4 py-3 text-right text-sm font-semibold">
        <span className={mov.tipo === "entrada" 
          ? "text-green-600 dark:text-green-400" 
          : "text-red-600 dark:text-red-400"
        }>
          {mov.tipo === "entrada" ? "+" : "-"} R$ {Number(mov.valor).toFixed(2)}
        </span>
      </td>

      {/* Forma de pagamento */}
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-600 dark:text-blue-400">Transferência</span>
          </div>
        ) : FormaPagamentoIcon ? (
          <div className="flex items-center gap-1.5">
            <FormaPagamentoIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span>{formaPagamento.label}</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Condição */}
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <CondicaoIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span>{condicao.label}</span>
          </div>
        )}
      </td>

      {/* Cartão */}
      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : mov.formaPagamento === "cartao" && cartao ? (
          <div className="flex items-center gap-2">
            {empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc && (
              <img
                src={empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc}
                alt={cartao.empresa}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
            )}
            <span className="truncate max-w-[100px]">{cartao.nome}</span>
          </div>
        ) : mov.formaPagamento === "cartao" ? (
          <span className="text-gray-500 dark:text-gray-400">Cartão</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Ações */}
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isTransferencia && (
              <DropdownMenuItem onClick={onEditar} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={onExcluir} 
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isTransferencia ? "Excluir transferência" : "Excluir"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}