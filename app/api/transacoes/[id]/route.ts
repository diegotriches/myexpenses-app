// app/api/transacoes/[id]/route.ts - ARQUIVO COMPLETO COM SUPORTE A DÉBITO
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

      const dataParaAtualizar = json.data
        ? (typeof json.data === 'string' ? new Date(json.data) : json.data)
        : new Date(transacaoExistente.data);

      const isParcelado  = json.parcelado  === true;
      const isRecorrente = json.recorrente === true;
      const eraParcelado  = transacaoExistente.parcelado  === true;
      const eraRecorrente = transacaoExistente.recorrente === true;

      // ============================================================
      // CASO ESPECIAL: Convertendo à vista → parcelado
      // Atualiza o registro existente como parcela 1 e cria as demais
      // ============================================================
      if (isParcelado && !eraParcelado) {
        const totalParcelas  = json.parcelas as number;
        const valorParcela   = Number(json.valor) / totalParcelas;
        const parcelamentoId = crypto.randomUUID();

        // 1. Atualiza a transação existente como parcela 1
        const [parcela1] = await db
          .update(transacoes)
          .set({
            tipo:           json.tipo,
            descricao:      json.descricao,
            valor:          valorParcela.toFixed(2),
            data:           dataParaAtualizar,
            categoria:      json.categoria,
            contaId:        json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado:      true,
            parcelas:       totalParcelas,
            parcelaAtual:   1,
            parcelamentoId,
            recorrente:     false,
            recorrenciaId:  null,
            repeticoes:     null,
            updatedAt:      new Date(),
          })
          .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
          .returning();

        console.log(`✅ Parcela 1/${totalParcelas} atualizada: ${id}`);

        // 2. Cria as parcelas 2..N com datas mensais subsequentes
        const parcelasParaCriar = [];
        for (let i = 2; i <= totalParcelas; i++) {
          const dataParcela = new Date(dataParaAtualizar);
          dataParcela.setMonth(dataParcela.getMonth() + (i - 1));

          parcelasParaCriar.push({
            userId,
            tipo:           json.tipo           as string,
            descricao:      json.descricao      as string | null,
            valor:          valorParcela.toFixed(2),
            data:           dataParcela,
            categoria:      json.categoria      as string | null,
            contaId:        json.formaPagamento === "cartao" ? null : (json.contaId || null),
            formaPagamento: json.formaPagamento as string,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            parcelado:      true,
            parcelas:       totalParcelas,
            parcelaAtual:   i,
            parcelamentoId,
            recorrente:     false,
            recorrenciaId:  null,
            repeticoes:     null,
          });
        }

        const novasParcelas = await db
          .insert(transacoes)
          .values(parcelasParaCriar)
          .returning();

        console.log(`✅ ${novasParcelas.length} parcelas criadas — parcelamentoId: ${parcelamentoId}`);

        return NextResponse.json({ parcela1, novasParcelas, parcelamentoId, totalParcelas });
      }

      // ============================================================
      // CASO ESPECIAL: Convertendo à vista → recorrente
      // Atualiza o registro existente como repetição 1 e cria as demais
      // ============================================================
      if (isRecorrente && !eraRecorrente) {
        const totalRepeticoes = json.repeticoes as number;
        const recorrenciaId   = crypto.randomUUID();

        // 1. Atualiza a transação existente como repetição 1
        const [repeticao1] = await db
          .update(transacoes)
          .set({
            tipo:           json.tipo,
            descricao:      json.descricao,
            valor:          String(json.valor),
            data:           dataParaAtualizar,
            categoria:      json.categoria,
            contaId:        json.contaId || null,
            formaPagamento: json.formaPagamento,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente:     true,
            recorrenciaId,
            repeticoes:     totalRepeticoes,
            parcelado:      false,
            parcelamentoId: null,
            parcelas:       null,
            parcelaAtual:   null,
            updatedAt:      new Date(),
          })
          .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
          .returning();

        console.log(`✅ Repetição 1/${totalRepeticoes} atualizada: ${id}`);

        // 2. Cria as repetições 2..N com datas mensais subsequentes
        const repeticoesParaCriar = [];
        for (let i = 2; i <= totalRepeticoes; i++) {
          const dataRepeticao = new Date(dataParaAtualizar);
          dataRepeticao.setMonth(dataRepeticao.getMonth() + (i - 1));

          repeticoesParaCriar.push({
            userId,
            tipo:           json.tipo           as string,
            descricao:      json.descricao      as string | null,
            valor:          String(json.valor),
            data:           dataRepeticao,
            categoria:      json.categoria      as string | null,
            contaId:        json.contaId        as string | null,
            formaPagamento: json.formaPagamento as string,
            cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
            recorrente:     true,
            recorrenciaId,
            repeticoes:     totalRepeticoes,
            parcelado:      false,
            parcelamentoId: null,
            parcelas:       null,
            parcelaAtual:   null,
          });
        }

        const novasRepeticoes = await db
          .insert(transacoes)
          .values(repeticoesParaCriar)
          .returning();

        console.log(`✅ ${novasRepeticoes.length} repetições criadas — recorrenciaId: ${recorrenciaId}`);

        return NextResponse.json({ repeticao1, novasRepeticoes, recorrenciaId, totalRepeticoes });
      }

      // ============================================================
      // CASO PADRÃO: Edição simples sem mudança de tipo de pagamento
      // ============================================================
      const parcelamentoId = isParcelado
        ? (transacaoExistente.parcelamentoId || crypto.randomUUID())
        : null;

      const recorrenciaId = isRecorrente
        ? (transacaoExistente.recorrenciaId || crypto.randomUUID())
        : null;

      const [updated] = await db
        .update(transacoes)
        .set({
          tipo:           json.tipo,
          descricao:      json.descricao,
          valor:          String(json.valor),
          data:           dataParaAtualizar,
          categoria:      json.categoria,
          contaId:        json.contaId,
          formaPagamento: json.formaPagamento,
          cartaoId:       json.formaPagamento === "cartao" ? json.cartaoId : null,
          parcelado:      isParcelado,
          parcelas:       isParcelado  ? (json.parcelas   ?? null) : null,
          parcelaAtual:   isParcelado  ? (transacaoExistente.parcelaAtual ?? 1) : null,
          parcelamentoId,
          recorrente:     isRecorrente,
          repeticoes:     isRecorrente ? (json.repeticoes ?? null) : null,
          recorrenciaId,
          updatedAt:      new Date(),
        })
        .where(and(eq(transacoes.id, id), eq(transacoes.userId, userId)))
        .returning();

      // Atualizar extrato SE existir e SE não for cartão
      if (transacaoExistente.formaPagamento !== "cartao" && transacaoExistente.contaId) {
        try {
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
            const valorAntigo     = Number(transacaoExistente.valor);
            const valorNovo       = Number(json.valor);
            const saldoAntigoApos = Number(extratoExistente.saldoApos);
            let novoSaldoApos     = saldoAntigoApos;

            if (valorAntigo !== valorNovo) {
              novoSaldoApos = saldoAntigoApos + (valorNovo - valorAntigo);

              await db
                .update(contas)
                .set({ saldoAtual: novoSaldoApos.toFixed(2), updatedAt: new Date() })
                .where(and(eq(contas.id, transacaoExistente.contaId), eq(contas.userId, userId)));
            }

            const dataExtrato = dataParaAtualizar
              ? dataParaAtualizar.toISOString().split('T')[0]
              : extratoExistente.data;

            await db
              .update(extratoConta)
              .set({
                data:      dataExtrato,
                tipo:      json.tipo === "entrada" ? "entrada" : "saida",
                valor:     Math.abs(Number(json.valor)).toFixed(2),
                descricao: json.descricao || extratoExistente.descricao,
                saldoApos: novoSaldoApos.toFixed(2),
              })
              .where(and(eq(extratoConta.id, extratoExistente.id), eq(extratoConta.userId, userId)));

            console.log(`✅ Extrato atualizado: ${id} | Novo saldo: R$ ${novoSaldoApos.toFixed(2)}`);
          }
        } catch (extratoError) {
          console.error("⚠️ Erro ao atualizar extrato (não crítico):", extratoError);
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
    const userId = await getUserId();

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

    const [mov] = await db
      .select()
      .from(transacoes)
      .where(
        and(
          eq(transacoes.id, id),
          eq(transacoes.userId, userId)
        )
      )
      .limit(1);

    if (!mov) {
      return NextResponse.json(
        { error: "Transação não encontrada ou acesso negado" },
        { status: 404 }
      );
    }

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

      // 1. Reverter saldo da conta (se não for cartão)
      if (transacao.contaId && transacao.formaPagamento !== "cartao") {
        const [conta] = await db
          .select()
          .from(contas)
          .where(eq(contas.id, transacao.contaId))
          .limit(1);

        if (conta) {
          const saldoAtual = Number(conta.saldoAtual);
          const novoSaldo = transacao.tipo === "entrada"
            ? saldoAtual - valor
            : saldoAtual + valor;

          await db
            .update(contas)
            .set({
              saldoAtual: novoSaldo.toFixed(2),
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

      // 3. ✅ Reverter fatura/limite (crédito) OU conta (débito)
      if (transacao.cartaoId && transacao.formaPagamento === "cartao") {
        const [cartao] = await db
          .select()
          .from(cartoes)
          .where(eq(cartoes.id, transacao.cartaoId))
          .limit(1);

        if (cartao) {
          if (cartao.tipo === "debito" && cartao.contaVinculadaId) {
            // ===== DÉBITO: Reverter na conta vinculada =====

            const [conta] = await db
              .select()
              .from(contas)
              .where(eq(contas.id, cartao.contaVinculadaId))
              .limit(1);

            if (conta) {
              const saldoAtual = Number(conta.saldoAtual);
              const novoSaldo = saldoAtual + valor; // Devolver o dinheiro

              await db
                .update(contas)
                .set({
                  saldoAtual: novoSaldo.toFixed(2),
                  updatedAt: new Date(),
                })
                .where(
                  and(
                    eq(contas.id, conta.id),
                    eq(contas.userId, userId)
                  )
                );

              console.log(
                `💳 Débito revertido: +R$ ${valor.toFixed(2)} em ${conta.nome} ` +
                `(Saldo: R$ ${saldoAtual.toFixed(2)} → R$ ${novoSaldo.toFixed(2)})`
              );
            }

          } else if (cartao.tipo === "credito") {
            // ===== CRÉDITO: Reverter fatura =====

            const dataTransacao = new Date(transacao.data);
            const diaFechamento = cartao.diaFechamento || 1;

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
                await db
                  .delete(faturas)
                  .where(eq(faturas.id, fatura.id));

                console.log(`🗑️  Fatura ${mesFatura}/${anoFatura} deletada (zerada)`);
              } else {
                await db
                  .update(faturas)
                  .set({
                    total: novoTotal.toFixed(2),
                    updatedAt: new Date(),
                  })
                  .where(eq(faturas.id, fatura.id));

                console.log(
                  `✅ Fatura ${mesFatura}/${anoFatura} atualizada: R$ ${totalAtual.toFixed(2)} → R$ ${novoTotal.toFixed(2)}`
                );
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
      }
    }

    // ===================================================================
    // 4. DELETAR AS TRANSAÇÕES
    // ===================================================================
    const idsParaDeletar = transacoesParaDeletar.map(t => t.id);

    if (idsParaDeletar.length === 1) {
      await db
        .delete(transacoes)
        .where(
          and(
            eq(transacoes.id, idsParaDeletar[0]),
            eq(transacoes.userId, userId)
          )
        );
    } else if (idsParaDeletar.length > 1) {
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