"use client";

import { usePeriodo } from "./PeriodoContext";

import { BsCaretLeftFill, BsCaretRightFill } from "react-icons/bs";

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
    <div className="flex w-[250px] ml-auto mr-12 justify-center items-center 
         rounded-bl-3xl rounded-br-3xl gap-3 px-3 py-2.5 
         bg-[#f1f1f1] text-[1.1rem]">
      <button className="bg-[#888] text-white rounded-full w-7 h-7 flex justify-center items-center 
         cursor-pointer transition-colors duration-200 hover:bg-[#555]" onClick={voltarMes}><BsCaretLeftFill /></button>
      <span className="font-semibold min-w-[150px] text-center">{meses[mesSelecionado]} / {anoSelecionado}</span>
      <button className="bg-[#888] text-white rounded-full w-7 h-7 flex justify-center items-center 
         cursor-pointer transition-colors duration-200 hover:bg-[#555]" onClick={avancarMes}><BsCaretRightFill /></button>
    </div>
  );
}