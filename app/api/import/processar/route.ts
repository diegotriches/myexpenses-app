// src/app/api/import/processar/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  categorias, contas, cartoes, transacoes, faturas, extratoConta,
  notificacoes, preferenciasNotificacao, preferences, estabelecimentos,
  transferencias, notas, adiantamentosFatura,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";

interface ImportResultado {
  modulo: string;
  importados: number;
}

/**
 * POST /api/import/processar
 *
 * ✅ REESCRITO DO ZERO. O sistema anterior tinha bugs críticos:
 * - Tentava inserir mesReferencia/anoReferencia em faturas (campos que
 *   não existem na tabela), o que quebrava todo import de faturas
 * - Gerava novos UUIDs para todo registro, então "pular duplicados"
 *   nunca funcionava de fato para transações/faturas/extrato
 * - Tratava "preferencias" (array de preferenciasNotificacao) como se
 *   fosse o objeto singular "preferences", inserindo na tabela errada
 * - Tinha um "rollback" que nunca desfazia nada e um "criarBackup" que
 *   era apenas um TODO sem implementação
 *
 * Nova abordagem: estratégia única e honesta — SUBSTITUI todos os
 * dados do usuário pelo conteúdo do arquivo, dentro de uma transação
 * atômica. É a mesma lógica já testada em
 * /api/backups/[id]/restaurar/route.ts. Não há mais tentativa de
 * "mesclar" ou "pular duplicados": ao importar um arquivo, o usuário
 * está dizendo "quero que meus dados sejam exatamente este arquivo".
 *
 * Body:
 * {
 *   dados: { metadata, statistics, data },
 *   confirmar: true
 * }
 */
