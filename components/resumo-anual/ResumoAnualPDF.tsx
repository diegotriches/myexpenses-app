// Importado dinamicamente via import() — não renderiza no servidor

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumoAnualData } from "@/hooks/useResumoAnual";
import { formatarMoeda } from "@/utils/formatadores";

// ── Helpers ────────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const nomeMes = (m: number) => MESES[m - 1] ?? "";

const variacaoPct = (atual: number, anterior: number) => {
  if (!anterior) return null;
  const pct = Math.round(((atual - anterior) / Math.abs(anterior)) * 100);
  return pct;
};

// ── Estilos ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 36,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  headerTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1e40af" },
  headerSub:   { fontSize: 10, color: "#6b7280", marginTop: 2 },
  headerDate:  { fontSize: 8, color: "#9ca3af", textAlign: "right" },

  // Seção
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e40af",
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
  },

  // KPIs
  kpiRow:  { flexDirection: "row", gap: 8, marginBottom: 4 },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#f9fafb",
  },
  kpiLabel: { fontSize: 7, color: "#6b7280", marginBottom: 3, textTransform: "uppercase" },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827" },
  kpiDiff:  { fontSize: 7, marginTop: 2 },
  kpiPos:   { color: "#059669" },
  kpiNeg:   { color: "#dc2626" },

  // Tabela de meses
  table:      { marginTop: 4 },
  tableHeader:{
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableRowAlt: { backgroundColor: "#f9fafb" },
  colMes:    { width: "18%", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" },
  colNum:    { width: "27.3%", textAlign: "right", fontSize: 8 },
  colHead:   { width: "27.3%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" },
  colMesHead:{ width: "18%",   fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" },
  green:     { color: "#059669" },
  red:       { color: "#dc2626" },
  blue:      { color: "#2563eb" },

  // Categorias
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  barBg:   { height: 5, backgroundColor: "#e5e7eb", borderRadius: 3, flex: 1, marginHorizontal: 8 },
  barFill: { height: 5, borderRadius: 3, backgroundColor: "#3b82f6" },

  // Destaques
  destRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  destBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
  },
  destLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 },
  destValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827" },
  destSub:   { fontSize: 8, color: "#6b7280", marginTop: 2 },

  // Comparativo
  compRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colCompMes:  { width: "20%",  fontSize: 8, fontFamily: "Helvetica-Bold", color: "#374151" },
  colCompNum:  { width: "26.7%", textAlign: "right", fontSize: 8 },
  colCompDiff: { width: "26.6%", textAlign: "right", fontSize: 8 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

// ── Componente ─────────────────────────────────────────────────────────────

export function ResumoAnualPDF({ data }: { data: ResumoAnualData }) {
  const geradoEm = new Date().toLocaleString("pt-BR");
  const { ano, anoAnterior, totais, totaisAnteriores } = data;

  const diffReceitas = variacaoPct(totais.receitas, totaisAnteriores.receitas);
  const diffDespesas = variacaoPct(totais.despesas, totaisAnteriores.despesas);
  const diffSaldo    = variacaoPct(totais.saldo,    totaisAnteriores.saldo);

  return (
    <Document title={`Resumo Financeiro ${ano}`} author="Finanças Pessoais">

      {/* ── Página 1: KPIs + Meses ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Resumo Financeiro {ano}</Text>
            <Text style={s.headerSub}>Visão consolidada do ano</Text>
          </View>
          <View>
            <Text style={s.headerDate}>Gerado em {geradoEm}</Text>
          </View>
        </View>

        {/* KPIs */}
        <Text style={s.sectionTitle}>Visão Geral</Text>
        <View style={s.kpiRow}>
          {[
            { label: "Receitas Totais", value: totais.receitas, diff: diffReceitas, pos: true },
            { label: "Despesas Totais", value: totais.despesas, diff: diffDespesas, pos: false },
            { label: "Saldo do Ano",    value: totais.saldo,    diff: diffSaldo,    pos: true },
          ].map(({ label, value, diff, pos }) => (
            <View key={label} style={s.kpiBox}>
              <Text style={s.kpiLabel}>{label}</Text>
              <Text style={s.kpiValue}>{formatarMoeda(value)}</Text>
              {diff !== null && (
                <Text style={[s.kpiDiff, (diff > 0) === pos ? s.kpiPos : s.kpiNeg]}>
                  {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}% vs {anoAnterior}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Destaques */}
        {(data.melhorMes || data.piorMes || data.maiorDespesa) && (
          <>
            <Text style={s.sectionTitle}>Destaques</Text>
            <View style={s.destRow}>
              {data.melhorMes && (
                <View style={s.destBox}>
                  <Text style={s.destLabel}>Melhor Mês</Text>
                  <Text style={s.destValue}>{nomeMes(data.melhorMes.mes)}</Text>
                  <Text style={[s.destSub, s.green]}>{formatarMoeda(data.melhorMes.saldo)}</Text>
                </View>
              )}
              {data.piorMes && (
                <View style={s.destBox}>
                  <Text style={s.destLabel}>Mês Mais Difícil</Text>
                  <Text style={s.destValue}>{nomeMes(data.piorMes.mes)}</Text>
                  <Text style={[s.destSub, data.piorMes.saldo >= 0 ? s.green : s.red]}>
                    {formatarMoeda(data.piorMes.saldo)}
                  </Text>
                </View>
              )}
              <View style={s.destBox}>
                <Text style={s.destLabel}>Média Mensal Receitas</Text>
                <Text style={[s.destValue, s.green]}>{formatarMoeda(data.mediaMensal.receitas)}</Text>
                <Text style={s.destLabel}>Média Mensal Despesas</Text>
                <Text style={[s.destValue, s.red]}>{formatarMoeda(data.mediaMensal.despesas)}</Text>
              </View>
              {data.maiorDespesa && (
                <View style={s.destBox}>
                  <Text style={s.destLabel}>Maior Despesa</Text>
                  <Text style={s.destValue}>
                    {(data.maiorDespesa.descricao || "Sem descrição").slice(0, 28)}
                  </Text>
                  <Text style={[s.destSub, s.red]}>{formatarMoeda(Number(data.maiorDespesa.valor))}</Text>
                  {data.maiorDespesa.categoria && (
                    <Text style={s.destSub}>{data.maiorDespesa.categoria}</Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Tabela de meses */}
        <Text style={s.sectionTitle}>Resultado por Mês — {ano}</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.colMesHead}>Mês</Text>
            <Text style={s.colHead}>Receitas</Text>
            <Text style={s.colHead}>Despesas</Text>
            <Text style={s.colHead}>Saldo</Text>
          </View>
          {data.meses.map((m, i) => (
            <View key={m.mes} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={s.colMes}>{MESES[m.mes - 1]}</Text>
              <Text style={[s.colNum, s.green]}>{formatarMoeda(m.receitas)}</Text>
              <Text style={[s.colNum, s.red]}>{formatarMoeda(m.despesas)}</Text>
              <Text style={[s.colNum, m.saldo >= 0 ? s.blue : s.red]}>{formatarMoeda(m.saldo)}</Text>
            </View>
          ))}
          {/* Totais */}
          <View style={[s.tableRow, { backgroundColor: "#eff6ff" }]}>
            <Text style={[s.colMes, { fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
            <Text style={[s.colNum, s.green, { fontFamily: "Helvetica-Bold" }]}>{formatarMoeda(totais.receitas)}</Text>
            <Text style={[s.colNum, s.red,   { fontFamily: "Helvetica-Bold" }]}>{formatarMoeda(totais.despesas)}</Text>
            <Text style={[s.colNum, totais.saldo >= 0 ? s.blue : s.red, { fontFamily: "Helvetica-Bold" }]}>
              {formatarMoeda(totais.saldo)}
            </Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Resumo Financeiro {ano} • Página 1</Text>
          <Text style={s.footerText}>{geradoEm}</Text>
        </View>
      </Page>

      {/* ── Página 2: Categorias + Comparativo ────────────────────── */}
      <Page size="A4" style={s.page}>

        {/* Cabeçalho simples */}
        <View style={[s.header, { marginBottom: 12 }]}>
          <Text style={[s.headerTitle, { fontSize: 14 }]}>Resumo Financeiro {ano}</Text>
          <Text style={s.headerDate}>Continuação</Text>
        </View>

        {/* Categorias */}
        {data.categorias.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Top Categorias de Despesa</Text>
            {data.categorias.map((cat) => (
              <View key={cat.categoria} style={s.catRow}>
                <Text style={{ width: "30%", fontSize: 8, color: "#374151" }}>{cat.categoria}</Text>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${cat.percentual}%` }]} />
                </View>
                <Text style={{ width: "12%", textAlign: "right", fontSize: 8, color: "#6b7280" }}>
                  {cat.percentual}%
                </Text>
                <Text style={{ width: "20%", textAlign: "right", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#111827" }}>
                  {formatarMoeda(cat.total)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Comparativo com ano anterior */}
        <Text style={s.sectionTitle}>Comparativo {anoAnterior} vs {ano}</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.colCompMes, { fontFamily: "Helvetica-Bold" }]}>Mês</Text>
            <Text style={[s.colCompNum, { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" }]}>
              Desp. {anoAnterior}
            </Text>
            <Text style={[s.colCompNum, { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" }]}>
              Desp. {ano}
            </Text>
            <Text style={[s.colCompDiff, { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#374151" }]}>
              Variação
            </Text>
          </View>
          {data.meses.map((m, i) => {
            const ant = data.mesesAnteriores[i].despesas;
            const atu = m.despesas;
            const pct = variacaoPct(atu, ant);
            return (
              <View key={m.mes} style={[s.compRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={s.colCompMes}>{MESES[m.mes - 1]}</Text>
                <Text style={[s.colCompNum, { color: "#6b7280" }]}>{formatarMoeda(ant)}</Text>
                <Text style={[s.colCompNum, s.red]}>{formatarMoeda(atu)}</Text>
                <Text style={[
                  s.colCompDiff,
                  pct === null ? {} : pct <= 0 ? s.green : s.red,
                ]}>
                  {pct === null ? "—" : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Resumo Financeiro {ano} • Página 2</Text>
          <Text style={s.footerText}>{geradoEm}</Text>
        </View>
      </Page>

    </Document>
  );
}