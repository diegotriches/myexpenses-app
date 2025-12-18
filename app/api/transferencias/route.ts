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

    if (!contaOrigemId || !contaDestinoId || data == null) {
      return NextResponse.json(
        { message: "Dados obrigatórios ausentes" },
        { status: 400 }
      );
    }

    const valorNumerico = Number(valor);
    if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
      return NextResponse.json(
        { message: "Valor da transferência inválido" },
        { status: 400 }
      );
    }

    const dataTransferencia = new Date(data);
    if (isNaN(dataTransferencia.getTime())) {
      return NextResponse.json(
        { message: "Data inválida" },
        { status: 400 }
      );
    }

    await TransferenciasService.transferir({
      contaOrigemId,
      contaDestinoId,
      valor: valorNumerico,
      descricao,
      data: dataTransferencia,
    });

    return NextResponse.json(
      { message: "Transferência realizada com sucesso" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          error?.message || "Erro interno ao realizar transferência",
      },
      { status: 500 }
    );
  }
}