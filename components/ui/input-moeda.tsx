// components/ui/input-moeda.tsx
"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

const formatador = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function exibir(valor: string): string {
  if (!valor || valor === "-") return valor;
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? formatador.format(numero) : "";
}

interface Props extends Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  /** Valor decimal em texto ("1234.56"), ou vazio. */
  value: string;
  onChange: (valor: string) => void;
  /** Aceita sinal: digitar "-" torna o valor negativo. */
  permitirNegativo?: boolean;
}

/**
 * Campo de dinheiro no formato de calculadora: os dígitos entram pelos
 * centavos, e vírgula e ponto aparecem sozinhos (1.234,56).
 */
export function InputMoeda({ value, onChange, permitirNegativo = false, ...props }: Props) {
  const aoDigitar = (texto: string) => {
    const negativo = permitirNegativo && texto.includes("-");
    const digitos = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);

    if (!digitos) {
      onChange(negativo ? "-" : "");
      return;
    }

    const reais = (parseInt(digitos, 10) / 100).toFixed(2);
    onChange(negativo ? `-${reais}` : reais);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode={permitirNegativo ? "text" : "numeric"}
      value={exibir(value)}
      onChange={(e) => aoDigitar(e.target.value)}
    />
  );
}
