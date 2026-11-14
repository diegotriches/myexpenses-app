"use client";

import { useLayoutEffect, useRef } from "react";

interface Opcoes {
  /** Muda quando muda o item ativo ou algo que altera o tamanho dos itens (rótulo, contador) */
  chave: string;
  /** Seletor CSS dos itens (observados para acompanhar mudanças de tamanho) */
  seletorItens: string;
  /** Seletor CSS do item ativo, procurado dentro do elemento pai do indicador */
  seletorAtivo: string;
  /**
   * "x": só posição horizontal e largura (sublinhado das abas, com altura fixa no CSS);
   * "xy": posição, largura e altura (pílula do menu, fundo do seletor segmentado)
   */
  eixos?: "x" | "xy";
}

/**
 * Indicador que desliza até o item ativo (sublinhado de aba, pílula do menu, fundo de
 * seletor). O indicador fica dentro do contêiner dos itens, que precisa ser `position:
 * relative`; a posição vem de offsetLeft/offsetTop do item ativo.
 *
 * - Mexe direto no estilo do indicador (sem estado): é só posição visual.
 * - Marca o contêiner com `data-indicador-pronto="true"` depois de posicionar, para o
 *   item ativo tirar o próprio fundo/borda (até lá, ele mesmo mostra o destaque).
 * - Sem item ativo (ou com o contêiner oculto), o indicador some; ao reaparecer e na
 *   montagem, nasce no lugar, sem deslizar de onde estava. A transição só vale com
 *   `data-animar="true"` no indicador: use `data-[animar=true]:transition-...` na classe.
 * - Acompanha mudanças de tamanho do contêiner e dos itens (ResizeObserver).
 */
export function useIndicadorDeslizante<T extends HTMLElement = HTMLSpanElement>({ chave, seletorItens, seletorAtivo, eixos = "xy" }: Opcoes) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const indicador = ref.current;
    const conteiner = indicador?.parentElement;
    if (!indicador || !conteiner) return;
    const quadros: number[] = [];

    const posicionar = () => {
      const ativo = conteiner.querySelector<HTMLElement>(seletorAtivo);
      if (!ativo || ativo.offsetWidth === 0) {
        indicador.style.opacity = "0";
        indicador.dataset.animar = "false";
        return;
      }
      const estavaOculto = indicador.style.opacity !== "1";
      if (estavaOculto) indicador.dataset.animar = "false";
      indicador.style.opacity = "1";
      indicador.style.width = `${ativo.offsetWidth}px`;
      if (eixos === "xy") {
        indicador.style.height = `${ativo.offsetHeight}px`;
        indicador.style.transform = `translate(${ativo.offsetLeft}px, ${ativo.offsetTop}px)`;
      } else {
        indicador.style.transform = `translateX(${ativo.offsetLeft}px)`;
      }
      conteiner.dataset.indicadorPronto = "true";
      // Só anima a partir do quadro seguinte: ao nascer, já aparece no lugar. Agenda sempre que
      // a animação ainda não estiver ligada (e não só ao sair de oculto): no modo de
      // desenvolvimento o React roda o efeito duas vezes, e a limpeza da primeira cancela o
      // agendamento; sem reagendar, o indicador nunca passava a deslizar no npm run dev.
      if (indicador.dataset.animar !== "true") quadros.push(requestAnimationFrame(() => { indicador.dataset.animar = "true"; }));
    };
    posicionar();

    const observador = new ResizeObserver(posicionar);
    observador.observe(conteiner);
    conteiner.querySelectorAll(seletorItens).forEach((item) => observador.observe(item));
    return () => { quadros.forEach(cancelAnimationFrame); observador.disconnect(); };
  }, [chave, seletorItens, seletorAtivo, eixos]);

  return ref;
}
