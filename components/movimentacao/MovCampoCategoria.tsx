import { useCategorias } from "@/hooks/useCategorias";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { iconOptions } from "@/utils/iconOptions"; // import do seu arquivo de ícones

interface Props {
  form: any;
  update: (k: string, v: any) => void;
}

export default function MovCampoCategoria({ form, update }: Props) {
  const { categorias, loading } = useCategorias();

  const categoriasFiltradas = categorias.filter((c) => c.tipo === form.tipo);

  const getIconComponent = (iconName: string | undefined) => {
    const found = iconOptions.find((i) => i.name === iconName);
    return found ? found.component : null;
  };

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
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>

          <SelectContent>
            {categoriasFiltradas.map((c) => {
              const Icon = getIconComponent(c.icon);
              return (
                <SelectItem
                  key={c.id}
                  value={c.nome}
                  className="flex items-center gap-2"
                >
                  {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
                  {c.nome}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
