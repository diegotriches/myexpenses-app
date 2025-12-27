import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { transacoes } from "@/db/schema";
import { TransacoesService } from "@/services/transacoesService";
import { sql } from "drizzle-orm";

// GET - Listar transações
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");

    let query = db.select().from(transacoes);

    // Se tiver filtro de período, aplica
    if (ano && mes) {
      const anoNum = parseInt(ano);
      const mesNum = parseInt(mes);
      
      const inicioMes = new Date(anoNum, mesNum - 1, 1);
      const fimMes = new Date(anoNum, mesNum, 1);

      query = query.where(
        sql`${transacoes.data} >= ${inicioMes} AND ${transacoes.data} < ${fimMes}`
      ) as any;
    }

    const result = await query;
    
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Erro ao buscar transações:", err);
    return NextResponse.json(
      { error: "Erro ao buscar transações: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    console.log("📥 JSON recebido:", json);

    // Validações básicas
    if (!json.tipo || !["entrada", "saida"].includes(json.tipo)) {
      return NextResponse.json(
        { error: "Tipo de transação inválido" },
        { status: 400 }
      );
    }

    if (json.tipo === "entrada" && !json.contaId) {
      return NextResponse.json(
        { error: "Conta é obrigatória para receitas" },
        { status: 400 }
      );
    }

    if (json.tipo === "saida" && json.formaPagamento !== "cartao" && !json.contaId) {
      return NextResponse.json(
        { error: "Conta é obrigatória para despesas com dinheiro/PIX" },
        { status: 400 }
      );
    }

    if (!json.data || isNaN(new Date(json.data).getTime())) {
      return NextResponse.json(
        { error: "Data inválida" },
        { status: 400 }
      );
    }

    if (json.formaPagamento === "cartao" && !json.cartaoId) {
      return NextResponse.json(
        { error: "Cartão é obrigatório quando forma de pagamento for 'cartao'" },
        { status: 400 }
      );
    }

    // USA O SERVICE (que agora busca conta automaticamente)
    const transacao = await TransacoesService.criar({
      contaId: json.contaId || undefined,
      tipo: json.tipo,
      valor: Number(json.valor),
      data: new Date(json.data),
      descricao: json.descricao || null,
      categoria: json.categoria || null,
      formaPagamento: json.formaPagamento || "dinheiro",
      cartaoId: json.cartaoId ? Number(json.cartaoId) : null,
    });

    console.log("✅ Transação criada:", transacao);

    return NextResponse.json(transacao, { status: 201 });
    
  } catch (err: any) {
    console.error("❌ Erro ao criar transação:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao criar transação" },
      { status: 500 }
    );
  }
}