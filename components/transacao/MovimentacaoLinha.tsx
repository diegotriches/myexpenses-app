"use client";

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
import { Card, CardContent } from "@/components/ui/card";

// ✅ REACT QUERY: Importar hooks corretos
import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";

// ✅ CORREÇÃO: Importar função de formatação de data
import { formatarDataParaExibicao } from "@/utils/dateUtils";

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
  viewMode?: "table" | "card";
}

const formaPagamentoConfig = {
  dinheiro: { icon: Banknote, label: "Dinheiro", color: "text-green-600 dark:text-green-400" },
  pix: { icon: Smartphone, label: "PIX", color: "text-blue-600 dark:text-blue-400" },
  cartao: { icon: CreditCard, label: "Cartão", color: "text-purple-600 dark:text-purple-400" },
  transferencia: { icon: ArrowLeftRight, label: "Transferência", color: "text-blue-600 dark:text-blue-400" },
};

export default function MovimentacaoLinha({
  mov,
  cartao,
  onEditar,
  onExcluir,
  viewMode = "table",
}: Props) {
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] } = useContas();

  const isTransferencia = !!mov.transferenciaId;
  const contaAtual = contas.find((c) => c.id === mov.contaId);

  const descricaoTransferencia =
    mov.tipo === "saida"
      ? `Transferência enviada${contaAtual ? ` (${contaAtual.nome})` : ""}`
      : `Transferência recebida${contaAtual ? ` (${contaAtual.nome})` : ""}`;

  const condicao = (() => {
    if (mov.parcelado === true) {
      return { 
        label: `${mov.parcelaAtual}/${mov.parcelas}`, 
        icon: Calendar,
        color: "text-orange-600 dark:text-orange-400"
      };
    }
    
    if (mov.recorrente === true) {
      return { 
        label: "Recorrente", 
        icon: Repeat,
        color: "text-purple-600 dark:text-purple-400"
      };
    }
    
    return { 
      label: "À Vista", 
      icon: DollarSign,
      color: "text-gray-600 dark:text-gray-400"
    };
  })();

  const categoriaObj = categorias.find((c) => c.nome === mov.categoria);
  const CategoriaIconComp = categoriaObj
    ? iconOptions.find((i) => i.name === categoriaObj.icone)?.component
    : null;

  const formaPagamento = formaPagamentoConfig[mov.formaPagamento as keyof typeof formaPagamentoConfig];
  const FormaPagamentoIcon = formaPagamento?.icon;
  const CondicaoIcon = condicao.icon;

  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(mov.valor));

  // ============================================
  // 📱 MOBILE: CARD VIEW
  // ============================================
  if (viewMode === "card") {
    return (
      <Card className={`${
        mov.tipo === "entrada" 
          ? "bg-green-50/30 dark:bg-green-950/10 border-green-200 dark:border-green-900" 
          : "bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900"
      }`}>
        <CardContent className="p-4">
          {/* Header: Data + Tipo + Valor */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {/* ✅ CORRIGIDO: Usar formatarDataParaExibicao */}
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatarDataParaExibicao(mov.data)}
                </span>
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
              </div>
              
              <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2">
                {isTransferencia
                  ? descricaoTransferencia
                  : mov.descricao || "(Sem descrição)"}
              </h3>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 dark:hover:bg-gray-700 ml-2 flex-shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                className="dark:bg-gray-800 dark:border-gray-700"
              >
                {!isTransferencia && (
                  <DropdownMenuItem 
                    onClick={onEditar} 
                    className="cursor-pointer dark:hover:bg-gray-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={onExcluir} 
                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isTransferencia ? "Excluir transferência" : "Excluir"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={`text-2xl font-bold mb-3 ${
            mov.tipo === "entrada" 
              ? "text-green-600 dark:text-green-400" 
              : "text-red-600 dark:text-red-400"
          }`}>
            {mov.tipo === "entrada" ? "+" : "-"} {valorFormatado}
          </div>

          <div className="space-y-2 text-sm">
            {!isTransferencia && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Categoria:</span>
                <div className="flex items-center gap-2">
                  {CategoriaIconComp && (
                    <CategoriaIconComp 
                      size={16} 
                      className={`flex-shrink-0 ${
                        mov.tipo === "entrada" 
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{mov.categoria}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Pagamento:</span>
              {isTransferencia ? (
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-600 dark:text-blue-400">Transferência</span>
                </div>
              ) : FormaPagamentoIcon ? (
                <div className="flex items-center gap-1.5">
                  <FormaPagamentoIcon className={`w-4 h-4 ${formaPagamento.color}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{formaPagamento.label}</span>
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-600">—</span>
              )}
            </div>

            {!isTransferencia && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Condição:</span>
                <div className="flex items-center gap-1.5">
                  <CondicaoIcon className={`w-4 h-4 ${condicao.color}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{condicao.label}</span>
                </div>
              </div>
            )}

            {!isTransferencia && mov.formaPagamento === "cartao" && cartao && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cartão:</span>
                <div className="flex items-center gap-2">
                  {empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc && (
                    <img
                      src={empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc}
                      alt={cartao.empresa}
                      className="w-5 h-5 object-contain flex-shrink-0 rounded"
                    />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{cartao.nome}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================
  // 💻 DESKTOP: TABLE ROW
  // ============================================
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
      mov.tipo === "entrada" 
        ? "bg-green-50/30 dark:bg-green-950/10" 
        : "bg-red-50/30 dark:bg-red-950/10"
    }`}>
      {/* Data */}
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {/* ✅ CORRIGIDO: Usar formatarDataParaExibicao */}
        {formatarDataParaExibicao(mov.data)}
      </td>

      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
        <div className="max-w-xs truncate">
          {isTransferencia
            ? descricaoTransferencia
            : mov.descricao || "(Sem descrição)"}
        </div>
      </td>

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

      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-2">
            {CategoriaIconComp && (
              <CategoriaIconComp 
                size={16} 
                className={`flex-shrink-0 ${
                  mov.tipo === "entrada" 
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              />
            )}
            <span className="truncate max-w-[150px]">{mov.categoria}</span>
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-right text-sm font-semibold">
        <span className={mov.tipo === "entrada" 
          ? "text-green-600 dark:text-green-400" 
          : "text-red-600 dark:text-red-400"
        }>
          {mov.tipo === "entrada" ? "+" : "-"} {valorFormatado.replace("R$", "").trim()}
        </span>
      </td>

      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-600 dark:text-blue-400">Transferência</span>
          </div>
        ) : FormaPagamentoIcon ? (
          <div className="flex items-center gap-1.5">
            <FormaPagamentoIcon className={`w-4 h-4 ${formaPagamento.color}`} />
            <span>{formaPagamento.label}</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <CondicaoIcon className={`w-4 h-4 ${condicao.color}`} />
            <span>{condicao.label}</span>
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : mov.formaPagamento === "cartao" && cartao ? (
          <div className="flex items-center gap-2">
            {empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc && (
              <img
                src={empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc}
                alt={cartao.empresa}
                className="w-5 h-5 object-contain flex-shrink-0 rounded"
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

      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 dark:hover:bg-gray-700"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end"
            className="dark:bg-gray-800 dark:border-gray-700"
          >
            {!isTransferencia && (
              <DropdownMenuItem 
                onClick={onEditar} 
                className="cursor-pointer dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={onExcluir} 
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700"
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