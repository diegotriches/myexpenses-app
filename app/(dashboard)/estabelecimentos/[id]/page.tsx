"use client";

import { useParams } from "next/navigation";
import ExtratoAgrupado from "@/components/extrato/ExtratoAgrupado";

export default function EstabelecimentoExtratoPage() {
  const { id } = useParams() as { id: string };
  return <ExtratoAgrupado origem="estabelecimentos" id={id} />;
}
