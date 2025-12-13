import { useCategorias } from "@/hooks/useCategorias";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

export default function MovCampoCategoria({ form, update }: Props) {
  const { categorias, loading } = useCategorias();

  const categoriasFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  return (
    <div>
      <Label>Categoria</Label>

      {loading ? (
        <p>Carregando categorias...</p>
      ) : categoriasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria cadastrada para este tipo.
        </p>
      ) : (
        <Select
          value={form.categoria}
          onValueChange={(v) => update("categoria", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>

          <SelectContent>
            {categoriasFiltradas.map((c) => (
              <SelectItem key={c.id} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
