// src/app/api/renda-variavel/ir/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { irConfigRv, irDarfRv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/auth";
import { CONFIG_IR_PADRAO, type ConfigIr } from "@/utils/irRendaVariavelUtils";
import { respostaDeErro } from "@/lib/rota";

type Linha = typeof irConfigRv.$inferSelect;

function paraConfig(l: Linha | undefined): ConfigIr {
  if (!l) return CONFIG_IR_PADRAO;
  return {
    aliquotaAcao: Number(l.aliquotaAcao),
    aliquotaEtf: Number(l.aliquotaEtf),
    aliquotaBdr: Number(l.aliquotaBdr),
    aliquotaFii: Number(l.aliquotaFii),
    aliquotaDayTrade: Number(l.aliquotaDayTrade),
    limiteIsencaoAcoes: Number(l.limiteIsencaoAcoes),
    prejuizoInicialComum: Number(l.prejuizoInicialComum),
    prejuizoInicialFii: Number(l.prejuizoInicialFii),
    prejuizoInicialDayTrade: Number(l.prejuizoInicialDayTrade),
  };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [cfg] = await db.select().from(irConfigRv).where(eq(irConfigRv.userId, userId)).limit(1);
  const pagos = await db.select().from(irDarfRv).where(eq(irDarfRv.userId, userId));

  return NextResponse.json({
    config: paraConfig(cfg),
    darfsPagos: pagos.map((p) => p.competencia),
  });
}

const CAMPOS_PERCENTUAL = [
  "aliquotaAcao", "aliquotaEtf", "aliquotaBdr", "aliquotaFii", "aliquotaDayTrade",
] as const;
const CAMPOS_VALOR = [
  "limiteIsencaoAcoes", "prejuizoInicialComum", "prejuizoInicialFii", "prejuizoInicialDayTrade",
] as const;

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const cfg: Record<string, number> = {};

    for (const c of CAMPOS_PERCENTUAL) {
      const v = Number(body?.[c]);
      if (!Number.isFinite(v) || v < 0 || v > 100)
        return NextResponse.json({ error: "Alíquotas devem estar entre 0% e 100%" }, { status: 400 });
      cfg[c] = Math.round(v * 100) / 100;
    }
    for (const c of CAMPOS_VALOR) {
      const v = Number(body?.[c]);
      if (!Number.isFinite(v) || v < 0 || v > 1e9)
        return NextResponse.json({ error: "Valores em R$ não podem ser negativos" }, { status: 400 });
      cfg[c] = Math.round(v * 100) / 100;
    }

    const valores = {
      aliquotaAcao: cfg.aliquotaAcao.toFixed(2),
      aliquotaEtf: cfg.aliquotaEtf.toFixed(2),
      aliquotaBdr: cfg.aliquotaBdr.toFixed(2),
      aliquotaFii: cfg.aliquotaFii.toFixed(2),
      aliquotaDayTrade: cfg.aliquotaDayTrade.toFixed(2),
      limiteIsencaoAcoes: cfg.limiteIsencaoAcoes.toFixed(2),
      prejuizoInicialComum: cfg.prejuizoInicialComum.toFixed(2),
      prejuizoInicialFii: cfg.prejuizoInicialFii.toFixed(2),
      prejuizoInicialDayTrade: cfg.prejuizoInicialDayTrade.toFixed(2),
      updatedAt: new Date(),
    };

    const [salva] = await db
      .insert(irConfigRv)
      .values({ userId, ...valores })
      .onConflictDoUpdate({ target: irConfigRv.userId, set: valores })
      .returning();

    return NextResponse.json(paraConfig(salva));
  } catch (error) {
    return respostaDeErro(error, "Erro ao salvar configuração");
  }
}