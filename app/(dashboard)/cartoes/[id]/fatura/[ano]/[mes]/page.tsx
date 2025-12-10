import { notFound } from "next/navigation";
import { Cartao } from "@/types/cartao";
import { Transacao } from "@/types/transacao";

async function getCartao(id: number): Promise<Cartao | null> {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cartoes/${id}`, {
    cache: "no-store",
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function getTransacoesCartao(id: number): Promise<Transacao[]> {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/transacoes?cartaoId=${id}`, {
    cache: "no-store",
  });
  if (!resp.ok) return [];
  return resp.json();
}

function calcularPeriodoFechamento(
  ano: number,
  mes: number,
  diaFechamento: number
) {
  // dataFechamento atual
  const dataFechamento = new Date(ano, mes - 1, diaFechamento);

  // fechamento anterior
  const dataFechamentoAnterior = new Date(ano, mes - 2, diaFechamento);

  return { dataFechamentoAnterior, dataFechamento };
}

export default async function Page({
  params,
}: {
  params: { id: string; ano: string; mes: string };
}) {
  const id = Number(params.id);
  const ano = Number(params.ano);
  const mes = Number(params.mes);

  const cartao = await getCartao(id);
  if (!cartao) return notFound();

  const transacoes = await getTransacoesCartao(id);

  const { dataFechamento, dataFechamentoAnterior } = calcularPeriodoFechamento(
    ano,
    mes,
    cartao.diaFechamento
  );

  const faturaTransacoes = transacoes.filter((t) => {
    const dt = new Date(t.data);
    return dt >= dataFechamentoAnterior && dt < dataFechamento;
  });

  const totalFatura = faturaTransacoes.reduce((acc, t) => acc + t.valor, 0);

  // Navegação entre meses
  const prevMonth = new Date(ano, mes - 2);
  const nextMonth = new Date(ano, mes);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg shadow bg-white">
        <h1 className="text-xl font-semibold">
          Fatura do Cartão: {cartao.nome} ({cartao.bandeira})
        </h1>

        <p className="text-sm text-gray-600">
          Fechamento: Dia {cartao.diaFechamento} — Vencimento: Dia {cartao.diaVencimento}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <a
            className="px-3 py-1 border rounded"
            href={`/cartoes/${id}/fatura/${prevMonth.getFullYear()}/${prevMonth.getMonth() + 1}`}
          >
            Fatura anterior
          </a>

          <span className="text-lg font-semibold">
            {mes.toString().padStart(2, "0")}/{ano}
          </span>

          <a
            className="px-3 py-1 border rounded"
            href={`/cartoes/${id}/fatura/${nextMonth.getFullYear()}/${nextMonth.getMonth() + 1}`}
          >
            Próxima fatura
          </a>
        </div>

        <div className="mt-6 border-t pt-4">
          <p className="text-lg font-bold">Total da fatura: R$ {totalFatura.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 rounded-lg shadow bg-white">
        <h2 className="font-semibold text-lg">Transações da Fatura</h2>

        {faturaTransacoes.length === 0 && (
          <p className="text-gray-600 mt-4">Nenhuma transação nesta fatura.</p>
        )}

        <ul className="mt-4 space-y-3">
          {faturaTransacoes.map((t) => (
            <li key={t.id} className="p-3 border rounded flex justify-between">
              <div>
                <p className="font-medium">{t.categoria}</p>
                <p className="text-sm text-gray-600">{t.descricao}</p>
                <p className="text-xs text-gray-500">Data: {t.data}</p>
              </div>

              <span className="font-semibold">R$ {t.valor.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
