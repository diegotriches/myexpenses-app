import { db } from "@/db";
import { cartoes, faturas } from "@/db/schema";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

// ============================================
// GET - Buscar todos os cartões do usuário
// ============================================
export async function GET() {
  try {
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    // FILTRAR por userId
    const listaCartoes = await db
      .select()
      .from(cartoes)
      .where(eq(cartoes.userId, userId));

    const resultado = await Promise.all(
      listaCartoes.map(async (cartao) => {
        // ✅ Converter string para number
        const limite = Number(cartao.limite ?? 0);

        // Calcular limite disponível baseado nas faturas não pagas
        let limiteUsado = 0;

        if (cartao.tipo === "credito") {
          // Buscar faturas do usuário E do cartão
          const faturasNaoPagas = await db
            .select()
            .from(faturas)
            .where(
              and(
                eq(faturas.cartaoId, cartao.id),
                eq(faturas.userId, userId),
                eq(faturas.paga, false)
              )
            );

          // Somar o valor de todas as faturas em aberto
          limiteUsado = faturasNaoPagas.reduce((acc, f) => {
            return acc + Number(f.total);
          }, 0);
        }

        const limiteDisponivel = Math.max(0, limite - limiteUsado);

        // Buscar fatura atual com filtro de userId
        const [faturaAtual] = await db
          .select()
          .from(faturas)
          .where(
            and(
              eq(faturas.cartaoId, cartao.id),
              eq(faturas.userId, userId),
              eq(faturas.ano, anoAtual),
              eq(faturas.mes, mesAtual)
            )
          );

        let faturaInfo = null;

        if (faturaAtual) {
          const diaVencimento = cartao.diaVencimento ?? 1;

          const vencimento = new Date(
            faturaAtual.ano,
            faturaAtual.mes - 1,
            diaVencimento
          );

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
          limite, // ✅ Já convertido para number
          limiteDisponivel, // ✅ Calculado como number
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

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
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

    // Validações básicas
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

    const isCartaoCredito = tipo === "credito";

    let limiteNum = 0;

    if (isCartaoCredito) {
      // ✅ CORRIGIDO: Aceitar string ou number
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

    // Validação da conta vinculada
    if (contaVinculadaId && typeof contaVinculadaId !== "string") {
      return NextResponse.json(
        { error: "Conta vinculada inválida" },
        { status: 400 }
      );
    }

    const novoCartao = {
      userId,
      nome,
      tipo,
      bandeira: bandeira || "",
      empresa: empresa || "",
      // ✅ CORRIGIDO: Converter para string com 2 casas decimais
      limite: limiteNum.toFixed(2),
      limiteDisponivel: limiteNum.toFixed(2),
      diaFechamento: fechamentoNum ?? null,
      diaVencimento: vencimentoNum ?? null,
      ativo: ativo ?? true,
      observacoes: observacoes || null,
      contaVinculadaId: contaVinculadaId || null,
    };

    const [novo] = await db
      .insert(cartoes)
      .values(novoCartao)
      .returning();

    return NextResponse.json(novo, { status: 201 });
  } catch (err) {
    console.error("Erro no POST /api/cartoes:", err);

    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}