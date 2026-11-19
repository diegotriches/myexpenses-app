import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aplicacoes, aportesAplicacao, contas, resgatesAplicacao } from "@/db/schema";
import { and, eq, max } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { respostaDeErro } from "@/lib/rota";
import { recalcularAplicacao } from "@/lib/aplicacaoEngine";
import { desfazerLancamentoAporte } from "@/lib/aporteExtrato";
import { ErroFinanceiro } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { ehTipoAplicacao, indexadoresDoTipo, podeSemVencimento, TIPO_APLICACAO_LABEL } from "@/utils/tipoAplicacao";
import { INDEXADORES, INDEXADOR_LABEL, usaTaxaAnual, type Indexador } from "@/utils/tesouroUtils";

const TRIBUTACOES = ["isento", "tributavel"];
// Campos que mudam o rendimento: alterar qualquer um recalcula a aplicação do zero
const CAMPOS_DE_CALCULO = [
  "indexador", "percentualIndexador", "taxaAnual", "tributacao", "rendeNoDiaAporte", "dataVencimento",
] as const;

type Corpo = Partial<Record<"descricao" | "tipo" | (typeof CAMPOS_DE_CALCULO)[number], unknown>>;

const erro = (mensagem: string, status = 400) => NextResponse.json({ error: mensagem }, { status });

