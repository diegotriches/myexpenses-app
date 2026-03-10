"use client";

import { createContext, useContext, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";

interface PeriodoContextProps {
  mesSelecionado: number;
  setMesSelecionado: (mes: number) => void;
  anoSelecionado: number;
  setAnoSelecionado: (ano: number) => void;
  // Registra um callback chamado ANTES de qualquer mudança manual pelo usuário.
  // A página da fatura usa isso para setar usuarioNavegou=true no mesmo ciclo,
  // evitando o bug de stale closure que precisava de 2 cliques para funcionar.
  registrarOnNavegacao: (cb: (() => void) | null) => void;
  // Versões "manuais" usadas pelo PeriodoSelector (disparam onNavegacao)
  navegarMes: (mes: number) => void;
  navegarAno: (ano: number) => void;
}

const PeriodoContext = createContext<PeriodoContextProps | undefined>(undefined);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Ref para o callback de navegação — ref evita re-renders desnecessários
  const onNavegacaoRef = useRef<(() => void) | null>(null);

  const registrarOnNavegacao = useCallback((cb: (() => void) | null) => {
    onNavegacaoRef.current = cb;
  }, []);

  // Chamado pelo PeriodoSelector ao mudar mês manualmente
  const navegarMes = useCallback((mes: number) => {
    onNavegacaoRef.current?.();
    setMesSelecionado(mes);
  }, []);

  // Chamado pelo PeriodoSelector ao mudar ano manualmente
  const navegarAno = useCallback((ano: number) => {
    onNavegacaoRef.current?.();
    setAnoSelecionado(ano);
  }, []);

  return (
    <PeriodoContext.Provider
      value={{
        mesSelecionado,
        setMesSelecionado,  // programático (sem disparar onNavegacao)
        anoSelecionado,
        setAnoSelecionado,  // programático (sem disparar onNavegacao)
        registrarOnNavegacao,
        navegarMes,         // manual (dispara onNavegacao)
        navegarAno,         // manual (dispara onNavegacao)
      }}
    >
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodo() {
  const context = useContext(PeriodoContext);
  if (!context) {
    throw new Error("usePeriodo deve ser usado dentro de PeriodoProvider");
  }
  return context;
}