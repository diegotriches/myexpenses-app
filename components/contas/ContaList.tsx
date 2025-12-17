"use client";

import ContaCard from "./ContaCard";
import { useContas } from "@/hooks/useContas";

export default function ContaList() {
  const { contas, loading, error, removerConta } = useContas();

  if (loading) return <p>Carregando contas...</p>;
  if (error) return <p>{error}</p>;
  if (contas.length === 0) return <p>Nenhuma conta cadastrada.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {contas.map((conta) => (
        <ContaCard
          key={conta.id}
          conta={conta}
          onExcluir={(c) => removerConta(c.id)}
          onEditar={(c) => console.log("Editar", c)}
          onExtrato={(c) => console.log("Extrato", c)}
          onTransferir={(c) => console.log("Transferir", c)}
        />
      ))}
    </div>
  );
}