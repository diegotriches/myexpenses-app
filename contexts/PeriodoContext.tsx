"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface PeriodoContextProps {
    mesSelecionado: number;
    setMesSelecionado: (mes: number) => void;
    anoSelecionado: number;
    setAnoSelecionado: (ano: number) => void;
}

const PeriodoContext = createContext<PeriodoContextProps | undefined>(undefined);

export function PeriodoProvider({ children }: { children: ReactNode }) {
    const hoje = new Date();
    const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
    const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

    return (
        <PeriodoContext.Provider
        value={{ mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado }}
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