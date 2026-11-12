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
import type { KeyboardEvent, MouseEvent } from "react";
import MovimentacaoDetalhes, { MOTIVO_BLOQUEIO } from "./MovimentacaoDetalhes";

import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";
import { formatarDataParaExibicao } from "@/utils/dateUtils";
import { useMoeda } from "@/hooks/useMoeda";

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
  // Tabela: false abaixo de 1536 px. Condição e Estabelecimento deixam de ser
  // colunas e aparecem dentro de Pagamento e Descrição
  colunasCompletas?: boolean;
  // Painel de detalhes aberto logo abaixo da linha; um por vez, controlado pela tabela
  aberta?: boolean;
  onAlternar?: () => void;
  // Movimentações carregadas, para o painel ligar estorno e compra
  movimentacoes?: Transacao[];
}

// O menu de ações fica dentro da linha clicável: o clique nele (e no conteúdo
// do menu, que sobe pela árvore do React mesmo estando em portal) não abre os detalhes
const pararPropagacao = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();

const formaPagamentoConfig = {
  dinheiro:      { icon: Banknote,       label: "Dinheiro",      color: "text-green-600 dark:text-green-400"  },
  pix:           { icon: Smartphone,     label: "PIX",           color: "text-blue-600 dark:text-blue-400"   },
  cartao:        { icon: CreditCard,     label: "Cartão",        color: "text-purple-600 dark:text-purple-400" },
  transferencia: { icon: ArrowLeftRight, label: "Transferência", color: "text-blue-600 dark:text-blue-400"   },
};

