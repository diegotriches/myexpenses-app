// lib/backupDados.ts
//
// Único ponto que conhece quais tabelas compõem os dados de um usuário.
// Exportação, backup automático, importação e restauração passam por aqui.
// Tabela nova com dados do usuário precisa entrar em CHAVES_LISTA (ou ser tratada
// como `preferences`), em gerarArquivoBackup e em substituirDadosUsuario. Coluna nova que referencia outro registro precisa ser traduzida em substituirDadosUsuario.

import { eq, getTableColumns, inArray } from "drizzle-orm";
import type { PgInsertValue, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  adiantamentosFatura,
  antecipacoesParcela,
  aplicacoes,
  aportesAplicacao,
  cartoes,
  categorias,
  contas,
  cotacoesManuaisRv,
  estabelecimentos,
  extratoConta,
  faturas,
  irConfigRv,
  irDarfRv,
  notas,
  notificacoes,
  operacoesRv,
  preferences,
  preferenciasNotificacao,
  proventosRv,
  recorrencias,
  rendimentosAplicacao,
  resgatesAplicacao,
  transacoes,
  transferencias,
} from "@/db/schema";

const VERSAO_ARQUIVO = "3.0.0";
const VERSAO_MINIMA = 3;
const TAMANHO_LOTE = 500;

const CHAVES_LISTA = [
  "categorias",
  "contas",
  "cartoes",
  "estabelecimentos",
  "recorrencias",
  "transacoes",
  "faturas",
  "adiantamentos",
  "antecipacoes",
  "transferencias",
  "extrato",
  "notas",
  "notificacoes",
  "preferencias",
  "aplicacoes",
  "rendimentosAplicacao",
  "aportesAplicacao",
  "resgatesAplicacao",
  "operacoesRv",
  "proventosRv",
  "irConfigRv",
  "irDarfRv",
  "cotacoesManuaisRv",
] as const;

type ChaveLista = (typeof CHAVES_LISTA)[number];
type Linha = Record<string, unknown>;

export type DadosBackup = Record<ChaveLista, Linha[]> & { preferences: Linha | null };

export type EstatisticasBackup = Record<ChaveLista, number> & {
  tamanhoBytes: number;
  tamanhoFormatado: string;
};

export interface MetadadosBackup {
  version: string;
  exportDate: string;
  userId: string;
  userName: string;
  userEmail: string;
  appName: "MyExpenses";
  appUrl: string;
}

export interface ArquivoBackup {
  metadata: MetadadosBackup;
  statistics: EstatisticasBackup;
  data: DadosBackup;
}

export interface ResultadoModulo {
  modulo: string;
  importados: number;
}

export type ValidacaoArquivo =
  | { ok: true; data: DadosBackup }
  | { ok: false; erro: string };

