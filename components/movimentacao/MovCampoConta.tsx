"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContas } from "@/hooks/useContas"; // ajuste conforme seu path

interface Props {
  form: { contaId: string };
  update: (k: string, v: any) => void;
}

export default function MovCampoConta({ form, update }: Props) {
  const { contas, loading, error } = useContas();

  return (
    <div>
      <Label>Conta</Label>
      {loading ? (
        <div>Carregando contas...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Select value={form.contaId} onValueChange={(v) => update("contaId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a conta" />
          </SelectTrigger>
          <SelectContent>
            {contas.map((conta) => (
              <SelectItem key={conta.id} value={conta.id}>
                {conta.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}