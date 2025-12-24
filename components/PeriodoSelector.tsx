"use client";

import { usePeriodo } from "./PeriodoContext";

import { FaAngleLeft, FaAngleRight } from "react-icons/fa";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PeriodoSelector() {
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado } = usePeriodo();

  const avancarMes = () => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  };

  const voltarMes = () => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  };

  return (
    <div className="flex w-[250px] border-2 ml-auto mr-12 justify-center items-center rounded-3xl gap-3 px-3 py-2.5 bg-gray text-[1.1rem]">
      <button className="text-blue-600 rounded-full w-4 h-4 flex justify-center items-center cursor-pointer transition-colors duration-200 hover:text-black" onClick={voltarMes}><FaAngleLeft /></button>
      <span className="font-semibold min-w-[150px] text-center">{meses[mesSelecionado]} {anoSelecionado}</span>
      <button className="text-blue-600 rounded-full w-4 h-4 flex justify-center items-center cursor-pointer transition-colors duration-200 hover:text-black" onClick={avancarMes}><FaAngleRight /></button>
    </div>
  );
}