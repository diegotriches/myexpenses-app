import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { substituirDadosUsuario, validarArquivoBackup } from "@/lib/backupDados";
import { respostaDeErro } from "@/lib/rota";

export const maxDuration = 60;

/**
 * POST /api/import/processar
 *
 * Substitui todos os dados do usuário pelo conteúdo do arquivo, numa transação.
 *
 * Body: { dados: { metadata, statistics, data }, confirmar: true }
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

    const validacao = validarArquivoBackup(dados);
    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.erro }, { status: 400 });
    }

    const resultados = await substituirDadosUsuario(userId, validacao.data);

    const duracao = Date.now() - inicio;
    const totalImportado = resultados.reduce((acc, r) => acc + r.importados, 0);

    console.log(`[Import] Importação concluída em ${duracao}ms — ${totalImportado} registros`);

    return NextResponse.json({
      message: "Importação concluída com sucesso",
      resultados,
      totalImportado,
      duracao,
    });
  } catch (error) {
    return respostaDeErro(error, "Erro ao processar importação");
  }
}
