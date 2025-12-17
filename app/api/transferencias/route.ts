import { NextRequest, NextResponse } from "next/server";
import { TransferenciasService } from "@/services/transferenciasService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      contaOrigemId,
      contaDestinoId,
      valor,
      descricao,
      data,
    } = body;

    if (!contaOrigemId || !contaDestinoId || !valor || !data) {
      return NextResponse.json(
        { error: "Dados obrigatórios ausentes" },
        { status: 400 }
      );
    }

    await TransferenciasService.transferir({
      contaOrigemId,
      contaDestinoId,
      valor: Number(valor),
      descricao,
      data: new Date(data),
    });

    return NextResponse.json(
      { success: true },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Erro ao realizar transferência" },
      { status: 400 }
    );
  }
}
