"use client";

import type { ReactNode } from "react";
import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";
import { Estabelecimento } from "@/types/estabelecimento";
import { Button } from "@/components/ui/button";
import { useMoeda } from "@/hooks/useMoeda";
import { formatarDataParaExibicao } from "@/utils/dateUtils";
import { formatarNomeFatura } from "@/utils/faturaUtils";
import {
  compraDoEstorno,
  estornosDaCompra,
  faturaDaMovimentacao,
  foiAlterada,
  formatarDataHoraBrt,
  resumoParcelamento,
} from "@/utils/detalhesMovimentacao";
import { Edit, Lock, Trash2 } from "lucide-react";

export const MOTIVO_BLOQUEIO = "Faz parte de uma antecipação pendente — desfaça na aba Parcelas primeiro";

interface Props {
  mov: Transacao;
  cartao: Cartao | null;
  estabelecimento: Estabelecimento | null;
  /** Movimentações carregadas na página, para ligar estorno e compra */
  movimentacoes: Transacao[];
  rotuloPagamento: string | null;
  nomeContaOuCartao: string | null;
  bloqueada: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}

function Item({ rotulo, children, largo = false }: { rotulo: string; children: ReactNode; largo?: boolean }) {
  return (
    <div className={`min-w-0 ${largo ? "col-span-2" : ""}`}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{rotulo}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 break-words">{children}</dd>
    </div>
  );
}

export default function MovimentacaoDetalhes({
  mov,
  cartao,
  estabelecimento,
  movimentacoes,
  rotuloPagamento,
  nomeContaOuCartao,
  bloqueada,
  onEditar,
  onExcluir,
}: Props) {
  const fmt = useMoeda();

  const isEstorno  = mov.tipo === "estorno";
  const parcelas   = resumoParcelamento(mov);
  const fatura     = faturaDaMovimentacao(mov, cartao);
  const origem     = isEstorno ? compraDoEstorno(mov, movimentacoes) : null;
  const estornos   = isEstorno ? [] : estornosDaCompra(mov.id, movimentacoes);
  const alterada   = foiAlterada(mov.createdAt, mov.updatedAt);
  const tipoCartao = cartao ? (cartao.tipo === "credito" ? "crédito" : "débito") : null;

  const pagamento = [
    rotuloPagamento,
    nomeContaOuCartao && tipoCartao ? `${nomeContaOuCartao} (${tipoCartao})` : nomeContaOuCartao,
  ].filter(Boolean).join(" · ");

  const recorrencia = mov.recorrente
    ? mov.origemRecorrenciaId
      ? "Gerada automaticamente por uma recorrência (aba Recorrências)"
      : mov.repeticoes
        ? `Recorrente, ${mov.repeticoes} repetições`
        : "Recorrente"
    : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
        <Item rotulo="Descrição" largo>{mov.descricao || "(Sem descrição)"}</Item>
        <Item rotulo="Data">{formatarDataParaExibicao(mov.data)}</Item>
        <Item rotulo={parcelas ? "Valor da parcela" : "Valor"}>{fmt(mov.valor)}</Item>
        {parcelas && mov.totalParcelamento != null && (
          <Item rotulo="Total da compra">
            {fmt(mov.totalParcelamento)}
            {(mov.parcelasAntecipadas ?? 0) > 0 && (
              <span className="text-gray-500 dark:text-gray-400">
                {" "}· inclui {mov.parcelasAntecipadas === 1 ? "1 parcela antecipada" : `${mov.parcelasAntecipadas} parcelas antecipadas`}
              </span>
            )}
          </Item>
        )}

        {mov.categoria && <Item rotulo="Categoria">{mov.categoria}</Item>}
        {estabelecimento && <Item rotulo="Estabelecimento">{estabelecimento.nome}</Item>}
        {pagamento && <Item rotulo="Pagamento">{pagamento}</Item>}

        {fatura && (
          <Item rotulo="Fatura">
            {formatarNomeFatura(fatura.mes, fatura.ano)}
            <span className={mov.emFaturaPaga ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
              {mov.emFaturaPaga ? " · paga" : " · ainda não paga"}
            </span>
          </Item>
        )}

        {parcelas && (
          <Item rotulo="Parcelamento" largo>
            Parcela {parcelas.atual} de {parcelas.total}
            {parcelas.restantes > 0
              ? ` · ${parcelas.restantes === 1 ? "falta 1" : `faltam ${parcelas.restantes}`} · última prevista para ${formatarDataParaExibicao(parcelas.ultimaParcela)}`
              : " · última parcela"}
          </Item>
        )}

        {recorrencia && <Item rotulo="Recorrência" largo>{recorrencia}</Item>}

        {isEstorno && (
          <Item rotulo="Estorno de" largo>
            {origem
              ? `${origem.descricao || "(Sem descrição)"} · ${formatarDataParaExibicao(origem.data)} · ${fmt(origem.valor)}`
              : "Compra de outro mês"}
          </Item>
        )}

        {estornos.length > 0 && (
          <Item rotulo={mov.totalmenteEstornada ? "Estornada totalmente" : "Estornos recebidos"} largo>
            {estornos.map((e) => `${formatarDataParaExibicao(e.data)} · ${fmt(e.valor)}`).join("; ")}
          </Item>
        )}

        {mov.createdAt && <Item rotulo="Cadastrada em">{formatarDataHoraBrt(mov.createdAt)}</Item>}
        {alterada && mov.updatedAt && <Item rotulo="Alterada em">{formatarDataHoraBrt(mov.updatedAt)}</Item>}
      </dl>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        {bloqueada ? (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Lock className="w-3.5 h-3.5 mt-px flex-shrink-0" />{MOTIVO_BLOQUEIO}
          </p>
        ) : <span />}
        <div className="flex gap-2 sm:justify-end">
          {!isEstorno && (
            <Button
              variant="outline" size="sm" onClick={onEditar} disabled={bloqueada}
              className="flex-1 sm:flex-none dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4 mr-1.5" />Editar
            </Button>
          )}
          <Button
            variant="outline" size="sm" onClick={onExcluir} disabled={bloqueada}
            className="flex-1 sm:flex-none text-red-600 hover:text-red-700 dark:text-red-400 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
