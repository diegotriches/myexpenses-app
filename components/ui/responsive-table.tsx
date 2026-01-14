// src/components/ui/responsive-table.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  mobileHidden?: boolean; // Oculta em mobile
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function ResponsiveTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  onRowClick,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  // Filtra colunas visíveis em mobile
  const visibleColumns = isMobile
    ? columns.filter(col => !col.mobileHidden)
    : columns;

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.map((column) => (
              <TableHead
                key={column.key}
                className={cn("text-xs md:text-sm", column.className)}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                "text-xs md:text-sm",
                onRowClick && "cursor-pointer hover:bg-muted/50"
              )}
            >
              {visibleColumns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Versão de card para mobile (alternativa à tabela)
 */
interface ResponsiveCardListProps<T> {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveCardList<T extends { id: string | number }>({
  data,
  renderCard,
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  className,
}: ResponsiveCardListProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {data.map(renderCard)}
    </div>
  );
}