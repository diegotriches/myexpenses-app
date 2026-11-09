// src/lib/recorrencias/aplicarImpacto.ts
//
// Aplica o impacto financeiro de UMA ocorrência de recorrência (saldo da
// conta, fatura + limite do cartão de crédito, ou conta vinculada do cartão
// de débito). Usado pelo cron e pela criação de recorrência com data de hoje,
// para os dois caminhos ficarem sempre idênticos.
//
// Regra de negócio: a ocorrência NUNCA é bloqueada por falta de saldo/limite.
// O impacto é aplicado normalmente (saldo pode ficar negativo, limite pode
// ficar negativo) e a função devolve um "alerta" para o chamador notificar.

import { cartoes, faturas } from "@/db/schema";
import { movimentarConta, type TransacaoBanco } from "@/lib/movimentacaoConta";
import { eq, and, sql } from "drizzle-orm";
import { calcularLimiteDisponivel } from "@/lib/limiteCartao";
import {
  calcularFaturaDaTransacao,
  proximaFaturaAberta,
} from "@/utils/faturaUtils";

export type AlertaImpacto =
  | {
      tipo: "SALDO_NEGATIVO";
      contaId: string;
      contaNome: string;
      saldoApos: number;
      // Preenchido quando o débito veio de um cartão de débito
      cartaoNome?: string;
    }
  | {
      tipo: "LIMITE_EXCEDIDO";
      cartaoId: number;
      cartaoNome: string;
      limiteDisponivelApos: number;
    };

interface Params {
  userId: string;
  tipo: string; // "entrada" | "saida"
  valor: number;
  data: Date;
  formaPagamento: string | null;
  contaId: string | null;
  cartaoId: number | null;
  // Usados para registrar a movimentação no extrato da conta
  transacaoId: string;
  descricao: string | null;
}

interface DadosExtrato {
  transacaoId: string;
  data: string; // YYYY-MM-DD
  descricao: string;
}

async function ajustarSaldoConta(
  tx: TransacaoBanco,
  contaId: string,
  userId: string,
  tipo: string,
  valor: number,
  extrato: DadosExtrato,
  cartaoNome?: string,
): Promise<AlertaImpacto | null> {
  const { conta, saldoApos } = await movimentarConta(tx, {
    userId,
    contaId,
    tipo: tipo === "entrada" ? "entrada" : "saida",
    valor,
    data: extrato.data,
    descricao: extrato.descricao,
    origem: "TRANSACAO_MANUAL",
    referenciaId: extrato.transacaoId,
  });

  if (tipo === "saida" && saldoApos < 0) {
    return {
      tipo: "SALDO_NEGATIVO",
      contaId,
      contaNome: conta.nome,
      saldoApos,
      cartaoNome,
    };
  }
  return null;
}

export async function aplicarImpactoRecorrencia(
  tx: TransacaoBanco,
  p: Params,
): Promise<AlertaImpacto | null> {
  const { userId, tipo, valor, data, formaPagamento, contaId, cartaoId } = p;

  // Data local em YYYY-MM-DD (mesma data da ocorrência, sem virada de fuso)
  const dataISO = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  const descricaoBase = p.descricao?.trim() || "Recorrência";

  // ── Cartão ────────────────────────────────────────────────────────────────
  if (formaPagamento === "cartao" && cartaoId) {
    const [cartao] = await tx
      .select()
      .from(cartoes)
      .where(and(eq(cartoes.id, cartaoId), eq(cartoes.userId, userId)))
      .limit(1)
      .for("update");
    if (!cartao) return null;

    // Débito: sai da conta vinculada ao cartão
    if (cartao.tipo === "debito") {
      if (!cartao.contaVinculadaId) return null;
      return ajustarSaldoConta(
        tx,
        cartao.contaVinculadaId,
        userId,
        tipo,
        valor,
        {
          transacaoId: p.transacaoId,
          data: dataISO,
          descricao: p.descricao?.trim() || `Recorrência no débito - ${cartao.nome}`,
        },
        cartao.nome,
      );
    }

    // Crédito: soma na fatura e reduz o limite disponível
    if (cartao.tipo === "credito") {
      const diaFechamento = cartao.diaFechamento || 1;
      const { mes: mesCalc, ano: anoCalc } = calcularFaturaDaTransacao(
        data,
        diaFechamento,
      );
      const { mes: mesFatura, ano: anoFatura } = proximaFaturaAberta(
        mesCalc,
        anoCalc,
        diaFechamento,
      );

      const [faturaExistente] = await tx
        .select()
        .from(faturas)
        .where(
          and(
            eq(faturas.cartaoId, cartaoId),
            eq(faturas.userId, userId),
            eq(faturas.mes, mesFatura),
            eq(faturas.ano, anoFatura),
          ),
        )
        .limit(1)
        .for("update");

      if (faturaExistente) {
        await tx
          .update(faturas)
          .set({
            total: (Number(faturaExistente.total) + valor).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(faturas.id, faturaExistente.id));
      } else {
        await tx.insert(faturas).values({
          userId,
          cartaoId,
          mes: mesFatura,
          ano: anoFatura,
          total: valor.toFixed(2),
          paga: false,
        });
      }

      await tx
        .update(cartoes)
        .set({ limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) - ${valor}` })
        .where(eq(cartoes.id, cartaoId));

      const novoLimite = await calcularLimiteDisponivel(tx, cartao, userId);

      if (novoLimite < 0) {
        return {
          tipo: "LIMITE_EXCEDIDO",
          cartaoId,
          cartaoNome: cartao.nome,
          limiteDisponivelApos: novoLimite,
        };
      }
    }
    return null;
  }

  // ── Conta (dinheiro / PIX) ────────────────────────────────────────────────
  if (contaId) {
    return ajustarSaldoConta(tx, contaId, userId, tipo, valor, {
      transacaoId: p.transacaoId,
      data: dataISO,
      descricao: descricaoBase,
    });
  }

  return null;
}