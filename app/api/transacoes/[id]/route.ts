// app/api/transacoes/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes, contas, extratoConta, cartoes, faturas } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";

// PUT - Atualizar transação
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const json = await req.json();
    const { modoEdicao } = json;

    // ============================================
    // EDIÇÃO DE UMA ÚNICA TRANSAÇÃO
    // ============================================
    if (modoEdicao === "unica") {
      // 🔐 Verificar ownership antes de atualizar
      const [transacaoExistente] = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId)
          )
        )
        .limit(1);

      if (!transacaoExistente) {
        return NextResponse.json(
          { error: "Transação não encontrada ou acesso negado" },
          { status: 404 }
        );
      }

      // ✅ CORREÇÃO: Converter data
      const dataParaAtualizar = json.data
        ? (typeof json.data === 'string' ? new Date(json.data) : json.data)
        : undefined;

      // ✅ NOVO: Atualizar transação
      const [updated] = await db
        .update(transacoes)
        .set({
          tipo: json.tipo,
          descricao: json.descricao,
          valor: String(json.valor),
          data: dataParaAtualizar,
          categoria: json.categoria,
          contaId: json.contaId,
          formaPagamento: json.formaPagamento,
          cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transacoes.id, id),
            eq(transacoes.userId, userId)
          )
        )
        .returning();

      // ✅ NOVO: Atualizar extrato SE existir e SE não for cartão
      if (transacaoExistente.formaPagamento !== "cartao" && transacaoExistente.contaId) {
        try {
          // Buscar registro do extrato vinculado
          const [extratoExistente] = await db
            .select()
            .from(extratoConta)
            .where(
              and(
                eq(extratoConta.referenciaId, id),
                eq(extratoConta.userId, userId)
              )
            )
            .limit(1);

          if (extratoExistente) {
            // Calcular novo saldo se o valor mudou
            const valorAntigo = Number(transacaoExistente.valor);
            const valorNovo = Number(json.valor);
            const saldoAntigoApos = Number(extratoExistente.saldoApos);

            let novoSaldoApos = saldoAntigoApos;

            // Se o valor mudou, recalcular saldo
            if (valorAntigo !== valorNovo) {
              const diferenca = valorNovo - valorAntigo;

              if (transacaoExistente.tipo === "entrada") {
                novoSaldoApos = saldoAntigoApos + diferenca;
              } else {
                novoSaldoApos = saldoAntigoApos + diferenca; // diferença já considera o sinal
              }

              // ✅ IMPORTANTE: Atualizar saldo da conta também
              await db
                .update(contas)
                .set({
                  saldoAtual: novoSaldoApos.toFixed(2),
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(contas.id, transacaoExistente.contaId),
                    eq(contas.userId, userId)
                  )
                );
            }

            // Formatar data para o extrato (YYYY-MM-DD)
            const dataExtrato = dataParaAtualizar
              ? dataParaAtualizar.toISOString().split('T')[0]
              : extratoExistente.data;

            // Atualizar registro do extrato
            await db
              .update(extratoConta)
              .set({
                data: dataExtrato,
                tipo: json.tipo === "entrada" ? "entrada" : "saida",
                valor: Math.abs(Number(json.valor)).toFixed(2),
                descricao: json.descricao || extratoExistente.descricao,
                saldoApos: novoSaldoApos.toFixed(2),
              })
              .where(
                and(
                  eq(extratoConta.id, extratoExistente.id),
                  eq(extratoConta.userId, userId)
                )
              );

            console.log(`✅ Extrato atualizado: ${id} | Novo saldo: R$ ${novoSaldoApos.toFixed(2)}`);
          }
        } catch (extratoError) {
          console.error("⚠️ Erro ao atualizar extrato (não crítico):", extratoError);
          // Não bloqueia a atualização da transação se o extrato falhar
        }
      }

      return NextResponse.json(updated);
    }

    // ============================================
    // EDIÇÃO DE TODAS AS PARCELAS
    // ============================================
    if (modoEdicao === "todas_parcelas") {
      if (!json.parcelamentoId) {
        return NextResponse.json(
          { error: "parcelamentoId é obrigatório" },
          { status: 400 }
        );
      }

      // 🔐 Buscar parcelas do usuário
      const transacoesParceladas = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, json.parcelamentoId),
            eq(transacoes.userId, userId)
          )
        );

      if (!transacoesParceladas.length) {
        return NextResponse.json(
          { error: "Parcelamento não encontrado" },
          { status: 404 }
        );
      }

      const valorParcela = Number(json.valor) / json.parcelas;
      const atualizadas = [];

      for (const t of transacoesParceladas) {
        const [updated] = await db
          .update(transacoes)
          .set({
            tipo: json.tipo,
            descricao: json.descricao,
            valor: valorParcela.toFixed(2),
            categoria: json.categoria,
            contaId: json.contaId,
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,

            parcelado: true,
            parcelas: json.parcelas,
            parcelaAtual: t.parcelaAtual,
            parcelamentoId: json.parcelamentoId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transacoes.id, t.id),
              eq(transacoes.userId, userId)
            )
          )
          .returning();

        if (updated) atualizadas.push(updated);

        // ✅ NOVO: Atualizar extrato de cada parcela
        if (t.formaPagamento !== "cartao" && t.contaId) {
          try {
            const [extratoExistente] = await db
              .select()
              .from(extratoConta)
              .where(
                and(
                  eq(extratoConta.referenciaId, t.id),
                  eq(extratoConta.userId, userId)
                )
              )
              .limit(1);

            if (extratoExistente) {
              await db
                .update(extratoConta)
                .set({
                  tipo: json.tipo === "entrada" ? "entrada" : "saida",
                  valor: Math.abs(valorParcela).toFixed(2),
                  descricao: json.descricao || extratoExistente.descricao,
                })
                .where(
                  and(
                    eq(extratoConta.id, extratoExistente.id),
                    eq(extratoConta.userId, userId)
                  )
                );
            }
          } catch (extratoError) {
            console.error("⚠️ Erro ao atualizar extrato da parcela:", extratoError);
          }
        }
      }

      return NextResponse.json(atualizadas);
    }

    // ============================================
    // EDIÇÃO DE TODA A RECORRÊNCIA
    // ============================================
    if (modoEdicao === "toda_recorrencia") {
      if (!json.recorrenciaId) {
        return NextResponse.json(
          { error: "recorrenciaId é obrigatório" },
          { status: 400 }
        );
      }

      // 🔐 Buscar recorrências do usuário
      const transacoesRecorrentes = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.recorrenciaId, json.recorrenciaId),
            eq(transacoes.userId, userId)
          )
        );

      if (!transacoesRecorrentes.length) {
        return NextResponse.json(
          { error: "Recorrência não encontrada" },
          { status: 404 }
        );
      }

      const atualizadas = [];

      for (const t of transacoesRecorrentes) {
        const [updated] = await db
          .update(transacoes)
          .set({
            tipo: json.tipo,
            descricao: json.descricao,
            valor: String(json.valor),
            categoria: json.categoria,
            contaId: json.contaId,
            formaPagamento: json.formaPagamento,
            cartaoId: json.formaPagamento === "cartao" ? json.cartaoId : null,

            recorrente: true,
            recorrenciaId: json.recorrenciaId,
            repeticoes: json.repeticoes,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transacoes.id, t.id),
              eq(transacoes.userId, userId)
            )
          )
          .returning();

        if (updated) atualizadas.push(updated);

        // ✅ NOVO: Atualizar extrato de cada recorrência
        if (t.formaPagamento !== "cartao" && t.contaId) {
          try {
            const [extratoExistente] = await db
              .select()
              .from(extratoConta)
              .where(
                and(
                  eq(extratoConta.referenciaId, t.id),
                  eq(extratoConta.userId, userId)
                )
              )
              .limit(1);

            if (extratoExistente) {
              await db
                .update(extratoConta)
                .set({
                  tipo: json.tipo === "entrada" ? "entrada" : "saida",
                  valor: Math.abs(Number(json.valor)).toFixed(2),
                  descricao: json.descricao || extratoExistente.descricao,
                })
                .where(
                  and(
                    eq(extratoConta.id, extratoExistente.id),
                    eq(extratoConta.userId, userId)
                  )
                );
            }
          } catch (extratoError) {
            console.error("⚠️ Erro ao atualizar extrato da recorrência:", extratoError);
          }
        }
      }

      return NextResponse.json(atualizadas);
    }

    // FALLBACK
    return NextResponse.json(
      { error: "Modo de edição inválido" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao atualizar transação:", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar transação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Deletar transação (com remoção de extrato e ajuste de saldo)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 🔐 Autenticação
    const userId = await getUserId();

    // ✅ VALIDAÇÃO: Retorna 401 se não autenticado
    if (!userId) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const tiposPermitidos = ["unica", "todas_parcelas", "toda_recorrencia"];

    if (tipo && !tiposPermitidos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }

    // 🔐 Buscar transação e verificar ownership
    const [mov] = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.id, id),
          eq(transacoes.userId, userId) // 🔐 Verificar ownership
        )
      )
      .limit(1);

    if (!mov) {
      return NextResponse.json(
        { error: "Transação não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

    // Bloqueio de transferência
    if (mov.transferenciaId) {
      return NextResponse.json(
        { error: "Esta transação faz parte de uma transferência. Use exclusão de transferências." },
        { status: 400 }
      );
    }

    // ===================================================================
    // BUSCAR TRANSAÇÕES A SEREM DELETADAS
    // ===================================================================
    let transacoesParaDeletar: typeof mov[] = [];

    if (!tipo || tipo === "unica") {
      transacoesParaDeletar = [mov];
    } else if (tipo === "todas_parcelas" && mov.parcelamentoId) {
      transacoesParaDeletar = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.parcelamentoId, mov.parcelamentoId),
            eq(transacoes.userId, userId)
          )
        );
    } else if (tipo === "toda_recorrencia" && mov.recorrenciaId) {
      transacoesParaDeletar = await db
        .select()
        .from(transacoes)
        .where(
          and(
            eq(transacoes.recorrenciaId, mov.recorrenciaId),
            eq(transacoes.userId, userId)
          )
        );
    }

    console.log(`🗑️  Deletando ${transacoesParaDeletar.length} transação(ões)`);

    // ===================================================================
    // PROCESSAR CADA TRANSAÇÃO
    // ===================================================================
    for (const transacao of transacoesParaDeletar) {
      const valor = Number(transacao.valor);

      // 1. Reverter saldo da conta (se não for cartão de crédito)
      if (transacao.contaId && transacao.formaPagamento !== "cartao") {
        const [conta] = await db
          .select()
          .from(contas)
          .where(eq(contas.id, transacao.contaId))
          .limit(1);

        if (conta) {
          const saldoAtual = Number(conta.saldoAtual);
          // Reverter: entrada vira saída, saída vira entrada
          const novoSaldo = transacao.tipo === "entrada"
            ? saldoAtual - valor
            : saldoAtual + valor;

          await db
            .update(contas)
            .set({
              saldoAtual: novoSaldo.toFixed(2), // ✅ String
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contas.id, transacao.contaId),
                eq(contas.userId, userId)
              )
            );
        }
      }

      // 2. Remover do extrato (se existir)
      await db
        .delete(extratoConta)
        .where(
          and(
            eq(extratoConta.referenciaId, transacao.id),
            eq(extratoConta.userId, userId)
          )
        );

      // 3. Reverter fatura se for cartão de crédito
      if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
        // ✅ BUSCAR CARTÃO PARA PEGAR DIA DE FECHAMENTO
        const [cartao] = await db
          .select()
          .from(cartoes)
          .where(eq(cartoes.id, transacao.cartaoId))
          .limit(1);

        if (cartao) {
          const dataTransacao = new Date(transacao.data);
          const diaFechamento = cartao.diaFechamento || 1;

          // ✅ CRÍTICO: Calcular fatura correta usando o mesmo método da criação
          const { mes: mesFatura, ano: anoFatura } = calcularFaturaDaTransacao(
            dataTransacao,
            diaFechamento
          );

          console.log(
            `📅 Revertendo transação de ${dataTransacao.toLocaleDateString('pt-BR')} → Fatura ${mesFatura}/${anoFatura}`
          );

          const [fatura] = await db
            .select()
            .from(faturas)
            .where(
              and(
                eq(faturas.cartaoId, transacao.cartaoId),
                eq(faturas.userId, userId),
                eq(faturas.mes, mesFatura),
                eq(faturas.ano, anoFatura)
              )
            )
            .limit(1);

          if (fatura) {
            const totalAtual = Number(fatura.total);
            const novoTotal = totalAtual - valor;

            if (novoTotal <= 0) {
              // Deletar fatura se ficar zerada
              await db
                .delete(faturas)
                .where(eq(faturas.id, fatura.id));

              console.log(`🗑️  Fatura ${mesFatura}/${anoFatura} deletada (zerada)`);
            } else {
              // Atualizar total da fatura
              await db
                .update(faturas)
                .set({
                  total: novoTotal.toFixed(2), // ✅ String
                  updatedAt: new Date(),
                })
                .where(eq(faturas.id, fatura.id));

              console.log(
                `✅ Fatura ${mesFatura}/${anoFatura} atualizada: R$ ${totalAtual.toFixed(2)} → R$ ${novoTotal.toFixed(2)}`
              );
            }
          }
        }

        // Reverter limite disponível do cartão
        await db
          .update(cartoes)
          .set({
            limiteDisponivel: sql`CAST(${cartoes.limiteDisponivel} AS NUMERIC) + ${valor}`,
          })
          .where(
            and(
              eq(cartoes.id, transacao.cartaoId),
              eq(cartoes.userId, userId)
            )
          );
      }
    }

    // ===================================================================
    // 4. DELETAR AS TRANSAÇÕES
    // ===================================================================
    const idsParaDeletar = transacoesParaDeletar.map(t => t.id);

    if (idsParaDeletar.length === 1) {
      // Deletar única transação
      await db
        .delete(transacoes)
        .where(
          and(
            eq(transacoes.id, idsParaDeletar[0]),
            eq(transacoes.userId, userId)
          )
        );
    } else if (idsParaDeletar.length > 1) {
      // ✅ Deletar múltiplas transações usando inArray
      await db
        .delete(transacoes)
        .where(
          and(
            inArray(transacoes.id, idsParaDeletar),
            eq(transacoes.userId, userId)
          )
        );
    }

    console.log(`✅ ${idsParaDeletar.length} transação(ões) deletada(s)`);

    return NextResponse.json({
      sucesso: true,
      deletadas: transacoesParaDeletar.length
    });

  } catch (err: any) {
    console.error("❌ Erro ao deletar transação:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}