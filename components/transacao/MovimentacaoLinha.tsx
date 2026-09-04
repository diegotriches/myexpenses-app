"use client";

import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { Estabelecimento } from "@/types/estabelecimento";
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
  Store,
  Lock,
} from "lucide-react";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  estabelecimento?: Estabelecimento | null;
  onEditar: () => void;
  onExcluir: () => void;
  viewMode?: "table" | "card";
  // ✅ NOVO: true quando a transação faz parte de uma antecipação
  // pendente (fatura ainda não paga) — bloqueia editar/excluir até o
  // usuário desfazer a antecipação na aba Parcelas
  bloqueada?: boolean;
}

const formaPagamentoConfig = {
  dinheiro:      { icon: Banknote,       label: "Dinheiro",      color: "text-green-600 dark:text-green-400"  },
  pix:           { icon: Smartphone,     label: "PIX",           color: "text-blue-600 dark:text-blue-400"   },
  cartao:        { icon: CreditCard,     label: "Cartão",        color: "text-purple-600 dark:text-purple-400" },
  transferencia: { icon: ArrowLeftRight, label: "Transferência", color: "text-blue-600 dark:text-blue-400"   },
};

const MOTIVO_BLOQUEIO = "Faz parte de uma antecipação pendente — desfaça na aba Parcelas primeiro";

