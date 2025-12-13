import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
  disabled?: boolean;
}

export default function MovCampoRecorrencia({ form, update, disabled }: Props) {
  return (
    <>
      <div>
        <Label>Recorrente</Label>
        <input
          type="checkbox"
          checked={form.recorrente}
          onChange={(e) => update("recorrente", e.target.checked)}
          disabled={disabled}
        />
      </div>

      {form.recorrente && (
        <div>
          <Label>Repetições</Label>
          <Input
            type="number"
            min={1}
            value={form.repeticoes}
            onChange={(e) => update("repeticoes", Number(e.target.value))}
          />
        </div>
      )}
    </>
  );
}
