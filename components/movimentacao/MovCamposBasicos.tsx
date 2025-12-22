import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
  campo: "tipo" | "data" | "valor" | "descricao";
  disabled?: boolean;
}

export default function MovCamposBasicos({ form, update, campo, disabled }: Props) {
  switch (campo) {
    case "tipo":
      return (
        <div>
          <Label>Tipo</Label>
          <Select value={form.tipo} onValueChange={(v) => update("tipo", v)} disabled={disabled}>
            <SelectTrigger className="w-full border rounded-md p-2">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada" className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full block" />
                Entrada
              </SelectItem>
              <SelectItem value="saida" className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full block" />
                Saída
              </SelectItem>
            </SelectContent>
          </Select>
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
            disabled={disabled}
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
            placeholder="R$ 0,00"
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