export default function MovimentacaoLinha({
  mov,
  cartao,
  estabelecimento = null,
  onEditar,
  onExcluir,
  viewMode = "table",
  bloqueada = false,
}: Props) {
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] }     = useContas();
  const { mask } = useHideValues();

  const isTransferencia = !!mov.transferenciaId;
  const contaAtual      = contas.find((c) => c.id === mov.contaId);

  const descricaoTransferencia =
    mov.tipo === "saida"
      ? `Transferência enviada${contaAtual ? ` (${contaAtual.nome})` : ""}`
      : `Transferência recebida${contaAtual ? ` (${contaAtual.nome})` : ""}`;

  const condicao = (() => {
    if (mov.parcelado  === true) return { label: `${mov.parcelaAtual}/${mov.parcelas}`, icon: Calendar,    color: "text-orange-600 dark:text-orange-400"  };
    if (mov.recorrente === true) return { label: "Recorrente",                          icon: Repeat,      color: "text-purple-600 dark:text-purple-400"  };
    return                              { label: "À Vista",                             icon: DollarSign,  color: "text-gray-600 dark:text-gray-400"       };
  })();

  const categoriaObj      = categorias.find((c) => c.nome === mov.categoria);
  const CategoriaIconComp = categoriaObj
    ? iconOptions.find((i) => i.name === categoriaObj.icone)?.component
    : null;

  const EstabIconComp = estabelecimento
    ? iconOptions.find((i) => i.name === estabelecimento.icone)?.component
    : null;

  const formaPagamento     = formaPagamentoConfig[mov.formaPagamento as keyof typeof formaPagamentoConfig];
  const FormaPagamentoIcon = formaPagamento?.icon;
  const CondicaoIcon       = condicao.icon;

  const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(mov.valor));
  const valorExibido   = mask(valorFormatado);

  // ── Célula Conta/Cartão ───────────────────────────────────────────────────
  const ContaOuCartaoCell = () => {
    if (isTransferencia) return <span className="text-gray-400 dark:text-gray-600">—</span>;
    if (mov.formaPagamento === "cartao") {
      if (!cartao) return <span className="text-gray-500 dark:text-gray-400">Cartão</span>;
      const logoSrc = empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc;
      return (
        <div className="flex items-center gap-1.5 max-w-[110px]">
          {logoSrc && <img src={logoSrc} alt={cartao.empresa} className="w-5 h-5 object-contain flex-shrink-0 rounded" />}
          <span className="truncate">{cartao.nome}</span>
        </div>
      );
    }
    if (contaAtual) {
      const bancoLogoSrc = empresaOptions.find((e) => e.value === contaAtual.banco)?.imgSrc;
      return (
        <div className="flex items-center gap-1.5 max-w-[110px]">
          {bancoLogoSrc
            ? <img src={bancoLogoSrc} alt={contaAtual.banco ?? ""} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
            : <Building2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          }
          <span className="truncate">{contaAtual.nome}</span>
        </div>
      );
    }
    return <span className="text-gray-400 dark:text-gray-600">—</span>;
  };

  // ── Bloco Conta/Cartão mobile ─────────────────────────────────────────────
  const ContaOuCartaoBlock = () => {
    if (isTransferencia) return null;
    if (mov.formaPagamento === "cartao" && cartao) {
      const logoSrc = empresaOptions.find((e) => e.value === cartao.empresa)?.imgSrc;
      return (
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cartão:</span>
          <div className="flex items-center gap-2">
            {logoSrc && <img src={logoSrc} alt={cartao.empresa} className="w-5 h-5 object-contain flex-shrink-0 rounded" />}
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
            {bancoLogoSrc
              ? <img src={bancoLogoSrc} alt={contaAtual.banco ?? ""} className="w-5 h-5 object-contain flex-shrink-0 rounded" />
              : <Building2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
            }
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{contaAtual.nome}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // ✅ NOVO: menu de ações — os dois itens ficam desabilitados quando
  // `bloqueada`, com um aviso explicando o motivo em vez do menu normal
  const AcoesMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost" size="sm"
          className={`h-8 w-8 p-0 dark:hover:bg-gray-700 ${viewMode === "card" ? "ml-2" : ""} flex-shrink-0`}
          title={bloqueada ? MOTIVO_BLOQUEIO : undefined}
        >
          {bloqueada ? <Lock className="h-4 w-4 text-amber-500" /> : <MoreVertical className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
        {bloqueada && (
          <div className="px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400 max-w-[220px] leading-snug">
            {MOTIVO_BLOQUEIO}
          </div>
        )}
        {!isTransferencia && (
          <DropdownMenuItem
            onClick={onEditar}
            disabled={bloqueada}
            className="cursor-pointer dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Edit className="w-4 h-4 mr-2" />Editar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={onExcluir}
          disabled={bloqueada}
          className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />{isTransferencia ? "Excluir transferência" : "Excluir"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── MOBILE: card ──────────────────────────────────────────────────────────
  if (viewMode === "card") {
    return (
      <Card className={mov.tipo === "entrada"
        ? "bg-green-50/30 dark:bg-green-950/10 border-green-200 dark:border-green-900"
        : "bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-900"
      }>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatarDataParaExibicao(mov.data)}
                </span>
                {mov.tipo === "entrada" ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
                    <ArrowUpCircle className="w-3 h-3 mr-1" />Receita
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                    <ArrowDownCircle className="w-3 h-3 mr-1" />Despesa
                  </Badge>
                )}
                {bloqueada && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                    <Lock className="w-3 h-3 mr-1" />Antecipada
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2">
                {isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}
              </h3>
            </div>
            <AcoesMenu />
          </div>

          <div className={`text-2xl font-bold mb-3 ${mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {mov.tipo === "entrada" ? "+" : "-"} {valorExibido}
          </div>

          <div className="space-y-2 text-sm">
            {!isTransferencia && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Categoria:</span>
                <div className="flex items-center gap-2">
                  {CategoriaIconComp && <CategoriaIconComp size={16} className={`flex-shrink-0 ${mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />}
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
              ) : <span className="text-gray-400 dark:text-gray-600">—</span>}
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
            <ContaOuCartaoBlock />

            {estabelecimento && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Store size={12} />
                  Local:
                </span>
                <div className="flex items-center gap-1.5">
                  {EstabIconComp
                    ? <EstabIconComp size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    : <Store size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  }
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                    {estabelecimento.nome}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── DESKTOP: table row ────────────────────────────────────────────────────
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
      mov.tipo === "entrada" ? "bg-green-50/30 dark:bg-green-950/10" : "bg-red-50/30 dark:bg-red-950/10"
    }`}>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {formatarDataParaExibicao(mov.data)}
      </td>
      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 w-0 min-w-0" style={{ maxWidth: 0 }}>
        <div className="flex items-center gap-1.5">
          <div className="truncate" title={isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}>
            {isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)"}
          </div>
          {bloqueada && (
            <span title={MOTIVO_BLOQUEIO} className="flex-shrink-0">
              <Lock className="w-3 h-3 text-amber-500" />
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-3 text-center">
        <div className="flex justify-center">
          {mov.tipo === "entrada" ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
              <ArrowUpCircle className="w-3 h-3 flex-shrink-0" />Receita
            </Badge>
          ) : (
            <Badge variant="outline" className="inline-flex items-center gap-1 whitespace-nowrap bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
              <ArrowDownCircle className="w-3 h-3 flex-shrink-0" />Despesa
            </Badge>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5 max-w-[120px]">
            {CategoriaIconComp && <CategoriaIconComp size={15} className={`flex-shrink-0 ${mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />}
            <span className="truncate">{mov.categoria}</span>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
        <span className={mov.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {mov.tipo === "entrada" ? "+" : "-"} {valorExibido.replace("R$ ", "").trim()}
        </span>
      </td>
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
        ) : <span className="text-gray-400 dark:text-gray-600">—</span>}
      </td>
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
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        <ContaOuCartaoCell />
      </td>

      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {estabelecimento ? (
          <div className="flex items-center gap-1.5 max-w-[110px]">
            {EstabIconComp
              ? <EstabIconComp size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              : <Store size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            }
            <span className="truncate">{estabelecimento.nome}</span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        )}
      </td>

      <td className="px-3 py-3 text-center">
        <AcoesMenu />
      </td>
    </tr>
  );
}