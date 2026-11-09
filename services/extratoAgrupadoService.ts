import { requisicao } from "@/services/http";
import type { ExtratoAgrupadoResponse, FiltrosExtratoAgrupado, OrigemExtratoAgrupado } from "@/types/extratoAgrupado";

export const EXTRATO_AGRUPADO_POR_PAGINA = 50;

export const extratoAgrupadoService = {
  buscar(origem: OrigemExtratoAgrupado, id: string, { ano, mes, tipo, busca }: FiltrosExtratoAgrupado, offset: number) {
    const p = new URLSearchParams({ ano: String(ano), limit: String(EXTRATO_AGRUPADO_POR_PAGINA), offset: String(offset) });
    if (mes) p.set("mes", String(mes));
    if (tipo !== "todos") p.set("tipo", tipo);
    if (busca) p.set("busca", busca);
    return requisicao<ExtratoAgrupadoResponse>(`/api/${origem}/${id}/extrato?${p.toString()}`, undefined, "Erro ao carregar extrato");
  },
};
