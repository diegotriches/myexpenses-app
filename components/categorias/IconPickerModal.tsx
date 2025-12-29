import { iconOptions } from "@/utils/iconOptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Search } from "lucide-react";

interface IconPickerModalProps {
  aberto: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

export default function IconPickerModal({
  aberto,
  onClose,
  onSelect,
}: IconPickerModalProps) {
  const [busca, setBusca] = useState("");

  const iconesFiltrados = iconOptions.filter((icon) =>
    icon.name.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Selecionar Ícone</DialogTitle>
          <DialogDescription>
            Escolha um ícone para representar sua categoria
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ícone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[400px] px-6 pb-6">
          {iconesFiltrados.length > 0 ? (
            <div className="grid grid-cols-7 gap-2">
              {iconesFiltrados.map((i) => {
                const IconComp = i.component;

                return (
                  <button
                    key={i.name}
                    type="button"
                    className="aspect-square p-3 border rounded-lg hover:bg-accent hover:border-primary transition-all duration-200 flex items-center justify-center group"
                    onClick={() => {
                      onSelect(i.name);
                      onClose();
                      setBusca("");
                    }}
                    title={i.name}
                  >
                    <IconComp className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum ícone encontrado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente buscar com outros termos
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}