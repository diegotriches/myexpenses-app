"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CalculadoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalculadoraModal({ open, onOpenChange }: CalculadoraModalProps) {
  const [display, setDisplay] = useState("0");
  const [historico, setHistorico] = useState<string[]>([]);

  // Manipula clique dos botões
  const handleButtonClick = (value: string) => {
    if (value === "C") {
      setDisplay("0");
    } else if (value === "⌫") {
      setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
    } else if (value === "=") {
      calcular();
    } else if (value === "%") {
      calcularPercentual();
    } else {
      setDisplay(display === "0" && value !== "." ? value : display + value);
    }
  };

  const calcular = () => {
    try {
      // eslint-disable-next-line no-eval
      const resultado = eval(display);
      setHistorico([`${display} = ${resultado}`, ...historico]);
      setDisplay(String(resultado));
    } catch {
      setDisplay("Erro");
    }
  };

  const calcularPercentual = () => {
    try {
      const valor = eval(display) / 100;
      setHistorico([`${display}% = ${valor}`, ...historico]);
      setDisplay(String(valor));
    } catch {
      setDisplay("Erro");
    }
  };

  // Suporte a teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const teclasValidas = "0123456789+-*/.=C%";
      if (teclasValidas.includes(e.key)) {
        if (e.key === "=" || e.key === "Enter") calcular();
        else if (e.key === "C" || e.key === "c") handleButtonClick("C");
        else handleButtonClick(e.key);
      } else if (e.key === "Backspace") {
        handleButtonClick("⌫");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [display, historico]);

  const buttons = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "⌫", "+"],
    ["C", "%", "="],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Calculadora</DialogTitle>
        </DialogHeader>

        {/* Display */}
        <input
          type="text"
          className="w-full text-right p-2 border rounded-md text-lg mb-2"
          value={display}
          readOnly
        />

        {/* Botões */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          {buttons.flat().map((btn) => (
            <Button key={btn} onClick={() => handleButtonClick(btn)}>
              {btn}
            </Button>
          ))}
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="mt-2 max-h-32 overflow-y-auto border-t pt-2 text-sm text-gray-700">
            {historico.map((item, index) => (
              <div key={index} className="truncate">
                {item}
              </div>
            ))}
          </div>
        )}

        {/* Fechar modal */}
        <DialogClose asChild>
          <Button className="mt-4 w-full">Fechar</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}