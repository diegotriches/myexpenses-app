import { ErroApi, comJson, requisicao } from "@/services/http";
import type { ResultadoImportacao } from "@/types/backup";

export const dadosService = {
  /** Baixa o arquivo completo de dados do usuário, com o nome sugerido pelo servidor. */
  async exportarMeusDados(): Promise<{ blob: Blob; nomeArquivo: string }> {
    const res = await fetch("/api/export/meus-dados");
    if (!res.ok) {
      const corpo = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new ErroApi(corpo?.error || "Erro ao exportar dados", res.status);
    }
    const blob = await res.blob();
    const disposicao = res.headers.get("Content-Disposition") || "";
    const nomeArquivo = disposicao.match(/filename="(.+)"/)?.[1] || `myexpenses-export-${Date.now()}.json`;
    return { blob, nomeArquivo };
  },

  /** Substitui todos os dados do usuário pelos do arquivo (operação destrutiva, confirmada na tela). */
  processarImportacao(dados: unknown) {
    return requisicao<ResultadoImportacao>(
      "/api/import/processar",
      comJson("POST", { dados, confirmar: true }),
      "Erro ao processar importação",
    );
  },
};