export default function MovimentacaoLinha({
  mov,
  cartao,
  estabelecimento = null,
  onEditar,
  onExcluir,
  viewMode = "table",
  bloqueada = false,
  colunasCompletas = true,
  aberta = false,
  onAlternar,
  movimentacoes = [],
}: Props) {
  const { data: categorias = [] } = useCategorias();
  const { data: contas = [] }     = useContas();
  const fmt = useMoeda();

  const isTransferencia = !!mov.transferenciaId;
  const isEstorno       = mov.tipo === "estorno";
  const creditoVisual   = mov.tipo === "entrada" || isEstorno; // verde, com sinal de mais
  const rotuloTipo      = isEstorno ? "Estorno" : "Receita";
  const riscoEstornada  = mov.totalmenteEstornada ? "line-through text-gray-400 dark:text-gray-500" : "";
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

  const valorExibido = fmt(mov.valor);
  const descricaoExibida = isTransferencia ? descricaoTransferencia : mov.descricao || "(Sem descrição)";
  const nomeContaOuCartao = isTransferencia ? null : mov.formaPagamento === "cartao" ? cartao?.nome ?? "Cartão" : contaAtual?.nome ?? null;

  // Transferência não tem painel: ela nem chega a esta lista (ver pendências)
  const temDetalhes = !isTransferencia && !!onAlternar;
  const alternarPorTeclado = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onAlternar?.();
  };
  const propsClicavel = temDetalhes
    ? {
        onClick: onAlternar,
        onKeyDown: alternarPorTeclado,
        tabIndex: 0,
        "aria-expanded": aberta,
      }
    : {};

  const renderDetalhes = () => (
    <MovimentacaoDetalhes
      mov={mov}
      cartao={cartao}
      estabelecimento={estabelecimento}
      movimentacoes={movimentacoes}
      rotuloPagamento={formaPagamento?.label ?? null}
      nomeContaOuCartao={nomeContaOuCartao}
      bloqueada={bloqueada}
      onEditar={onEditar}
      onExcluir={onExcluir}
    />
  );

  // ── Célula Conta/Cartão ───────────────────────────────────────────────────
  const renderContaOuCartaoCell = () => {
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

  // ✅ NOVO: menu de ações — os dois itens ficam desabilitados quando
  // `bloqueada`, com um aviso explicando o motivo em vez do menu normal
  const renderAcoesMenu = () => (
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
        {!isTransferencia && !isEstorno && (
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

  // ── Celular: cartão compacto de duas linhas ───────────────────────────────
  // Linha 1: descrição e valor. Linha 2: data, categoria, conta ou cartão,
  // condição (quando não é à vista) e estabelecimento, mais o menu de ações.
  if (viewMode === "card") {
    const detalhes = [
      formatarDataParaExibicao(mov.data).slice(0, 5),
      !isTransferencia ? mov.categoria : null,
      nomeContaOuCartao,
      !isTransferencia && condicao.label !== "À Vista" ? condicao.label : null,
      estabelecimento?.nome ?? null,
    ].filter(Boolean).join(" · ");
    const IconeLinha = isTransferencia ? ArrowLeftRight : CategoriaIconComp ?? (creditoVisual ? ArrowUpCircle : ArrowDownCircle);
    const cor = creditoVisual ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

    return (
      <Card className={`py-0 gap-0 dark:bg-gray-900 ${aberta ? "border-blue-300 dark:border-blue-800" : "dark:border-gray-800"}`}>
        <CardContent className="p-3">
          <div
            {...propsClicavel}
            className={`flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${temDetalhes ? "cursor-pointer" : ""}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              creditoVisual ? "bg-green-50 dark:bg-green-950/40" : "bg-red-50 dark:bg-red-950/40"
            }`}>
              <IconeLinha size={17} className={cor} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-medium truncate ${riscoEstornada || "text-gray-900 dark:text-white"}`} title={descricaoExibida}>
                  {descricaoExibida}
                </p>
                <span className={`text-sm font-semibold whitespace-nowrap ${cor}`}>
                  {creditoVisual ? "+" : "−"} {valorExibido}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isEstorno && (
                  <span className="text-[10px] font-medium px-1.5 rounded bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">Estorno</span>
                )}
                {bloqueada && (
                  <span className="text-[10px] font-medium px-1.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 inline-flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />Antecipada
                  </span>
                )}
                <p className="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400 truncate">{detalhes}</p>
              </div>
            </div>
            <div onClick={pararPropagacao} onKeyDown={pararPropagacao}>
              {renderAcoesMenu()}
            </div>
          </div>
          {aberta && temDetalhes && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {renderDetalhes()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── DESKTOP: table row ────────────────────────────────────────────────────
  return (
    <>
    <tr
      {...propsClicavel}
      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors outline-none focus-visible:bg-blue-50 dark:focus-visible:bg-blue-950/30 ${
        temDetalhes ? "cursor-pointer" : ""
      } ${
        aberta
          ? "bg-gray-100 dark:bg-gray-800/70"
          : creditoVisual ? "bg-green-50/30 dark:bg-green-950/10" : "bg-red-50/30 dark:bg-red-950/10"
      }`}
    >
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
        {formatarDataParaExibicao(mov.data)}
      </td>
      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100 w-0 min-w-0" style={{ maxWidth: 0 }}>
        <div className="flex items-center gap-1.5">
          <div className="min-w-0">
            <div className={`truncate ${riscoEstornada}`} title={descricaoExibida}>
              {descricaoExibida}
            </div>
            {!colunasCompletas && estabelecimento && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                <Store size={11} className="flex-shrink-0" />{estabelecimento.nome}
              </div>
            )}
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
          {creditoVisual ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 whitespace-nowrap bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
              <ArrowUpCircle className="w-3 h-3 flex-shrink-0" />{rotuloTipo}
            </Badge>
          ) : (
            // Despesa é a maioria das linhas: texto discreto, sem selo. O valor já vem em vermelho
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
              <ArrowDownCircle className="w-3 h-3 flex-shrink-0" />Despesa
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <span className="text-gray-400 dark:text-gray-600">—</span>
        ) : (
          <div className="flex items-center gap-1.5 max-w-[120px]">
            {CategoriaIconComp && <CategoriaIconComp size={15} className={`flex-shrink-0 ${creditoVisual ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />}
            <span className="truncate">{mov.categoria}</span>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right text-sm font-semibold whitespace-nowrap">
        <span className={creditoVisual ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {creditoVisual ? "+" : "-"} {valorExibido.replace("R$ ", "").trim()}
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {isTransferencia ? (
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-600 dark:text-blue-400">Transferência</span>
          </div>
        ) : FormaPagamentoIcon ? (
          <div>
            <div className="flex items-center gap-1.5">
              <FormaPagamentoIcon className={`w-4 h-4 flex-shrink-0 ${formaPagamento.color}`} />
              <span>{formaPagamento.label}</span>
            </div>
            {!colunasCompletas && condicao.label !== "À Vista" && (
              <div className={`flex items-center gap-1 text-xs ${condicao.color}`}>
                <CondicaoIcon className="w-3 h-3 flex-shrink-0" />{condicao.label}
              </div>
            )}
          </div>
        ) : <span className="text-gray-400 dark:text-gray-600">—</span>}
      </td>
      {colunasCompletas && (
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
      )}
      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {renderContaOuCartaoCell()}
      </td>

      {colunasCompletas && (
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
      )}

      <td className="px-3 py-3 text-center" onClick={pararPropagacao} onKeyDown={pararPropagacao}>
        {renderAcoesMenu()}
      </td>
    </tr>
    {aberta && temDetalhes && (
      <tr className="bg-gray-50 dark:bg-gray-800/40">
        <td colSpan={colunasCompletas ? 10 : 8} className="px-4 py-4 border-l-2 border-blue-500">
          {renderDetalhes()}
        </td>
      </tr>
    )}
    </>
  );
}