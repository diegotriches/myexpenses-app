import { NextResponse } from "next/server";
import { ContasService } from "@/services/contasService";

export async function GET() {
  try {
    const contas = await ContasService.listar();

    const normalizadas = contas.map((conta) => ({
      ...conta,
      saldoInicial: Number(conta.saldoInicial),
      saldoAtual: Number(conta.saldoAtual),
      limite: conta.limite !== null ? Number(conta.limite) : null,
    }));

    return NextResponse.json(normalizadas);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao buscar contas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.nome || !data.tipo) {
      return NextResponse.json(
        { message: "Nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["BANCARIA", "CARTAO"].includes(data.tipo)) {
      return NextResponse.json(
        { message: "Tipo de conta inválido" },
        { status: 400 }
      );
    }

    const saldoInicial = Number(data.saldoInicial ?? 0);

    if (Number.isNaN(saldoInicial)) {
      return NextResponse.json(
        { message: "Saldo inicial inválido" },
        { status: 400 }
      );
    }

    // Validação específica por tipo
    if (data.tipo === "CARTAO") {
      if (!data.banco || !data.limite) {
        return NextResponse.json(
          { message: "Cartão exige banco e limite" },
          { status: 400 }
        );
      }
    }

    const conta = await ContasService.criar({
      nome: data.nome,
      tipo: data.tipo,
      ativo: data.ativo ?? true,
      observacoes: data.observacoes ?? null,

      saldoInicial,
      saldoAtual: saldoInicial,

      banco: data.banco ?? null,
      bandeira: data.bandeira ?? null,
      ultimosDigitos: data.ultimosDigitos ?? null,
      limite: data.limite != null ? Number(data.limite) : null,
      fechamentoFatura: data.fechamentoFatura ?? null,
      vencimentoFatura: data.vencimentoFatura ?? null,
    });

    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao criar conta" },
      { status: 500 }
    );
  }
}