export async function POST(req: NextRequest) {
  const inicio = Date.now();

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { dados, confirmar } = body;

    if (confirmar !== true) {
      return NextResponse.json(
        { error: "Confirmação obrigatória — envie { confirmar: true } no body" },
        { status: 400 }
      );
    }

    if (!dados?.data) {
      return NextResponse.json(
        { error: "Arquivo inválido — estrutura 'data' não encontrada" },
        { status: 400 }
      );
    }

    // Validação estrutural mínima: confirma que é um arquivo do MyExpenses
    if (!dados.metadata?.appName || dados.metadata.appName !== "MyExpenses") {
      return NextResponse.json(
        { error: "Arquivo não reconhecido como um export válido do MyExpenses" },
        { status: 400 }
      );
    }

    const data = dados.data;
    const resultados: ImportResultado[] = [];

    await db.transaction(async (tx) => {
      // 1. Remove dados atuais do usuário (filhas → pais, respeitando FKs)
      await tx.delete(adiantamentosFatura).where(eq(adiantamentosFatura.userId, userId));
      await tx.delete(extratoConta).where(eq(extratoConta.userId, userId));
      await tx.delete(transferencias).where(eq(transferencias.userId, userId));
      await tx.delete(faturas).where(eq(faturas.userId, userId));
      await tx.delete(transacoes).where(eq(transacoes.userId, userId));
      await tx.delete(notas).where(eq(notas.userId, userId));
      await tx.delete(notificacoes).where(eq(notificacoes.userId, userId));
      await tx.delete(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId));
      await tx.delete(estabelecimentos).where(eq(estabelecimentos.userId, userId));
      await tx.delete(cartoes).where(eq(cartoes.userId, userId));
      await tx.delete(contas).where(eq(contas.userId, userId));
      await tx.delete(categorias).where(eq(categorias.userId, userId));
      await tx.delete(preferences).where(eq(preferences.userId, userId));

      // 2. Reinsere a partir do arquivo (pais → filhas)
      // Todos os registros têm seu userId forçado para o usuário atual,
      // independente do que estava no arquivo — protege contra um
      // arquivo de outro usuário sendo importado por engano/manipulação.

      if (data.categorias?.length) {
        const registros = data.categorias.map((r: any) => ({ ...r, userId }));
        await tx.insert(categorias).values(registros);
        resultados.push({ modulo: "categorias", importados: registros.length });
      }

      if (data.contas?.length) {
        const registros = data.contas.map((r: any) => ({ ...r, userId }));
        await tx.insert(contas).values(registros);
        resultados.push({ modulo: "contas", importados: registros.length });
      }

      if (data.cartoes?.length) {
        const registros = data.cartoes.map((r: any) => ({ ...r, userId }));
        await tx.insert(cartoes).values(registros);
        resultados.push({ modulo: "cartoes", importados: registros.length });
      }

      if (data.estabelecimentos?.length) {
        const registros = data.estabelecimentos.map((r: any) => ({ ...r, userId }));
        await tx.insert(estabelecimentos).values(registros);
        resultados.push({ modulo: "estabelecimentos", importados: registros.length });
      }

      if (data.transacoes?.length) {
        const registros = data.transacoes.map((r: any) => ({ ...r, userId }));
        await tx.insert(transacoes).values(registros);
        resultados.push({ modulo: "transacoes", importados: registros.length });
      }

      if (data.faturas?.length) {
        // ✅ Remove os campos calculados que não existem na tabela real
        const registros = data.faturas.map((f: any) => {
          const { mesReferencia, anoReferencia, ...resto } = f;
          return { ...resto, userId };
        });
        await tx.insert(faturas).values(registros);
        resultados.push({ modulo: "faturas", importados: registros.length });
      }

      if (data.adiantamentos?.length) {
        const registros = data.adiantamentos.map((r: any) => ({ ...r, userId }));
        await tx.insert(adiantamentosFatura).values(registros);
        resultados.push({ modulo: "adiantamentos", importados: registros.length });
      }

      if (data.transferencias?.length) {
        const registros = data.transferencias.map((r: any) => ({ ...r, userId }));
        await tx.insert(transferencias).values(registros);
        resultados.push({ modulo: "transferencias", importados: registros.length });
      }

      if (data.extrato?.length) {
        const registros = data.extrato.map((r: any) => ({ ...r, userId }));
        await tx.insert(extratoConta).values(registros);
        resultados.push({ modulo: "extrato", importados: registros.length });
      }

      if (data.notas?.length) {
        const registros = data.notas.map((r: any) => ({ ...r, userId }));
        await tx.insert(notas).values(registros);
        resultados.push({ modulo: "notas", importados: registros.length });
      }

      if (data.notificacoes?.length) {
        const registros = data.notificacoes.map((r: any) => ({ ...r, userId }));
        await tx.insert(notificacoes).values(registros);
        resultados.push({ modulo: "notificacoes", importados: registros.length });
      }

      // ✅ CORRIGIDO: "preferencias" (array) vai para preferenciasNotificacao,
      // que é a tabela correta — não para "preferences" (singular, outra
      // tabela), que era o bug do código anterior.
      if (data.preferencias?.length) {
        const registros = data.preferencias.map((r: any) => ({ ...r, userId }));
        await tx.insert(preferenciasNotificacao).values(registros);
        resultados.push({ modulo: "preferencias_notificacao", importados: registros.length });
      }

      // ✅ CORRIGIDO: "preferences" (objeto singular) agora é processado
      // separadamente — no código anterior, essa chave nunca era lida.
      if (data.preferences) {
        await tx.insert(preferences).values({ ...data.preferences, userId });
        resultados.push({ modulo: "preferences", importados: 1 });
      }
    });

    const duracao = Date.now() - inicio;
    const totalImportado = resultados.reduce((acc, r) => acc + r.importados, 0);

    console.log(`[Import] Importação concluída em ${duracao}ms — ${totalImportado} registros`, resultados);

    return NextResponse.json({
      message:    "Importação concluída com sucesso",
      resultados,
      totalImportado,
      duracao,
    });
  } catch (error: any) {
    console.error("[Import] Erro ao processar importação:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao processar importação" },
      { status: 500 }
    );
  }
}