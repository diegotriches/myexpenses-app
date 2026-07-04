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

// ── Mapeamento de IDs antigos → novos ────────────────────────────────────────
// Ao importar, geramos novos UUIDs para todos os registros para evitar
// conflito de chave primária (o banco pode ter registros de outros usuários
// com os mesmos IDs). Mantemos um mapa de id_antigo → id_novo para corrigir
// as referências entre tabelas (ex: transacoes.contaId → novo id da conta).
function gerarIdMap(registros: any[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of registros) {
    if (r.id) map.set(r.id, crypto.randomUUID());
  }
  return map;
}

function aplicarIdMap(registros: any[], map: Map<string, string>, campo = "id"): any[] {
  return registros.map((r) => ({
    ...r,
    [campo]: map.get(r[campo]) ?? r[campo],
  }));
}

function substituirReferencias(registros: any[], campos: string[], maps: Map<string, string>[]): any[] {
  return registros.map((r) => {
    const novo = { ...r };
    for (const campo of campos) {
      if (novo[campo]) {
        for (const map of maps) {
          if (map.has(novo[campo])) {
            novo[campo] = map.get(novo[campo]);
            break;
          }
        }
      }
    }
    return novo;
  });
}
// O Drizzle espera objetos Date para colunas timestamp, mas o JSON do arquivo
// exportado traz todas as datas como strings ISO. Essa função converte
// recursivamente qualquer string que pareça uma data ISO para objeto Date.
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

