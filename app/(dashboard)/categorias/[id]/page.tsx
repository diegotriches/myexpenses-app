"use client";

import { useParams } from "next/navigation";
import ExtratoAgrupado from "@/components/extrato/ExtratoAgrupado";

export default function CategoriaExtratoPage() {
  const { id } = useParams() as { id: string };
  return <ExtratoAgrupado origem="categorias" id={id} />;
}
