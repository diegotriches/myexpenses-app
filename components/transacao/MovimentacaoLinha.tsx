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

import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";
import { formatarDataParaExibicao } from "@/utils/dateUtils";
import { useHideValues } from "@/contexts/HideValuesContext";

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
  Building2,
} from "lucide-react";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  onEditar: () => void;
  onExcluir: () => void;
  viewMode?: "table" | "card";
}

const formaPagamentoConfig = {
  dinheiro:      { icon: Banknote,       label: "Dinheiro",      color: "text-green-600 dark:text-green-400" },
  pix:           { icon: Smartphone,     label: "PIX",           color: "text-blue-600 dark:text-blue-400"  },
  cartao:        { icon: CreditCard,     label: "Cartão",        color: "text-purple-600 dark:text-purple-400" },
  transferencia: { icon: ArrowLeftRight, label: "Transferência", color: "text-blue-600 dark:text-blue-400"  },
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
  const { mask } = useHideValues();

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

  const valorExibido = mask(valorFormatado);

  // ── Célula/bloco "Conta / Cartão" ────────────────────────────────────────
  // Cartão de crédito/débito → exibe logo + nome do cartão
  // Dinheiro, PIX, Transferência → exibe ícone de banco + nome da conta
  // Transferência sem conta → exibe "—"
  const ContaOuCartaoCell = () => {
    if (isTransferencia) {
      return <span className="text-gray-400 dark:text-gray-600">—</span>;
    }

    if (mov.formaPagamento === "cartao") {
      if (!cartao) return <span className="text-gray-500 dark:text-gray-400">Cartão</span>;
      const logoSrc = empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc;
      return (
        <div className="flex items-center gap-1.5 max-w-[110px]">
          {logoSrc && (
            <img src={logoSrc} alt={cartao.empresa} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
          )}
          <span className="truncate">{cartao.nome}</span>
        </div>
      );
    }

    // dinheiro / pix / transferencia
    if (contaAtual) {
      const bancoLogoSrc = empresaOptions.find((e) => e.value === contaAtual.banco)?.imgSrc;
      return (
        <div className="flex items-center gap-1.5 max-w-[110px]">
          {bancoLogoSrc ? (
            <img src={bancoLogoSrc} alt={contaAtual.banco ?? ""} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
          ) : (
            <Building2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          )}
          <span className="truncate">{contaAtual.nome}</span>
        </div>
      );
    }

    return <span className="text-gray-400 dark:text-gray-600">—</span>;
  };

  // ── Bloco mobile "Conta / Cartão" ─────────────────────────────────────────
  const ContaOuCartaoBlock = () => {
    if (isTransferencia) return null;

    if (mov.formaPagamento === "cartao" && cartao) {
      const logoSrc = empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc;
      return (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cartão:</span>
          <div className="flex items-center gap-2">
            {logoSrc && (
              <img src={logoSrc} alt={cartao.empresa} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
            )}
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{cartao.nome}</span>
          </div>
        </div>
      );
    }

    if (contaAtual) {
      const bancoLogoSrc = empresaOptions.find((e) => e.value === contaAtual.banco)?.imgSrc;
      return (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Conta:</span>
          <div className="flex items-center gap-2">
            {bancoLogoSrc ? (
              <img src={bancoLogoSrc} alt={contaAtual.banco ?? ""} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
            ) : (
              <Building2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            )}
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{contaAtual.nome}</span>
          </div>
        </div>
      );
    }

    return null;
  };

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
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
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
                {isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}
              </h3>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 dark:hover:bg-gray-700 ml-2 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                {!isTransferencia && (
                  <DropdownMenuItem onClick={onEditar} className="cursor-pointer dark:hover:bg-gray-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onExcluir} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700">
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
            {mov.tipo === "entrada" ? "+" : "-"} {valorExibido}
          </div>

          <div className="space-y-2 text-sm">
            {!isTransferencia && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Categoria:</span>
                <div className="flex items-center gap-2">
                  {CategoriaIconComp && (
                    <CategoriaIconComp size={16} className={`flex-shrink-0 ${mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
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

            {/* Conta ou Cartão — bloco unificado */}
            <ContaOuCartaoBlock />
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
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {formatarDataParaExibicao(mov.data)}
      </td>

      {/* Descrição */}
      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 w-0 min-w-0" style={{ maxWidth: 0 }}>
        <div className="truncate" title={isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}>
          {isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}
        </div>
      </td>

      {/* Tipo */}
      <td className="px-2 py-3 text-center">
        <div className="flex justify-center">
          {mov.tipo === "entrada" ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
              <ArrowUpCircle className="w-3 h-3 flex-shrink-0" />
              Receita
            </Badge>
          ) : (
            <Badge variant="outline" className="inline-flex items-center gap-1 whitespace-nowrap bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
              <ArrowDownCircle className="w-3 h-3 flex-shrink-0" />
              Despesa
            </Badge>
          )}
        </div>
      </td>

      {/* Categoria */}
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5 max-w-[120px]">
            {CategoriaIconComp && (
              <CategoriaIconComp
                size={15}
                className={`flex-shrink-0 ${
                  mov.tipo === "entrada"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              />
            )}
            <span className="truncate">{mov.categoria}</span>
          </div>
        )}
      </td>

      {/* Valor */}
      <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
        <span className={mov.tipo === "entrada"
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
        }>
          {mov.tipo === "entrada" ? "+" : "-"} {valorExibido.replace("R$ ", "").trim()}
        </span>
      </td>

      {/* Pagamento */}
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-600 dark:text-blue-400">Transferência</span>
          </div>
        ) : FormaPagamentoIcon ? (
          <div className="flex items-center gap-1.5">
            <FormaPagamentoIcon className={`w-4 h-4 flex-shrink-0 ${formaPagamento.color}`} />
            <span>{formaPagamento.label}</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        )}
      </td>

      {/* Condição */}
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <CondicaoIcon className={`w-4 h-4 flex-shrink-0 ${condicao.color}`} />
            <span>{condicao.label}</span>
          </div>
        )}
      </td>

      {/* Conta / Cartão */}
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        <ContaOuCartaoCell />
      </td>

      {/* Ações */}
      <td className="px-3 py-3 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 dark:hover:bg-gray-700">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
            {!isTransferencia && (
              <DropdownMenuItem onClick={onEditar} className="cursor-pointer dark:hover:bg-gray-700">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onExcluir} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700">
              <Trash2 className="w-4 h-4 mr-2" />
              {isTransferencia ? "Excluir transferência" : "Excluir"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}