/**
 * Edita os dados da aplicação que não mexem em dinheiro: descrição, tipo,
 * indexador, percentual ou taxa, tributação, "rende no dia do aporte" e
 * vencimento. Valor, data e conta dos aportes não mudam aqui. As regras são as
 * da criação, conferidas no estado final. Mudou algo do cálculo, a aplicação é
 * recalculada do zero (o motor refaz todo o histórico). Resgatada: só
 * descrição e tipo, porque o dinheiro já voltou para a conta.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const corpo: Corpo = await req.json();

    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return erro("Aplicação não encontrada", 404);

    const mudar: Partial<typeof aplicacoes.$inferInsert> = {};

    if ("descricao" in corpo) {
      if (corpo.descricao !== null && typeof corpo.descricao !== "string") return erro("Descrição inválida");
      mudar.descricao = typeof corpo.descricao === "string" && corpo.descricao.trim() ? corpo.descricao.trim() : null;
    }

    let tipo = aplicacao.tipo;
    if ("tipo" in corpo) {
      if (!ehTipoAplicacao(corpo.tipo)) return erro("Escolha o tipo da aplicação");
      tipo = corpo.tipo;
      mudar.tipo = corpo.tipo;
    }

    const mudaCalculo = CAMPOS_DE_CALCULO.some((c) => c in corpo);
    if (mudaCalculo && aplicacao.resgatada)
      return erro("Aplicação já resgatada: só a descrição e o tipo podem mudar");

    // Indexador final (o informado ou o atual) e a combinação com o tipo
    const indexador = "indexador" in corpo ? corpo.indexador : aplicacao.indexador;
    if (typeof indexador !== "string" || !(INDEXADORES as readonly string[]).includes(indexador))
      return erro("indexador deve ser 'cdi', 'selic', 'prefixado' ou 'ipca'");
    if (ehTipoAplicacao(tipo) && !(indexadoresDoTipo(tipo) as string[]).includes(indexador)) {
      return erro(`${TIPO_APLICACAO_LABEL[tipo]} não aceita o indexador ${INDEXADOR_LABEL[indexador as Indexador]}`);
    }

    if (mudaCalculo) {
      mudar.indexador = indexador;

      // Rentabilidade: Prefixado/IPCA+ pela taxa ao ano, a 100%; CDI/Selic pelo percentual
      if (usaTaxaAnual(indexador)) {
        const taxa = Number("taxaAnual" in corpo ? corpo.taxaAnual : aplicacao.taxaAnual);
        if (isNaN(taxa) || taxa <= 0 || taxa >= 100) return erro("Informe a taxa do título (% ao ano)");
        mudar.taxaAnual = taxa.toFixed(4);
        mudar.percentualIndexador = "100.00";
      } else {
        const percentual = Number("percentualIndexador" in corpo ? corpo.percentualIndexador : aplicacao.percentualIndexador);
        if (isNaN(percentual) || percentual <= 0) return erro("Informe um percentual válido");
        mudar.percentualIndexador = percentual.toFixed(2);
        mudar.taxaAnual = null;
      }

      if ("tributacao" in corpo) {
        if (typeof corpo.tributacao !== "string" || !TRIBUTACOES.includes(corpo.tributacao))
          return erro("tributacao deve ser 'isento' ou 'tributavel'");
        mudar.tributacao = corpo.tributacao as "isento" | "tributavel";
      }

      if ("rendeNoDiaAporte" in corpo) {
        if (typeof corpo.rendeNoDiaAporte !== "boolean") return erro("rendeNoDiaAporte inválido");
        mudar.rendeNoDiaAporte = corpo.rendeNoDiaAporte;
      }

      // Vencimento final: o informado (null = liquidez diária) ou o atual
      let vencimento = aplicacao.dataVencimento;
      if ("dataVencimento" in corpo) {
        if (corpo.dataVencimento === null) {
          vencimento = null;
        } else {
          const texto = String(corpo.dataVencimento).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || isNaN(new Date(texto).getTime())) return erro("Vencimento inválido");
          // Vencimento passado faria a rotina diária resgatar na hora
          if (texto <= hojeBrt()) return erro("O vencimento precisa ser uma data futura");
          const [ultimo] = await db.select({ data: max(aportesAplicacao.data) }).from(aportesAplicacao)
            .where(eq(aportesAplicacao.aplicacaoId, aplicacao.id));
          if (ultimo?.data && texto <= ultimo.data)
            return erro("O vencimento precisa ser depois do último aporte");
          vencimento = new Date(`${texto}T12:00:00-03:00`);
        }
        mudar.dataVencimento = vencimento;
      }
      // Sem vencimento só onde há liquidez diária (aplicação antiga sem tipo: só CDI/Selic)
      const aceitaSemVencimento = ehTipoAplicacao(tipo) ? podeSemVencimento(tipo, indexador) : !usaTaxaAnual(indexador);
      if (!vencimento && !aceitaSemVencimento) return erro("Informe a data de vencimento");
    }

    if (Object.keys(mudar).length === 0) return erro("Nada para alterar");

    const [atualizada] = await db.update(aplicacoes)
      .set({ ...mudar, updatedAt: new Date() })
      .where(eq(aplicacoes.id, aplicacao.id))
      .returning();

    // Rendimento refeito do zero com os dados novos (o mesmo replay do cron)
    let recalculada = false;
    if (mudaCalculo) {
      try { recalculada = !!(await recalcularAplicacao(aplicacao.id)); }
      catch (e) { console.error("[Aplicações] recálculo após edição falhou:", e); }
    }

    return NextResponse.json({ ...atualizada, recalculada });
  } catch (error) {
    return respostaDeErro(error, "Erro ao editar a aplicação");
  }
}

/**
 * Exclui uma aplicação criada por engano, como se nunca tivesse existido: o que
 * saiu da conta (aportes não históricos) volta, os lançamentos saem do extrato
 * e a aplicação, os aportes e o rendimento são apagados. Diferente do resgate,
 * não credita rendimento nem retém IR. Só sem nenhum resgate.
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await context.params;
    const [aplicacao] = await db.select().from(aplicacoes)
      .where(and(eq(aplicacoes.id, id), eq(aplicacoes.userId, userId))).limit(1);
    if (!aplicacao) return erro("Aplicação não encontrada", 404);

    const devolvido = await db.transaction(async (tx) => {
      // Trava a aplicação: um resgate ao mesmo tempo espera a exclusão terminar
      await tx.select({ id: aplicacoes.id }).from(aplicacoes).where(eq(aplicacoes.id, aplicacao.id)).for("update");
      const resgates = await tx.$count(resgatesAplicacao, eq(resgatesAplicacao.aplicacaoId, aplicacao.id));
      if (resgates > 0 || aplicacao.resgatada)
        throw new ErroFinanceiro("Esta aplicação já teve resgate e não pode ser excluída");

      const aportes = await tx.select().from(aportesAplicacao).where(eq(aportesAplicacao.aplicacaoId, aplicacao.id));
      const porConta = new Map<string, number>();
      for (const a of aportes) {
        if (a.historico) continue;
        const contaId = a.contaId ?? aplicacao.contaId;
        const valor = Number(a.valor);
        const desfeito = await desfazerLancamentoAporte(tx, { userId, aplicacaoId: aplicacao.id, contaId, data: a.data, valor });
        if (desfeito !== null) porConta.set(contaId, (porConta.get(contaId) ?? 0) + valor);
      }

      // aportes, resgates e rendimentos saem em cascata
      await tx.delete(aplicacoes).where(eq(aplicacoes.id, aplicacao.id));

      const nomes = porConta.size
        ? await tx.select({ id: contas.id, nome: contas.nome }).from(contas).where(eq(contas.userId, userId))
        : [];
      return [...porConta].map(([contaId, valor]) => ({
        conta: nomes.find((c) => c.id === contaId)?.nome ?? "Conta",
        valor: Math.round(valor * 100) / 100,
      }));
    });

    return NextResponse.json({ ok: true, devolvido });
  } catch (error) {
    return respostaDeErro(error, "Erro ao excluir a aplicação");
  }
}
