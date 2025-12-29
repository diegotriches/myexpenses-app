"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculadoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalculadoraModal({ open, onOpenChange }: CalculadoraModalProps) {
  const [display, setDisplay] = useState("0");
  const [expressao, setExpressao] = useState("");
  const [historico, setHistorico] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);

  // Parser seguro de expressões matemáticas
  const calcularSeguro = (expr: string): number => {
    try {
      // Remove espaços
      expr = expr.replace(/\s/g, "");

      // Valida caracteres permitidos
      if (!/^[\d+\-*/.()%]+$/.test(expr)) {
        throw new Error("Caracteres inválidos");
      }

      // Substitui % por /100
      expr = expr.replace(/(\d+)%/g, "($1/100)");

      // Parser simples usando Function (mais seguro que eval)
      const func = new Function(`'use strict'; return (${expr})`);
      const resultado = func();

      if (isNaN(resultado) || !isFinite(resultado)) {
        throw new Error("Resultado inválido");
      }

      return resultado;
    } catch (error) {
      throw new Error("Erro de cálculo");
    }
  };

  const handleButtonClick = (value: string) => {
    if (display === "Erro") {
      setDisplay("0");
      setExpressao("");
    }

    if (value === "AC") {
      setDisplay("0");
      setExpressao("");
    } else if (value === "⌫") {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay("0");
      }
    } else if (value === "=") {
      calcular();
    } else if (value === "%") {
      // Adiciona % ao display
      if (display !== "0" && !/[+\-*/.(%]$/.test(display)) {
        setDisplay(display + "%");
      }
    } else if (["+", "-", "*", "/"].includes(value)) {
      // Não permite operadores consecutivos
      if (!/[+\-*/.(%]$/.test(display)) {
        setDisplay(display === "0" ? "0" + value : display + value);
      }
    } else if (value === ".") {
      // Não permite múltiplos pontos no mesmo número
      const ultimoNumero = display.split(/[+\-*/()]/).pop() || "";
      if (!ultimoNumero.includes(".")) {
        setDisplay(display + value);
      }
    } else if (value === "(" || value === ")") {
      setDisplay(display === "0" ? value : display + value);
    } else {
      // Números
      setDisplay(display === "0" ? value : display + value);
    }
  };

  const calcular = () => {
    try {
      const resultado = calcularSeguro(display);
      const resultadoFormatado = Number.isInteger(resultado) 
        ? resultado.toString() 
        : resultado.toFixed(8).replace(/\.?0+$/, "");
      
      setHistorico([`${display} = ${resultadoFormatado}`, ...historico.slice(0, 9)]);
      setExpressao(display);
      setDisplay(resultadoFormatado);
    } catch (error) {
      setDisplay("Erro");
      setExpressao("");
    }
  };

  const copiarResultado = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  const limparHistorico = () => {
    setHistorico([]);
  };

  const usarDoHistorico = (item: string) => {
    const resultado = item.split(" = ")[1];
    setDisplay(resultado);
    setExpressao("");
  };

  // Suporte a teclado físico
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      if (e.key >= "0" && e.key <= "9") {
        handleButtonClick(e.key);
      } else if (["+", "-", "*", "/", "(", ")", ".", "%"].includes(e.key)) {
        handleButtonClick(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        calcular();
      } else if (e.key === "Backspace") {
        handleButtonClick("⌫");
      } else if (e.key === "Escape") {
        handleButtonClick("AC");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, display, expressao]);

  const ButtonCalc = ({ 
    value, 
    variant = "default", 
    className = "",
    span = 1
  }: { 
    value: string; 
    variant?: "default" | "operator" | "equals" | "clear";
    className?: string;
    span?: number;
  }) => {
    const baseClass = "h-14 text-lg font-semibold transition-all active:scale-95";
    const variants = {
      default: "bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white",
      operator: "bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-100",
      equals: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600",
      clear: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-100"
    };

    return (
      <Button
        onClick={() => handleButtonClick(value)}
        className={cn(baseClass, variants[variant], className)}
        style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
      >
        {value}
      </Button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Calculadora</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={copiarResultado}
              className="h-8 w-8"
              title="Copiar resultado"
            >
              {copiado ? (
                <Check size={16} className="text-green-600" />
              ) : (
                <Copy size={16} />
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Display */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          {expressao && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-right truncate">
              {expressao}
            </div>
          )}
          <div className="text-3xl font-bold text-right text-gray-900 dark:text-white break-all">
            {display}
          </div>
          <div className="text-xs text-gray-400 mt-2 text-right">
            Pressione ESC para limpar
          </div>
        </div>

        {/* Botões */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <ButtonCalc value="AC" variant="clear" />
          <ButtonCalc value="(" variant="operator" />
          <ButtonCalc value=")" variant="operator" />
          <ButtonCalc value="⌫" variant="operator" />

          <ButtonCalc value="7" />
          <ButtonCalc value="8" />
          <ButtonCalc value="9" />
          <ButtonCalc value="/" variant="operator" />

          <ButtonCalc value="4" />
          <ButtonCalc value="5" />
          <ButtonCalc value="6" />
          <ButtonCalc value="*" variant="operator" />

          <ButtonCalc value="1" />
          <ButtonCalc value="2" />
          <ButtonCalc value="3" />
          <ButtonCalc value="-" variant="operator" />

          <ButtonCalc value="0" />
          <ButtonCalc value="." />
          <ButtonCalc value="%" variant="operator" />
          <ButtonCalc value="+" variant="operator" />

          <ButtonCalc value="=" variant="equals" span={4} />
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="border-t dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Histórico
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={limparHistorico}
                className="h-7 text-xs"
              >
                <Trash2 size={12} className="mr-1" />
                Limpar
              </Button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {historico.map((item, index) => (
                <button
                  key={index}
                  onClick={() => usarDoHistorico(item)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors truncate"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}