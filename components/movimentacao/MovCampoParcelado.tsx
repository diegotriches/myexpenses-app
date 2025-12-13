import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
  disabled?: boolean;
}

export default function MovCampoParcelado({ form, update, disabled }: Props) {
  return (
    <div className="flex gap-4">
      {/* Compras Parceladas */}
      <div className="flex-1">
        <Label>Parcelado</Label>
        <input
          type="checkbox"
          checked={form.parcelado}
          onChange={(e) => update("parcelado", e.target.checked)}
          disabled={disabled}
        />
      </div>

      {/* Número de Parcelas */}
      {form.parcelado && (
        <div className="flex-1">
          <Label>Parcelas</Label>
          <Input
            type="number"
            min={1}
            value={form.parcelas}
            onChange={(e) => update("parcelas", Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