function normalizarDatas(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    return ISO_REGEX.test(obj) ? new Date(obj) : obj;
  }
  if (Array.isArray(obj)) return obj.map(normalizarDatas);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, normalizarDatas(v)])
    );
  }
  return obj;
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
      // Geramos novos UUIDs para todos os registros para evitar conflito
      // de chave primária — o banco pode ter registros de outros usuários
      // com os mesmos IDs do arquivo. Mantemos mapas id_antigo→id_novo
      // para corrigir referências entre tabelas.

      // ── Categorias ────────────────────────────────────────────────────────
      const categoriasMap = gerarIdMap(data.categorias ?? []);
      if (data.categorias?.length) {
        const registros = normalizarDatas(
          aplicarIdMap(data.categorias, categoriasMap).map((r: any) => ({ ...r, userId }))
        );
        await tx.insert(categorias).values(registros);
        resultados.push({ modulo: "categorias", importados: registros.length });
      }

      // ── Contas ────────────────────────────────────────────────────────────
      const contasMap = gerarIdMap(data.contas ?? []);
      if (data.contas?.length) {
        const registros = normalizarDatas(
          aplicarIdMap(data.contas, contasMap).map((r: any) => ({ ...r, userId }))
        );
        await tx.insert(contas).values(registros);
        resultados.push({ modulo: "contas", importados: registros.length });
      }

      // ── Cartões (id serial — gerado pelo banco) ───────────────────────────
      const cartoesIdMap = new Map<number, number>(); // id_antigo → id_novo
      if (data.cartoes?.length) {
        for (const cartao of data.cartoes) {
          const { id: idAntigo, ...resto } = cartao;
          const registro = normalizarDatas({
            ...resto,
            userId,
            contaVinculadaId: cartao.contaVinculadaId
              ? (contasMap.get(cartao.contaVinculadaId) ?? cartao.contaVinculadaId)
              : null,
          });
          const [inserido] = await tx.insert(cartoes).values(registro).returning({ id: cartoes.id });
          if (idAntigo != null) cartoesIdMap.set(Number(idAntigo), Number(inserido.id));
        }
        resultados.push({ modulo: "cartoes", importados: data.cartoes.length });
      }

      // ── Estabelecimentos ──────────────────────────────────────────────────
      const estabelecimentosMap = gerarIdMap(data.estabelecimentos ?? []);
      if (data.estabelecimentos?.length) {
        const registros = normalizarDatas(
          aplicarIdMap(data.estabelecimentos, estabelecimentosMap).map((r: any) => ({ ...r, userId }))
        );
        await tx.insert(estabelecimentos).values(registros);
        resultados.push({ modulo: "estabelecimentos", importados: registros.length });
      }

      // ── Transações (id serial — gerado pelo banco) ────────────────────────
      const transacoesIdMap = new Map<number, number>();
      if (data.transacoes?.length) {
        for (const transacao of data.transacoes) {
          const { id: idAntigo, ...resto } = transacao;
          const registro = normalizarDatas({
            ...resto,
            userId,
            contaId:     transacao.contaId     ? (contasMap.get(transacao.contaId)           ?? transacao.contaId)     : null,
            cartaoId:    transacao.cartaoId     ? (cartoesIdMap.get(Number(transacao.cartaoId)) ?? transacao.cartaoId)  : null,
            categoriaId: transacao.categoriaId  ? (categoriasMap.get(transacao.categoriaId)   ?? transacao.categoriaId) : null,
          });
          const [inserido] = await tx.insert(transacoes).values(registro).returning({ id: transacoes.id });
          if (idAntigo != null) transacoesIdMap.set(Number(idAntigo), Number(inserido.id));
        }
        resultados.push({ modulo: "transacoes", importados: data.transacoes.length });
      }

      // ── Faturas (id serial — gerado pelo banco) ───────────────────────────
      const faturasIdMap = new Map<number, number>(); // id_antigo → id_novo
      if (data.faturas?.length) {
        for (const fatura of data.faturas) {
          const { id: idAntigo, mesReferencia, anoReferencia, ...resto } = fatura;
          const registro = normalizarDatas({
            ...resto,
            userId,
            cartaoId:         fatura.cartaoId         ? (cartoesIdMap.get(Number(fatura.cartaoId)) ?? fatura.cartaoId)  : null,
            contaPagamentoId: fatura.contaPagamentoId  ? (contasMap.get(fatura.contaPagamentoId)   ?? fatura.contaPagamentoId) : null,
          });
          const [inserido] = await tx.insert(faturas).values(registro).returning({ id: faturas.id });
          if (idAntigo != null) faturasIdMap.set(Number(idAntigo), Number(inserido.id));
        }
        resultados.push({ modulo: "faturas", importados: data.faturas.length });
      }

      // ── Adiantamentos (id serial) ─────────────────────────────────────────
      if (data.adiantamentos?.length) {
        for (const adiantamento of data.adiantamentos) {
          const { id: _, ...resto } = adiantamento;
          const registro = normalizarDatas({
            ...resto,
            userId,
            faturaId: adiantamento.faturaId ? (faturasIdMap.get(Number(adiantamento.faturaId)) ?? adiantamento.faturaId) : null,
            contaId:  adiantamento.contaId  ? (contasMap.get(adiantamento.contaId) ?? adiantamento.contaId) : null,
          });
          await tx.insert(adiantamentosFatura).values(registro);
        }
        resultados.push({ modulo: "adiantamentos", importados: data.adiantamentos.length });
      }

      // ── Transferências ────────────────────────────────────────────────────
      if (data.transferencias?.length) {
        const registros = normalizarDatas(
          data.transferencias.map((r: any) => ({
            ...r,
            id:             crypto.randomUUID(),
            userId,
            contaOrigemId:  r.contaOrigemId  ? (contasMap.get(r.contaOrigemId)  ?? r.contaOrigemId)  : null,
            contaDestinoId: r.contaDestinoId ? (contasMap.get(r.contaDestinoId) ?? r.contaDestinoId) : null,
          }))
        );
        await tx.insert(transferencias).values(registros);
        resultados.push({ modulo: "transferencias", importados: registros.length });
      }

      // ── Extrato (id serial) ───────────────────────────────────────────────
      if (data.extrato?.length) {
        for (const entry of data.extrato) {
          const { id: _, ...resto } = entry;
          const registro = normalizarDatas({
            ...resto,
            userId,
            contaId: entry.contaId ? (contasMap.get(entry.contaId) ?? entry.contaId) : null,
          });
          await tx.insert(extratoConta).values(registro);
        }
        resultados.push({ modulo: "extrato", importados: data.extrato.length });
      }

      // ── Notas ─────────────────────────────────────────────────────────────
      if (data.notas?.length) {
        const registros = normalizarDatas(
          data.notas.map((r: any) => ({ ...r, id: crypto.randomUUID(), userId }))
        );
        await tx.insert(notas).values(registros);
        resultados.push({ modulo: "notas", importados: registros.length });
      }

      // ── Notificações ──────────────────────────────────────────────────────
      if (data.notificacoes?.length) {
        const registros = normalizarDatas(
          data.notificacoes.map((r: any) => ({ ...r, id: crypto.randomUUID(), userId }))
        );
        await tx.insert(notificacoes).values(registros);
        resultados.push({ modulo: "notificacoes", importados: registros.length });
      }

      // ── Preferências de notificação ───────────────────────────────────────
      if (data.preferencias?.length) {
        const registros = normalizarDatas(
          data.preferencias.map((r: any) => ({ ...r, id: crypto.randomUUID(), userId }))
        );
        await tx.insert(preferenciasNotificacao).values(registros);
        resultados.push({ modulo: "preferencias_notificacao", importados: registros.length });
      }

      // ── Preferências gerais ───────────────────────────────────────────────
      if (data.preferences) {
        const registro = normalizarDatas({ ...data.preferences, id: crypto.randomUUID(), userId });
        await tx.insert(preferences).values(registro);
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