type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function formatarBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const unidades = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${unidades[i]}`;
}

// ── Geração ──────────────────────────────────────────────────────────────────

export async function gerarArquivoBackup(
  userId: string,
  usuario: { name: string | null; email: string },
): Promise<ArquivoBackup> {
  const [
    categoriasDados,
    contasDados,
    cartoesDados,
    estabelecimentosDados,
    recorrenciasDados,
    transacoesDados,
    faturasDados,
    adiantamentosDados,
    antecipacoesDados,
    transferenciasDados,
    extratoDados,
    notasDados,
    notificacoesDados,
    preferenciasDados,
    preferencesDados,
    aplicacoesDados,
    operacoesDados,
    proventosDados,
    irConfigDados,
    irDarfDados,
    cotacoesManuaisDados,
  ] = await Promise.all([
    db.select().from(categorias).where(eq(categorias.userId, userId)),
    db.select().from(contas).where(eq(contas.userId, userId)),
    db.select().from(cartoes).where(eq(cartoes.userId, userId)),
    db.select().from(estabelecimentos).where(eq(estabelecimentos.userId, userId)),
    db.select().from(recorrencias).where(eq(recorrencias.userId, userId)),
    db.select().from(transacoes).where(eq(transacoes.userId, userId)),
    db.select().from(faturas).where(eq(faturas.userId, userId)),
    db.select().from(adiantamentosFatura).where(eq(adiantamentosFatura.userId, userId)),
    db.select().from(antecipacoesParcela).where(eq(antecipacoesParcela.userId, userId)),
    db.select().from(transferencias).where(eq(transferencias.userId, userId)),
    db.select().from(extratoConta).where(eq(extratoConta.userId, userId)),
    db.select().from(notas).where(eq(notas.userId, userId)),
    db.select().from(notificacoes).where(eq(notificacoes.userId, userId)),
    db.select().from(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId)),
    db.select().from(preferences).where(eq(preferences.userId, userId)),
    db.select().from(aplicacoes).where(eq(aplicacoes.userId, userId)),
    db.select().from(operacoesRv).where(eq(operacoesRv.userId, userId)),
    db.select().from(proventosRv).where(eq(proventosRv.userId, userId)),
    db.select().from(irConfigRv).where(eq(irConfigRv.userId, userId)),
    db.select().from(irDarfRv).where(eq(irDarfRv.userId, userId)),
    db.select().from(cotacoesManuaisRv).where(eq(cotacoesManuaisRv.userId, userId)),
  ]);

  // Filhas de aplicações não têm userId: são buscadas pelas aplicações do usuário
  const idsAplicacoes = aplicacoesDados.map((a) => a.id);
  const [rendimentosDados, aportesDados, resgatesDados] = idsAplicacoes.length
    ? await Promise.all([
        db.select().from(rendimentosAplicacao).where(inArray(rendimentosAplicacao.aplicacaoId, idsAplicacoes)),
        db.select().from(aportesAplicacao).where(inArray(aportesAplicacao.aplicacaoId, idsAplicacoes)),
        db.select().from(resgatesAplicacao).where(inArray(resgatesAplicacao.aplicacaoId, idsAplicacoes)),
      ])
    : [[], [], []];

  const data: DadosBackup = {
    categorias: categoriasDados,
    contas: contasDados,
    cartoes: cartoesDados,
    estabelecimentos: estabelecimentosDados,
    recorrencias: recorrenciasDados,
    transacoes: transacoesDados,
    faturas: faturasDados,
    adiantamentos: adiantamentosDados,
    antecipacoes: antecipacoesDados,
    transferencias: transferenciasDados,
    extrato: extratoDados,
    notas: notasDados,
    notificacoes: notificacoesDados,
    preferencias: preferenciasDados,
    aplicacoes: aplicacoesDados,
    rendimentosAplicacao: rendimentosDados,
    aportesAplicacao: aportesDados,
    resgatesAplicacao: resgatesDados,
    operacoesRv: operacoesDados,
    proventosRv: proventosDados,
    irConfigRv: irConfigDados,
    irDarfRv: irDarfDados,
    cotacoesManuaisRv: cotacoesManuaisDados,
    preferences: preferencesDados[0] ?? null,
  };

  const contagens = Object.fromEntries(
    CHAVES_LISTA.map((chave) => [chave, data[chave].length]),
  ) as Record<ChaveLista, number>;

  const arquivo: ArquivoBackup = {
    metadata: {
      version: VERSAO_ARQUIVO,
      exportDate: new Date().toISOString(),
      userId,
      userName: usuario.name || "Usuário",
      userEmail: usuario.email,
      appName: "MyExpenses",
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    },
    statistics: { ...contagens, tamanhoBytes: 0, tamanhoFormatado: "" },
    data,
  };

  const tamanho = Buffer.byteLength(JSON.stringify(arquivo), "utf-8");
  arquivo.statistics.tamanhoBytes = tamanho;
  arquivo.statistics.tamanhoFormatado = formatarBytes(tamanho);

  return arquivo;
}

// ── Validação ────────────────────────────────────────────────────────────────

function ehObjeto(valor: unknown): valor is Linha {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/** Roda antes de qualquer exclusão: arquivo recusado não altera nenhum dado. */
export function validarArquivoBackup(arquivo: unknown): ValidacaoArquivo {
  if (!ehObjeto(arquivo) || !ehObjeto(arquivo.metadata) || arquivo.metadata.appName !== "MyExpenses") {
    // Backups automáticos antigos não têm metadata: guardavam só os dados
    if (ehObjeto(arquivo) && Array.isArray(arquivo.contas)) return { ok: false, erro: MSG_FORMATO_ANTIGO };
    return { ok: false, erro: "Arquivo não reconhecido como um backup válido do MyExpenses" };
  }

  const versaoMaior = Number(String(arquivo.metadata.version ?? "").split(".")[0]);
  if (!Number.isFinite(versaoMaior) || versaoMaior < VERSAO_MINIMA) {
    return { ok: false, erro: MSG_FORMATO_ANTIGO };
  }

  const data = arquivo.data;
  if (!ehObjeto(data)) return { ok: false, erro: "Arquivo inválido: estrutura 'data' não encontrada" };

  for (const chave of CHAVES_LISTA) {
    const linhas = data[chave];
    if (!Array.isArray(linhas) || !linhas.every(ehObjeto)) {
      return { ok: false, erro: `Arquivo inválido ou incompleto: seção '${chave}'` };
    }
  }
  if (data.preferences !== null && !ehObjeto(data.preferences)) {
    return { ok: false, erro: "Arquivo inválido ou incompleto: seção 'preferences'" };
  }

  return { ok: true, data: data as DadosBackup };
}

const MSG_FORMATO_ANTIGO =
  "Este arquivo foi gerado antes da atualização do backup e não contém todos os seus dados " +
  "(recorrências, renda variável e aplicações). Para não perder essas informações, ele não pode ser usado. " +
  "Nenhum dado foi alterado.";

// ── Reinserção ───────────────────────────────────────────────────────────────

class ArquivoInconsistenteError extends Error {}

/**
 * Só passam colunas que existem na tabela, e só as de timestamp viram Date
 * (colunas `date` do schema trabalham com texto "YYYY-MM-DD").
 * `valores` tem prioridade sobre a linha do arquivo; undefined deixa o banco
 * usar o default (ids seriais).
 */
function prepararLinha<T extends PgTable>(tabela: T, linha: Linha, valores: Linha): PgInsertValue<T> {
  const registro: Linha = {};
  for (const [nome, coluna] of Object.entries(getTableColumns(tabela))) {
    const valor = nome in valores ? valores[nome] : linha[nome];
    if (valor === undefined) continue;
    registro[nome] = coluna.dataType === "date" && typeof valor === "string" ? new Date(valor) : valor;
  }
  return registro as PgInsertValue<T>;
}

async function inserirEmLotes<T extends PgTable>(tx: Transacao, tabela: T, registros: PgInsertValue<T>[]) {
  for (let i = 0; i < registros.length; i += TAMANHO_LOTE) {
    await tx.insert(tabela).values(registros.slice(i, i + TAMANHO_LOTE));
  }
}

async function apagarDadosUsuario(tx: Transacao, userId: string) {
  // Filhas antes das pais. Excluir aplicações leva rendimentos, aportes e resgates.
  await tx.delete(antecipacoesParcela).where(eq(antecipacoesParcela.userId, userId));
  await tx.delete(adiantamentosFatura).where(eq(adiantamentosFatura.userId, userId));
  await tx.delete(extratoConta).where(eq(extratoConta.userId, userId));
  await tx.delete(transferencias).where(eq(transferencias.userId, userId));
  await tx.delete(aplicacoes).where(eq(aplicacoes.userId, userId));
  await tx.delete(operacoesRv).where(eq(operacoesRv.userId, userId));
  await tx.delete(proventosRv).where(eq(proventosRv.userId, userId));
  await tx.delete(irConfigRv).where(eq(irConfigRv.userId, userId));
  await tx.delete(irDarfRv).where(eq(irDarfRv.userId, userId));
  await tx.delete(cotacoesManuaisRv).where(eq(cotacoesManuaisRv.userId, userId));
  await tx.delete(faturas).where(eq(faturas.userId, userId));
  await tx.delete(transacoes).where(eq(transacoes.userId, userId));
  await tx.delete(recorrencias).where(eq(recorrencias.userId, userId));
  await tx.delete(notas).where(eq(notas.userId, userId));
  await tx.delete(notificacoes).where(eq(notificacoes.userId, userId));
  await tx.delete(preferenciasNotificacao).where(eq(preferenciasNotificacao.userId, userId));
  await tx.delete(estabelecimentos).where(eq(estabelecimentos.userId, userId));
  await tx.delete(cartoes).where(eq(cartoes.userId, userId));
  await tx.delete(contas).where(eq(contas.userId, userId));
  await tx.delete(categorias).where(eq(categorias.userId, userId));
  await tx.delete(preferences).where(eq(preferences.userId, userId));
}

/**
 * Substitui todos os dados do usuário pelo conteúdo validado, numa transação.
 * Todo registro ganha id novo: o arquivo pode ter vindo de outro usuário, e uma
 * referência só é aceita se apontar para um registro do próprio arquivo.
 */
export async function substituirDadosUsuario(userId: string, data: DadosBackup): Promise<ResultadoModulo[]> {
  const resultados: ResultadoModulo[] = [];

  await db.transaction(async (tx) => {
    await apagarDadosUsuario(tx, userId);

    const uuids = new Map<string, string>();
    const idsCartoes = new Map<string, number>();
    const idsFaturas = new Map<string, number>();

    const contar = (modulo: string, importados: number) => {
      if (importados > 0) resultados.push({ modulo, importados });
    };

    // Referência opcional: sem correspondente no arquivo, fica nula
    const uuidOuNulo = (valor: unknown) => (valor ? uuids.get(String(valor)) ?? null : null);
    const cartaoOuNulo = (valor: unknown) => (valor ? idsCartoes.get(String(valor)) ?? null : null);

    const obrigatorio = <V>(valor: V | null, campo: string): V => {
      if (valor === null) throw new ArquivoInconsistenteError(`Arquivo inconsistente: referência inválida em ${campo}`);
      return valor;
    };

    // Referência sem FK no banco: id desconhecido é mantido como está
    const uuidOuOriginal = (valor: unknown) => (valor ? uuids.get(String(valor)) ?? valor : valor);

    async function inserirComUuid<T extends PgTable>(
      tabela: T,
      modulo: string,
      linhas: Linha[],
      referencias: (linha: Linha) => Linha = () => ({}),
    ) {
      const registros = linhas.map((linha) => {
        const id = crypto.randomUUID();
        if (linha.id) uuids.set(String(linha.id), id);
        return { linha, id };
      });
      await inserirEmLotes(
        tx,
        tabela,
        registros.map(({ linha, id }) => prepararLinha(tabela, linha, { ...referencias(linha), id, userId })),
      );
      contar(modulo, linhas.length);
    }

    // Tabelas sem coluna `id` uuid: filhas seriais e chaves compostas
    async function inserirSemUuid<T extends PgTable>(
      tabela: T,
      modulo: string,
      linhas: Linha[],
      referencias: (linha: Linha) => Linha = () => ({}),
    ) {
      await inserirEmLotes(
        tx,
        tabela,
        linhas.map((linha) => prepararLinha(tabela, linha, { ...referencias(linha), id: undefined, userId })),
      );
      contar(modulo, linhas.length);
    }

    await inserirComUuid(categorias, "categorias", data.categorias);
    await inserirComUuid(contas, "contas", data.contas);

    for (const linha of data.cartoes) {
      const [novo] = await tx
        .insert(cartoes)
        .values(prepararLinha(cartoes, linha, {
          id: undefined,
          userId,
          contaVinculadaId: uuidOuNulo(linha.contaVinculadaId),
        }))
        .returning({ id: cartoes.id });
      idsCartoes.set(String(linha.id), novo.id);
    }
    contar("cartoes", data.cartoes.length);

    await inserirComUuid(estabelecimentos, "estabelecimentos", data.estabelecimentos);

    await inserirComUuid(recorrencias, "recorrencias", data.recorrencias, (l) => ({
      contaId: uuidOuNulo(l.contaId),
      cartaoId: cartaoOuNulo(l.cartaoId),
      estabelecimentoId: uuidOuNulo(l.estabelecimentoId),
    }));

    await inserirComUuid(transacoes, "transacoes", data.transacoes, (l) => ({
      contaId: uuidOuNulo(l.contaId),
      cartaoId: cartaoOuNulo(l.cartaoId),
      estabelecimentoId: uuidOuNulo(l.estabelecimentoId),
      origemRecorrenciaId: uuidOuNulo(l.origemRecorrenciaId),
    }));

    for (const linha of data.faturas) {
      const [nova] = await tx
        .insert(faturas)
        .values(prepararLinha(faturas, linha, {
          id: undefined,
          userId,
          cartaoId: obrigatorio(cartaoOuNulo(linha.cartaoId), "faturas.cartaoId"),
          contaPagamentoId: uuidOuNulo(linha.contaPagamentoId),
        }))
        .returning({ id: faturas.id });
      idsFaturas.set(String(linha.id), nova.id);
    }
    contar("faturas", data.faturas.length);

    const faturaObrigatoria = (valor: unknown, campo: string) =>
      obrigatorio(idsFaturas.get(String(valor)) ?? null, campo);

    await inserirComUuid(adiantamentosFatura, "adiantamentos", data.adiantamentos, (l) => ({
      faturaId: faturaObrigatoria(l.faturaId, "adiantamentos.faturaId"),
      contaId: uuidOuNulo(l.contaId),
    }));

    await inserirComUuid(antecipacoesParcela, "antecipacoes", data.antecipacoes, (l) => ({
      cartaoId: obrigatorio(cartaoOuNulo(l.cartaoId), "antecipacoes.cartaoId"),
      faturaAtualId: faturaObrigatoria(l.faturaAtualId, "antecipacoes.faturaAtualId"),
      transacaoSinteticaId: uuidOuOriginal(l.transacaoSinteticaId),
      // Desfazer a antecipação recria as parcelas a partir deste JSON
      parcelasRemovidas: Array.isArray(l.parcelasRemovidas)
        ? l.parcelasRemovidas.map((p: unknown) =>
            ehObjeto(p) ? { ...p, estabelecimentoId: uuidOuNulo(p.estabelecimentoId) } : p,
          )
        : l.parcelasRemovidas,
    }));

    await inserirComUuid(transferencias, "transferencias", data.transferencias, (l) => ({
      contaOrigemId: obrigatorio(uuidOuNulo(l.contaOrigemId), "transferencias.contaOrigemId"),
      contaDestinoId: obrigatorio(uuidOuNulo(l.contaDestinoId), "transferencias.contaDestinoId"),
    }));

    await inserirComUuid(aplicacoes, "aplicacoes", data.aplicacoes, (l) => ({
      contaId: obrigatorio(uuidOuNulo(l.contaId), "aplicacoes.contaId"),
    }));

    const aplicacaoObrigatoria = (valor: unknown, campo: string) => obrigatorio(uuidOuNulo(valor), campo);

    await inserirSemUuid(rendimentosAplicacao, "rendimentos_aplicacao", data.rendimentosAplicacao, (l) => ({
      aplicacaoId: aplicacaoObrigatoria(l.aplicacaoId, "rendimentosAplicacao.aplicacaoId"),
    }));
    await inserirComUuid(aportesAplicacao, "aportes_aplicacao", data.aportesAplicacao, (l) => ({
      aplicacaoId: aplicacaoObrigatoria(l.aplicacaoId, "aportesAplicacao.aplicacaoId"),
      contaId: uuidOuNulo(l.contaId),
    }));
    await inserirComUuid(resgatesAplicacao, "resgates_aplicacao", data.resgatesAplicacao, (l) => ({
      aplicacaoId: aplicacaoObrigatoria(l.aplicacaoId, "resgatesAplicacao.aplicacaoId"),
      contaId: uuidOuNulo(l.contaId),
    }));

    await inserirComUuid(operacoesRv, "operacoes_rv", data.operacoesRv, (l) => ({ contaId: uuidOuNulo(l.contaId) }));
    await inserirComUuid(proventosRv, "proventos_rv", data.proventosRv, (l) => ({ contaId: uuidOuNulo(l.contaId) }));

    // Por último: referenciaId pode apontar para quase todas as tabelas acima
    await inserirComUuid(extratoConta, "extrato", data.extrato, (l) => {
      const idFatura = l.referenciaId ? idsFaturas.get(String(l.referenciaId)) : undefined;
      return {
        contaId: obrigatorio(uuidOuNulo(l.contaId), "extrato.contaId"),
        referenciaId: idFatura !== undefined ? String(idFatura) : uuidOuOriginal(l.referenciaId),
      };
    });

    await inserirComUuid(notas, "notas", data.notas);
    await inserirComUuid(notificacoes, "notificacoes", data.notificacoes);
    await inserirComUuid(preferenciasNotificacao, "preferencias_notificacao", data.preferencias);
    await inserirComUuid(preferences, "preferences", data.preferences ? [data.preferences] : []);
    await inserirSemUuid(irConfigRv, "ir_config_rv", data.irConfigRv);
    await inserirComUuid(irDarfRv, "ir_darf_rv", data.irDarfRv);
    await inserirSemUuid(cotacoesManuaisRv, "cotacoes_manuais_rv", data.cotacoesManuaisRv);
  });

  return resultados;
}
