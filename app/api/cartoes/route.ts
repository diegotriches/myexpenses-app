// app/api/cartoes/route.ts
import { calcularLimiteUsado } from "@/lib/limiteCartao";
import { db } from "@/db";
import { cartoes, faturas, contas } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { garantirDono } from "@/lib/garantirDono";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

// ============================================
// GET - Buscar todos os cartões do usuário
// ============================================
export async function GET() {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // ✅ normaliza hora para comparações de data
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    const listaCartoes = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const resultado = await Promise.all(
      listaCartoes.map(async (cartao) => {
        const limite = Number(cartao.limite ?? 0);

        // ── Limite usado: soma das faturas não pagas ────────────────────────
        const limiteUsado = cartao.tipo === "credito"
          ? await calcularLimiteUsado(db, cartao.id, userId)
          : 0;

        const limiteDisponivel = Math.max(0, limite - limiteUsado);

        // ── Fatura atual ────────────────────────────────────────────────────
        // ✅ CORRIGIDO: usa calcularFaturaDaTransacao para obter o mês correto
        // da fatura ativa, respeitando o diaFechamento do cartão.
        // Sem isso, cartões com fechamento passado (ex: fecha dia 2, hoje dia 17)
        // buscavam a fatura do mês calendário (fevereiro) em vez da ativa (março).
        const diaFechamento = cartao.diaFechamento ?? 1;
        const diaVencimento = cartao.diaVencimento ?? 1;

        let mesFaturaAtiva  = mesAtual;
        let anoFaturaAtiva  = anoAtual;

        if (cartao.tipo === "credito" && cartao.diaFechamento) {
          const faturaAtiva = calcularFaturaDaTransacao(hoje, diaFechamento);
          mesFaturaAtiva = faturaAtiva.mes;
          anoFaturaAtiva = faturaAtiva.ano;
        }

        const [faturaAtual] = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, cartao.id),
              eq(faturas.userId, userId),
              eq(faturas.ano, anoFaturaAtiva),
              eq(faturas.mes, mesFaturaAtiva)
            )
          );

        let faturaInfo = null;

        if (faturaAtual) {
          // ✅ CORRIGIDO: clamp do diaVencimento no último dia do mês
          // Sem isso, diaVencimento=31 em fevereiro transbordava para março
          const ultimoDiaDoMes = new Date(
            faturaAtual.ano,
            faturaAtual.mes, // dia 0 do mês seguinte = último dia do mês atual
            0
          ).getDate();
          const diaVenc = Math.min(diaVencimento, ultimoDiaDoMes);

          const vencimento = new Date(faturaAtual.ano, faturaAtual.mes - 1, diaVenc);
          vencimento.setHours(0, 0, 0, 0); // ✅ normaliza para comparação correta

          // ✅ CORRIGIDO: hoje já está normalizado (setHours acima)
          // Sem normalização, hoje > vencimento poderia ser true no próprio dia
          // do vencimento (hora atual > 00:00), marcando como ATRASADA indevidamente
          let status: "PAGA" | "EM_ABERTO" | "ATRASADA";

          if (faturaAtual.paga) {
            status = "PAGA";
          } else if (hoje > vencimento) {
            status = "ATRASADA";
          } else {
            status = "EM_ABERTO";
          }

          faturaInfo = {
            ano: faturaAtual.ano,
            mes: faturaAtual.mes,
            total: Number(faturaAtual.total),
            paga: faturaAtual.paga,
            dataVencimento: vencimento.toISOString().split("T")[0],
            status,
          };
        }

        return {
          ...cartao,
          limite,
          limiteDisponivel,
          emUso: limiteUsado,
          faturaAtual: faturaInfo,
          contaVinculadaId: cartao.contaVinculadaId ?? null,
        };
      })
    );

    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    console.error("Erro no GET /api/cartoes:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================
// POST - Criar novo cartão
// ============================================
export async function POST(req: Request) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();

    const {
      nome,
      tipo,
      bandeira,
      empresa,
      limite,
      diaFechamento,
      diaVencimento,
      ativo,
      observacoes,
      contaVinculadaId,
    } = body;

    if (!nome || !tipo) {
      return NextResponse.json(
        { error: "Nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    if (tipo !== "credito" && tipo !== "debito") {
      return NextResponse.json(
        { error: "Tipo de cartão inválido" },
        { status: 400 }
      );
    }

    if (tipo === "debito") {
      if (!contaVinculadaId) {
        return NextResponse.json(
          { error: "Cartão de débito precisa estar vinculado a uma conta" },
          { status: 400 }
        );
      }

      const [contaVinculada] = await db
        .select()
        .from(contas)
        .where(and(eq(contas.id, contaVinculadaId), eq(contas.userId, userId)))
        .limit(1);

      if (!contaVinculada) {
        return NextResponse.json(
          { error: "Conta vinculada não encontrada" },
          { status: 404 }
        );
      }

      if (!contaVinculada.ativo) {
        return NextResponse.json(
          { error: "A conta vinculada está inativa" },
          { status: 400 }
        );
      }
    }

    const isCartaoCredito = tipo === "credito";

    let limiteNum = 0;

    if (isCartaoCredito) {
      limiteNum = typeof limite === "string" ? parseFloat(limite) : Number(limite);

      if (!Number.isFinite(limiteNum) || limiteNum <= 0) {
        return NextResponse.json(
          { error: "Limite válido é obrigatório para cartão de crédito" },
          { status: 400 }
        );
      }
    }

    const fechamentoNum =
      isCartaoCredito && diaFechamento !== undefined
        ? Number(diaFechamento)
        : undefined;

    const vencimentoNum =
      isCartaoCredito && diaVencimento !== undefined
        ? Number(diaVencimento)
        : undefined;

    if (
      isCartaoCredito &&
      ((fechamentoNum !== undefined && !Number.isFinite(fechamentoNum)) ||
        (vencimentoNum !== undefined && !Number.isFinite(vencimentoNum)))
    ) {
      return NextResponse.json(
        { error: "Dias de fechamento/vencimento inválidos" },
        { status: 400 }
      );
    }

    if (contaVinculadaId && typeof contaVinculadaId !== "string") {
      return NextResponse.json(
        { error: "Conta vinculada inválida" },
        { status: 400 }
      );
    }

    const erroDono = await garantirDono(userId, { contaId: contaVinculadaId });
    if (erroDono) return NextResponse.json({ error: erroDono }, { status: 404 });

    const [novo] = await db
      .insert(cartoes)
      .values({
        userId,
        nome,
        tipo,
        bandeira: bandeira || "",
        empresa: empresa || "",
        limite: limiteNum.toFixed(2),
        limiteDisponivel: limiteNum.toFixed(2),
        diaFechamento: fechamentoNum ?? null,
        diaVencimento: vencimentoNum ?? null,
        ativo: ativo ?? true,
        observacoes: observacoes || null,
        contaVinculadaId: contaVinculadaId || null,
      })
      .returning();

    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    console.error("Erro no POST /api/cartoes:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}