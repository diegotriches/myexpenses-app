import { Transacao } from "@/types/transacao";

interface FaturaItemProps {
    transacao: Transacao;
}

export function FaturaItem({ transacao }: FaturaItemProps) {
  return (
    <div className="p-3 border rounded flex justify-between">
      <div>
        <p className="font-medium">{transacao.descricao}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(transacao.data).toLocaleDateString()} • {transacao.categoria}
        </p>
      </div>

      <p className="font-semibold text-red-600">
        -R$ {transacao.valor.toFixed(2)}
      </p>
    </div>
  );
}
