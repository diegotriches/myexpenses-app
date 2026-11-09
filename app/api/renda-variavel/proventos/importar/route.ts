// src/app/api/renda-variavel/proventos/importar/route.ts
//
// Recebe os proventos já lidos da planilha da B3 (a leitura do XLSX é feita no
// navegador) e grava só os que ainda não existem — a chave única
// (ticker|data|tipo|valor|quantidade) torna a importação repetível sem duplicar.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { proventosRv, contas, extratoConta } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { ErroFinanceiro, alterarSaldo } from "@/lib/movimentacaoConta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { TICKER_REGEX, normalizarTicker, r2 } from "@/utils/rendaVariavelUtils";
import { chaveProvento, TIPO_PROVENTO_LABEL, type TipoProvento } from "@/utils/proventosUtils";

const TIPOS: TipoProvento[] = ["dividendo", "jcp", "rendimento"];
const MAX_LINHAS = 1000;

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const entrada: any[] = Array.isArray(body.proventos) ? body.proventos : [];
    if (entrada.length === 0) return NextResponse.json({ error: "Nenhum provento para importar" }, { status: 400 });
    if (entrada.length > MAX_LINHAS)
      return NextResponse.json({ error: `Máximo de ${MAX_LINHAS} proventos por importação` }, { status: 400 });

    const hoje = hojeBrt();
    const validos: {
      ticker: string; tipo: TipoProvento; data: string; quantidade: number | null;
      precoUnitario: number | null; valorLiquido: number; instituicao: string | null; chave: string;
    }[] = [];
    let invalidos = 0;

    for (const e of entrada) {
      const ticker = normalizarTicker(String(e?.ticker ?? ""));
      const valor = Number(e?.valorLiquido);
      const data = String(e?.data ?? "");
      const qtd = e?.quantidade === null || e?.quantidade === undefined ? null : Number(e.quantidade);
      if (
        !TICKER_REGEX.test(ticker) || !TIPOS.includes(e?.tipo) || !(valor > 0) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje ||
        (qtd !== null && (!Number.isInteger(qtd) || qtd < 0))
      ) {
        invalidos++;
        continue;
      }
      const valorLiquido = r2(valor);
      validos.push({
        ticker,
        tipo: e.tipo,
        data,
        quantidade: qtd,
        precoUnitario: e.precoUnitario !== null && e.precoUnitario !== undefined && Number(e.precoUnitario) > 0 ? Number(e.precoUnitario) : null,
        valorLiquido,
        instituicao: e.instituicao ? String(e.instituicao).slice(0, 120) : null,
        chave: chaveProvento({ ticker, data, tipo: e.tipo, valorLiquido, quantidade: qtd }),
      });
    }

    // Repetidos dentro do próprio arquivo contam como um só
    const unicos = Array.from(new Map(validos.map((v) => [v.chave, v])).values());

    if (unicos.length === 0) {
      return NextResponse.json({ inseridos: 0, duplicados: 0, invalidos, total: 0 });
    }

    // Creditar a conta? Para planilhas (histórico) o padrão é NÃO creditar
    const creditar = body.creditarConta === true;
    let conta: typeof contas.$inferSelect | undefined;
    if (creditar) {
      if (!body.contaId) return NextResponse.json({ error: "Escolha a conta para creditar" }, { status: 400 });
      [conta] = await db
        .select()
        .from(contas)
        .where(and(eq(contas.id, body.contaId), eq(contas.userId, userId)))
        .limit(1);
      if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
      if (!conta.ativo) return NextResponse.json({ error: "Conta inativa" }, { status: 400 });
    }

    const inseridos = await db.transaction(async (tx) => {
      const novos = await tx
        .insert(proventosRv)
        .values(
          unicos.map((p) => ({
            userId,
            ticker: p.ticker,
            tipo: p.tipo,
            data: p.data,
            quantidade: p.quantidade,
            precoUnitario: p.precoUnitario !== null ? p.precoUnitario.toFixed(6) : null,
            valorLiquido: p.valorLiquido.toFixed(2),
            instituicao: p.instituicao,
            contaId: conta?.id ?? null,
            movimentouConta: !!conta,
            chave: p.chave,
          })),
        )
        .onConflictDoNothing()
        .returning();

      if (conta && novos.length > 0) {
        const totalCreditado = novos.reduce((s, p) => s + Number(p.valorLiquido), 0);
        const resultado = await alterarSaldo(tx, userId, conta.id, totalCreditado);
        if (!resultado) throw new ErroFinanceiro("Conta não encontrada", 404);

        let saldo = r2(resultado.saldoApos - totalCreditado);
        for (const p of [...novos].sort((a, b) => (a.data < b.data ? -1 : 1))) {
          saldo = r2(saldo + Number(p.valorLiquido));
          await tx.insert(extratoConta).values({
            userId,
            contaId: conta.id,
            data: p.data,
            tipo: "entrada",
            valor: Number(p.valorLiquido).toFixed(2),
            descricao: `${TIPO_PROVENTO_LABEL[p.tipo]} ${p.ticker}`,
            saldoApos: saldo.toFixed(2),
            origem: "TRANSACAO_MANUAL",
            referenciaId: p.id,
          });
        }
      }

      return novos;
    });

    return NextResponse.json({
      inseridos: inseridos.length,
      duplicados: unicos.length - inseridos.length,
      invalidos,
      total: r2(inseridos.reduce((s, p) => s + Number(p.valorLiquido), 0)),
    });
  } catch (error: any) {
    if (error instanceof ErroFinanceiro) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro ao importar proventos:", error);
    return NextResponse.json({ error: error.message || "Erro ao importar proventos" }, { status: 500 });
  }
}