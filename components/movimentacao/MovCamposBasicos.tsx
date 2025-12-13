import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
  campo: "tipo" | "data" | "valor" | "descricao";
}

export default function MovCamposBasicos({ form, update, campo }: Props) {
  switch (campo) {
    case "tipo":
      return (
        <div>
          <Label>Tipo</Label>
          <select
            value={form.tipo}
            onChange={(e) => update("tipo", e.target.value)}
            className="w-full border rounded-md p-2"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
      );

    case "data":
      return (
        <div>
          <Label>Data</Label>
          <Input
            type="date"
            value={form.data}
            onChange={(e) => update("data", e.target.value)}
            className="w-full"
          />
        </div>
      );

    case "valor":
      return (
        <div>
          <Label>Valor</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.valor}
            onChange={(e) => update("valor", e.target.value)}
            className="w-full"
            placeholder="0.00"
          />
        </div>
      );

    case "descricao":
      return (
        <div>
          <Label>Descrição</Label>
          <Input
            type="text"
            value={form.descricao}
            onChange={(e) => update("descricao", e.target.value)}
            className="w-full"
            placeholder="Descrição da movimentação"
          />
        </div>
      );

    default:
      return null;
  }
}